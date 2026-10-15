'use client';

import { useSyncExternalStore } from 'react';

// Motion's own hook reads the preference once on mount. Subscribe directly so switching
// the OS setting also affects a surface that is already open.
const QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(notify: () => void) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const media = window.matchMedia(QUERY);
  media.addEventListener?.('change', notify);
  return () => media.removeEventListener?.('change', notify);
}

export function readReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(QUERY).matches;
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, readReducedMotion, () => false);
}
