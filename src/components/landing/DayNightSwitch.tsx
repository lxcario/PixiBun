'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { useThemeStore } from '@/stores/themeStore';
import { toggleColorSchemeFrom } from '@/lib/theme/themeTransition';

const STARS = [
  { x: 9, y: 6, d: 0 },
  { x: 16, y: 15, d: 0.6 },
  { x: 22, y: 7, d: 1.2 },
  { x: 13, y: 19, d: 1.8 },
];

/**
 * The landing's Day/Night switch: a little window onto the sky. At night the
 * moon rests on the left among twinkling stars; by day the sun rolls to the
 * right past a drifting cloud. Pressing it spreads the new sky out of the switch.
 */
export const DayNightSwitch: React.FC = () => {
  const colorScheme = useThemeStore((s) => s.colorScheme);
  const reduceMotion = Boolean(useReducedMotion());
  const ref = useRef<HTMLButtonElement | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // The saved scheme is only known after hydration; keep the slot until then.
  if (!mounted) return <span className="block w-[52px] h-[28px]" aria-hidden="true" />;

  const day = colorScheme === 'light';
  const spring = reduceMotion ? { duration: 0 } : { type: 'spring' as const, stiffness: 380, damping: 26 };

  return (
    <button
      ref={ref}
      type="button"
      role="switch"
      aria-checked={day}
      aria-label="Daylight"
      title={day ? 'Switch to night' : 'Switch to day'}
      onClick={() => toggleColorSchemeFrom(ref.current)}
      className="daynight-switch group relative w-[52px] h-[28px] shrink-0 rounded-[3px] border-2 border-[var(--ink)] overflow-hidden cursor-pointer shadow-[0_2px_0_var(--ink)] active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--desk-bg)]"
      data-day={day ? 'true' : 'false'}
    >
      {/* Sky */}
      <motion.span
        aria-hidden="true"
        className="absolute inset-0"
        initial={false}
        animate={{ backgroundColor: day ? '#8fd3f0' : '#141a3a' }}
        transition={{ duration: reduceMotion ? 0 : 0.5 }}
      />
      {/* Stars at night */}
      {STARS.map((s) => (
        <motion.span
          key={`${s.x}-${s.y}`}
          aria-hidden="true"
          className="absolute w-[2px] h-[2px] bg-[#fff3c4]"
          style={{ left: s.x + 18, top: s.y - 2 }}
          initial={false}
          animate={day ? { opacity: 0, y: 8 } : { opacity: [0.35, 1, 0.35], y: 0 }}
          transition={day || reduceMotion ? { duration: 0.3 } : { duration: 2.2, repeat: Infinity, delay: s.d }}
        />
      ))}
      {/* A cloud by day */}
      <motion.span
        aria-hidden="true"
        className="absolute top-[13px] left-[4px] w-[14px] h-[5px] bg-white shadow-[3px_-3px_0_-1px_#fff,7px_-2px_0_0_#fff]"
        initial={false}
        animate={day ? { opacity: 0.95, x: 0 } : { opacity: 0, x: -12 }}
        transition={{ duration: reduceMotion ? 0 : 0.45 }}
      />
      {/* Ground line */}
      <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[3px] bg-[color-mix(in_srgb,var(--ink)_55%,transparent)]" />
      {/* Knob: moon at night, sun by day */}
      <motion.span
        aria-hidden="true"
        className="absolute top-[3px] left-[3px] w-[18px] h-[18px]"
        initial={false}
        animate={{ x: day ? 24 : 0, rotate: day ? 180 : 0 }}
        transition={spring}
      >
        <svg viewBox="0 0 18 18" width="18" height="18" shapeRendering="crispEdges" className="block">
          {day ? (
            <g fill="#ffd285">
              <rect x="5" y="3" width="8" height="12" />
              <rect x="3" y="5" width="12" height="8" />
              <rect x="8" y="0" width="2" height="2" />
              <rect x="8" y="16" width="2" height="2" />
              <rect x="0" y="8" width="2" height="2" />
              <rect x="16" y="8" width="2" height="2" />
              <rect x="6" y="5" width="3" height="2" fill="#fff3c4" />
            </g>
          ) : (
            <g>
              <rect x="5" y="2" width="8" height="14" fill="#f4ecdc" />
              <rect x="3" y="4" width="12" height="10" fill="#f4ecdc" />
              <rect x="2" y="6" width="14" height="6" fill="#f4ecdc" />
              <rect x="6" y="5" width="2" height="2" fill="#cfc2a8" />
              <rect x="10" y="9" width="3" height="2" fill="#cfc2a8" />
              <rect x="6" y="11" width="2" height="1" fill="#cfc2a8" />
            </g>
          )}
        </svg>
      </motion.span>
    </button>
  );
};
