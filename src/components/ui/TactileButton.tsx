'use client';

import React from 'react';
import { motion, HTMLMotionProps, useReducedMotion } from 'motion/react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export type TactileVariant = 'default' | 'primary' | 'accent' | 'danger' | 'ghost' | 'active' | 'inset' | 'image' | 'tactile' | 'toggle';
export type TactileSize = 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm';

export interface TactileButtonProps extends Omit<HTMLMotionProps<'button'>, 'size'> {
  variant?: TactileVariant;
  size?: TactileSize;
  active?: boolean;
  imageSrc?: string;
  imageAlt?: string;
  children?: React.ReactNode;
  className?: string;
}

export const TactileButton = React.forwardRef<HTMLButtonElement, TactileButtonProps>(
  ({ variant = 'default', size = 'md', active = false, imageSrc, imageAlt, children, className, disabled, ...props }, ref) => {
    
    const shouldReduceMotion = useReducedMotion();

    // Resolve active state whether passed via `active` prop or `variant="active"`
    const isSelected = Boolean(active || variant === 'active');
    const isImageButton = Boolean(imageSrc);

    // Pixel-scaled sizing (sleek & compact)
    const sizeClasses = {
      'icon-sm': 'w-7 h-7 p-1 flex items-center justify-center text-xs',
      'icon': 'w-9 h-9 p-1 flex items-center justify-center text-sm',
      'sm': 'px-2.5 py-0.5 text-xs font-medium h-7',
      'md': 'px-3.5 py-1.5 text-sm font-medium h-9',
      'lg': 'px-5 py-2.5 text-base font-semibold h-11',
    }[size];

    // Alabaster, Thistle, Plum, and Wisteria theme styling
    const variantClasses = isImageButton
      ? isSelected
        ? 'bg-transparent border-0 p-0 rounded-[2px] ring-2 ring-[var(--accent-gold)] shadow-[0_0_8px_rgba(240,190,124,0.55)]'
        : 'bg-transparent border-0 p-0 shadow-none'
      : {
          default: isSelected
            ? 'pixel-tactile-btn bg-[var(--surface-3)] text-[var(--accent-gold)] border-[var(--accent-gold)] shadow-[inset_1px_1px_0_rgba(229,169,98,0.2),0_1px_0px_var(--btn-shadow)]'
            : 'pixel-tactile-btn tactile-motion-btn text-[var(--text-heading)] border-[var(--desk-border)]',
          tactile: isSelected
            ? 'pixel-tactile-btn bg-[var(--surface-3)] text-[var(--accent-gold)] border-[var(--accent-gold)] shadow-[inset_1px_1px_0_rgba(229,169,98,0.2),0_1px_0px_var(--btn-shadow)]'
            : 'pixel-tactile-btn tactile-motion-btn text-[var(--btn-text)] border-[var(--btn-border)]',
          primary: isSelected
            ? 'pixel-primary-btn tactile-motion-btn font-bold shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]'
            : 'pixel-primary-btn tactile-motion-btn',
          accent: isSelected
            ? 'pixel-tactile-btn bg-[var(--surface-3)] text-[var(--accent-gold)] border-[var(--accent-gold)] shadow-[inset_1px_1px_0_rgba(229,169,98,0.2),0_1px_0px_var(--btn-shadow)]'
            : 'pixel-tactile-btn tactile-motion-btn text-[var(--text-heading)] border-[var(--desk-border)] hover:bg-[var(--surface-2)]',
          danger: 'pixel-tactile-btn tactile-motion-btn bg-[var(--surface-0)] text-[var(--state-danger)] border-[var(--state-danger)]/40 shadow-[0_2px_0_var(--btn-shadow)] hover:bg-[var(--state-danger)] hover:text-[#ffffff] hover:border-[var(--state-danger)] active:shadow-[inset_1px_1px_0px_rgba(0,0,0,0.4)]',
          ghost: 'bg-transparent text-[var(--text-body)] border-transparent shadow-none hover:bg-[var(--state-hover)] hover:text-[var(--text-heading)]',
          toggle: isSelected
            ? 'pixel-tactile-btn bg-[var(--surface-2)] text-[var(--accent-gold)] border-[var(--accent-gold)] shadow-[inset_1px_1px_0_rgba(229,169,98,0.15),0_1px_0px_var(--btn-shadow)] font-bold'
            : 'pixel-tactile-btn tactile-motion-btn text-[var(--text-body)] border-[var(--btn-border)]',
          active: 'pixel-tactile-btn bg-[var(--surface-3)] text-[var(--accent-gold)] border-[var(--accent-gold)] shadow-[inset_1px_1px_0_rgba(229,169,98,0.2),0_1px_0px_var(--btn-shadow)]',
          inset: 'bg-[var(--surface-0)] text-[var(--text-body)] border-[var(--desk-border)] shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]',
          image: isSelected
            ? 'bg-transparent border-0 p-0 rounded-[2px] ring-2 ring-[var(--accent-gold)] shadow-[0_0_8px_rgba(240,190,124,0.55)]'
            : 'bg-transparent border-0 p-0 shadow-none',
        }[variant];

    return (
      <motion.button
        ref={ref}
        disabled={disabled}
        initial="rest"
        animate={isSelected ? "active" : "rest"}
        whileHover={disabled ? undefined : "hover"}
        whileTap={disabled ? undefined : "tap"}
        variants={{
          rest: { scale: 1, y: 0 },
          active: { 
            scale: 1, 
            y: 0, 
            transition: { duration: 0.08, ease: 'easeOut' } 
          },
          hover: { 
            scale: 1,
            y: shouldReduceMotion ? 0 : -1,
            transition: { duration: 0.1, ease: 'easeOut' } 
          },
          tap: { 
            scale: 1, 
            y: shouldReduceMotion ? 0 : 1, 
            transition: { duration: 0.05, ease: 'easeOut' } 
          }
        }}
        className={twMerge(
          clsx(
            'group relative select-none rounded-[2px] font-sans',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--desk-surface)]',
            !isImageButton && 'border',
            'transition-colors duration-100',
            'disabled:opacity-40 disabled:cursor-not-allowed',
            'overflow-hidden',
            sizeClasses,
            variantClasses,
            className
          )
        )}
        {...props}
      >
        {/* If this is a direct PNG asset button, render the PNG image */}
        {imageSrc ? (
          <div className="relative w-full h-full flex items-center justify-center">
            <img
              src={imageSrc}
              alt={imageAlt ?? ((props['aria-label']) || '')}
              className="w-full h-full object-contain pixelated pointer-events-none select-none transition-all duration-150"
              style={{
                imageRendering: 'pixelated',
                filter: isSelected
                  ? 'brightness(0.95) contrast(1.05)'
                  : 'none',
              }}
            />
            {isSelected && (
              <div className="absolute inset-0 bg-[var(--accent-gold)]/10 rounded-[2px] pointer-events-none" />
            )}
          </div>
        ) : (
          <span className="relative z-0 flex items-center justify-center gap-1.5 leading-none">
            {children}
          </span>
        )}

        {/* Specular CC Light Sweep Gleam Animation across enabled non-ghost buttons */}
        {!disabled && variant !== 'ghost' && !shouldReduceMotion && (
          <motion.div
            variants={{
              rest: {
                x: '-160%',
                opacity: 0,
                transition: { duration: 0.45, ease: [0.25, 1, 0.5, 1] }
              },
              active: {
                x: '-160%',
                opacity: 0,
              },
              hover: {
                x: '160%',
                opacity: 1,
                transition: { duration: 0.55, ease: [0.25, 1, 0.5, 1] }
              },
              tap: {
                opacity: 0.25,
                transition: { duration: 0.1 }
              }
            }}
            className="pointer-events-none absolute inset-0 z-10 h-[200%] w-[80%] -top-[50%]"
            style={{
              background: 'linear-gradient(115deg, transparent 0%, rgba(220,171,223,0.15) 20%, rgba(255,255,255,0.75) 50%, rgba(220,171,223,0.15) 80%, transparent 100%)',
              transformOrigin: 'center center'
            }}
          />
        )}
      </motion.button>
    );
  }
);

TactileButton.displayName = 'TactileButton';
