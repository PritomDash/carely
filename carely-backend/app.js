require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Socket.IO ──────────────────────────────────────────────────────────────────
// Created before routes are mounted so req.io is populated for every route handler.
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(require('cookie-parser')());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use((req, _res, next) => { req.io = io; next(); });

const session = require('express-session');
const passport = require('passport');
app.use(session({ secret: process.env.JWT_SECRET, resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use('/api/auth', require('./routes/googleAuthRoutes'));

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
app.use('/api/credits',       require('./routes/creditRoutes'));

app.get('/', (req, res) => res.send('🚀 Carely API running'));

// ── Seed fake professionals (only runs if fewer than 5 exist) ──────────────────
const seedProfessionals = async () => {
  const User = require('./models/user');
  try {
    const count = await User.countDocuments({ role: 'professional' });
    if (count >= 5) return;

    const fakeProfessionals = [
      {
        name: 'Fatima Rahman', email: 'pro1@carely.com', password: 'Test@1234', phone: '01700000001',
        role: 'professional', professionalType: 'Child Care',
        location: { division: 'Dhaka', district: 'Dhaka', thana: 'Gulshan' },
        experience: '4 years', hourlyRate: 800, weekdayRate: 800, saturdayRate: 800, sundayRate: 800,
        about: 'Experienced child care specialist with 4 years caring for children aged 1-12. CPR certified and very patient.',
        rating: 4.8, isVerified: true, profileApproved: true,
      },
      {
        name: 'Dr Karim Hossain', email: 'pro2@carely.com', password: 'Test@1234', phone: '01700000002',
        role: 'professional', professionalType: 'Nurse',
        location: { division: 'Dhaka', district: 'Dhaka', thana: 'Dhanmondi' },
        experience: '6 years', hourlyRate: 1200, weekdayRate: 1200, saturdayRate: 1200, sundayRate: 1200,
        about: 'Qualified nurse with hospital experience. Specializes in elderly home care and post-surgery recovery.',
        rating: 4.9, isVerified: true, profileApproved: true,
      },
      {
        name: 'Nasrin Akter', email: 'pro3@carely.com', password: 'Test@1234', phone: '01700000003',
        role: 'professional', professionalType: 'Aged Care',
        location: { division: 'Chittagong', district: 'Chittagong', thana: 'Panchlaish' },
        experience: '3 years', hourlyRate: 700, weekdayRate: 700, saturdayRate: 700, sundayRate: 700,
        about: 'Compassionate aged care worker. Gentle and respectful with elderly patients.',
        rating: 4.7, isVerified: true, profileApproved: true,
      },
      {
        name: 'Rahim Physiotherapy', email: 'pro4@carely.com', password: 'Test@1234', phone: '01700000004',
        role: 'professional', professionalType: 'Physiotherapist',
        location: { division: 'Dhaka', district: 'Dhaka', thana: 'Mirpur' },
        experience: '5 years', hourlyRate: 1500, weekdayRate: 1500, saturdayRate: 1500, sundayRate: 1500,
        about: 'Licensed physiotherapist. Expert in rehabilitation, mobility improvement and pain management.',
        rating: 4.6, isVerified: true, profileApproved: true,
      },
      {
        name: 'Sumaiya Begum', email: 'pro5@carely.com', password: 'Test@1234', phone: '01700000005',
        role: 'professional', professionalType: 'Child Care',
        location: { division: 'Sylhet', district: 'Sylhet', thana: 'Sylhet Sadar' },
        experience: '2 years', hourlyRate: 600, weekdayRate: 600, saturdayRate: 600, sundayRate: 600,
        about: 'Loving and energetic child care provider. Great with toddlers and school-age children.',
        rating: 4.5, isVerified: true, profileApproved: true,
      },
    ];

    for (const data of fakeProfessionals) {
      const exists = await User.findOne({ email: data.email });
      if (!exists) {
        await new User(data).save();
      }
    }
    console.log('✅ Seeded fake professionals');
  } catch (err) {
    console.error('❌ Seed error:', err.message);
  }
};

// ── MongoDB ────────────────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ MongoDB connected');
  require('./cronJobs')(io);
  seedProfessionals();
})
.catch(err => console.error('❌ MongoDB error:', err));

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

if (process.env.NODE_ENV === 'production') {
  const https = require('https');
  setInterval(() => {
    const url = process.env.RENDER_EXTERNAL_URL || process.env.APP_BASE_URL;
    if (url) {
      https.get(url, (res) => {
        console.log('Self-ping:', res.statusCode);
      }).on('error', () => {});
    }
  }, 14 * 60 * 1000);
}

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
