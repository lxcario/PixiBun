import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface TactilePanelProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'raised' | 'inset' | 'flat' | 'canvas-frame';
  children?: React.ReactNode;
  className?: string;
}

export const TactilePanel = React.forwardRef<HTMLDivElement, TactilePanelProps>(
  ({ variant = 'raised', children, className, ...props }, ref) => {
    const variantClasses = {
      raised: 'bg-surface border-2 border-border-dark shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_2px_4px_rgba(58,46,76,0.15)] rounded-[4px]',
      inset: 'bg-surface-inset texture-dither border-2 border-border-dark shadow-[inset_0_2px_4px_rgba(58,46,76,0.25)] rounded-[4px]',
      flat: 'bg-accent-tertiary border border-[#a08fae] rounded-[4px]',
      'canvas-frame': 'bg-canvas-outer border-2 border-border-dark shadow-[inset_0_2px_6px_rgba(58,46,76,0.2)] rounded-[4px]',
    }[variant];

    return (
      <div
        ref={ref}
        className={twMerge(
          clsx('transition-all', variantClasses, className)
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

TactilePanel.displayName = 'TactilePanel';
