const express = require('express');
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);

router.get('/me', requireAuth, userController.getProfile);
router.put('/me', requireAuth, userController.updateProfile);
router.post('/change-password', requireAuth, authController.changePassword);

module.exports = router;