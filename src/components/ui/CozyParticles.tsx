'use client';

import React, { useEffect, useState } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
}

export const CozyParticles: React.FC<{ count?: number; className?: string }> = ({
  count = 20,
  className = '',
}) => {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const items: Particle[] = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.floor(Math.random() * 100),
      y: Math.floor(Math.random() * 100),
      size: Math.random() > 0.5 ? 3 : 2,
      duration: 4 + Math.random() * 5,
      delay: Math.random() * 3,
      opacity: 0.35 + Math.random() * 0.45,
    }));
    setParticles(items);
  }, [count]);

  return (
    <div
      className={`absolute inset-0 pointer-events-none overflow-hidden select-none ${className}`}
      aria-hidden="true"
    >
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute bg-[#e0b94d] animate-pulse pixelated"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            borderRadius: 0,
            opacity: p.opacity,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
};
