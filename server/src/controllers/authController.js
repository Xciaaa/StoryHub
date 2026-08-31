const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userService = require('../services/userService');
const { query } = require('../config/db');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const SALT_ROUNDS = 10;
const TOKEN_EXPIRY = '7d';

function issueToken(user) {
  return jwt.sign({ sub: user.id, username: user.username }, process.env.JWT_SECRET, {
    expiresIn: TOKEN_EXPIRY,
  });
}

const signup = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'username, email, and password are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'password must be at least 8 characters' });
  }

  const existing = await userService.findUserByEmail(email);
  if (existing) {
    return res.status(409).json({ error: 'An account with that email already exists' });
  }

  let passwordHash;
  try {
    passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  } catch (err) {
    console.error('bcrypt hash failed during signup:', err);
    return res.status(500).json({ error: 'Failed to create password hash' });
  }

  const user = await userService.createUser({ username, email, passwordHash });
  const token = issueToken(user);

  return res.status(201).json({
    token,
    user: { id: user.id, username: user.username, email: user.email },
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  const user = await userService.findUserByEmail(email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  let valid = false;
  try {
    valid = await bcrypt.compare(password, user.password_hash);
  } catch (err) {
    console.error('bcrypt compare failed during login:', err);
    return res.status(500).json({ error: 'Authentication service error. Please try again.' });
  }

  if (!valid) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = issueToken(user);

  return res.json({
    token,
    user: { id: user.id, username: user.username, email: user.email },
  });
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'currentPassword and newPassword are required' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'password must be at least 8 characters' });
  }

  const user = await userService.getUserById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (!user.password_hash) {
    return res.status(400).json({ error: 'Password login is not enabled for this account. Use your OAuth provider to sign in.' });
  }

  try {
    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
  } catch (err) {
    console.error('bcrypt compare failed:', err);
    return res.status(500).json({ error: 'Password verification failed' });
  }

  let newHash;
  try {
    newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  } catch (err) {
    console.error('bcrypt hash failed:', err);
    return res.status(500).json({ error: 'Failed to hash new password' });
  }

  try {
    await query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [newHash, req.user.id]
    );
  } catch (err) {
    console.error('Database update failed:', err);
    return res.status(500).json({ error: 'Failed to update password' });
  }

  return res.json({ success: true });
});

const setPassword = asyncHandler(async (req, res) => {
  const { newPassword } = req.body;

  if (!newPassword) {
    return res.status(400).json({ error: 'newPassword is required' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'password must be at least 8 characters' });
  }

  const user = await userService.getUserById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  let newHash;
  try {
    newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  } catch (err) {
    console.error('bcrypt hash failed:', err);
    return res.status(500).json({ error: 'Failed to hash password' });
  }

  try {
    await query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [newHash, req.user.id]
    );
  } catch (err) {
    console.error('Database update failed:', err);
    return res.status(500).json({ error: 'Failed to set password' });
  }

  return res.json({ success: true });
});

module.exports = { signup, login, changePassword, setPassword };
