require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const morgan = require('morgan');
const errorHandler = require('./middleware/errorHandler');
const connectDB = require('./config/db');
const compression = require('compression');

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const MONGO_URI = process.env.MONGO_URI;
const clientDist = path.join(__dirname, '..', 'client', 'dist');

if (!MONGO_URI) {
  console.error('CRITICAL: Missing MONGO_URI in server/.env');
  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  console.error('CRITICAL: Missing JWT_SECRET in server/.env');
  process.exit(1);
}

// 1. Security HTTP Headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// 2. HTTP Request Logger
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// 3. Response Compression (Gzip/Brotli)
app.use(compression());

// 4. CORS Configuration for Standalone API Server across separate systems
const allowedOrigins = (process.env.FRONTEND_URL || process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim().replace(/\/$/, ''));

const corsOptions = {
  origin: (origin, cb) => {
    // Allow server-to-server / Postman / curl requests (no Origin header) or configured origins
    if (!origin) return cb(null, true);
    const cleanOrigin = origin.replace(/\/$/, '');
    if (allowedOrigins.includes('*') || allowedOrigins.includes(cleanOrigin)) {
      return cb(null, true);
    }
    cb(new Error(`CORS policy violation: origin ${origin} is not permitted.`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Total-Pages'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Handle browser CORS preflights explicitly

// 4. Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: Number(process.env.RATE_LIMIT_MAX) || 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, message: 'Too many requests from this IP, please try again after 15 minutes.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Strict limit on login attempts
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, message: 'Too many login attempts from this IP. Account temporarily locked for 15 minutes.' },
});

app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);

// 5. Body Parsing & Parameter Pollution Protection
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(hpp());

// 6. Health & System Status Endpoints
app.get('/', (_req, res) => {
  res.json({
    ok: true,
    service: 'Kuppai ERP Backend API Server',
    status: 'Running',
    mode: 'Standalone API Server',
    endpoints: '/api',
    healthCheck: '/health',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'kuppai-standalone-api-server',
    timestamp: new Date().toISOString(),
    dbStatus: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
  });
});

app.get('/api', (_req, res) => {
  res.json({ ok: true, message: 'Kuppai ERP Production API v1.0 running' });
});

// 7. API Feature Routes
app.use('/api/auth',       require('./features/auth/auth.routes'));
app.use('/api/units',      require('./features/settings/units.routes'));
app.use('/api/users',      require('./features/users/users.routes'));
app.use('/api/suppliers',  require('./features/suppliers/suppliers.routes'));
app.use('/api/labours',    require('./features/labours/labours.routes'));
app.use('/api/clients',    require('./features/clients/clients.routes'));
app.use('/api/purchases',  require('./features/purchases/purchases.routes'));
app.use('/api/cleaning',   require('./features/operations/cleaning.routes'));
app.use('/api/processing', require('./features/operations/processing.routes'));
app.use('/api/inventory',  require('./features/inventory/inventory.routes'));
app.use('/api/sales',      require('./features/sales/sales.routes'));
app.use('/api/invoices',   require('./features/invoices/invoices.routes'));
app.use('/api/settings',     require('./features/settings/settings.routes'));
app.use('/api/transactions', require('./features/transactions/transactions.routes'));

// 8. 404 Handler for Unmatched API Routes
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ ok: false, message: `API Endpoint Not Found: ${req.method} ${req.originalUrl}` });
  }
  next();
});

// Optional Static Serving fallback if SERVE_CLIENT_STATIC=true
if (process.env.SERVE_CLIENT_STATIC === 'true' && fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
} else {
  // If not serving static files, 404 all non-api routes cleanly
  app.use('*', (req, res) => {
    res.status(404).json({ ok: false, message: `Route not found: ${req.method} ${req.originalUrl}. Standalone API server mode.` });
  });
}

// 9. Centralized Global Error Handler
app.use(errorHandler);

// 10. Database Connection & Graceful Server Startup
connectDB(MONGO_URI).then(() => {
  const server = app.listen(PORT, () => {
    console.log(`[SERVER] Standalone API Server running on port ${PORT}`);
  });

  // Graceful shutdown handlers
  const shutdown = (signal) => {
    console.log(`[SYSTEM] Received ${signal}. Shutting down gracefully...`);
    server.close(() => {
      mongoose.connection.close(false).then(() => {
        console.log('[DATABASE] MongoDB connection closed.');
        process.exit(0);
      });
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
});
