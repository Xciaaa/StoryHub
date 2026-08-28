import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

export default function NotificationBell({ className = '' }) {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api.getUnreadNotificationsCount()
      .then((data) => {
        if (!cancelled) setUnread(data.count || 0);
      })
      .catch(() => {
        if (!cancelled) setUnread(0);
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <Link to="/notifications" className={`relative inline-flex items-center justify-center ${className}`}>
      <span className="material-symbols-outlined">notifications</span>
      {unread > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-error text-on-primary text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-background">
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </Link>
  );
}
