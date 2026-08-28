const express = require('express');
const router = express.Router();
const likeController = require('../controllers/likeController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.post('/:id/like', likeController.toggleLike);
router.get('/:id/like', likeController.getLikeStatus);
router.get('/:id/likes/count', likeController.getLikeCount);

module.exports = router;
