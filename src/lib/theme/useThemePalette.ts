'use client';
import { useLiveThemeChoice } from '@/stores/themeStore';
import { getStudioTheme } from './registry';

/** Canvas surfaces share the CSS theme palette, including saved Day/Night choices. */
export function useThemePalette() {
  const { studioTheme, colorScheme } = useLiveThemeChoice();
  const definition = getStudioTheme(studioTheme);
  return colorScheme === 'light' ? definition.day : definition.night;
}
