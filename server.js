const express = require("express");
const next = require("next");
const http = require("http");
const { Server } = require("socket.io");

const app = next({ dev: true, turbo: true }); // always run in dev with Turbopack
const handle = app.getRequestHandler();

const PORT = 3000; // fixed port, no env

app.prepare().then(() => {
    const server = express();
    const httpServer = http.createServer(server);
    const io = new Server(httpServer);

    // Store for active rooms with their creation timestamps
    const activeRooms = new Map();

    // Clean expired rooms every hour
    setInterval(() => {
        const now = Date.now();
        for (const [code, timestamp] of activeRooms.entries()) {
            if (now - timestamp > 24 * 60 * 60 * 1000) {
                activeRooms.delete(code);
            }
        }
    }, 60 * 60 * 1000);

    // --- Socket.io handlers ---
    io.on("connection", (socket) => {
        console.log("User connected");

        socket.on("create-room", (code) => {
            activeRooms.set(code, Date.now());
            socket.join(code);
            socket.emit("room-created", code);
            console.log("Room created:", code);
        });

        socket.on("join-room", (code) => {
            if (activeRooms.has(code)) {
                const room = io.sockets.adapter.rooms.get(code);
                const numMembers = room ? room.size : 0;

                if (numMembers < 2) {
                    socket.join(code);
                    socket.emit("room-joined", code);
                    console.log("Room joined:", code);
                } else {
                    socket.emit("join-error", "Room is full");
                    console.log("Join attempt failed: Room is full");
                }
            } else {
                socket.emit("join-error", "Room does not exist or has expired");
            }
        });

        socket.on("send-object", ({ room, data }) => {
            if (activeRooms.has(room)) {
                socket.to(room).emit("receive-object", data);
                console.log("Object sent in room:", room);
            }
        });

        socket.on("send-message", ({ room, message }) => {
            if (activeRooms.has(room)) {
                socket.to(room).emit("receive-message", message);
                console.log("Message sent in room:", room);
            }
        });

        socket.on("check-room-members", (code) => {
            const room = io.sockets.adapter.rooms.get(code);
            const numMembers = room ? room.size : 0;
            socket.emit("room-members-count", { room: code, count: numMembers });
        });

        socket.on("send-offer-sdp", ({ room, offerSDP }) => {
            socket.to(room).emit("receive-offer-sdp", offerSDP);
        });

        socket.on("send-answer-sdp", ({ room, answerSDP }) => {
            socket.to(room).emit("receive-answer-sdp", answerSDP);
        });

        socket.on("stop-vc", (room) => {
            socket.to(room).emit("vc-stopped", "Peer stopped VC");
        });

        socket.on("disconnect", () => {
            console.log("User disconnected");
        });
    });

    // Let Next.js handle everything else
    server.use((req, res) => handle(req, res));

    httpServer.listen(PORT, () => {
        console.log(`Server ready at http://localhost:${PORT}`);
    });
});
