'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useLiveThemeChoice } from '@/stores/themeStore';
import { sceneRecolor, type Recolor } from '@/lib/theme/sceneRecolor';

/** The recolor that paints the landing's night scenes in the current studio theme and time of day. */
export function useSceneRecolor(): Recolor {
  const { studioTheme, colorScheme } = useLiveThemeChoice();
  const day = colorScheme === 'light';
  return useMemo(() => sceneRecolor(studioTheme, day), [studioTheme, day]);
}

/**
 * The current recolor in a ref, so an animated scene can keep its built world
 * across theme changes and only repaint: rebuilding every scene on Day/Night
 * froze the page. `onChange` repaints scenes that are not animating.
 */
export function useSceneRecolorRef(onChange?: () => void) {
  const recolor = useSceneRecolor();
  const ref = useRef(recolor);
  const changed = useRef(onChange);
  changed.current = onChange;
  useEffect(() => {
    if (ref.current === recolor) return;
    ref.current = recolor;
    changed.current?.();
  }, [recolor]);
  return ref;
}
