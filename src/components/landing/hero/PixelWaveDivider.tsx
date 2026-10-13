'use client';

import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

const COLUMNS = 28;
const PALETTES = {
  gold: ['#f0be7c', '#ffd285', '#e5a962'],
  plum: ['#dcabdf', '#c792df', '#9d7ec4'],
};

/**
 * A row of pixel blocks that ripples up like a little equaliser when it scrolls
 * into view, with a spinning gem in the middle. Purely decorative.
 */
export const PixelWaveDivider: React.FC<{ tone?: keyof typeof PALETTES }> = ({ tone = 'gold' }) => {
  const reduceMotion = useReducedMotion();
  const colors = PALETTES[tone];
  const half = COLUMNS / 2;

  return (
    <div aria-hidden="true" className="w-full max-w-5xl mx-auto px-6 py-6 flex items-end justify-center gap-[3px] h-16">
      {Array.from({ length: COLUMNS + 1 }, (_, i) => {
        if (i === half) {
          return (
            <motion.span
              key="gem"
              className="mx-3 mb-1 w-3 h-3 shrink-0 rotate-45 bg-[var(--accent-gold)] shadow-[0_0_10px_rgba(240,190,124,0.6)]"
              initial={reduceMotion ? false : { scale: 0, rotate: 45 }}
              whileInView={reduceMotion ? undefined : { scale: 1, rotate: 405 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
            />
          );
        }
        const dist = Math.abs(i - half) / half;
        const height = Math.max(2, Math.round((1 - dist) * 5 + Math.sin(i * 1.3) * 1.5)) * 4;
        return (
          <motion.span
            key={i}
            className="w-[6px] shrink-0 origin-bottom"
            style={{ height, backgroundColor: colors[i % colors.length], opacity: 0.35 + (1 - dist) * 0.55 }}
            initial={reduceMotion ? false : { scaleY: 0 }}
            whileInView={reduceMotion ? undefined : { scaleY: [0, 1.6, 0.8, 1] }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.7, delay: Math.abs(i - half) * 0.035, ease: 'easeOut' }}
          />
        );
      })}
    </div>
  );
};
