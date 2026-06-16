const { Server } = require('socket.io');
const { verifyAccessToken } = require('../utils/jwt');
const pool = require('../config/database');

const INBOUND_EVENTS = [
  'request_watch_camera_response', 'update_account', 'update_mic_time',
  'update_room_welcome_message', 'update_room_announcement', 'mute_audio',
  'pull_mic', 'join_effect', 'warning_message', 'poll_created', 'give_mic',
  'delete_message', 'request_mic', 'gate_enter_request', 'rejoin_request',
  'message_action', 'user_left', 'user_kick', 'user_join', 'change_state',
  'add_account', 'block', 'ride', 'ban', 'token_expired', 'general_message',
  'poll_voted', 'poll_ended', 'mic_time_open', 'server_broadcast',
  'publish_camera', 'update_room_style', 'wuno_game', 'public_message',
  'create_ludo', 'remove_block', 'profile_viewed', 'take_mic', 'clear_text',
  'update_room_private', 'server_kick', 'pull_mic_all',
  'update_advanced_room_settings', 'typing', 'delete_account',
  'request_watch_camera', 'gate_enter_response', 'enable_mics',
  'duplex_mic', 'update_room_camera', 'private_message',
  'update_room_talk', 'update_room_lock', 'add_profile_like',
  'server_ban', 'talking'
];

function setupSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    path: '/socket.io'
  });

  // Track room participants
  const roomParticipants = new Map();

  io.use(async (socket, next) => {
    try {
      const { account_id, session_token } = socket.handshake.query;
      if (!account_id || !session_token) {
        return next(new Error('Authentication required'));
      }
      // Verify session token from database
      const [users] = await pool.query('SELECT id, aid, name, session_token FROM users WHERE aid = ? AND session_token = ?',
        [parseInt(account_id), session_token]);
      if (users.length === 0) {
        return next(new Error('Invalid session'));
      }
      socket.user = { id: users[0].id, aid: users[0].aid, name: users[0].name };
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;
    console.log(`User ${user.name}(${user.aid}) connected: ${socket.id}`);

    // Join user's personal room for private messages
    socket.join(`user:${user.aid}`);

    // --- Inbound Event Handlers (App -> Server) ---

    // Room events
    socket.on('user_in_door_response', (data) => {
      // Handle door entry response
      io.to(`user:${data.toAid}`).emit('gate_enter_response', data);
    });

    socket.on('delete_message', (data) => {
      io.to(`room:${data.roomId}`).emit('delete_message', data);
    });

    socket.on('private_message', (data) => {
      io.to(`user:${data.toAid}`).emit('private_message', data);
    });

    socket.on('add_profile_picture', (data) => {
      io.to(`user:${user.aid}`).emit('profile_viewed', data);
    });

    socket.on('request_watch_camera_response', (data) => {
      io.to(`user:${data.toAid}`).emit('request_watch_camera_response', data);
    });

    // Join a room (Socket.IO room)
    socket.on('join_room', (data) => {
      const { roomId } = data;
      socket.join(`room:${roomId}`);
      if (!roomParticipants.has(roomId)) {
        roomParticipants.set(roomId, new Set());
      }
      roomParticipants.get(roomId).add(user.aid);

      // Notify others
      socket.to(`room:${roomId}`).emit('user_join', {
        userId: user.aid,
        nickname: user.name,
        timestamp: Date.now()
      });

      // Send current room participants
      const participants = Array.from(roomParticipants.get(roomId) || []);
      socket.emit('change_state', { roomId, participants, count: participants.length });
    });

    // Leave a room
    socket.on('leave_room', (data) => {
      const { roomId } = data;
      socket.leave(`room:${roomId}`);
      if (roomParticipants.has(roomId)) {
        roomParticipants.get(roomId).delete(user.aid);
      }
      socket.to(`room:${roomId}`).emit('user_left', {
        userId: user.aid,
        nickname: user.name,
        timestamp: Date.now()
      });
    });

    // Chat messages
    socket.on('send_message', (data) => {
      const { roomId, message, type, imageUrl } = data;
      const msgData = {
        id: Date.now(),
        fromUser: { id: user.aid, nickname: user.name },
        type: type || 0,
        content: message,
        imageUrl,
        createdAt: Date.now()
      };
      // Store in database (optional)
      io.to(`room:${roomId}`).emit('public_message', msgData);
    });

    // Typing indicator
    socket.on('typing', (data) => {
      const { roomId, isTyping } = data;
      socket.to(`room:${roomId}`).emit('typing', {
        userId: user.aid,
        nickname: user.name,
        isTyping
      });
    });

    // Mic management
    socket.on('mic_up', (data) => {
      io.to(`room:${data.roomId}`).emit('take_mic', { userId: user.aid, nickname: user.name });
    });
    socket.on('mic_down', (data) => {
      io.to(`room:${data.roomId}`).emit('pull_mic', { userId: user.aid });
    });
    socket.on('request_mic', (data) => {
      io.to(`room:${data.roomId}`).emit('request_mic', { userId: user.aid, nickname: user.name });
    });

    // Moderation
    socket.on('kick_user', (data) => {
      io.to(`room:${data.roomId}`).emit('user_kick', { userId: data.targetAid, by: user.aid });
      io.to(`user:${data.targetAid}`).emit('server_kick', { roomId: data.roomId, reason: data.reason });
    });

    socket.on('ban_user', (data) => {
      io.to(`room:${data.roomId}`).emit('ban', { userId: data.targetAid, by: user.aid });
      io.to(`user:${data.targetAid}`).emit('server_ban', { roomId: data.roomId, reason: data.reason });
    });

    socket.on('block_user', (data) => {
      const { roomId, targetAid } = data;
      socket.to(`room:${roomId}`).emit('block', { userId: targetAid, by: user.aid });
      if (data.blockCam) socket.to(`room:${roomId}`).emit('update_room_camera', { userId: targetAid, enabled: false });
      if (data.blockTalk) socket.to(`room:${roomId}`).emit('update_room_talk', { userId: targetAid });
      if (data.blockPrv) socket.to(`room:${roomId}`).emit('update_room_private', { userId: targetAid });
      if (data.blockTxt) socket.to(`room:${roomId}`).emit('clear_text', { userId: targetAid });
    });

    // Room updates
    socket.on('update_room', (data) => {
      const { roomId, updates } = data;
      for (const [key, value] of Object.entries(updates || {})) {
        const eventMap = {
          title: 'update_room_talk',
          welcome: 'update_room_welcome_message',
          lock: 'update_room_lock',
          private: 'update_room_private',
          theme: 'update_room_style',
          camera: 'update_room_camera'
        };
        if (eventMap[key]) {
          io.to(`room:${roomId}`).emit(eventMap[key], { ...value, by: user.aid });
        }
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`User ${user.name}(${user.aid}) disconnected: ${socket.id}`);
      // Remove from all rooms
      for (const [roomId, participants] of roomParticipants.entries()) {
        if (participants.has(user.aid)) {
          participants.delete(user.aid);
          io.to(`room:${roomId}`).emit('user_left', {
            userId: user.aid,
            nickname: user.name,
            timestamp: Date.now()
          });
        }
      }
    });
  });

  return io;
}

module.exports = { setupSocket, INBOUND_EVENTS };
