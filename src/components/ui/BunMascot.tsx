'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { bunOutline, bunPixels, BUN_INK, BunPose } from '@/lib/art/bunSprite';

interface BunMascotProps {
  size?: number;
  pose?: BunPose;
  /** When true (default off) an idle pose occasionally blinks; honors reduced motion. */
  animate?: boolean;
  className?: string;
}

export const BunMascot: React.FC<BunMascotProps> = ({
  size = 32,
  pose = 'idle',
  animate = false,
  className,
}) => {
  const [blinking, setBlinking] = useState(false);

  useEffect(() => {
    if (!animate || pose !== 'idle') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let hideTimer: number;
    const schedule = window.setInterval(() => {
      setBlinking(true);
      hideTimer = window.setTimeout(() => setBlinking(false), 160);
    }, 3400);
    return () => {
      window.clearInterval(schedule);
      window.clearTimeout(hideTimer);
    };
  }, [animate, pose]);

  const activePose: BunPose = pose === 'blink' || blinking ? 'blink' : pose;
  const pixels = useMemo(() => bunPixels(activePose), [activePose]);
  const outline = useMemo(() => bunOutline(activePose), [activePose]);

  return (
    <svg
      viewBox="-1 -1 18 18"
      width={size}
      height={size}
      shapeRendering="crispEdges"
      className={className}
      role="img"
      aria-label="Bun, the PixiBun bunny"
    >
      {outline.map(([x, y], i) => (
        <rect key={`o${i}`} x={x} y={y} width={1} height={1} fill={BUN_INK} />
      ))}
      {pixels.map(([x, y, w, h, fill], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} fill={fill} />
      ))}
    </svg>
  );
};
