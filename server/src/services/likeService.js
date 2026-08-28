const { query } = require('../config/db');

async function toggleLike({ userId, projectId }) {
  const existing = await query(
    'SELECT 1 FROM likes WHERE user_id = $1 AND project_id = $2',
    [userId, projectId]
  );

  if (existing.rowCount > 0) {
    await query('DELETE FROM likes WHERE user_id = $1 AND project_id = $2', [userId, projectId]);
    return { liked: false };
  }

  await query(
    'INSERT INTO likes (user_id, project_id) VALUES ($1, $2)',
    [userId, projectId]
  );

  const actor = await query('SELECT username, avatar FROM users WHERE id = $1', [userId]).then(r => r.rows[0]);
  const project = await query('SELECT title, user_id FROM projects WHERE id = $1', [projectId]).then(r => r.rows[0]);

  if (project && actor && project.user_id !== userId) {
    const notificationService = require('../services/notificationService');
    await notificationService.createNotification({
      userId: project.user_id,
      type: 'like',
      title: `${actor.username} liked your project`,
      description: `"${project.title}"`,
      actorId: userId,
      actorUsername: actor.username,
      actorAvatar: actor.avatar,
      projectId,
      projectTitle: project.title,
      actionUrl: `/project/${projectId}`,
    });
  }

  return { liked: true };
}

async function getLikeCount(projectId) {
  const result = await query('SELECT COUNT(*) AS count FROM likes WHERE project_id = $1', [projectId]);
  return parseInt(result.rows[0].count, 10);
}

async function hasUserLikedProject(userId, projectId) {
  const result = await query('SELECT 1 FROM likes WHERE user_id = $1 AND project_id = $2', [userId, projectId]);
  return result.rowCount > 0;
}

module.exports = {
  toggleLike,
  getLikeCount,
  hasUserLikedProject,
};
