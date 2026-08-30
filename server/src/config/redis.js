/**
 * Redis client, used for:
 *  - caching public canvas payloads (GET /api/community/projects/:id)
 *  - session state (if session-based auth is used instead of/alongside JWT)
 */
const { createClient } = require('redis');

const getRedisOptions = () => {
  const url = process.env.REDIS_URL;
  const options = { url };

  if (url && url.startsWith('rediss://')) {
    try {
      const parsedUrl = new URL(url);
      options.socket = {
        tls: true,
        servername: parsedUrl.hostname,
        rejectUnauthorized: false,
      };
    } catch (e) {
      console.error('Failed to parse REDIS_URL for TLS SNI configuration:', e.message);
    }
  }

  return options;
};

const redisClient = createClient(getRedisOptions());

redisClient.on('error', (err) => {
  console.error('Redis client error', err);
});

redisClient.on('connect', () => {
  console.log('Redis client connecting...');
});

redisClient.on('ready', () => {
  console.log('Redis client ready');
});

redisClient.on('reconnecting', () => {
  console.warn('Redis client reconnecting...');
});

let connected = false;
let connectionAttempts = 0;
const MAX_CONNECTION_ATTEMPTS = 5;

async function connectRedis() {
  if (!process.env.REDIS_URL) {
    console.warn('REDIS_URL not set — skipping Redis connection');
    return false;
  }
  if (connected) return true;

  try {
    await redisClient.connect();
    connected = true;
    connectionAttempts = 0;
    console.log('Redis connected successfully');
    return true;
  } catch (err) {
    connectionAttempts++;
    console.error(`Redis connection failed (attempt ${connectionAttempts}/${MAX_CONNECTION_ATTEMPTS}):`, err.message);
    if (connectionAttempts >= MAX_CONNECTION_ATTEMPTS) {
      console.error('Max Redis connection attempts reached. Running without cache.');
    }
    return false;
  }
}

async function ensureConnected() {
  if (!connected && connectionAttempts < MAX_CONNECTION_ATTEMPTS) {
    return connectRedis();
  }
  return connected;
}

function isConnected() {
  return connected;
}

async function getCached(key) {
  if (!(await ensureConnected())) return null;
  try {
    const cached = await redisClient.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (err) {
    console.error('Redis get error:', err.message);
    return null;
  }
}

async function setCached(key, value, ttlSeconds) {
  if (!(await ensureConnected())) return;
  try {
    await redisClient.set(key, JSON.stringify(value), { EX: ttlSeconds });
  } catch (err) {
    console.error('Redis set error:', err.message);
  }
}

async function deleteCached(key) {
  if (!(await ensureConnected())) return;
  try {
    await redisClient.del(key);
  } catch (err) {
    console.error('Redis delete error:', err.message);
  }
}

async function deleteCachedMany(keys) {
  if (!(await ensureConnected())) return;
  if (!Array.isArray(keys) || keys.length === 0) return;
  try {
    const pipeline = redisClient.multi();
    keys.forEach((key) => pipeline.del(key));
    await pipeline.exec();
  } catch (err) {
    console.error('Redis deleteMany error:', err.message);
  }
}

async function getCachedMany(keys) {
  if (!(await ensureConnected())) return [];
  if (!Array.isArray(keys) || keys.length === 0) return [];
  try {
    const values = await redisClient.mGet(keys);
    return values.map((val) => (val ? JSON.parse(val) : null));
  } catch (err) {
    console.error('Redis getMany error:', err.message);
    return [];
  }
}

async function setCachedMany(keyValuePairs, ttlSeconds) {
  if (!(await ensureConnected())) return;
  if (!Array.isArray(keyValuePairs) || keyValuePairs.length === 0) return;
  try {
    const pipeline = redisClient.multi();
    keyValuePairs.forEach(({ key, value }) => {
      pipeline.set(key, JSON.stringify(value), { EX: ttlSeconds });
    });
    await pipeline.exec();
  } catch (err) {
    console.error('Redis setMany error:', err.message);
  }
}

module.exports = {
  redisClient,
  connectRedis,
  isConnected,
  ensureConnected,
  getCached,
  setCached,
  deleteCached,
  deleteCachedMany,
  getCachedMany,
  setCachedMany,
};