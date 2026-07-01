require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Routes ─────────────────────────────────────────────────────────────────────
app.use('/api/auth',          require('./routes/authRoutes'));
app.use('/api/users',         require('./routes/userRoutes'));
app.use('/api/bookings',      require('./routes/bookingRoutes'));
app.use('/api/chat',          require('./routes/chatRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/ratings',       require('./routes/ratingRoutes'));
app.use('/api/jobs',          require('./routes/jobPostRoutes'));
app.use('/api/admin',         require('./routes/adminAuthRoutes'));
app.use('/api/admin',         require('./routes/adminRoutes'));
app.use('/api/admin/chat',    require('./routes/adminChatRoutes'));
app.use('/api/ads',           require('./routes/adRoutes'));
app.use('/api/assets',        require('./routes/assetRoutes'));

app.get('/', (req, res) => res.send('🚀 Carely API running'));

// ── MongoDB ────────────────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ MongoDB connected');
  require('./cronJobs')();
})
.catch(err => console.error('❌ MongoDB error:', err));

// ── Socket.IO ──────────────────────────────────────────────────────────────────
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

app.use((req, _res, next) => { req.io = io; next(); });

io.on('connection', (socket) => {
  console.log('🟢 Socket connected:', socket.id);

  socket.on('joinRoom', (userId) => {
    if (userId) socket.join(String(userId));
  });

  socket.on('joinThread', (roomId) => {
    if (roomId) socket.join(String(roomId));
  });

  socket.on('joinAdminGlobal', () => {
    socket.join('admin_global');
  });

  socket.on('disconnect', () => {
    console.log('🔌 Socket disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
