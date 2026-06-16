const net = require('net');
const config = require('../config/config');

// WebRTC Signaling Server (TCP port 5050)
// Protocol: [1 byte type][4 bytes length (BE)][payload]
// Type 1 = JSON data

function setupSignaling() {
  const server = net.createServer((socket) => {
    console.log(`Signaling client connected from ${socket.remoteAddress}:${socket.remotePort}`);

    let buffer = Buffer.alloc(0);

    socket.on('data', (data) => {
      buffer = Buffer.concat([buffer, data]);

      while (buffer.length >= 5) {
        const type = buffer[0];
        const length = buffer.readUInt32BE(1);

        if (buffer.length < 5 + length) break;

        const payload = buffer.slice(5, 5 + length);
        buffer = buffer.slice(5 + length);

        if (type === 1) {
          try {
            const message = JSON.parse(payload.toString('utf8'));
            handleMessage(socket, message);
          } catch (err) {
            console.error('Invalid signaling JSON:', err.message);
          }
        }
      }
    });

    socket.on('close', () => {
      console.log('Signaling client disconnected');
    });

    socket.on('error', (err) => {
      console.error('Signaling socket error:', err.message);
    });
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Signaling port ${config.signalingPort} in use, skipping signaling server`);
    } else {
      console.error('Signaling server error:', err.message);
    }
  });

  server.listen(config.signalingPort, () => {
    console.log(`WebRTC Signaling server on port ${config.signalingPort}`);
  });

  return server;
}

function handleMessage(socket, message) {
  const { type, roomId, userId, sdp, iceCandidates } = message;

  switch (type) {
    case 'joinRoom':
      socket.roomId = roomId;
      socket.userId = userId;
      sendMessage(socket, { type: 'joinRoom', success: true });
      // Notify others
      broadcastToRoom(socket, { type: 'userJoined', userId });
      break;

    case 'remoteDescription':
      broadcastToRoom(socket, {
        type: 'remoteDescription',
        fromUserId: socket.userId,
        sdp
      });
      break;

    case 'iceCandidates':
      broadcastToRoom(socket, {
        type: 'iceCandidates',
        fromUserId: socket.userId,
        candidates: iceCandidates
      });
      break;

    case 'startStream':
      socket.isStreaming = true;
      broadcastToRoom(socket, {
        type: 'startStream',
        fromUserId: socket.userId
      });
      break;

    case 'receiveStream':
      sendMessage(socket, {
        type: 'receiveStream',
        fromUserId: message.targetUserId,
        sdp: message.sdp
      });
      break;
  }
}

function sendMessage(socket, data) {
  const payload = Buffer.from(JSON.stringify(data), 'utf8');
  const header = Buffer.alloc(5);
  header[0] = 1; // type: JSON
  header.writeUInt32BE(payload.length, 1);
  socket.write(Buffer.concat([header, payload]));
}

function broadcastToRoom(senderSocket, data) {
  // In production, maintain room->socket mapping
  // For now, broadcast to all connected clients except sender
  if (senderSocket.server) {
    senderSocket.server.getConnections((err, count) => {
      // Simple broadcast: would use proper room management in production
    });
  }
}

module.exports = { setupSignaling };
