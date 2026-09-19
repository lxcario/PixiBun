'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useThemeStore } from '@/stores/themeStore';
import { PixelIcon } from '@/components/ui/PixelIcon';

export interface AppearancePopoverProps {
  className?: string;
}

export const AppearancePopover: React.FC<AppearancePopoverProps> = ({ className = '' }) => {
  const { studioTheme, setStudioTheme, colorScheme, setColorScheme } = useThemeStore();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const atelierRef = useRef<HTMLButtonElement>(null);
  const cozyRef = useRef<HTMLButtonElement>(null);
  const darkRef = useRef<HTMLButtonElement>(null);
  const lightRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState<{ top: number; right: number } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateCoords = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + 6,
        right: Math.max(12, window.innerWidth - rect.right),
      });
    }
  }, []);

  // Initial focus on open
  useEffect(() => {
    if (isOpen) {
      const timer = requestAnimationFrame(() => {
        if (studioTheme === 'cozy-classic') {
          cozyRef.current?.focus();
        } else {
          atelierRef.current?.focus();
        }
      });
      return () => cancelAnimationFrame(timer);
    }
  }, [isOpen, studioTheme]);

  useEffect(() => {
    if (!isOpen) return;
    updateCoords();

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    window.addEventListener('resize', updateCoords);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('resize', updateCoords);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, updateCoords]);

  const handleStyleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (studioTheme === 'atelier') {
        setStudioTheme('cozy-classic');
        cozyRef.current?.focus();
      } else {
        setStudioTheme('atelier');
        atelierRef.current?.focus();
      }
    }
  };

  const handleSchemeKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      if (colorScheme === 'dark') {
        setColorScheme('light');
        lightRef.current?.focus();
      } else {
        setColorScheme('dark');
        darkRef.current?.focus();
      }
    }
  };

  if (!mounted) {
    return <div className={`w-6 h-6 rounded-[1px] ${className}`} aria-hidden="true" />;
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        title="Appearance (Theme & Color Scheme)"
        aria-label="Appearance (Theme & Color Scheme)"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        data-testid="appearance-button"
        className={`w-6 h-6 flex items-center justify-center rounded-[1px] pixel-tactile-btn border border-[var(--desk-border)] text-[var(--text-body)] hover:text-[var(--text-heading)] cursor-pointer select-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-wisteria)] ${
          isOpen ? 'bg-[var(--surface-2)] text-[var(--text-heading)] font-bold' : ''
        } ${className}`}
      >
        {/* Pixel-native Palette/Appearance icon */}
        <PixelIcon name="palette" size={12} />
      </button>

      {isOpen &&
        coords &&
        createPortal(
          <div
            ref={popoverRef}
            role="dialog"
            aria-modal="false"
            aria-label="Appearance settings"
            className="fixed z-[9999] w-64 bg-[var(--desk-surface)] border border-[var(--desk-border)] rounded-[3px] shadow-2xl p-3 text-xs font-sans text-[var(--text-heading)] select-none animate-in fade-in zoom-in-95 duration-100"
            style={{
              top: `${coords.top}px`,
              right: `${coords.right}px`,
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-[var(--desk-border)]">
              <span className="font-semibold text-[11px] tracking-wide text-[var(--text-heading)]">
                Appearance
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  triggerRef.current?.focus();
                }}
                aria-label="Close appearance popover"
                className="w-4 h-4 rounded-[1px] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-heading)] hover:bg-[var(--surface-1)] cursor-pointer text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-wisteria)]"
              >
                ✕
              </button>
            </div>

            {/* Studio Style Section */}
            <div
              role="radiogroup" tabIndex={-1}
              aria-label="Studio style"
              onKeyDown={handleStyleKeyDown}
              className="flex flex-col gap-1.5 mb-3"
            >
              <span className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider" id="studio-style-label">
                Studio style
              </span>

              {/* Atelier Option */}
              <button
                ref={atelierRef}
                type="button"
                role="radio"
                aria-checked={studioTheme === 'atelier'}
                data-testid="theme-option-atelier"
                onClick={() => setStudioTheme('atelier')}
                className={`flex items-start gap-2.5 p-2 rounded-[2px] border text-left cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-wisteria)] ${
                  studioTheme === 'atelier'
                    ? 'bg-[var(--surface-2)] border-[var(--accent-wisteria)] text-[var(--text-heading)]'
                    : 'bg-[var(--surface-0)] border-[var(--desk-border)] text-[var(--text-body)] hover:bg-[var(--surface-1)] hover:text-[var(--text-heading)]'
                }`}
              >
                <div className="pt-0.5 shrink-0 text-[11px] font-mono text-[var(--accent-gold)]" aria-hidden="true">
                  {studioTheme === 'atelier' ? '●' : '○'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-semibold text-xs text-[var(--text-heading)]">Atelier</span>
                    {/* Abstract 3-surface swatch preview */}
                    <div className="flex items-center gap-0.5 shrink-0" aria-hidden="true">
                      <span className="w-2.5 h-2.5 rounded-[1px] border border-black/40 bg-[#16141a]" title="Charcoal Base" />
                      <span className="w-2.5 h-2.5 rounded-[1px] border border-black/40 bg-[#201d26]" title="Workbench Surface" />
                      <span className="w-2.5 h-2.5 rounded-[1px] border border-black/40 bg-[#e5a962]" title="Warm Brass" />
                    </div>
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-snug">
                    Quiet, crafted workbench
                  </p>
                </div>
              </button>

              {/* Cozy Classic Option */}
              <button
                ref={cozyRef}
                type="button"
                role="radio"
                aria-checked={studioTheme === 'cozy-classic'}
                data-testid="theme-option-cozy-classic"
                onClick={() => setStudioTheme('cozy-classic')}
                className={`flex items-start gap-2.5 p-2 rounded-[2px] border text-left cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-gold)] ${
                  studioTheme === 'cozy-classic'
                    ? 'bg-[var(--surface-2)] border-[var(--accent-gold)] text-[var(--text-heading)]'
                    : 'bg-[var(--surface-0)] border-[var(--desk-border)] text-[var(--text-body)] hover:bg-[var(--surface-1)] hover:text-[var(--text-heading)]'
                }`}
              >
                <div className="pt-0.5 shrink-0 text-[11px] font-mono text-[var(--accent-gold)]" aria-hidden="true">
                  {studioTheme === 'cozy-classic' ? '●' : '○'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-semibold text-xs text-[var(--text-heading)]">Cozy Classic</span>
                    {/* Abstract 3-surface swatch preview */}
                    <div className="flex items-center gap-0.5 shrink-0" aria-hidden="true">
                      <span className="w-2.5 h-2.5 rounded-[1px] border border-black/40 bg-[#140c1e]" title="Plum Base" />
                      <span className="w-2.5 h-2.5 rounded-[1px] border border-black/40 bg-[#201431]" title="Lavender Surface" />
                      <span className="w-2.5 h-2.5 rounded-[1px] border border-black/40 bg-[#f0be7c]" title="Golden Amber" />
                    </div>
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-snug">
                    Warm original PixiBun
                  </p>
                </div>
              </button>
            </div>

            {/* Color Scheme Section - Compact pixel-native segmented control */}
            <div className="flex flex-col gap-1.5 pt-2 border-t border-[var(--desk-border)]">
              <span className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider" id="color-scheme-label">
                Color scheme
              </span>
              <div
                role="radiogroup" tabIndex={-1}
                aria-label="Color scheme"
                onKeyDown={handleSchemeKeyDown}
                className="flex p-0.5 bg-[var(--surface-0)] border border-[var(--desk-border)] rounded-[2px] gap-0.5"
              >
                <button
                  ref={darkRef}
                  type="button"
                  role="radio"
                  aria-checked={colorScheme === 'dark'}
                  data-testid="scheme-option-dark"
                  onClick={() => setColorScheme('dark')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-[1px] text-xs font-sans transition-colors cursor-pointer select-none border pixel-tactile-btn focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-wisteria)] ${
                    colorScheme === 'dark'
                      ? 'bg-[var(--surface-2)] border-[var(--desk-border-highlight)] text-[var(--text-heading)] font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.3)]'
                      : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-heading)]'
                  }`}
                >
                  <svg
                    viewBox="0 0 16 16"
                    width="11"
                    height="11"
                    fill="currentColor"
                    shapeRendering="crispEdges"
                    className="pixelated shrink-0"
                    aria-hidden="true"
                  >
                    <path d="M12 9.5A5.5 5.5 0 0 1 6.5 4a5.55 5.55 0 0 1 .45-2.2A6 6 0 1 0 14.2 8.9c-.68.4-1.45.6-2.2.6z" />
                  </svg>
                  <span>Dark</span>
                </button>

                <button
                  ref={lightRef}
                  type="button"
                  role="radio"
                  aria-checked={colorScheme === 'light'}
                  data-testid="scheme-option-light"
                  onClick={() => setColorScheme('light')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-[1px] text-xs font-sans transition-colors cursor-pointer select-none border pixel-tactile-btn focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-wisteria)] ${
                    colorScheme === 'light'
                      ? 'bg-[var(--surface-2)] border-[var(--desk-border-highlight)] text-[var(--text-heading)] font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.3)]'
                      : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-heading)]'
                  }`}
                >
                  <svg
                    viewBox="0 0 16 16"
                    width="11"
                    height="11"
                    fill="currentColor"
                    shapeRendering="crispEdges"
                    className="pixelated shrink-0"
                    aria-hidden="true"
                  >
                    <circle cx="8" cy="8" r="3" />
                    <rect x="7" y="1" width="2" height="2" />
                    <rect x="7" y="13" width="2" height="2" />
                    <rect x="1" y="7" width="2" height="2" />
                    <rect x="13" y="7" width="2" height="2" />
                    <rect x="3" y="3" width="2" height="2" />
                    <rect x="11" y="11" width="2" height="2" />
                    <rect x="11" y="3" width="2" height="2" />
                    <rect x="3" y="11" width="2" height="2" />
                  </svg>
                  <span>Light</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
