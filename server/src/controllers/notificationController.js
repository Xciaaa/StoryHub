const notificationService = require('../services/notificationService');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const listNotifications = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '20', 10)));
  const filter = req.query.filter || 'all';

  const notifications = await notificationService.getNotificationsForUser(req.user.id, {
    page,
    limit,
    filter,
  });

  return res.json(notifications);
});

const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await notificationService.getUnreadCount(req.user.id);
  return res.json({ count });
});

const markNotificationRead = asyncHandler(async (req, res) => {
  const notification = await notificationService.markAsRead(req.user.id, req.params.id);
  if (!notification) {
    return res.status(404).json({ error: 'Notification not found' });
  }
  return res.json(notification);
});

const markAllNotificationsRead = asyncHandler(async (req, res) => {
  const notifications = await notificationService.markAllAsRead(req.user.id);
  return res.json({ updated: notifications.length });
});

const deleteNotification = asyncHandler(async (req, res) => {
  const notification = await notificationService.deleteNotification(req.user.id, req.params.id);
  if (!notification) {
    return res.status(404).json({ error: 'Notification not found' });
  }
  return res.status(204).send();
});

module.exports = {
  listNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
};
