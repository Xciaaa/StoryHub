require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const { connectRedis } = require('./config/redis');
const { pool } = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const projectRoutes = require('./routes/projectRoutes');
const communityRoutes = require('./routes/communityRoutes');

const app = express();

// --- Security & parsing middleware -----------------------------------
app.use(helmet());
app.use(express.json({ limit: '2mb' })); // canvas_data payloads can be sizeable

// CORS: allow the deployed Vercel frontend + local dev.
// Supports a comma-separated ALLOWED_ORIGINS env var so preview deploys
// (e.g. Vercel branch URLs) can be added without a code change.
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser requests (no Origin header) and any whitelisted origin.
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);

// Basic rate limiting — tighter on auth routes, applied globally as a floor.
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

// --- Routes -------------------------------------------------------------
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/community', communityRoutes);

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Centralized error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 4000;

async function start() {
  try {
    // Verify Postgres connectivity at boot.
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('PostgreSQL connection verified');

    // Redis is a cache — if it's down, the app should still serve requests.
    try {
      await connectRedis();
      console.log('Redis connection verified');
    } catch (redisErr) {
      console.warn('Redis unavailable — running without cache:', redisErr.message);
    }

    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server', err);
    process.exit(1);
  }
}

start();

module.exports = app;
