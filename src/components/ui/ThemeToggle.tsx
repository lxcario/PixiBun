'use client';

import React, { useEffect, useState } from 'react';
import { useThemeStore } from '@/stores/themeStore';

export const ThemeToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { colorScheme, toggleColorScheme, setColorScheme } = useThemeStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = window.localStorage.getItem('pixibun-color-scheme') || window.localStorage.getItem('pixibun-theme');
        if (saved === 'light' || saved === 'dark') {
          setColorScheme(saved);
        }
      }
    } catch {
      // fallback if storage unavailable
    }
  }, [setColorScheme]);

  if (!mounted) {
    return (
      <div className={`w-6 h-6 rounded-[1px] ${className}`} aria-hidden="true" />
    );
  }

  const isLight = colorScheme === 'light';

  return (
    <button
      type="button"
      onClick={toggleColorScheme}
      title={isLight ? 'Switch to Dark Scheme' : 'Switch to Light Scheme'}
      aria-label="Toggle Theme"
      className={`w-6 h-6 flex items-center justify-center rounded-[1px] text-[var(--text-body)] hover:text-[var(--text-heading)] hover:bg-[var(--surface-1)] active:translate-y-[1px] transition-colors cursor-pointer select-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-wisteria)] ${className}`}
    >
      {isLight ? (
        // Pixel-native Moon icon for switching to dark
        <svg
          viewBox="0 0 16 16"
          width="13"
          height="13"
          fill="currentColor"
          shapeRendering="crispEdges"
          className="pixelated"
          aria-hidden="true"
        >
          <path d="M12 9.5A5.5 5.5 0 0 1 6.5 4a5.55 5.55 0 0 1 .45-2.2A6 6 0 1 0 14.2 8.9c-.68.4-1.45.6-2.2.6z" />
        </svg>
      ) : (
        // Pixel-native Sun icon for switching to light
        <svg
          viewBox="0 0 16 16"
          width="13"
          height="13"
          fill="currentColor"
          shapeRendering="crispEdges"
          className="pixelated"
          aria-hidden="true"
        >
          <circle cx="8" cy="8" r="3" />
          <rect x="7" y="1" width="2" height="2" />
          <rect x="7" y="13" width="2" height="2" />
          <rect x="1" y="7" width="2" height="2" />
          <rect x="13" y="7" width="2" height="2" />
          <rect x="3" y="3" width="2" height="2" />
          <rect x="11" y="11" width="2" height="2" />
          <rect x="11" y="3" width="2" height="2" />
          <rect x="3" y="11" width="2" height="2" />
        </svg>
      )}
    </button>
  );
};
