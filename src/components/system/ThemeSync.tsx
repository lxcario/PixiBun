'use client';

import { useEffect, useLayoutEffect } from 'react';
import { applyThemeToDOM, useThemeStore } from '@/stores/themeStore';

function themeApplied(studioTheme: string, colorScheme: string): boolean {
  const root = document.documentElement;
  return root.getAttribute('data-studio-theme') === studioTheme && root.getAttribute('data-color-scheme') === colorScheme;
}

/**
 * React owns <html>, and rendering it can drop the attributes /theme.js set
 * before hydration, which silently reverted every theme to the base tokens.
 * Re-apply the stored theme after hydration, on every change, and whenever
 * something strips the attributes again.
 */
export function ThemeSync() {
  const studioTheme = useThemeStore(s => s.studioTheme);
  const colorScheme = useThemeStore(s => s.colorScheme);

  useLayoutEffect(() => {
    if (!themeApplied(studioTheme, colorScheme)) applyThemeToDOM(studioTheme, colorScheme);
  }, [studioTheme, colorScheme]);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (!themeApplied(studioTheme, colorScheme)) applyThemeToDOM(studioTheme, colorScheme);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-studio-theme', 'data-color-scheme'] });
    return () => observer.disconnect();
  }, [studioTheme, colorScheme]);

  return null;
}
