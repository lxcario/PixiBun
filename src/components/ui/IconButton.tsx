'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { PixelIcon, PixelIconName } from '@/components/ui/PixelIcon';

interface IconButtonProps {
  icon: PixelIconName;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  label: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'ghost' | 'surface' | 'danger';
  active?: boolean;
  disabled?: boolean;
  className?: string;
}

export default function IconButton({
  icon,
  onClick,
  label,
  size = 'md',
  variant = 'ghost',
  active = false,
  disabled = false,
  className,
}: IconButtonProps) {
  const sizeClasses = {
    sm: 'w-[24px] h-[24px]',
    md: 'w-[28px] h-[28px]',
    lg: 'w-[32px] h-[32px]',
  }[size];

  const iconSizes = {
    sm: 14,
    md: 16,
    lg: 20,
  }[size];

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      disabled={disabled}
      className={twMerge(
        clsx(
          'flex items-center justify-center rounded-[var(--radius-sm)] transition-colors duration-100 ease-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--desk-surface)]',
          sizeClasses,

          disabled && 'opacity-40 cursor-not-allowed',
          
          !disabled && variant === 'ghost' && !active && 'bg-transparent hover:bg-[var(--state-hover)] active:bg-[var(--state-active)] text-[var(--text-body)] hover:text-[var(--text-heading)]',
          !disabled && variant === 'surface' && !active && 'bg-[var(--surface-2)] hover:bg-[var(--state-hover)] text-[var(--text-body)] hover:text-[var(--text-heading)]',
          !disabled && variant === 'danger' && !active && 'bg-transparent hover:bg-[var(--state-danger)] text-[var(--text-body)] hover:text-[#ffffff]',
          
          active && !disabled && 'bg-[var(--surface-2)] shadow-[inset_2px_0_0_var(--accent-gold)] text-[var(--text-heading)]',
          !active && 'shadow-[inset_2px_0_0_transparent]', // Ensure no layout shift
          
          className
        )
      )}
    >
      <PixelIcon name={icon} size={iconSizes} />
    </button>
  );
}
