'use client';

import React from 'react';
import { motion, HTMLMotionProps, useReducedMotion } from 'motion/react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export type TactileVariant = 'default' | 'primary' | 'accent' | 'danger' | 'ghost' | 'active' | 'inset' | 'image';
export type TactileSize = 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm';

export interface TactileButtonProps extends Omit<HTMLMotionProps<'button'>, 'size'> {
  variant?: TactileVariant;
  size?: TactileSize;
  active?: boolean;
  imageSrc?: string;
  children?: React.ReactNode;
  className?: string;
}

export const TactileButton = React.forwardRef<HTMLButtonElement, TactileButtonProps>(
  ({ variant = 'default', size = 'md', active = false, imageSrc, children, className, disabled, ...props }, ref) => {
    
    const shouldReduceMotion = useReducedMotion();

    // Resolve active state whether passed via `active` prop or `variant="active"`
    const isSelected = Boolean(active || variant === 'active');
    const isImageButton = Boolean(imageSrc);

    // Pixel-scaled sizing (sleek & compact)
    const sizeClasses = {
      'icon-sm': 'w-7 h-7 p-1 flex items-center justify-center text-xs',
      'icon': 'w-9 h-9 p-1 flex items-center justify-center text-sm',
      'sm': 'px-2.5 py-1 text-xs font-medium min-h-7',
      'md': 'px-3.5 py-1.5 text-sm font-medium min-h-9',
      'lg': 'px-5 py-2.5 text-base font-semibold min-h-11',
    }[size];

    // Alabaster, Thistle, Plum, and Wisteria theme styling
    const variantClasses = isImageButton
      ? isSelected
        ? 'bg-transparent border-0 p-0 rounded-[2px] ring-2 ring-[#c792df] shadow-[0_0_8px_rgba(199,146,223,0.55)]'
        : 'bg-transparent border-0 p-0 shadow-none'
      : {
          default: isSelected
            ? 'bg-accent-primary text-[#ffffff] border-border-dark shadow-[inset_0_2px_4px_rgba(58,46,76,0.3)]'
            : 'bg-surface-raised text-text-primary border-border-dark hover:bg-[#603B82] hover:border-[var(--accent-wisteria)] hover:shadow-[0_0_10px_rgba(199,146,223,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),inset_0_-1px_0_rgba(58,46,76,0.2)]',
          primary: isSelected
            ? 'bg-[#b673d3] text-[#ffffff] border-border-dark shadow-[inset_0_2px_4px_rgba(58,46,76,0.3)]'
            : 'bg-accent-primary text-text-primary font-bold border-border-dark hover:bg-[#d4a5ea] shadow-[inset_0_1px_0_rgba(255,255,255,0.8),inset_0_-1px_0_rgba(58,46,76,0.3)]',
          accent: isSelected
            ? 'bg-accent-primary text-[#ffffff] border-border-dark shadow-[inset_0_2px_4px_rgba(58,46,76,0.3)]'
            : 'bg-accent-secondary text-text-primary font-bold border-border-dark hover:bg-[#b673d3] shadow-[inset_0_1px_0_rgba(255,255,255,0.8),inset_0_-1px_0_rgba(58,46,76,0.3)]',
          danger: isSelected
            ? 'bg-[#c24e61] text-[#ffffff] border-border-dark shadow-[inset_0_2px_4px_rgba(58,46,76,0.3)]'
            : 'bg-danger text-[#ffffff] font-bold border-border-dark hover:bg-[#c24e61] shadow-[inset_0_1px_0_rgba(255,255,255,0.6),inset_0_-1px_0_rgba(58,46,76,0.3)]',
          ghost: 'bg-transparent text-text-secondary border-transparent hover:bg-[#603B82]/40 hover:text-[var(--text-heading)]',
          active: 'bg-accent-primary text-[#ffffff] border-border-dark shadow-[inset_0_2px_4px_rgba(58,46,76,0.3)]',
          inset: 'bg-surface-inset texture-dither text-text-primary border-border-dark shadow-[inset_0_2px_4px_rgba(58,46,76,0.25)]',
          image: isSelected
            ? 'bg-transparent border-0 p-0 rounded-[2px] ring-2 ring-[#c792df] shadow-[0_0_8px_rgba(199,146,223,0.55)]'
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
            scale: shouldReduceMotion ? 1 : 0.97, 
            y: shouldReduceMotion ? 0 : 1, 
            transition: { type: 'spring', stiffness: 420, damping: 28 } 
          },
          hover: { 
            scale: shouldReduceMotion ? 1 : (isSelected ? 0.98 : 1.025), 
            transition: { type: 'spring', stiffness: 420, damping: 28 } 
          },
          tap: { 
            scale: shouldReduceMotion ? 1 : 0.97, 
            y: shouldReduceMotion ? 0 : 1, 
            transition: { type: 'spring', stiffness: 550, damping: 22 } 
          }
        }}
        className={twMerge(
          clsx(
            'group relative select-none rounded-[2px] font-mono',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lamp focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
            !isImageButton && 'border-2',
            'transition-colors duration-150',
            'disabled:opacity-40 disabled:pointer-events-none',
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
              alt="Button Asset"
              className="w-full h-full object-contain pixelated pointer-events-none select-none transition-all duration-200"
              style={{
                imageRendering: 'pixelated',
                filter: isSelected
                  ? 'brightness(0.90) saturate(1.35) contrast(1.05)'
                  : 'none',
              }}
            />

            {/* Soft, rich lavender/plum glow tint when active/selected */}
            {isSelected && (
              <div className="absolute inset-0 bg-accent-primary/20 rounded-[2px] pointer-events-none shadow-[inset_0_1px_3px_rgba(58,46,76,0.3)]" />
            )}
          </div>
        ) : (
          <span className="relative z-0 flex items-center justify-center gap-1.5 leading-none">
            {children}
          </span>
        )}

        {/* Specular CC Light Sweep Gleam Animation across the entire button / PNG asset */}
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
