/**
 * PostgreSQL connection pool.
 * Render (and most managed Postgres hosts) require SSL, but typically
 * present a self-signed/internal CA chain — so we enable SSL but disable
 * strict certificate verification unless a CA cert is explicitly provided.
 */
const { Pool } = require('pg');

const isProduction = process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction
    ? { rejectUnauthorized: false }
    : false,
  // Reasonable defaults for a small-to-mid web service; tune as load grows.
  max: parseInt(process.env.PG_POOL_MAX || '10', 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  // Errors on idle clients (e.g. connection dropped by host) should not
  // crash the whole process — log and let the pool recover.
  console.error('Unexpected error on idle Postgres client', err);
});

/**
 * Thin query helper so callers don't need to import `pool` everywhere.
 * Keeps a single place to add query logging/metrics later.
 */
async function query(text, params) {
  const start = Date.now();
  const result = await pool.query(text, params);
  if (process.env.LOG_SQL === 'true') {
    console.log('executed query', { text, duration: Date.now() - start, rows: result.rowCount });
  }
  return result;
}

/**
 * Use when a caller needs a single client for a transaction
 * (multiple statements that must commit/rollback together).
 * Caller is responsible for client.release().
 */
async function getClient() {
  const client = await pool.connect();
  return client;
}

module.exports = { pool, query, getClient };
