const express = require('express');
const passport = require('passport');
const { issueToken } = require('../controllers/oauthController');

const router = express.Router();

function getFrontendUrl() {
  const env = process.env.FRONTEND_URL || 'http://localhost:5173';
  const first = env.split(',')[0].trim();
  if (first.includes('vercel.app') || first.includes('localhost')) {
    return first;
  }
  return first;
}

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback', passport.authenticate('google', { session: false }), (req, res) => {
  const token = issueToken(req.user);
  const frontendUrl = getFrontendUrl();
  res.redirect(`${frontendUrl}/oauth/callback?token=${token}`);
});

router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));

router.get('/github/callback', passport.authenticate('github', { session: false }), (req, res) => {
  const token = issueToken(req.user);
  const frontendUrl = getFrontendUrl();
  res.redirect(`${frontendUrl}/oauth/callback?token=${token}`);
});

module.exports = router;
