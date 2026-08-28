import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import Logo from './Logo';
import { useAuth } from '../context/AuthContext';

export default function LoadingPage() {
  const { user, loading: authLoading } = useAuth();
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  if (authLoading || !showContent) {
    return (
      <div className="fixed inset-0 z-[200] bg-[#0B0D17] flex items-center justify-center">
        <div className="logo-continuous-loop">
          <Logo className="w-28 h-28 md:w-32 md:h-32" />
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to="/login" replace />;
}
