/**
 * PostgreSQL connection pool.
 * Render (and most managed Postgres hosts) require SSL, but typically
 * present a self-signed/internal CA chain — so we enable SSL but disable
 * strict certificate verification unless a CA cert is explicitly provided.
 */
const { Pool } = require('pg');

// Force SSL for remote cloud databases regardless of NODE_ENV, 
// or check if the connection string points to localhost.
const isLocal = process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isLocal
    ? false
    : { rejectUnauthorized: false }, // Always allow cloud SSL certificates locally
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
