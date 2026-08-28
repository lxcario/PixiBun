'use client';

import React, { useRef, useEffect } from 'react';
import { useThemeStore } from '@/stores/themeStore';

interface SquaresProps {
  direction?: 'diagonal' | 'up' | 'right' | 'down' | 'left';
  speed?: number;
  squareSize?: number;
  borderColor?: string;
  hoverFillColor?: string;
  className?: string;
}

/**
 * 16-Bit Interactive Pixel Squares Background (PixiBun Edition)
 * A delicate, interactive retro drafting mat grid with warm amber hover tiles,
 * soft twinkling stars, and ambient luminescence.
 */
export const Squares: React.FC<SquaresProps> = ({
  direction = 'diagonal',
  speed = 0.12,
  squareSize = 32,
  borderColor,
  hoverFillColor,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gridOffset = useRef({ x: 0, y: 0 });
  const hoveredSquare = useRef<{ x: number; y: number } | null>(null);
  const { theme } = useThemeStore();
  const isLight = theme === 'light';

  const activeBorder =
    borderColor ||
    (isLight ? 'rgba(86, 67, 102, 0.08)' : 'rgba(220, 171, 223, 0.07)');
  const activeHoverFill =
    hoverFillColor ||
    (isLight ? 'rgba(224, 142, 40, 0.08)' : 'rgba(240, 190, 124, 0.10)');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const startX = Math.floor((mouseX - (gridOffset.current.x % squareSize)) / squareSize);
      const startY = Math.floor((mouseY - (gridOffset.current.y % squareSize)) / squareSize);

      hoveredSquare.current = { x: startX, y: startY };
    };

    const handleMouseLeave = () => {
      hoveredSquare.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    let frame = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;

      const numCols = Math.ceil(canvas.width / squareSize) + 2;
      const numRows = Math.ceil(canvas.height / squareSize) + 2;

      const offsetX = gridOffset.current.x % squareSize;
      const offsetY = gridOffset.current.y % squareSize;

      // Draw Grid Squares
      for (let i = -1; i < numCols; i++) {
        for (let j = -1; j < numRows; j++) {
          const sqX = i * squareSize + offsetX;
          const sqY = j * squareSize + offsetY;

          // Interactive Hover Glow
          const isHovered =
            hoveredSquare.current &&
            hoveredSquare.current.x === i &&
            hoveredSquare.current.y === j;

          // Radial hover field around mouse
          if (hoveredSquare.current) {
            const dist = Math.hypot(
              hoveredSquare.current.x - i,
              hoveredSquare.current.y - j
            );
            if (dist <= 3.5) {
              const alpha = Math.max(0, (1 - dist / 3.5) * 0.18);
              ctx.fillStyle = `rgba(240, 190, 124, ${alpha})`;
              ctx.fillRect(sqX + 1, sqY + 1, squareSize - 2, squareSize - 2);
            }
          }

          if (isHovered) {
            ctx.fillStyle = activeHoverFill;
            ctx.fillRect(sqX + 1, sqY + 1, squareSize - 2, squareSize - 2);

            // Specular 16-bit corner glint
            ctx.fillStyle = '#fff8db';
            ctx.fillRect(sqX + 2, sqY + 2, 2, 2);
          }

          // Subtle Grid Lines
          ctx.strokeStyle = activeBorder;
          ctx.lineWidth = 1;
          ctx.strokeRect(sqX, sqY, squareSize, squareSize);

          // Starry pixel glints on specific deterministic tiles
          const hash = ((i * 73856093) ^ (j * 19349663)) >>> 0;
          if (hash % 23 === 0) {
            const twinkle = (Math.sin(frame * 0.03 + hash) + 1) * 0.5;
            if (twinkle > 0.4) {
              ctx.fillStyle = isLight
                ? `rgba(224, 142, 40, ${twinkle * 0.35})`
                : `rgba(240, 190, 124, ${twinkle * 0.35})`;
              ctx.fillRect(sqX + (hash % 16) + 8, sqY + ((hash >> 4) % 16) + 8, 2, 2);
            }
          }
        }
      }

      // Gentle Ambient Drift
      switch (direction) {
        case 'diagonal':
          gridOffset.current.x -= speed;
          gridOffset.current.y -= speed;
          break;
        case 'up':
          gridOffset.current.y -= speed;
          break;
        case 'down':
          gridOffset.current.y += speed;
          break;
        case 'left':
          gridOffset.current.x -= speed;
          break;
        case 'right':
          gridOffset.current.x += speed;
          break;
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [direction, speed, squareSize, activeBorder, activeHoverFill, isLight]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`fixed inset-0 pointer-events-none z-0 pixelated ${className}`}
      style={{ imageRendering: 'pixelated' }}
    />
  );
};
