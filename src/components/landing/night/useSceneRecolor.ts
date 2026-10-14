'use client';

import { useMemo } from 'react';
import { useThemeStore } from '@/stores/themeStore';
import { sceneRecolor, type Recolor } from '@/lib/theme/sceneRecolor';

/** The recolor that paints the landing's night scenes in the current studio theme and time of day. */
export function useSceneRecolor(): Recolor {
  const studioTheme = useThemeStore((s) => s.studioTheme);
  const day = useThemeStore((s) => s.colorScheme) === 'light';
  return useMemo(() => sceneRecolor(studioTheme, day), [studioTheme, day]);
}
