'use client';

import React, { useRef, useEffect, useCallback } from 'react';

interface ClickSparkProps {
  sparkColor?: string;
  sparkColors?: string[];
  sparkSize?: number;
  sparkRadius?: number;
  sparkCount?: number;
  duration?: number;
  children: React.ReactNode;
  className?: string;
}

interface Spark {
  x: number;
  y: number;
  angle: number;
  speed: number;
  startTime: number;
  color: string;
  size: number;
}

/**
 * 16-Bit Pixel ClickSpark (React Bits customized for PixiBun)
 * Spawns crisp integer pixel star sparks when clicked.
 */
export const ClickSpark: React.FC<ClickSparkProps> = ({
  sparkColors = ['#f0be7c', '#fff8db', '#dcabdf'],
  sparkSize = 2.5,
  sparkRadius = 18,
  sparkCount = 5,
  duration = 320,
  children,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sparksRef = useRef<Spark[]>([]);

  const animate = useCallback(
    (timestamp: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      sparksRef.current = sparksRef.current.filter((spark) => {
        const elapsed = timestamp - spark.startTime;
        if (elapsed >= duration) return false;

        const progress = elapsed / duration;
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const distance = easeOut * sparkRadius;

        const currX = Math.round(spark.x + Math.cos(spark.angle) * distance);
        const currY = Math.round(spark.y + Math.sin(spark.angle) * distance);
        const alpha = Math.max(0, 1 - progress);

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = spark.color;

        // 16-Bit 4-Pixel Cross Star Sprite
        const s = spark.size;
        ctx.fillRect(currX - s / 2, currY - s / 2, s, s);
        // Cross points
        ctx.fillRect(currX - s, currY - s / 4, s * 2, s / 2);
        ctx.fillRect(currX - s / 4, currY - s, s / 2, s * 2);

        // Specular core
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(currX - 1, currY - 1, 2, 2);

        ctx.restore();
        return true;
      });

      if (sparksRef.current.length > 0) {
        requestAnimationFrame(animate);
      }
    },
    [duration, sparkRadius]
  );

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const x = e.clientX;
    const y = e.clientY;

    const now = performance.now();
    const newSparks: Spark[] = [];

    for (let i = 0; i < sparkCount; i++) {
      const angle = (Math.PI * 2 * i) / sparkCount + (Math.random() * 0.4 - 0.2);
      const color = sparkColors[Math.floor(Math.random() * sparkColors.length)];
      newSparks.push({
        x,
        y,
        angle,
        speed: 1 + Math.random() * 0.8,
        startTime: now,
        color,
        size: sparkSize,
      });
    }

    const wasEmpty = sparksRef.current.length === 0;
    sparksRef.current.push(...newSparks);

    if (wasEmpty) {
      requestAnimationFrame(animate);
    }
  };

  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div
      onClick={handleClick}
      className={`relative ${className}`}
      style={{ isolation: 'isolate' }}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none z-50 pixelated"
        style={{ imageRendering: 'pixelated', width: '100vw', height: '100vh' }}
      />
      {children}
    </div>
  );
};
