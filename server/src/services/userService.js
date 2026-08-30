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

async function searchUsers(q) {
  const result = await query(
    `SELECT id, username, email, avatar, bio, title, created_at FROM users WHERE username ILIKE $1 ORDER BY username ASC LIMIT 20`,
    [`%${q}%`]
  );
  return result.rows;
}

async function getUserById(id) {
  const result = await query(
    `SELECT id, username, email, avatar, bio, title, password_hash, created_at FROM users WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

async function updateUser(id, { username, email, avatar, bio, title, emailNotifications, pushNotifications }) {
  const result = await query(
    `UPDATE users
     SET username = COALESCE($2, username),
         email = COALESCE($3, email),
         avatar = COALESCE($4, avatar),
         bio = COALESCE($5, bio),
         title = COALESCE($6, title),
         email_notifications = COALESCE($7, email_notifications),
         push_notifications = COALESCE($8, push_notifications)
     WHERE id = $1
     RETURNING id, username, email, avatar, bio, title, password_hash, email_notifications, push_notifications, created_at`,
    [id, username ?? null, email ?? null, avatar ?? null, bio ?? null, title ?? null, emailNotifications ?? null, pushNotifications ?? null]
  );
  return result.rows[0] || null;
}

module.exports = { findUserByEmail, findUserByUsername, createUser, searchUsers, getUserById, updateUser };
