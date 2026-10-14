'use client';

import { useEffect, useLayoutEffect } from 'react';
import { applyThemeToDOM, useThemeStore } from '@/stores/themeStore';

function themeApplied(studioTheme: string, colorScheme: string): boolean {
  const root = document.documentElement;
  return root.getAttribute('data-studio-theme') === studioTheme && root.getAttribute('data-color-scheme') === colorScheme;
}

/** Re-applies the saved theme from the store's live state, never from a render snapshot. */
function syncThemeToDOM() {
  const { studioTheme, colorScheme } = useThemeStore.getState();
  if (!themeApplied(studioTheme, colorScheme)) applyThemeToDOM(studioTheme, colorScheme);
}

/**
 * React owns <html>, and rendering it can drop the attributes /theme.js set
 * before hydration, which silently reverted every theme to the base tokens.
 * Re-apply the stored theme after hydration, on every change, and whenever
 * something strips the attributes again.
 *
 * The hydration render sees the server's default theme (Moonlit), not the
 * saved one, so the DOM is always synced from `getState()`: applying the
 * rendered value flashed Moonlit's purple over the saved theme on every load.
 */
export function ThemeSync() {
  const studioTheme = useThemeStore(s => s.studioTheme);
  const colorScheme = useThemeStore(s => s.colorScheme);

  useLayoutEffect(syncThemeToDOM, [studioTheme, colorScheme]);

  useEffect(() => {
    const observer = new MutationObserver(syncThemeToDOM);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-studio-theme', 'data-color-scheme'] });
    return () => observer.disconnect();
  }, []);

  return null;
}
