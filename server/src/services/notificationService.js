const { query } = require('../config/db');

async function getNotificationsForUser(userId, { page = 1, limit = 20, filter = 'all' } = {}) {
  const offset = (page - 1) * limit;
  const where = ['n.user_id = $1'];
  const params = [userId];
  let idx = 2;

  if (filter === 'unread') {
    where.push('n.is_read = FALSE');
  } else if (filter === 'follow') {
    where.push('n.type = $' + idx);
    params.push('follow');
    idx++;
  } else if (filter === 'like') {
    where.push('n.type = $' + idx);
    params.push('like');
    idx++;
  } else if (filter === 'project') {
    where.push('n.type IN ($' + idx + ', $' + (idx + 1) + ', $' + (idx + 2) + ')');
    params.push('project_update', 'project_fork', 'fork');
    idx += 3;
  } else if (filter === 'system') {
    where.push('n.type = $' + idx);
    params.push('system');
    idx++;
  }

  const sql = `
    SELECT n.*, u.username AS actor_username, u.avatar AS actor_avatar
    FROM notifications n
    LEFT JOIN users u ON u.id = n.actor_id
    WHERE ${where.join(' AND ')}
    ORDER BY n.created_at DESC
    LIMIT $${idx} OFFSET $${idx + 1}
  `;
  params.push(limit, offset);

  const result = await query(sql, params);
  return result.rows;
}

async function getUnreadCount(userId) {
  const result = await query(
    'SELECT COUNT(*) AS count FROM notifications WHERE user_id = $1 AND is_read = FALSE',
    [userId]
  );
  return parseInt(result.rows[0].count, 10);
}

async function createNotification({
  userId,
  type,
  title,
  description,
  actorId = null,
  actorUsername = null,
  actorAvatar = null,
  projectId = null,
  projectTitle = null,
  quote = null,
  actionUrl = null,
}) {
  const userResult = await query(
    'SELECT email_notifications, push_notifications FROM users WHERE id = $1',
    [userId]
  );
  const user = userResult.rows[0];
  if (!user) return null;

  const inApp = true;
  const email = user.email_notifications && ['follow', 'fork', 'project_update'].includes(type);
  const push = user.push_notifications && ['follow', 'fork', 'project_update'].includes(type);

  if (!inApp && !email && !push) return null;

  const result = await query(
    `INSERT INTO notifications
      (user_id, type, title, description, actor_id, actor_username, actor_avatar, project_id, project_title, quote, action_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      userId,
      type,
      title,
      description,
      actorId,
      actorUsername,
      actorAvatar,
      projectId,
      projectTitle,
      quote,
      actionUrl,
    ]
  );
  const notification = result.rows[0];

  if (email) {
    await sendEmailNotification(userId, notification);
  }

  if (push) {
    await sendPushNotification(userId, notification);
  }

  return notification;
}

async function markAsRead(userId, notificationId) {
  const result = await query(
    'UPDATE notifications SET is_read = TRUE, updated_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING *',
    [notificationId, userId]
  );
  return result.rows[0];
}

async function deleteNotification(userId, notificationId) {
  const result = await query(
    'DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING id',
    [notificationId, userId]
  );
  return result.rows[0] || null;
}

async function markAllAsRead(userId) {
  const result = await query(
    'UPDATE notifications SET is_read = TRUE, updated_at = NOW() WHERE user_id = $1 AND is_read = FALSE RETURNING *',
    [userId]
  );
  return result.rows;
}

async function sendEmailNotification(userId, notification) {
  const userResult = await query('SELECT email, username FROM users WHERE id = $1', [userId]);
  const user = userResult.rows[0];
  if (!user) return;

  console.log(`[Email Notification] To: ${user.email} | Subject: ${notification.title} | Body: ${notification.description}`);
}

async function sendPushNotification(userId, notification) {
  const userResult = await query('SELECT id, username FROM users WHERE id = $1', [userId]);
  const user = userResult.rows[0];
  if (!user) return;

  console.log(`[Push Notification] To: ${user.username} | Title: ${notification.title} | Body: ${notification.description}`);
}

module.exports = {
  getNotificationsForUser,
  getUnreadCount,
  createNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
