# WebRTC Project

## Live Link

https://webrtc-next.onrender.com/

## Overview

This project is a WebRTC-based application that enables real-time peer-to-peer communication through audio, video, and data channels. It uses Next.js for the frontend and an Express.js + Socket.io signaling server to exchange SDP and ICE candidates for connection setup.

## Features

- Real-time audio and video communication
- Data channel for sending messages
- Peer-to-peer connection setup via Socket.io signaling
- Responsive design for vdesktop and mobile
- Easy setup and deployment

## Technologies Used

- WebRTC – real-time peer-to-peer media and data transfer
- Next.js – frontend framework for fast and scalable UI
- Node.js – runtime environment
- Express.js – backend server for routing and signaling logic
- Socket.io – real-time communication between peers

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/jxeal/webrtc-next
   ```

2. Navigate to the project directory:

   ```bash
   cd webrtc-next
   ```

3. Install the dependencies:

   ```bash
   npm install
   ```

4. Start the server:

   ```bash
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:3000` to access the application.

## Usage

1. Create/Join a room
2. Start VC
3. Stop VC once to be able to restart the VC
   Stop VC twice to end camera usage for both peers
4. Incase VC was stopped, turn on camera from both sides and start VC

## Contributing

Contributions are welcome! Please follow these steps to contribute:

1. Fork the repository.
2. Create a new branch (`git checkout -b feature/YourFeature`).
3. Make your changes and commit them (`git commit -m 'Add some feature'`).
4. Push to the branch (`git push origin feature/YourFeature`).
5. Open a pull request.

## Acknowledgments

- [WebRTC Documentation](https://webrtc.org/)
- [Socket.io Documentation](https://socket.io/docs/)
- [Express.js Documentation](https://expressjs.com/)
- [Next.js Documentation](https://nextjs.org/docs)
