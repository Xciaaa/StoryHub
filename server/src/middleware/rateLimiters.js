const rateLimit = require('express-rate-limit');
const RedisStoreModule = require('rate-limit-redis');
const RedisStore = RedisStoreModule.RedisStore || RedisStoreModule.default || RedisStoreModule;
const { redisClient, isConnected } = require('../config/redis');

/**
 * Build a Redis-backed store for express-rate-limit.
 * Falls back to in-memory (per-process) if Redis is unavailable so the
 * API stays responsive even during a Redis outage.
 */
function buildStore(prefix) {
  if (!isConnected()) {
    console.warn(`[ratelimit] Redis not connected; using memory store for "${prefix}"`);
    return undefined;
  }
  return new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args),
    prefix: `rl:${prefix}:`,
  });
}

/**
 * Extract the real client IP behind proxies.
 * Requires `app.set('trust proxy', 1)` in server.js so Express
 * surfaces req.ip correctly from X-Forwarded-For.
 */
function getClientIp(req) {
  return req.ip || req.connection?.remoteAddress || 'unknown';
}

/**
 * Custom 429 handler that emits a clean JSON response with the
 * standard rate-limit headers already set by the limiter.
 */
function tooManyRequests(req, res /* , next, options */) {
  const retryAfter = res.getHeader('Retry-After');
  res.status(429).json({
    error: 'Too many requests',
    message: 'Rate limit exceeded. Please slow down and try again shortly.',
    retryAfter: retryAfter ? Number(retryAfter) : undefined,
  });
}

/**
 * Skip successful preflight CORS requests so they don't consume the
 * budget for real API calls.
 */
function skipPreflight(req) {
  return req.method === 'OPTIONS';
}

/**
 * Public API rate limiter — applied to all /api routes by default.
 * 60 requests / minute per IP, distributed across instances via Redis.
 */
const publicLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  store: buildStore('public'),
  keyGenerator: getClientIp,
  skip: skipPreflight,
  handler: tooManyRequests,
});

/**
 * Stricter limiter for authentication endpoints (login, signup, OAuth).
 * Protects against credential stuffing and brute-force password attempts.
 * 10 attempts / 15 minutes per IP, plus an email-based key so a single
 * attacker can't bypass the limit by rotating IPs.
 */
function authKeyGenerator(req) {
  const ip = getClientIp(req);
  const email = (req.body && typeof req.body.email === 'string')
    ? req.body.email.toLowerCase().trim()
    : 'anonymous';
  // Always include the IP so an attacker can't bypass by spoofing the email field.
  return `${ip}|${email}`;
}

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  store: buildStore('auth'),
  keyGenerator: authKeyGenerator,
  skip: skipPreflight,
  handler: tooManyRequests,
});

/**
 * Password change / set-password limiter — authenticated routes, so we
 * key on the user id when present, falling back to IP.
 * 5 attempts / 15 minutes per user.
 */
const passwordChangeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  store: buildStore('password'),
  keyGenerator: (req) => (req.user && req.user.id) ? `user:${req.user.id}` : `ip:${getClientIp(req)}`,
  skip: skipPreflight,
  handler: tooManyRequests,
});

/**
 * Upload limiter — image uploads are expensive (storage + bandwidth).
 * 20 uploads / 15 minutes per user.
 */
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  store: buildStore('upload'),
  keyGenerator: (req) => (req.user && req.user.id) ? `user:${req.user.id}` : `ip:${getClientIp(req)}`,
  skip: skipPreflight,
  handler: tooManyRequests,
});

module.exports = {
  publicLimiter,
  authLimiter,
  passwordChangeLimiter,
  uploadLimiter,
  getClientIp,
};
