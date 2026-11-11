'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type AppTheme = 'light' | 'dark' | 'high-contrast' | 'system';
export type FontScale = 'normal' | 'large' | 'x-large';

interface ThemeContextType {
  theme: AppTheme;
  resolvedTheme: 'light' | 'dark' | 'high-contrast';
  setTheme: (theme: AppTheme) => void;
  fontScale: FontScale;
  setFontScale: (scale: FontScale) => void;
  reducedMotion: boolean;
  setReducedMotion: (reduced: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_COLOR_MAP: Record<'light' | 'dark' | 'high-contrast', string> = {
  light: '#221849',
  dark: '#0E0B1A',
  'high-contrast': '#000000',
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<AppTheme>('light');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark' | 'high-contrast'>('light');
  const [fontScale, setFontScaleState] = useState<FontScale>('normal');
  const [reducedMotion, setReducedMotionState] = useState<boolean>(false);

  const resolveAndApplyTheme = useCallback((targetTheme: AppTheme) => {
    if (typeof window === 'undefined') return;
    let effective: 'light' | 'dark' | 'high-contrast' = 'light';

    if (targetTheme === 'system') {
      if (window.matchMedia('(prefers-contrast: more)').matches) {
        effective = 'high-contrast';
      } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        effective = 'dark';
      } else {
        effective = 'light';
      }
    } else {
      effective = targetTheme;
    }

    const root = document.documentElement;
    root.classList.remove('dark', 'high-contrast');
    if (effective === 'dark') {
      root.classList.add('dark');
    } else if (effective === 'high-contrast') {
      root.classList.add('dark', 'high-contrast');
    }
    root.setAttribute('data-contrast', effective === 'high-contrast' ? 'high' : 'normal');
    setResolvedTheme(effective);

    // Sync browser / standalone PWA theme-color meta tags cleanly
    const metas = document.querySelectorAll('meta[name="theme-color"]');
    if (metas.length > 0) {
      metas.forEach((m) => m.setAttribute('content', THEME_COLOR_MAP[effective]));
    } else {
      const meta = document.createElement('meta');
      meta.name = 'theme-color';
      meta.content = THEME_COLOR_MAP[effective];
      document.head.appendChild(meta);
    }
  }, []);

  const applyScaleClasses = (scale: FontScale) => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.classList.remove('scale-large', 'scale-xlarge');
    if (scale === 'large') {
      root.classList.add('scale-large');
    } else if (scale === 'x-large') {
      root.classList.add('scale-xlarge');
    }
  };

  const applyMotionClass = (enabled: boolean) => {
    if (typeof document === 'undefined') return;
    if (enabled) {
      document.documentElement.classList.add('reduced-motion');
    } else {
      document.documentElement.classList.remove('reduced-motion');
    }
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem('eventops_theme') as AppTheme | null;
    const savedScale = localStorage.getItem('eventops_font_scale') as FontScale | null;
    const savedMotion = localStorage.getItem('eventops_reduced_motion');

    // Default UI matches the light lavender reference unless high-contrast OS or user saved choice
    let initialTheme: AppTheme = 'light';
    if (savedTheme && ['light', 'dark', 'high-contrast', 'system'].includes(savedTheme)) {
      initialTheme = savedTheme;
    } else if (typeof window !== 'undefined' && window.matchMedia('(prefers-contrast: more)').matches) {
      initialTheme = 'high-contrast';
    }

    setThemeState(initialTheme);
    resolveAndApplyTheme(initialTheme);

    if (savedScale && ['normal', 'large', 'x-large'].includes(savedScale)) {
      setFontScaleState(savedScale);
      applyScaleClasses(savedScale);
    }

    let initialMotion = false;
    if (savedMotion !== null) {
      initialMotion = savedMotion === 'true';
    } else if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      initialMotion = true;
    }
    setReducedMotionState(initialMotion);
    applyMotionClass(initialMotion);

    const darkMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const contrastMediaQuery = window.matchMedia('(prefers-contrast: more)');
    const handleSystemChange = () => {
      const currentStored = (localStorage.getItem('eventops_theme') as AppTheme | null) || initialTheme;
      if (currentStored === 'system') {
        resolveAndApplyTheme('system');
      }
    };
    darkMediaQuery.addEventListener('change', handleSystemChange);
    contrastMediaQuery.addEventListener('change', handleSystemChange);

    return () => {
      darkMediaQuery.removeEventListener('change', handleSystemChange);
      contrastMediaQuery.removeEventListener('change', handleSystemChange);
    };
  }, [resolveAndApplyTheme]);

  const setTheme = (newTheme: AppTheme) => {
    setThemeState(newTheme);
    localStorage.setItem('eventops_theme', newTheme);
    resolveAndApplyTheme(newTheme);
  };

  const setFontScale = (newScale: FontScale) => {
    setFontScaleState(newScale);
    localStorage.setItem('eventops_font_scale', newScale);
    applyScaleClasses(newScale);
  };

  const setReducedMotion = (enabled: boolean) => {
    setReducedMotionState(enabled);
    localStorage.setItem('eventops_reduced_motion', String(enabled));
    applyMotionClass(enabled);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme,
        setTheme,
        fontScale,
        setFontScale,
        reducedMotion,
        setReducedMotion,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
