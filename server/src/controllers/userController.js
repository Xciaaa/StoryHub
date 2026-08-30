const userService = require('../services/userService');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const searchUsers = asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q || !q.trim()) {
    return res.status(400).json({ error: 'Search query is required' });
  }
  const users = await userService.searchUsers(q.trim());
  return res.json(users);
});

const followUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const followerId = req.user.id;

  if (id === followerId) {
    return res.status(400).json({ error: 'You cannot follow yourself' });
  }

  const followService = require('../services/followService');
  await followService.followUser(followerId, id);
  return res.status(201).json({ success: true });
});

const unfollowUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const followerId = req.user.id;

  const followService = require('../services/followService');
  await followService.unfollowUser(followerId, id);
  return res.json({ success: true });
});

const getFollowers = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const followService = require('../services/followService');
  const followers = await followService.getFollowers(id);
  return res.json(followers);
});

const getFollowing = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const followService = require('../services/followService');
  const following = await followService.getFollowing(id);
  return res.json(following);
});

const getFollowStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const followerId = req.user.id;

  const followService = require('../services/followService');
  const isFollowing = await followService.isFollowing(followerId, id);
  return res.json({ isFollowing });
});

const getProfile = asyncHandler(async (req, res) => {
  const user = await userService.getUserById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  return res.json({
    id: user.id,
    username: user.username,
    email: user.email,
    avatar: user.avatar,
    bio: user.bio,
    title: user.title,
    email_notifications: user.email_notifications,
    push_notifications: user.push_notifications,
    created_at: user.created_at,
  });
});

const updateProfile = asyncHandler(async (req, res) => {
  const { username, email, avatar, bio, title, emailNotifications, pushNotifications } = req.body;
  const user = await userService.updateUser(req.user.id, {
    username,
    email,
    avatar,
    bio,
    title,
    emailNotifications,
    pushNotifications,
  });
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  return res.json({
    id: user.id,
    username: user.username,
    email: user.email,
    avatar: user.avatar,
    bio: user.bio,
    title: user.title,
    email_notifications: user.email_notifications,
    push_notifications: user.push_notifications,
    created_at: user.created_at,
  });
});

module.exports = {
  searchUsers,
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  getFollowStatus,
  getProfile,
  updateProfile,
};
