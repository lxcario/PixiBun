'use client';

import React from 'react';
import { useThemeStore } from '@/stores/themeStore';

interface ShinyTextProps {
  text: string;
  className?: string;
  speed?: number;
}

/**
 * 16-Bit Specular Gold & Plum ShinyText (PixiBun Edition)
 * High-contrast metallic gradient with continuous specular light sweep.
 * In Light Mode: Deep Royal Wisteria & Golden Amber (100% readable on light paper).
 * In Dark Mode: Luminescent Golden Amber & White Specular Gleam.
 */
export const ShinyText: React.FC<ShinyTextProps> = ({
  text,
  className = '',
  speed = 2.8,
}) => {
  const { theme } = useThemeStore();
  const isLight = theme === 'light';

  return (
    <span
      className={`inline-block font-display font-bold tracking-wider uppercase select-none ${className}`}
      style={{
        backgroundImage: isLight
          ? 'linear-gradient(90deg, #7a2b94 0%, #a448c4 20%, #d97d16 45%, #f2a73a 50%, #d97d16 55%, #a448c4 80%, #7a2b94 100%)'
          : 'linear-gradient(90deg, #d88e28 0%, #f0be7c 20%, #ffffff 48%, #fff8db 52%, #f0be7c 80%, #d88e28 100%)',
        backgroundSize: '200% auto',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        color: 'transparent',
        animation: `goldShimmer ${speed}s linear infinite`,
        display: 'inline-block',
      }}
    >
      {text}
    </span>
  );
};
