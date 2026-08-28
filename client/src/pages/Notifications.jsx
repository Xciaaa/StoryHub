import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api, API_BASE } from '../lib/api';
import Avatar from '../components/Avatar';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'follow', label: 'Follows' },
  { key: 'like', label: 'Likes' },
  { key: 'project_update', label: 'Projects' },
  { key: 'system', label: 'System' },
];

function timeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
}

function getNotificationIcon(type) {
  switch (type) {
    case 'follow':
      return 'person_add';
    case 'fork':
      return 'fork_right';
    case 'project_update':
      return 'mediation';
    case 'like':
      return 'favorite';
    case 'mention':
      return 'forum';
    case 'system':
      return 'summarize';
    case 'comment':
      return 'chat';
    default:
      return 'notifications';
  }
}

export default function Notifications() {
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState('all');
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = async (pageNum = 1, filter = activeFilter) => {
    setLoading(true);
    setError('');
    try {
      const data = await api.listNotifications(pageNum, 20, filter);
      if (pageNum === 1) {
        setNotifications(data);
      } else {
        setNotifications((prev) => [...prev, ...data]);
      }
      setHasMore(data.length === 20);
      setPage(pageNum);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const data = await api.getUnreadNotificationsCount();
      setUnreadCount(data.count);
    } catch {
      // ignore count errors
    }
  };

  useEffect(() => {
    loadNotifications(1, activeFilter);
    loadUnreadCount();
  }, [activeFilter]);

  const handleNotificationClick = async (notification) => {
    if (!notification.is_read) {
      try {
        await api.markNotificationRead(notification.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {
        // ignore read errors
      }
    }
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      loadNotifications(page + 1, activeFilter);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  };

  const displayNotifications = notifications.map((n) => ({
    id: n.id,
    type: n.type,
    icon: getNotificationIcon(n.type),
    title: n.actor_username || n.title,
    description: n.description,
    time: timeAgo(n.created_at),
    category: n.type.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
    unread: !n.is_read,
    avatar: n.actor_avatar ? (n.actor_avatar.startsWith('http') ? n.actor_avatar : `${API_BASE}${n.actor_avatar}`) : null,
    quote: n.quote,
    action: n.action_url ? 'View' : null,
    actionUrl: n.action_url,
  }));

  return (
    <div className="min-h-screen bg-background text-on-background font-body-md text-body-md overflow-x-hidden">
      {/* Top Navigation */}
      <header className="fixed top-0 left-0 w-full z-50 glass-strong border-b border-outline-variant/30 shadow-none">
        <div className="flex justify-between items-center px-4 md:px-12 h-20 w-full">
          <div className="flex items-center gap-8">
            <Link to="/dashboard" className="font-display-lg text-display-lg tracking-tighter text-primary">
              Lore Canvas
            </Link>
            <nav className="hidden md:flex gap-6">
              <Link to="/dashboard" className="text-on-surface-variant font-medium hover:text-primary transition-colors duration-300">
                Dashboard
              </Link>
              <Link to="/editor/new" className="text-on-surface-variant font-medium hover:text-primary transition-colors duration-300">
                Canvas
              </Link>
              <Link to="/community" className="text-on-surface-variant font-medium hover:text-primary transition-colors duration-300">
                Community
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/notifications" className="text-primary font-bold border-b-2 border-primary pb-1 active:scale-95 transition-transform">
              <span className="material-symbols-outlined relative" style={{ fontVariationSettings: "'FILL' 1" }}>
                notifications
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </span>
            </Link>
            <Link to="/settings" className="text-on-surface-variant font-medium hover:text-primary transition-colors duration-300 active:scale-95 transition-transform">
              <span className="material-symbols-outlined">settings</span>
            </Link>
            <Link to={`/profile/${user?.username}`} className="w-10 h-10 rounded-full border border-outline-variant/30 overflow-hidden bg-surface-container">
              <Avatar src={user?.avatar} alt="User profile" className="w-full h-full object-cover" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-32 pb-24 md:pb-8 px-4 md:px-12 flex justify-center w-full min-h-screen">
        <div className="w-full max-w-3xl flex flex-col gap-8">
          <header className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h1 className="font-headline-lg text-headline-lg md:text-display-lg text-on-surface tracking-tight">
                Activity Feed
              </h1>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="font-label-md text-label-md text-primary hover:text-inverse-primary transition-colors"
                >
                  Mark all as read
                </button>
              )}
            </div>
            {/* Filters */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {FILTERS.map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => setActiveFilter(filter.key)}
                  className={`px-4 py-2 rounded-full font-label-md text-label-md whitespace-nowrap transition-all ${
                    activeFilter === filter.key
                      ? 'bg-primary-container/20 border border-primary/50 text-primary shadow-[0_0_10px_rgba(79,70,229,0.2)]'
                      : 'bg-surface-container/50 border border-outline-variant/30 text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </header>

          <div className="flex flex-col gap-4">
            {error && (
              <p className="text-error text-sm text-center py-12">{error}</p>
            )}
            {!loading && displayNotifications.length === 0 && !error && (
              <p className="text-on-surface-variant text-sm text-center py-12">No notifications found.</p>
            )}
            {displayNotifications.map((notification) => (
              <div
                key={notification.id}
                role="button"
                tabIndex={0}
                onClick={() => handleNotificationClick(notification)}
                className="group relative p-6 rounded-2xl bg-glass-panel border border-outline-variant/20 hover:border-primary-container/50 transition-colors duration-300 overflow-hidden cursor-pointer"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-primary-container/0 via-primary-container/5 to-primary-container/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center shrink-0 border border-outline-variant/20 overflow-hidden">
                    {notification.avatar ? (
                      <img alt={notification.title} className="w-full h-full object-cover" src={notification.avatar} />
                    ) : (
                      <span className="material-symbols-outlined text-primary text-[20px]">{notification.icon}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-body-md text-body-md text-on-surface">
                      <span className="font-semibold text-primary">{notification.title}</span>{' '}
                      {notification.description}
                    </p>
                    {notification.quote && (
                      <div className="mt-3 p-3 rounded-lg bg-surface-container-lowest border border-outline-variant/20 border-l-2 border-l-primary/50 text-on-surface-variant font-body-md text-sm italic">
                        "{notification.quote}"
                      </div>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      <span className="font-label-sm text-label-sm text-on-surface-variant/60">
                        {notification.time} • {notification.category}
                      </span>
                      {notification.unread && (
                        <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_6px_rgba(79,70,229,0.6)]" />
                      )}
                    </div>
                  </div>
                  {notification.action && notification.actionUrl && (
                    <Link
                      to={notification.actionUrl}
                      className="px-3 py-1.5 rounded-lg bg-surface-container border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface font-label-sm text-label-sm transition-colors shrink-0"
                    >
                      {notification.action}
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center mt-4">
              <button
                onClick={handleLoadMore}
                disabled={loading}
                className="px-6 py-2 rounded-full bg-surface-container/30 border border-outline-variant/30 text-on-surface-variant font-label-md text-label-md hover:text-on-surface hover:bg-surface-container transition-all disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Load More History'}
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Navigation (Mobile) */}
      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center h-16 px-4 bg-surface-container-lowest/80 backdrop-blur-3xl border-t border-outline-variant/20 shadow-[0_-10px_40px_rgba(79,70,229,0.15)] md:hidden">
        <Link to="/editor/new" className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary transition-all duration-150 active:scale-90">
          <span className="material-symbols-outlined text-[24px]">grid_view</span>
          <span className="font-label-sm text-[10px] mt-1">Canvas</span>
        </Link>
        <Link to="/community" className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary transition-all duration-150 active:scale-90">
          <span className="material-symbols-outlined text-[24px]">dynamic_feed</span>
          <span className="font-label-sm text-[10px] mt-1">Feed</span>
        </Link>
        <Link to="/notifications" className="flex flex-col items-center justify-center text-primary drop-shadow-[0_0_8px_rgba(79,70,229,0.4)] active:scale-90 transition-all duration-150">
          <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            notifications
          </span>
          <span className="font-label-sm text-[10px] mt-1 font-semibold">Alerts</span>
        </Link>
        <Link to={`/profile/${user?.username}`} className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary transition-all duration-150 active:scale-90">
          <span className="material-symbols-outlined text-[24px]">person</span>
          <span className="font-label-sm text-[10px] mt-1">Profile</span>
        </Link>
      </nav>
    </div>
  );
}
