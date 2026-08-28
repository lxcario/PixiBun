'use client';

import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
}

const SPARKLE_COLORS = ['#fff8db', '#f0be7c', '#ffd285', '#dcabdf'];

/**
 * 16-Bit Golden Sparkle Trail & Native Cursor Controller
 * Activates zero-lag native SVG pixel cursors on the landing page
 * while rendering gentle, lightweight ambient golden sparkle trails with automatic idle sleep.
 */
export const PixelCursor: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const lastPos = useRef({ x: 0, y: 0 });
  const isRunningRef = useRef(false);
  const animIdRef = useRef<number>(0);

  useEffect(() => {
    // Only activate on devices with a mouse / trackpad
    if (window.matchMedia('(pointer: coarse)').matches) return;

    document.body.classList.add('custom-cursor-active');

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    const render = () => {
      const cvs = canvasRef.current;
      if (!cvs) {
        isRunningRef.current = false;
        return;
      }
      const ctx = cvs.getContext('2d');
      if (!ctx) {
        isRunningRef.current = false;
        return;
      }

      ctx.clearRect(0, 0, cvs.width, cvs.height);

      particlesRef.current = particlesRef.current.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life += 1;
        p.alpha = Math.max(0, 0.85 - p.life / 28);

        if (p.alpha <= 0) return false;

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
        ctx.restore();
        return true;
      });

      // If particles still exist, continue loop; otherwise sleep
      if (particlesRef.current.length > 0) {
        animIdRef.current = requestAnimationFrame(render);
      } else {
        isRunningRef.current = false;
      }
    };

    const startLoop = () => {
      if (!isRunningRef.current) {
        isRunningRef.current = true;
        animIdRef.current = requestAnimationFrame(render);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - lastPos.current.x;
      const dy = e.clientY - lastPos.current.y;
      const speed = Math.hypot(dx, dy);

      // Spawn soft golden sparkle particle when moving swiftly
      if (speed > 5 && Math.random() < 0.28 && particlesRef.current.length < 18) {
        particlesRef.current.push({
          x: e.clientX + (Math.random() * 6 - 3),
          y: e.clientY + (Math.random() * 6 - 3),
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5 + 0.2,
          color: SPARKLE_COLORS[Math.floor(Math.random() * SPARKLE_COLORS.length)],
          size: Math.random() > 0.6 ? 3 : 2,
          alpha: 0.85,
          life: 0,
        });

        startLoop();
      }

      lastPos.current = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      document.body.classList.remove('custom-cursor-active');
      cancelAnimationFrame(animIdRef.current);
      isRunningRef.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-[99999] pixelated"
      style={{ imageRendering: 'pixelated' }}
    />
  );
};

