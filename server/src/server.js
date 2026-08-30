require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const RedisStore = require('connect-redis').default || require('connect-redis');
const path = require('path');

const { connectRedis, redisClient } = require('./config/redis');
const { pool } = require('./config/db');
const { runMigrations } = require('./config/runMigrations');
const errorHandler = require('./middleware/errorHandler');
const { passport } = require('./controllers/oauthController');
const { requireAuth } = require('./middleware/auth');

const authRoutes = require('./routes/authRoutes');
const projectRoutes = require('./routes/projectRoutes');
const communityRoutes = require('./routes/communityRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const likeRoutes = require('./routes/likeRoutes');
const goalRoutes = require('./routes/goalRoutes');
const oauthRoutes = require('./routes/oauthRoutes');
const upload = require('./middleware/upload');
const uploadController = require('./controllers/uploadController');

const app = express();

app.set('trust proxy', 1);

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(express.json({ limit: '2mb' }));

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) return callback(null, true);
    if (origin.endsWith('.vercel.app')) return callback(null, true);
    console.log('[CORS] blocked origin:', origin);
    return callback(null, true);
  },
  credentials: true,
};

app.use(cors(corsOptions));

app.use(
  session({
    store: new RedisStore({ client: redisClient }),
    secret: process.env.JWT_SECRET || 'storyhub-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production' },
  })
);

app.use(passport.initialize());
app.use(passport.session());

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/auth', oauthRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/projects', likeRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/goals', goalRoutes);

app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
}, express.static(path.join(__dirname, '../public/uploads')));
app.post('/api/upload', requireAuth, upload.single('image'), uploadController.uploadImage);


app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use(errorHandler);

const PORT = process.env.PORT || 4000;

async function start() {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('PostgreSQL connection verified');

    await runMigrations();

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

if (process.env.VERCEL !== '1') {
  start();
}

module.exports = app;
