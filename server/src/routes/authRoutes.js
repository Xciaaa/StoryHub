const express = require('express');

const router = express.Router();

// Placeholder — implement alongside a users/auth service:
//   POST /api/auth/signup  { username, email, password }
//   POST /api/auth/login   { email, password } -> { token }
// bcrypt for password_hash, jsonwebtoken for issuing tokens
// (jwt.sign({ sub: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '7d' })
// to match the shape requireAuth() in middleware/auth.js expects.

router.post('/signup', (req, res) => {
  res.status(501).json({ error: 'Not implemented yet' });
});

router.post('/login', (req, res) => {
  res.status(501).json({ error: 'Not implemented yet' });
});

module.exports = router;
