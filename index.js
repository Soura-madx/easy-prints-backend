require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');


require('./utils/cronJobs');

// Routes Import
const authRoutes = require('./routes/auth');
const orderRoutes = require('./routes/order');
const uploadRoutes = require('./routes/upload');

const app = express();

// Socket.io ke liye HTTP server create karna zaroori hai
const server = http.createServer(app);

// WebSocket (Socket.io) Setup with Frontend URL from .env
const io = new Server(server, {
  cors: {
    origin: ['https://easy-prints-frontend.vercel.app', 'http://localhost:5173'], // e.g., http://localhost:5173
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

// Taaki hum 'io' ko aage routes me use kar sakein (eg. order aane par flash karne ke liye)
app.set('io', io);

// Middleware
// Localhost aur Vercel dono ko allow karne ke liye array bana diya
const allowedOrigins = ['https://easy-prints-frontend.vercel.app', 'http://localhost:5173'];

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      var msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/upload', uploadRoutes);

// Base Route
app.get('/', (req, res) => {
  res.send('Easy Prints Backend API + WebSockets is running fast! 🚀');
});

// Real-time Connection Logic (Socket.io)
io.on('connection', (socket) => {
  console.log(`🔌 New client connected: ${socket.id}`);
  
  // Jab shopkeeper login karega, wo apne specific "room" me join ho jayega
  socket.on('joinShopRoom', (shopId) => {
    socket.join(shopId);
    console.log(`🏪 Shopkeeper joined room: ${shopId}`);
  });

  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

// Database Connection & Server Startup
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB Connected Successfully!');
    // DHYAN DEIN: yahan app.listen ki jagah server.listen chalega
    server.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
  });