const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PATCH'],
    credentials: true,
  },
});


connectDB();


app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
app.use('/api/experts', require('./routes/expertRoutes'));
app.use('/api/bookings', require('./routes/bookingRoutes'));
app.use('/api/reservations', require('./routes/reservationRoutes'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});


io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  let heldReservation = null; 

  socket.on('join-expert-room', (expertId) => {
    socket.join(`expert-${expertId}`);
    console.log(`Socket ${socket.id} joined room: expert-${expertId}`);
  });

  socket.on('leave-expert-room', (expertId) => {
    socket.leave(`expert-${expertId}`);
  });

  // Track reservation ownership for auto-release on disconnect
  socket.on('hold-reservation', ({ expertId, slotId, sessionId, date, startTime }) => {
    heldReservation = { expertId, slotId, sessionId, date, startTime };
  });

  socket.on('clear-reservation', () => {
    heldReservation = null;
  });

  socket.on('disconnect', async () => {
    console.log(`Client disconnected: ${socket.id}`);
    if (heldReservation) {
      const { expertId, slotId, sessionId, date, startTime } = heldReservation;
      try {
        const SlotReservation = require('./models/SlotReservation');
        const deleted = await SlotReservation.findOneAndDelete({ expertId, slotId, sessionId });
        if (deleted) {
          io.to(`expert-${expertId}`).emit('slot-released', { expertId, slotId, date, startTime });
          console.log(`Auto-released reservation for slot ${slotId} on disconnect`);
        }
      } catch (err) {
        console.error('Auto-release on disconnect failed:', err.message);
      }
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = { app, io };
