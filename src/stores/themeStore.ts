'use client';

import { create } from 'zustand';

export type StudioTheme = 'moonlit' | 'atelier' | 'cozy-classic';

/** Moonlit is the default for anyone who has not picked a style yet. */
export const DEFAULT_STUDIO_THEME: StudioTheme = 'moonlit';

export function normalizeStudioTheme(value: unknown): StudioTheme {
  return value === 'atelier' || value === 'cozy-classic' || value === 'moonlit' ? value : DEFAULT_STUDIO_THEME;
}
export type ColorScheme = 'dark' | 'light';
export type ThemeMode = ColorScheme; // backward compatibility

export interface ThemeStore {
  studioTheme: StudioTheme;
  colorScheme: ColorScheme;
  theme: ColorScheme; // backward compatibility alias for colorScheme
  setStudioTheme: (theme: StudioTheme) => void;
  setColorScheme: (scheme: ColorScheme) => void;
  toggleColorScheme: () => void;
  setTheme: (theme: ThemeMode) => void; // backward compatibility alias for setColorScheme
  toggleTheme: () => void; // backward compatibility alias for toggleColorScheme
}

/**
 * Apply studio theme and color scheme to document with zero-lag transition suppression.
 * Temporarily disables all CSS transitions across the entire DOM during class and attribute mutation
 * to prevent thousands of simultaneous style recalculations and repaints.
 */
export function applyThemeToDOM(studioTheme: StudioTheme, colorScheme: ColorScheme) {
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
  const validTheme = normalizeStudioTheme(studioTheme);
  const validScheme: ColorScheme = colorScheme === 'light' ? 'light' : 'dark';

  root.setAttribute('data-studio-theme', validTheme);
  root.setAttribute('data-color-scheme', validScheme);
  root.setAttribute('data-theme', validScheme); // backward compatibility

  if (validScheme === 'light') {
    root.classList.add('light');
    root.classList.remove('dark');
    root.style.colorScheme = 'light';
  } else {
    root.classList.add('dark');
    root.classList.remove('light');
    root.style.colorScheme = 'dark';
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

export function getInitialStudioTheme(): StudioTheme {
  if (typeof window === 'undefined' || !window.localStorage) return DEFAULT_STUDIO_THEME;
  try {
    return normalizeStudioTheme(window.localStorage.getItem('pixibun-studio-theme'));
  } catch {
    return DEFAULT_STUDIO_THEME;
  }
}

export function getInitialColorScheme(): ColorScheme {
  if (typeof window === 'undefined' || !window.localStorage) return 'dark';
  try {
    const savedScheme = window.localStorage.getItem('pixibun-color-scheme') || window.localStorage.getItem('pixibun-theme');
    if (savedScheme === 'light') return 'light';
    if (savedScheme === 'dark') return 'dark';
  } catch {
    // ignore storage errors
  }
  return 'dark';
}

const initialStudioTheme = getInitialStudioTheme();
const initialColorScheme = getInitialColorScheme();

export const useThemeStore = create<ThemeStore>((set, get) => ({
  studioTheme: initialStudioTheme,
  colorScheme: initialColorScheme,
  theme: initialColorScheme,

  setStudioTheme: (studioTheme: StudioTheme) => {
    const validTheme = normalizeStudioTheme(studioTheme);
    set({ studioTheme: validTheme });
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem('pixibun-studio-theme', validTheme);
      } catch {
        // ignore storage errors
      }
      applyThemeToDOM(validTheme, get().colorScheme);
    }
  },

  setColorScheme: (colorScheme: ColorScheme) => {
    const validScheme: ColorScheme = colorScheme === 'light' ? 'light' : 'dark';
    set({ colorScheme: validScheme, theme: validScheme });
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem('pixibun-color-scheme', validScheme);
        window.localStorage.setItem('pixibun-theme', validScheme);
      } catch {
        // ignore storage errors
      }
      applyThemeToDOM(get().studioTheme, validScheme);
    }
  },

  toggleColorScheme: () => {
    const next = get().colorScheme === 'dark' ? 'light' : 'dark';
    get().setColorScheme(next);
  },

  setTheme: (theme: ThemeMode) => {
    get().setColorScheme(theme);
  },

  toggleTheme: () => {
    get().toggleColorScheme();
  },
}));

if (typeof window !== 'undefined') {
  applyThemeToDOM(initialStudioTheme, initialColorScheme);
}
