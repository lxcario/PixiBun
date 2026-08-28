'use client';

import React, { useRef } from 'react';

interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  spotlightColor?: string;
  radius?: number;
}

/**
 * 16-Bit Subtle SpotlightCard (PixiBun Edition - Zero Re-render 60 FPS)
 * Delicate, soft candlelight glint that smoothly tracks the cursor using CSS Custom Properties
 * with 0 React re-renders and zero Forced Synchronous Layouts.
 */
export const SpotlightCard: React.FC<SpotlightCardProps> = ({
  children,
  className = '',
  spotlightColor = 'rgba(240, 190, 124, 0.06)',
  radius = 220,
  ...props
}) => {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const spotlightRef = useRef<HTMLDivElement | null>(null);
  const rectRef = useRef<{ left: number; top: number }>({ left: 0, top: 0 });

  const handleMouseEnter = () => {
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      rectRef.current = { left: rect.left, top: rect.top };
    }
    if (spotlightRef.current) {
      spotlightRef.current.style.opacity = '1';
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!spotlightRef.current) return;
    const x = e.clientX - rectRef.current.left;
    const y = e.clientY - rectRef.current.top;

    spotlightRef.current.style.background = `radial-gradient(${radius}px circle at ${x}px ${y}px, ${spotlightColor}, transparent 75%)`;
  };

  const handleMouseLeave = () => {
    if (spotlightRef.current) {
      spotlightRef.current.style.opacity = '0';
    }
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative overflow-hidden ${className}`}
      {...props}
    >
      {/* Subtle Gentle Candlelight Glint (Zero React Re-render) */}
      <div
        ref={spotlightRef}
        aria-hidden="true"
        className="pointer-events-none absolute -inset-px transition-opacity duration-300 z-10 opacity-0"
      />
      {children}
    </div>
  );
};

