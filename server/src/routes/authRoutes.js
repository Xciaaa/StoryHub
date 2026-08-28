const express = require('express');
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);

router.use(requireAuth);
router.get('/me', userController.getProfile);
router.put('/me', userController.updateProfile);
router.post('/change-password', authController.changePassword);

module.exports = router;
