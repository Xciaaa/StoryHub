import { useEffect, useState } from 'react';
import { API_BASE } from '../lib/api';

const DEFAULT_AVATAR = 'https://lh3.googleusercontent.com/aida-public/AB6AXuBmW6M3gVbzficM23M0Yu8RLcIro7pEasnq7rOcmRUJ6Q4WCusCL7BReKKIK6MdtKZfdqxojALPqcCkQ3AWyPdHg93P4MbvlZNqMdjOY2X-MV5f5QY8qkhNkv1Teh5VGbiYc985f2DAn2gdT7NfYuT-njerGIiWOPWg5aiHRTcTb3hNanUYZn3WCa36KdcHlMi32NHi0PTcZyAgFX9NoCqPUtB1bwpARSOpaE_PJj_LVOE44PV6KRGa2Q';

export default function Avatar({ src, alt = 'User profile', className = '' }) {
  const [error, setError] = useState(false);

  const resolvedSrc = src
    ? src.startsWith('http')
      ? src
      : `${API_BASE}${src}`
    : DEFAULT_AVATAR;

  useEffect(() => {
    setError(false);
  }, [src]);

  return (
    <img
      alt={alt}
      className={className}
      src={error ? DEFAULT_AVATAR : resolvedSrc}
      onError={() => setError(true)}
    />
  );
}
