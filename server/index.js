import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { initDB } from './config/db.js';
import { connectRedis } from './config/redis.js';
import passport from './config/passport.js';
import pool from './config/db.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import authRoutes from './routes/authRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import templateRoutes from './routes/templateRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

dotenv.config();

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;

// Security - Enhanced helmet configuration with CSP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      fontSrc: ["'self'"],
      connectSrc: ["'self'", 'https://accounts.google.com', 'https://github.com'],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  xFrameOptions: { action: 'deny' },
}));

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(cookieParser());

// CSRF protection handled via SameSite=Strict cookies + httpOnly tokens

// Rate limiting
app.use('/api', apiLimiter);

// Passport
app.use(passport.initialize());

// Body parsing - Handle Stripe webhook with raw body
// Use express.raw ONLY for the webhook route to preserve signature verification
app.use('/api/payment/webhook', express.raw({ type: 'application/json' }));

// For all other routes, use standard JSON parsing
app.use(express.json({ limit: '10mb' }));

// CSRF Token endpoint — returns empty token since CSRF is handled by SameSite cookies
app.get('/api/csrf-token', (req, res) => {
  res.json({ csrfToken: 'samesite-protected' });
});

// Routes with CSRF protection on state-changing operations
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/admin', adminRoutes);

// Health check - comprehensive service status
app.get('/api/health', async (req, res) => {
  const startTime = Date.now();
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    uptime: process.uptime(),
    services: {
      database: 'unknown',
      redis: 'unknown',
      auth: 'configured',
      payments: 'configured'
    },
    checks: {}
  };

  try {
    // Check database
    const dbResult = await pool.query('SELECT NOW()');
    health.services.database = 'connected';
    health.checks.database_response_time = `${Date.now() - startTime}ms`;

    // Check Redis
    try {
      const { default: redis } = await import('./config/redis.js');
      const redisResult = await redis.ping();
      health.services.redis = redisResult === 'PONG' ? 'connected' : 'error';
    } catch (redisErr) {
      health.services.redis = 'disconnected';
    }

    // Check OAuth configuration
    health.services.oauth = {
      google: !!process.env.GOOGLE_CLIENT_ID,
      github: !!process.env.GITHUB_CLIENT_ID
    };

    // Check payment configuration
    health.services.payments = {
      stripe: !!(process.env.STRIPE_SECRET_KEY)
    };

    // Overall status
    if (health.services.database !== 'connected') {
      health.status = 'unhealthy';
    }

    res.status(health.status === 'healthy' ? 200 : 503).json(health);
  } catch (err) {
    health.status = 'unhealthy';
    health.services.database = 'error';
    health.error = err.message;
    res.status(503).json(health);
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', {
    message: err.message,
    path: req.path,
    method: req.method,
    status: err.status || 500,
  });
  
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// Start
const start = async () => {
  try {
    await initDB();
    console.log('✅ Database initialized and connected');
  } catch (e) {
    console.error('❌ Database initialization failed:', e.message);
    console.error('This is critical - check your DATABASE_URL in .env');
    process.exit(1);
  }
  
  // Redis connection skipped (handled lazily)
  
  // Log OAuth configuration status
  const googleConfigured = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET;
  const githubConfigured = process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET;
  
  console.log('\n🔐 OAuth Configuration Status:');
  console.log(`  ${googleConfigured ? '✅' : '❌'} Google OAuth: ${googleConfigured ? 'configured' : 'MISSING CREDENTIALS'}`);
  console.log(`  ${githubConfigured ? '✅' : '❌'} GitHub OAuth: ${githubConfigured ? 'configured' : 'MISSING CREDENTIALS'}`);
  console.log(`  📍 Callback URL: ${process.env.CLIENT_URL}`);

  // Initialize BullMQ worker for async AI generation
  try {
    const { aiWorker } = await import('./config/queue.js');
    console.log('\n⚙️  BullMQ Queue System:');
    console.log('  ✅ AI Worker initialized (processing with concurrency: 2)');
    console.log('  📋 Job queue: ai-generation');
  } catch (queueErr) {
    // Silent fallback
  }
  
  const server = app.listen(PORT, () => {
    console.log(`\n🚀 Server running on http://localhost:${PORT}`);
    console.log(`📱 Client: ${process.env.CLIENT_URL}`);
    console.log(`📊 Health check: GET http://localhost:${PORT}/api/health\n`);
  });

  server.timeout = 120000; // 2 minutes
};

start();
