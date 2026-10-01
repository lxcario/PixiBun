'use client';

import React from 'react';
import { BunMascot } from '@/components/ui/BunMascot';

export interface PixiBunLogoProps {
  /** Size scale: 'sm' (compact/rail), 'md' (standard nav), 'lg' (hero/errors). */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to render the 'ATELIER' subtitle under 'PIXIBUN' (default true). */
  showSubtitle?: boolean;
  /** Optional responsive treatment of the wordmark; the mascot stays visible. */
  wordmarkClassName?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const PixiBunLogo: React.FC<PixiBunLogoProps> = ({
  size = 'md',
  showSubtitle = true,
  wordmarkClassName = '',
  className = '',
  style,
}) => {
  const sizeConfig = {
    sm: {
      tile: 'w-7 h-7 p-0.5',
      mascot: 18,
      title: 'text-xs tracking-wider',
      subtitle: 'text-[9px] mt-0.5',
      gap: 'gap-2',
    },
    md: {
      tile: 'w-8 h-8 p-0.5',
      mascot: 22,
      title: 'text-sm tracking-wider',
      subtitle: 'text-[10px] mt-0.5',
      gap: 'gap-2.5',
    },
    lg: {
      tile: 'w-10 h-10 p-1',
      mascot: 28,
      title: 'text-base tracking-widest',
      subtitle: 'text-xs mt-1',
      gap: 'gap-3',
    },
  }[size];

  return (
    <div
      className={`inline-flex items-center ${sizeConfig.gap} select-none ${className}`}
      style={style}
    >
      <div
        className={`${sizeConfig.tile} flex items-center justify-center bg-[var(--desk-surface-raised)] border-2 border-[var(--desk-border)] rounded-[2px] shadow-sm shrink-0`}
      >
        <BunMascot size={sizeConfig.mascot} animate />
      </div>
      <div className={`flex flex-col leading-none ${wordmarkClassName}`}>
        <span
          className={`font-display font-bold ${sizeConfig.title} text-[var(--text-heading)]`}
        >
          PIXIBUN
        </span>
        {showSubtitle && (
          <span
            className={`font-mono tracking-tight text-[var(--accent-gold)] ${sizeConfig.subtitle}`}
          >
            ATELIER
          </span>
        )}
      </div>
    </div>
  );
};
