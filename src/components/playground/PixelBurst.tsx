'use client';

import React, { useMemo } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

const COLORS = ['var(--accent-gold)', 'var(--accent-sage)', 'var(--accent-wisteria)', 'var(--accent-plum)', 'var(--primary-bg)'];

/** A little fountain of square pixels. Changing `burstKey` fires it again. */
export const PixelBurst: React.FC<{ burstKey: number | null; count?: number; spread?: number }> = ({
  burstKey, count = 18, spread = 90,
}) => {
  const reduceMotion = Boolean(useReducedMotion());
  const bits = useMemo(() => {
    // Deterministic per burst so a re-render never reshuffles a flight mid-air.
    let seed = (burstKey ?? 1) * 9301 + 49297;
    const rand = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    return Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2 + rand() * 0.5;
      const distance = spread * (0.55 + rand() * 0.6);
      return {
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance - spread * 0.35,
        size: rand() > 0.6 ? 6 : 4,
        color: COLORS[i % COLORS.length],
        delay: rand() * 0.08,
        spin: rand() > 0.5 ? 90 : -90,
      };
    });
  }, [burstKey, count, spread]);

  if (reduceMotion || burstKey === null) return null;
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-visible">
      <AnimatePresence>
        <motion.div key={burstKey} className="relative" initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ delay: 0.75, duration: 0.35 }}>
          {bits.map((bit, i) => (
            <motion.span
              key={i}
              className="absolute block"
              style={{ width: bit.size, height: bit.size, background: bit.color, left: -bit.size / 2, top: -bit.size / 2, boxShadow: '1px 1px 0 var(--ink)' }}
              initial={{ x: 0, y: 0, scale: 0.4, rotate: 0 }}
              animate={{ x: bit.x, y: [0, bit.y, bit.y + spread * 0.5], scale: 1, rotate: bit.spin }}
              transition={{ duration: 1.05, delay: bit.delay, ease: [0.16, 1, 0.3, 1] }}
            />
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
