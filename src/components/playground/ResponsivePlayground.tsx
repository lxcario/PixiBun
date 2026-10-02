'use client';

import { useSyncExternalStore } from 'react';
import { PracticeWorkspace } from './PracticeWorkspace';
import { PocketDoodlePad } from './PocketDoodlePad';

const DESKTOP_QUERY = '(min-width: 1024px)';

function subscribe(onChange: () => void) {
  const query = window.matchMedia(DESKTOP_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

const getSnapshot = () => window.matchMedia(DESKTOP_QUERY).matches;
const getServerSnapshot = () => null;

/** CSS hiding would still run the desktop lesson's store-changing effects. */
export function ResponsivePlayground() {
  const desktop = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  if (desktop === null) return <p role="status">Getting your drawing space ready…</p>;
  return desktop ? <PracticeWorkspace /> : <PocketDoodlePad />;
}
