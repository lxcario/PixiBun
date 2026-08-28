'use client';

import React, { useRef, useState, useCallback } from 'react';

interface BorderGlowProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
  glowRadius?: number;
  borderWidth?: number;
  edgeSensitivity?: number;
}

/**
 * 16-Bit BorderGlow (React Bits customized for PixiBun)
 * A warm golden & wisteria specular light beam that glides along
 * the container's border edges, tracking your cursor position.
 */
export const BorderGlow: React.FC<BorderGlowProps> = ({
  children,
  className = '',
  glowColor = 'rgba(240, 190, 124, 0.95)',
  glowRadius = 180,
  borderWidth = 2,
  edgeSensitivity = 40,
  ...props
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [isNear, setIsNear] = useState(false);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      setMousePos({ x, y });

      // Check if mouse is within edgeSensitivity
      const isInsideOrNear =
        x >= -edgeSensitivity &&
        x <= rect.width + edgeSensitivity &&
        y >= -edgeSensitivity &&
        y <= rect.height + edgeSensitivity;

      setIsNear(isInsideOrNear);
    },
    [edgeSensitivity]
  );

  const handleMouseLeave = useCallback(() => {
    setIsNear(false);
  }, []);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative rounded-[2px] p-[2px] overflow-hidden bg-[var(--desk-surface)] border-2 border-[var(--desk-border)] shadow-[0_10px_0_var(--btn-shadow)] transition-colors duration-300 ${className}`}
      {...props}
    >
      {/* 1. Dynamic Cursor-Tracking Glowing Border Overlay */}
      {isNear && mousePos && (
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none z-10 transition-opacity duration-200"
          style={{
            background: `radial-gradient(${glowRadius}px circle at ${mousePos.x}px ${mousePos.y}px, ${glowColor} 0%, rgba(220, 171, 223, 0.6) 35%, transparent 70%)`,
            WebkitMask: `
              linear-gradient(#fff 0 0) content-box, 
              linear-gradient(#fff 0 0)
            `,
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
            padding: `${borderWidth}px`,
          }}
        />
      )}

      {/* 2. Soft Ambient Edge Bloom */}
      {isNear && mousePos && (
        <div
          aria-hidden="true"
          className="absolute -inset-1 pointer-events-none z-0 filter blur-[8px] opacity-40 transition-opacity duration-200"
          style={{
            background: `radial-gradient(${glowRadius * 0.8}px circle at ${mousePos.x}px ${mousePos.y}px, ${glowColor} 0%, rgba(220, 171, 223, 0.4) 40%, transparent 75%)`,
          }}
        />
      )}

      {/* 3. Card Content */}
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </div>
  );
};
