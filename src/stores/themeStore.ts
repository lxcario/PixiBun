'use client';

import { create } from 'zustand';
import { DEFAULT_THEME_ID, isSceneTheme, isThemeId } from '@/lib/theme/registry';

/** A theme id from src/lib/theme/themes.json. */
export type StudioTheme = string;

/** Moonlit is the default for anyone who has not picked a style yet. */
export const DEFAULT_STUDIO_THEME: StudioTheme = DEFAULT_THEME_ID;

export function normalizeStudioTheme(value: unknown): StudioTheme {
  return isThemeId(value) ? value : DEFAULT_STUDIO_THEME;
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
  root.setAttribute('data-layout-kind', isSceneTheme(validTheme) ? 'scene' : 'flat');
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

// The store starts at the server's defaults: zustand serves getInitialState()
// as the hydration snapshot, so React's first client render matches the server
// HTML. The saved choice is loaded right after creation (below), and components
// re-render with it once hydration completes instead of discarding the tree.
export const useThemeStore = create<ThemeStore>((set, get) => ({
  studioTheme: DEFAULT_STUDIO_THEME,
  colorScheme: 'dark',
  theme: 'dark',

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
  useThemeStore.setState({ studioTheme: initialStudioTheme, colorScheme: initialColorScheme, theme: initialColorScheme });
  applyThemeToDOM(initialStudioTheme, initialColorScheme);
}
