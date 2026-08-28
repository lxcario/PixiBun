'use client';

import React, { useRef, useState, useEffect } from 'react';

interface MagnetProps {
  children: React.ReactNode;
  magnetStrength?: number;
  activeDistance?: number;
  className?: string;
}

/**
 * 16-Bit Magnet (React Bits customized for PixiBun)
 * Gently pulls interactive buttons towards the cursor with tactile spring physics.
 */
export const Magnet: React.FC<MagnetProps> = ({
  children,
  magnetStrength = 0.22,
  activeDistance = 60,
  className = '',
}) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // Disable on touch devices
    if (window.matchMedia('(pointer: coarse)').matches) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;
      const dist = Math.hypot(dx, dy);

      if (dist < activeDistance) {
        setOffset({
          x: dx * magnetStrength,
          y: dy * magnetStrength,
        });
      } else {
        setOffset({ x: 0, y: 0 });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [activeDistance, magnetStrength]);

  return (
    <div
      ref={ref}
      className={`inline-block transition-transform duration-200 ease-out ${className}`}
      style={{
        transform: `translate(${offset.x}px, ${offset.y}px)`,
      }}
    >
      {children}
    </div>
  );
};
