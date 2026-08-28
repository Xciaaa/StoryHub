const express = require('express');
const projectController = require('../controllers/projectController');
const userController = require('../controllers/userController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/projects', projectController.listPublicProjects);
router.get('/projects/:id', projectController.getPublicProject);

router.get('/users/search', userController.searchUsers);
router.get('/users/:id/followers', userController.getFollowers);
router.get('/users/:id/following', userController.getFollowing);

router.use(requireAuth);
router.get('/users/:id/follow-status', userController.getFollowStatus);
router.post('/users/:id/follow', userController.followUser);
router.post('/users/:id/unfollow', userController.unfollowUser);

module.exports = router;
