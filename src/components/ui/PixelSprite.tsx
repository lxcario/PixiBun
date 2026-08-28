'use client';

import React from 'react';
import Image from 'next/image';

interface PixelSpriteProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  'aria-hidden'?: boolean | 'true' | 'false';
  style?: React.CSSProperties;
}

export const PixelSprite: React.FC<PixelSpriteProps> = ({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
  'aria-hidden': ariaHidden,
  style,
}) => {
  return (
    <Image
      src={src}
      alt={alt}
      width={width || 300}
      height={height || 200}
      priority={priority}
      unoptimized // Guarantees Next.js won't blur or interpolate pixel art edges
      aria-hidden={ariaHidden}
      className={`pixelated select-none pointer-events-none object-contain ${className}`}
      style={{
        imageRendering: 'pixelated',
        ...style,
      }}
    />
  );
};
