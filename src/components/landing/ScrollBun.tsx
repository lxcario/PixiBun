'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion, useTransform, type MotionValue } from 'motion/react';
import { drawBun, type BunPose } from '@/lib/art/bunSprite';

const SIZE = 18;

/**
 * Bun rides the scroll progress bar: hopping while the page moves, facing the
 * way you scroll, blinking while it waits. Clicking Bun hops back to the top.
 */
export const ScrollBun: React.FC<{ progress: MotionValue<number>; shown: boolean }> = ({ progress, shown }) => {
  const reduceMotion = Boolean(useReducedMotion());
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [moving, setMoving] = useState(false);
  const [facing, setFacing] = useState<1 | -1>(1);
  const left = useTransform(progress, (v) => `calc(${Math.min(1, Math.max(0, v)) * 100}% - ${Math.min(1, Math.max(0, v)) * SIZE * 1.5}px)`);

  // Hop while scrolling; settle a moment after the page stops.
  useEffect(() => {
    let last = window.scrollY;
    let timer = 0;
    const onScroll = () => {
      const y = window.scrollY;
      if (y !== last) setFacing(y > last ? 1 : -1);
      last = y;
      setMoving(true);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setMoving(false), 180);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.clearTimeout(timer);
    };
  }, []);

  // Paint the pose: happy while hopping, an occasional blink while waiting.
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const paint = (pose: BunPose) => {
      ctx.clearRect(0, 0, SIZE, SIZE);
      drawBun(ctx, 1, 1, pose);
    };
    if (moving) {
      paint('happy');
      return;
    }
    paint('idle');
    if (reduceMotion) return;
    let blink = 0;
    const id = window.setInterval(() => {
      paint('blink');
      blink = window.setTimeout(() => paint('idle'), 140);
    }, 3200);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(blink);
    };
  }, [moving, reduceMotion]);

  return (
    <motion.button
      type="button"
      aria-label="Back to the top"
      title="Bun walks with you. Click to hop back to the top."
      onClick={() => window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' })}
      className="hidden sm:block absolute bottom-[1px] z-[5] w-[27px] h-[27px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] rounded-[2px]"
      style={{ left }}
      initial={false}
      animate={{ opacity: shown ? 1 : 0, scale: shown ? 1 : 0.4, pointerEvents: shown ? 'auto' : 'none' }}
      transition={{ duration: 0.25 }}
      tabIndex={shown ? 0 : -1}
    >
      <span className={`block w-full h-full ${moving && !reduceMotion ? 'scroll-bun-hop' : ''}`}>
        <canvas
          ref={canvasRef}
          width={SIZE}
          height={SIZE}
          aria-hidden="true"
          className="block w-full h-full"
          style={{ imageRendering: 'pixelated', transform: `scaleX(${facing})` }}
        />
      </span>
    </motion.button>
  );
};
