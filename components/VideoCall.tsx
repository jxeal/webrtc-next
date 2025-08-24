"use client";
import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { toast } from "sonner";
import { Camera, CameraOff, Mic, MicOff, Phone, Video } from "lucide-react";

// --- Socket and variables ---
export const socket = io();
let videoCameraFlag = 0;

const VideoCall: React.FC = () => {
  const pc = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const remoteStream = useRef<MediaStream | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const roomInputRef = useRef<HTMLInputElement>(null);
  const [roomCode, setRoomCode] = useState<string>("");
  const [camera, setCamera] = useState<boolean>(true);
  const [mic, setMic] = useState<boolean>(true);
  const [vc, setVc] = useState<boolean>(false);
  const [stopVc, setStopVc] = useState<boolean>(false);

  // --- Functions ---
  async function startCamera() {
    if (!pc.current) {
      pc.current = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
          { urls: "stun:stun2.l.google.com:19302" },
          { urls: "stun:stun3.l.google.com:19302" },
        ],
      });
    }

    if (!localStream.current) {
      try {
        const constraints = { video: { height: 384, width: 512 }, audio: true };
        localStream.current = await navigator.mediaDevices.getUserMedia(
          constraints
        );
        videoCameraFlag = 1;
      } catch (e) {
        console.error("Error opening camera: ", e);
        toast.error("Failed to access camera/microphone");
        return;
      }

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream.current;
      }
    }

    if (!remoteStream.current) {
      remoteStream.current = new MediaStream();
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream.current;
      }
    }

    localStream.current.getTracks().forEach((track) => {
      if (!pc.current?.getSenders().some((sender) => sender.track === track)) {
        pc.current?.addTrack(track, localStream.current as MediaStream);
      }
    });

    pc.current.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        if (!remoteStream.current?.getTracks().includes(track)) {
          remoteStream.current?.addTrack(track);
        }
      });
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream.current;
      }
    };
  }

  function generateRoom() {
    const code = Math.floor(1000 + Math.random() * 9000);
    socket.emit("create-room", code.toString());
    setRoomCode(code.toString());
  }

  function joinRoom() {
    const code = roomCode;
    if (code.length === 4) {
      socket.emit("join-room", code);
    } else {
      toast.error("Please enter a 4 digit room code");
      setRoomCode("");
    }
  }

  function toggleVideoFromCamera() {
    if (!localStream.current) return;
    const videoTracks = localStream.current.getVideoTracks();
    if (videoTracks.length > 0) {
      videoTracks[0].enabled = !videoTracks[0].enabled;
    }
  }

  async function handleCameraClick() {
    if (!videoCameraFlag) await startCamera();
    toggleVideoFromCamera();
    setCamera((prev) => !prev);
  }

  function handleAudio() {
    if (!localStream.current) return;
    const audioTracks = localStream.current.getAudioTracks();
    if (audioTracks.length > 0) {
      setMic((prev) => !prev);
      audioTracks[0].enabled = !audioTracks[0].enabled;
    }
  }

  async function handleCreate() {
    if (!pc.current) return;

    setVc(true);
    setStopVc(false);
    // set ICE handler
    pc.current.onicecandidate = () => {
      const offerSDP = pc.current!.localDescription;
      if (offerSDP) {
        socket.emit("send-offer-sdp", { room: roomCode, offerSDP });
      }
    };

    try {
      const offer = await pc.current.createOffer();
      await pc.current.setLocalDescription(offer);
      socket.emit("send-offer-sdp", { room: roomCode, offerSDP: offer });
    } catch (err) {
      console.error("Error creating offer:", err);
    }
  }

  async function handleJoin(offer: RTCSessionDescriptionInit) {
    if (!pc.current) return;

    setVc(true);
    setStopVc(false);
    pc.current.onicecandidate = () => {
      const answerSDP = pc.current!.localDescription;
      if (answerSDP) {
        console.log("Room code", roomCode);
        socket.emit("send-answer-sdp", { room: roomCode, answerSDP });
      }
    };

    try {
      await pc.current.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.current.createAnswer();
      await pc.current.setLocalDescription(answer);
      console.log("Room code", roomCode);
      socket.emit("send-answer-sdp", { room: roomCode, answerSDP: answer });
    } catch (err) {
      console.error("Error handling join:", err);
    }
  }

  async function handleAnswer(answer: RTCSessionDescriptionInit) {
    if (!pc.current) return;
    try {
      await pc.current.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (err) {
      console.error("Error setting remote answer:", err);
    }
  }

  function handleStopVC() {
    socket.emit("stop-vc", roomCode);
    handleRemoveTracks();
    setStopVc(true);
    setVc(false);
    setMic(true);
    setCamera(true);
  }

  function handleRemoveTracks() {
    localStream.current?.getTracks().forEach((track) => track.stop());
    // Close connection
    if (pc.current) {
      pc.current.onicecandidate = null;
      pc.current.ontrack = null;
      pc.current.close();
      pc.current = null;
    }

    // Clear streams
    localStream.current = null;
    remoteStream.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    videoCameraFlag = 0;
  }

  // --- Auto start camera on mount ---
  useEffect(() => {
    startCamera();
  }, [stopVc]);

  // --- Socket listeners ---
  useEffect(() => {
    socket.on("receive-answer-sdp", (answerSDP) => handleAnswer(answerSDP));
    socket.on("receive-offer-sdp", (offerSDP) => handleJoin(offerSDP));
    socket.on("vc-stopped", (msg: string) => {
      handleRemoveTracks();
      toast.error(msg || "Video call stopped");
      setStopVc(true);
      setVc(false);
      setMic(true);
    });
    socket.on("room-created", (code) => {
      toast.success(`Room created ${code}`);
      console.log("Room created:", code);
    });

    socket.on("room-joined", (code) => {
      toast.success(`Joined room ${code}`);
      console.log("Room joined: ", code);
      setRoomCode(code.toString());
    });

    socket.on("join-error", (message) => {
      toast.error(message);
      setRoomCode("");
    });

    socket.on("connect_error", (err) => {
      toast.error("Connection error! " + err.message);
      console.error("Connection error:", err);
    });

    return () => {
      socket.off("receive-answer-sdp");
      socket.off("receive-offer-sdp");
      socket.off("vc-stopped");
    };
  }, [roomCode]);

  // --- JSX ---
  return (
    <div className="flex flex-col items-center justify-start text-[#e0e0e0] p-4 w-full max-w-[1024px] md:mt-30 mx-auto ">
      {/* Video Row */}
      <div className="flex flex-col md:flex-row justify-center items-center md:items-start mb-5 w-full">
        <div className="w-full md:w-[512px] md:h-[384px] bg-[#2c2c2c] overflow-hidden mb-4 md:mb-0 md:mx-2 rounded border">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            className="w-full h-full object-cover"
          ></video>
        </div>
        <div className="w-full md:w-[512px] md:h-[384px] bg-[#2c2c2c] overflow-hidden md:mx-2 rounded border">
          <video
            ref={remoteVideoRef}
            autoPlay
            className="w-full h-full object-cover"
          ></video>
        </div>
      </div>

      {/* Room controls */}
      <div className="flex flex-col items-center w-full space-y-3">
        <div className="flex flex-col md:flex-row items-center w-full md:w-auto space-y-3 md:space-y-0 md:space-x-2">
          <button
            onClick={generateRoom}
            className="w-full md:w-auto bg-[#555] hover:bg-[#666] text-white text-base md:text-lg rounded-md px-4 py-2"
          >
            Generate Room
          </button>

          <input
            ref={roomInputRef}
            type="text"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value)}
            placeholder="Enter 4-digit code"
            className="w-full md:w-[245px] px-3 py-2 text-base md:text-lg rounded-md border-0 bg-white text-black focus:ring-2 focus:ring-[#666]"
          />
          <button
            onClick={joinRoom}
            className="w-full md:w-auto bg-[#555] hover:bg-[#666] text-white text-base md:text-lg rounded-md px-4 py-2"
          >
            Join Room
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap justify-center items-center gap-2 mt-5 w-full md:w-auto">
        <button
          onClick={handleCameraClick}
          className="w-full md:w-auto bg-[#555] hover:bg-[#666] text-white text-base md:text-lg rounded-md px-4 py-2"
        >
          {camera ? <Camera size={28} /> : <CameraOff size={28} />}
        </button>
        <button
          onClick={handleAudio}
          className="w-full md:w-auto bg-[#555] hover:bg-[#666] text-white text-base md:text-lg rounded-md px-4 py-2"
        >
          {mic ? <Mic size={28} /> : <MicOff size={28} />}
        </button>
        <button
          onClick={handleCreate}
          className="w-full md:w-auto bg-[#555] hover:bg-[#666] text-white text-base md:text-lg rounded-md px-4 py-2"
        >
          <div className="flex flex-row gap-2">
            Start <Video size={28} />
          </div>
        </button>
        <button
          onClick={handleStopVC}
          className="w-full md:w-auto bg-[#555] hover:bg-[#666] text-white text-base md:text-lg rounded-md px-4 py-2"
        >
          <Phone color="red" size={28} />
        </button>
      </div>

      {/* Info */}
      <div className="mt-5 text-center px-2 text-sm md:text-base">
        <p>Generate/Join a room. Turn the camera on and start vc.</p>
        <p className="mt-2">
          If the connection doesn&apos;t work, try another guest mode. Some
          extensions may cause troubles.
        </p>
      </div>
    </div>
  );
};

export default VideoCall;
