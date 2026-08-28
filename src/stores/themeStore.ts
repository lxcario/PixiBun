'use client';

import { create } from 'zustand';

export type ThemeMode = 'dark' | 'light';

interface ThemeStore {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

/**
 * Apply theme to document with zero-lag transition suppression.
 * Temporarily disables all CSS transitions across the entire DOM during class mutation
 * to prevent thousands of simultaneous style recalculations and repaints.
 */
export function applyThemeToDOM(theme: ThemeMode) {
  if (typeof window === 'undefined') return;

  const root = document.documentElement;

  // 1. Inject temporary zero-transition override
  const css = document.createElement('style');
  css.id = 'pixibun-theme-transition-killer';
  css.appendChild(
    document.createTextNode(
      `*, *::before, *::after {
        -webkit-transition: none !important;
        -moz-transition: none !important;
        -o-transition: none !important;
        -ms-transition: none !important;
        transition: none !important;
      }`
    )
  );
  document.head.appendChild(css);

  // 2. Mutate theme attributes
  if (theme === 'light') {
    root.classList.add('light');
    root.classList.remove('dark');
    root.setAttribute('data-theme', 'light');
  } else {
    root.classList.add('dark');
    root.classList.remove('light');
    root.setAttribute('data-theme', 'dark');
  }

  // 3. Force synchronous style recalculation while transitions are disabled
  void window.getComputedStyle(css).opacity;

  // 4. Cleanly remove the temporary stylesheet on the next frame
  requestAnimationFrame(() => {
    if (css.parentNode) {
      document.head.removeChild(css);
    }
  });
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  theme: 'dark',

  setTheme: (theme: ThemeMode) => {
    set({ theme });
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('pixibun-theme', theme);
      } catch {
        // ignore storage errors
      }
      applyThemeToDOM(theme);
    }
  },

  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    get().setTheme(next);
  },
}));

if (typeof window !== 'undefined') {
  try {
    const saved = localStorage.getItem('pixibun-theme') as ThemeMode | null;
    const initial = saved === 'light' ? 'light' : 'dark';
    applyThemeToDOM(initial);
  } catch {
    // ignore
  }
}

