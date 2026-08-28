const { query } = require('../config/db');
const notificationService = require('../services/notificationService');

async function searchUsers(q) {
  const result = await query(
    `SELECT id, username, email, avatar, bio, created_at FROM users WHERE username ILIKE $1 ORDER BY username ASC LIMIT 20`,
    [`%${q}%`]
  );
  return result.rows;
}

async function followUser(followerId, followingId) {
  await query(
    `INSERT INTO follows (follower_id, following_id)
     VALUES ($1, $2)
     ON CONFLICT (follower_id, following_id) DO NOTHING`,
    [followerId, followingId]
  );

  try {
    const follower = await query('SELECT username, avatar FROM users WHERE id = $1', [followerId]).then(r => r.rows[0]);
    if (follower) {
      await notificationService.createNotification({
        userId: followingId,
        type: 'follow',
        title: `${follower.username} started following you`,
        description: '',
        actorId: followerId,
        actorUsername: follower.username,
        actorAvatar: follower.avatar,
        actionUrl: `/profile/${follower.username}`,
      });
    }
  } catch (notificationError) {
    console.error('Failed to create follow notification:', notificationError);
  }
}

async function unfollowUser(followerId, followingId) {
  await query(
    `DELETE FROM follows WHERE follower_id = $1 AND following_id = $2`,
    [followerId, followingId]
  );
}

async function getFollowers(userId) {
  const result = await query(
    `SELECT u.id, u.username, f.created_at
     FROM follows f
     JOIN users u ON f.follower_id = u.id
     WHERE f.following_id = $1
     ORDER BY f.created_at DESC`,
    [userId]
  );
  return result.rows;
}

async function getFollowing(userId) {
  const result = await query(
    `SELECT u.id, u.username, f.created_at
     FROM follows f
     JOIN users u ON f.following_id = u.id
     WHERE f.follower_id = $1
     ORDER BY f.created_at DESC`,
    [userId]
  );
  return result.rows;
}

async function isFollowing(followerId, followingId) {
  const result = await query(
    `SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2`,
    [followerId, followingId]
  );
  return result.rowCount > 0;
}

async function countFollows(userId) {
  const result = await query('SELECT COUNT(*) AS count FROM follows WHERE follower_id = $1', [userId]);
  return parseInt(result.rows[0].count, 10);
}

module.exports = {
  searchUsers,
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  isFollowing,
  countFollows,
};
