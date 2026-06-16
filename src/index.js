process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const config = require('./config/config');
const { setupSocket } = require('./socket/index');
const { setupSignaling } = require('./webrtc/index');
const HOST = process.env.HOST || '0.0.0.0';

const authRoutes = require('./routes/auth');
const roomRoutes = require('./routes/room');
const profileRoutes = require('./routes/profile');
const messageRoutes = require('./routes/message');
const friendRoutes = require('./routes/friend');
const momentRoutes = require('./routes/moment');
const uploadRoutes = require('./routes/upload');
const storeRoutes = require('./routes/store');
const billingRoutes = require('./routes/billing');

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

const uploadsPath = path.join(__dirname, '..', 'uploads');
app.use('/uploads', express.static(uploadsPath));
app.use('/image', express.static(uploadsPath));
app.use('/tZjqEwAm6xx4dM2q', express.static(uploadsPath));

app.use('/api/v1', authRoutes);
app.use('/api/v1/room', roomRoutes);
app.use('/api/v1', profileRoutes);
app.use('/api/v1', messageRoutes);
app.use('/api/v1', friendRoutes);
app.use('/api/v1', momentRoutes);
app.use('/api/v1', uploadRoutes);
app.use('/api/v1', storeRoutes);
app.use('/api/v1', billingRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

const io = setupSocket(server);
setupSignaling();

const PORT = config.apiPort;
server.listen(PORT, () => {
  console.log(`🚀 Wino Live Server running on port ${PORT}`);
  console.log(`   API:       http://0.0.0.0:${PORT}/api/v1/`);
  console.log(`   Socket.IO: http://0.0.0.0:${PORT}/socket.io/`);
  console.log(`   Media:     http://0.0.0.0:${PORT}/image/`);
  console.log(`   Signaling: tcp://0.0.0.0:${config.signalingPort}`);
});
