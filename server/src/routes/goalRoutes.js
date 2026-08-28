const express = require('express');
const router = express.Router();
const goalController = require('../controllers/goalController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.get('/goals', goalController.listGoals);
router.post('/goals/:key/complete', goalController.completeGoal);
router.post('/goals/check', goalController.checkGoals);

module.exports = router;
