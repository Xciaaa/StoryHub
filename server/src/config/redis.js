/**
 * Redis client, used for:
 *  - caching public canvas payloads (GET /api/community/projects/:id)
 *  - session state (if session-based auth is used instead of/alongside JWT)
 */
const { createClient } = require('redis');

// Build client options dynamically to handle TLS SNI requirements for Layerbase / Cloud Redis
const getRedisOptions = () => {
  const url = process.env.REDIS_URL;
  const options = { url };

  // Layerbase and modern cloud Redis hosts require TLS SNI (socket.servername)
  if (url && url.startsWith('rediss://')) {
    try {
      const parsedUrl = new URL(url);
      options.socket = {
        tls: true,
        servername: parsedUrl.hostname, // Sets SNI to host (e.g. redis-1-marsh-chalk.cloud.layerbase.dev)
        rejectUnauthorized: false,     // Prevents strict SSL certificate errors in dev/cloud
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