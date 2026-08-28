const likeService = require('../services/likeService');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const toggleLike = asyncHandler(async (req, res) => {
  const { liked } = await likeService.toggleLike({
    userId: req.user.id,
    projectId: req.params.id,
  });

  const count = await likeService.getLikeCount(req.params.id);

  return res.json({ liked, count });
});

const getLikeCount = asyncHandler(async (req, res) => {
  const count = await likeService.getLikeCount(req.params.id);
  return res.json({ count });
});

const getLikeStatus = asyncHandler(async (req, res) => {
  const hasLiked = await likeService.hasUserLikedProject(req.user.id, req.params.id);
  const count = await likeService.getLikeCount(req.params.id);
  return res.json({ liked: hasLiked, count });
});

module.exports = {
  toggleLike,
  getLikeCount,
  getLikeStatus,
};
