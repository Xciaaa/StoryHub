import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

export default function NotificationBell({ className = '' }) {
  const [unread, setUnread] = useState(0);

  const fetchCount = () => {
    api.getUnreadNotificationsCount()
      .then((data) => setUnread(data.count || 0))
      .catch(() => setUnread(0));
  };

  useEffect(() => {
    fetchCount();
    const onFocus = () => fetchCount();
    const onVisibility = () => { if (document.visibilityState === 'visible') fetchCount(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return (
    <Link to="/notifications" onClick={fetchCount} className={`relative inline-flex items-center justify-center ${className}`}>
      <span className="material-symbols-outlined">notifications</span>
      {unread > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-error text-on-primary text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-background">
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </Link>
  );
}
