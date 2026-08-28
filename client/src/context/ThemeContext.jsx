import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') || 'dark';
    }
    return 'dark';
  });

  const [compact, setCompact] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('compact') === 'true';
    }
    return false;
  });

  const [animations, setAnimations] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('animations') !== 'false';
    }
    return true;
  });

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-compact', compact ? 'true' : 'false');
    localStorage.setItem('compact', String(compact));
  }, [compact]);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-animations', animations ? 'true' : 'false');
    localStorage.setItem('animations', String(animations));
  }, [animations]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const toggleCompact = () => {
    setCompact((prev) => !prev);
  };

  const toggleAnimations = () => {
    setAnimations((prev) => !prev);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, compact, toggleCompact, animations, toggleAnimations }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
