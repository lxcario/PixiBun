'use client';

import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { useThemeStore } from '@/stores/themeStore';

export const ThemeToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { theme, toggleTheme, setTheme } = useThemeStore();
  const shouldReduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('pixibun-theme');
    if (saved === 'light' || saved === 'dark') {
      setTheme(saved);
    }
  }, [setTheme]);

  if (!mounted) {
    return (
      <div className={`w-14 h-7 rounded-[2px] bg-[#1e1730] border-2 border-[#3a2e4c] ${className}`} />
    );
  }

  const isLight = theme === 'light';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isLight ? 'Switch to Cozy Midnight (Dark)' : 'Switch to Morning Atelier (Light)'}
      aria-label="Toggle Theme"
      className={`group relative w-14 h-7 rounded-[2px] border-2 p-0.5 flex items-center cursor-pointer select-none transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0be7c] ${
        isLight
          ? 'bg-[#e4dde8] border-[#4a3a5e] shadow-[inset_0_2px_3px_rgba(74,58,94,0.2),0_2px_0_#4a3a5e]'
          : 'bg-[#181024] border-[#3a2e4c] shadow-[inset_0_2px_4px_rgba(0,0,0,0.6),0_2px_0_#130e20]'
      } ${className}`}
    >
      {/* Background Track Icons */}
      <div className="absolute inset-0 flex items-center justify-between px-1.5 pointer-events-none text-[10px] font-mono leading-none">
        {/* Day Sun in background */}
        <span
          className={`transition-opacity duration-200 ${
            isLight ? 'opacity-0' : 'opacity-60 group-hover:opacity-100 text-[#f0be7c]'
          }`}
        >
          <svg viewBox="0 0 10 10" width="10" height="10" fill="currentColor" className="pixelated">
            <rect x="3" y="3" width="4" height="4" />
            <rect x="4" y="1" width="2" height="1" />
            <rect x="4" y="8" width="2" height="1" />
            <rect x="1" y="4" width="1" height="2" />
            <rect x="8" y="4" width="1" height="2" />
          </svg>
        </span>
        {/* Night Moon in background */}
        <span
          className={`transition-opacity duration-200 ${
            isLight ? 'opacity-60 group-hover:opacity-100 text-[#564366]' : 'opacity-0'
          }`}
        >
          <svg viewBox="0 0 10 10" width="10" height="10" fill="currentColor" className="pixelated">
            <path d="M7 1A4 4 0 0 0 3 5a4 4 0 0 0 4 4 4 4 0 0 0 2-.5A4.5 4.5 0 0 1 5 4.5 4.5 4.5 0 0 1 8.5 1z" />
          </svg>
        </span>
      </div>

      {/* Sliding Tactile Knob */}
      <motion.div
        transition={{
          type: 'spring',
          stiffness: 550,
          damping: 32,
        }}
        animate={{
          x: isLight ? 28 : 0,
        }}
        className={`relative z-10 w-5 h-5 rounded-[1px] border flex items-center justify-center shadow-md transition-colors duration-200 ${
          isLight
            ? 'bg-[#ffffff] border-[#4a3a5e] text-[#c9842a] shadow-[0_2px_4px_rgba(74,58,94,0.3)]'
            : 'bg-[#281c3c] border-[#f0be7c] text-[#f0be7c] shadow-[0_2px_4px_rgba(0,0,0,0.7)]'
        }`}
      >
        {isLight ? (
          // Radiant Morning Sun Sprite
          <motion.svg
            key="sun"
            viewBox="0 0 16 16"
            width="12"
            height="12"
            fill="currentColor"
            initial={shouldReduceMotion ? {} : { rotate: -90, scale: 0.6 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ duration: 0.25 }}
            className="pixelated"
          >
            <circle cx="8" cy="8" r="3.5" fill="#c9842a" />
            <circle cx="8" cy="8" r="2.5" fill="#f0be7c" />
            {/* Sun Rays */}
            <rect x="7" y="1" width="2" height="1.5" fill="#c9842a" />
            <rect x="7" y="13.5" width="2" height="1.5" fill="#c9842a" />
            <rect x="1" y="7" width="1.5" height="2" fill="#c9842a" />
            <rect x="13.5" y="7" width="1.5" height="2" fill="#c9842a" />
            <rect x="3" y="3" width="1.5" height="1.5" fill="#c9842a" />
            <rect x="11.5" y="11.5" width="1.5" height="1.5" fill="#c9842a" />
            <rect x="11.5" y="3" width="1.5" height="1.5" fill="#c9842a" />
            <rect x="3" y="11.5" width="1.5" height="1.5" fill="#c9842a" />
          </motion.svg>
        ) : (
          // Cozy Crescent Moon Sprite
          <motion.svg
            key="moon"
            viewBox="0 0 16 16"
            width="12"
            height="12"
            fill="none"
            initial={shouldReduceMotion ? {} : { rotate: 90, scale: 0.6 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ duration: 0.25 }}
            className="pixelated"
          >
            <path
              d="M12 9.5A5.5 5.5 0 0 1 6.5 4a5.55 5.55 0 0 1 .45-2.2A6 6 0 1 0 14.2 8.9c-.68.4-1.45.6-2.2.6z"
              fill="#f0be7c"
            />
            {/* Twinkling star */}
            <rect x="11" y="2" width="2" height="2" fill="#fff8db" />
            <rect x="12" y="1" width="1" height="1" fill="#fff8db" />
          </motion.svg>
        )}
      </motion.div>
    </button>
  );
};
