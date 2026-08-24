/**
 * Redis client, used for:
 *  - caching public canvas payloads (GET /api/community/projects/:id)
 *  - session state (if session-based auth is used instead of/alongside JWT)
 */
const { createClient } = require('redis');

const redisClient = createClient({
  url: process.env.REDIS_URL, // e.g. redis://default:<password>@<host>:<port>
});

redisClient.on('error', (err) => {
  console.error('Redis client error', err);
});

let connected = false;

async function connectRedis() {
  if (!process.env.REDIS_URL) {
    console.warn('REDIS_URL not set — skipping Redis connection');
    return false;
  }
  if (!connected) {
    await redisClient.connect();
    connected = true;
  }
  return true;
}

function isConnected() {
  return connected;
}

module.exports = { redisClient, connectRedis, isConnected };
