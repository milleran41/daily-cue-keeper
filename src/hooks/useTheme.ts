import { useState, useEffect, useCallback } from 'react';

export type ThemeMode = 'light' | 'dark' | 'auto';

export const useTheme = () => {
  const [mode, setMode] = useState<ThemeMode>(() => {
    return (localStorage.getItem('theme_mode') as ThemeMode) || 'auto';
  });

  const applyTheme = useCallback((m: ThemeMode) => {
    let isDark = false;
    if (m === 'dark') {
      isDark = true;
    } else if (m === 'auto') {
      // Check system preference first
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      
      // Also fallback to time-based (8 PM to 7 AM) if no system preference or as additional logic
      const hour = new Date().getHours();
      const isNightTime = hour >= 20 || hour < 7;
      
      isDark = systemPrefersDark || isNightTime;
    }
    document.documentElement.classList.toggle('dark', isDark);
  }, []);

  useEffect(() => {
    localStorage.setItem('theme_mode', mode);
    applyTheme(mode);

    // Listener for system theme changes
    if (mode === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme('auto');
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [mode, applyTheme]);

  // Auto-update every minute when in auto mode
  useEffect(() => {
    if (mode !== 'auto') return;
    const interval = setInterval(() => applyTheme('auto'), 60000);
    return () => clearInterval(interval);
  }, [mode, applyTheme]);

  return { mode, setMode };
};
