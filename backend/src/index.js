/**
 * DevSure Backend - Main Entry Point
 * Production-ready Express.js server
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Import routes
const authRoutes = require('./routes/auth.routes');
const projectRoutes = require('./routes/project.routes');

// Import services
const jobRunner = require('./services/jobRunner.service');

// Import middleware
const errorHandler = require('./middlewares/errorHandler');

// Initialize Express
const app = express();

// ============================================
// SECURITY MIDDLEWARE
// ============================================

// Helmet for security headers (disable for dev)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// CORS configuration - Allow all origins in development
app.use(cors({
  origin: true,  // Allow all origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Handle preflight requests
app.options('*', cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { 
    error: 'Too many requests, please try again later.',
    retryAfter: '15 minutes'
  }
});
app.use(limiter);

// ============================================
// BODY PARSING MIDDLEWARE
// ============================================

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================
// ROUTES
// ============================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'DevSure API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Error Handler (must be last)
app.use(errorHandler);

// ============================================
// SERVER START
// ============================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════╗
  ║                                           ║
  ║   🛡️  DevSure API Server                  ║
  ║                                           ║
  ║   Status:  Running                        ║
  ║   Port:    ${PORT}                            ║
  ║   Mode:    ${process.env.NODE_ENV || 'development'}                   ║
  ║                                           ║
  ╚═══════════════════════════════════════════╝
  `);

  // Start the job runner (polls DB for pending analyses)
  jobRunner.start();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  jobRunner.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  jobRunner.stop();
  process.exit(0);
});

module.exports = app;
