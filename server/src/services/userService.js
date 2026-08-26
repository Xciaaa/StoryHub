const { query } = require('../config/db');

async function findUserByEmail(email) {
  const result = await query(
    `SELECT id, username, email, password_hash FROM users WHERE email = $1`,
    [email]
  );
  return result.rows[0] || null;
}

async function findUserByUsername(username) {
  const result = await query(
    `SELECT id, username, email FROM users WHERE username = $1`,
    [username]
  );
  return result.rows[0] || null;
}

async function createUser({ username, email, passwordHash }) {
  const result = await query(
    `INSERT INTO users (username, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, username, email, created_at`,
    [username, email, passwordHash]
  );
  return result.rows[0];
}

module.exports = { findUserByEmail, findUserByUsername, createUser };
