'use client';

import { useEffect } from 'react';
import { installPressMotion } from '@/lib/motion/pressMotion';

/** Mounts the shared press-and-release motion for every control in the app. */
export function PressMotion() {
  useEffect(() => installPressMotion(), []);
  return null;
}
