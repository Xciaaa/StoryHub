import { useEffect, useRef } from 'react';

/**
 * Calls `callback` with the latest args after `delay` ms of inactivity.
 * Returns nothing — fire-and-forget, intended for autosave triggers.
 */
export function useDebouncedEffect(callback, deps, delay) {
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      callback();
    }, delay);

    return () => clearTimeout(timeoutRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
