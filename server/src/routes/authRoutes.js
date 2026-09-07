const express = require('express');
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');
const { requireAuth } = require('../middleware/auth');
const { authLimiter, passwordChangeLimiter } = require('../middleware/rateLimiters');

const router = express.Router();

router.post('/signup', authLimiter, authController.signup);
router.post('/login', authLimiter, authController.login);

router.get('/me', requireAuth, userController.getProfile);
router.put('/me', requireAuth, userController.updateProfile);
router.post('/change-password', requireAuth, passwordChangeLimiter, authController.changePassword);
router.post('/set-password', requireAuth, passwordChangeLimiter, authController.setPassword);

module.exports = router;