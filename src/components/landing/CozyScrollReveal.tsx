'use client';

import React from 'react';
import { motion, useReducedMotion, type Variants } from 'motion/react';

export type ScrollRevealVariant = 'fade-up' | 'slide-left' | 'slide-right' | 'scale-up' | 'fade';

interface CozyScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delayMs?: number;
  variant?: ScrollRevealVariant;
  showPixelCorners?: boolean;
  once?: boolean;
  amount?: number | 'some' | 'all';
}

const VARIANTS_MAP: Record<ScrollRevealVariant, Variants> = {
  'fade-up': {
    hidden: { opacity: 0, y: 28 },
    visible: { opacity: 1, y: 0 },
  },
  'slide-left': {
    hidden: { opacity: 0, x: -32 },
    visible: { opacity: 1, x: 0 },
  },
  'slide-right': {
    hidden: { opacity: 0, x: 32 },
    visible: { opacity: 1, x: 0 },
  },
  'scale-up': {
    hidden: { opacity: 0, scale: 0.95, y: 16 },
    visible: { opacity: 1, scale: 1, y: 0 },
  },
  fade: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  },
};

export const PixelCorners: React.FC<{
  color?: string;
  className?: string;
}> = ({
  color = 'var(--accent-gold)',
  className = '',
}) => (
  <div
    className={`absolute inset-0 pointer-events-none select-none z-20 ${className}`}
    aria-hidden="true"
  >
    {/* Top-Left Corner */}
    <span
      className="absolute top-1 left-1 w-2.5 h-2.5 border-t-2 border-l-2"
      style={{ borderColor: color }}
    />
    {/* Top-Right Corner */}
    <span
      className="absolute top-1 right-1 w-2.5 h-2.5 border-t-2 border-r-2"
      style={{ borderColor: color }}
    />
    {/* Bottom-Left Corner */}
    <span
      className="absolute bottom-1 left-1 w-2.5 h-2.5 border-b-2 border-l-2"
      style={{ borderColor: color }}
    />
    {/* Bottom-Right Corner */}
    <span
      className="absolute bottom-1 right-1 w-2.5 h-2.5 border-b-2 border-r-2"
      style={{ borderColor: color }}
    />
  </div>
);

export const CozyScrollReveal: React.FC<CozyScrollRevealProps> = ({
  children,
  className = '',
  delayMs = 0,
  variant = 'fade-up',
  showPixelCorners = false,
  once = true,
  amount = 0.12,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const selectedVariants = VARIANTS_MAP[variant] || VARIANTS_MAP['fade-up'];

  return (
    <motion.div
      initial="hidden"
      animate={shouldReduceMotion ? 'visible' : undefined}
      whileInView="visible"
      viewport={{ once, amount, margin: '120px 0px 120px 0px' }}
      variants={selectedVariants}
      transition={{
        duration: shouldReduceMotion ? 0 : 0.5,
        delay: shouldReduceMotion ? 0 : delayMs / 1000,
        ease: [0.22, 1, 0.36, 1], // Tactile smooth cubic-bezier easing
      }}
      className={`relative w-full ${className}`}
    >
      {showPixelCorners && <PixelCorners />}
      {children}
    </motion.div>
  );
};

