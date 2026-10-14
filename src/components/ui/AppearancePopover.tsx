'use client';

import React, { useState, useRef, useEffect, useCallback, useId } from 'react';
import { createPortal } from 'react-dom';
import { useThemeStore, type StudioTheme } from '@/stores/themeStore';
import { STUDIO_THEMES } from '@/lib/theme/registry';
import { usePreferencesStore } from '@/stores/preferencesStore';
import { PixelIcon, type PixelIconName } from '@/components/ui/PixelIcon';
import StudioToggle from '@/components/ui/StudioToggle';
import {
  isToolPreviewsDisabled,
  setToolPreviewsDisabled,
  TOOL_PREVIEWS_CHANGED_EVENT,
} from '@/components/ui/ToolMotionPreview';

export interface AppearancePopoverProps {
  className?: string;
  label?: string;
  /** Optional studio actions share this panel without another submenu. */
  actions?: Array<{ label: string; icon: PixelIconName; onSelect?: () => void; testId?: string; ariaLabel?: string }>;
}

/** Theme ids, names and palettes come from src/lib/theme/themes.json. */
const STUDIO_STYLES = STUDIO_THEMES;

export const AppearancePopover: React.FC<AppearancePopoverProps> = ({ className = '', label, actions }) => {
  const dialogId = useId();
  const { studioTheme, setStudioTheme, colorScheme, setColorScheme } = useThemeStore();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const styleRefs = useRef<Partial<Record<StudioTheme, HTMLButtonElement | null>>>({});
  const darkRef = useRef<HTMLButtonElement>(null);
  const lightRef = useRef<HTMLButtonElement>(null);
  const firstActionRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState<{ top: number; right: number } | null>(null);

  const [toolPreviewsEnabled, setToolPreviewsEnabled] = useState(true);
  const tipsEnabled = usePreferencesStore((s) => s.tipsEnabled);
  const setTipsEnabled = usePreferencesStore((s) => s.setTipsEnabled);
  const requestWelcome = usePreferencesStore((s) => s.requestWelcome);

  useEffect(() => {
    setMounted(true);
    const sync = () => {
      setToolPreviewsEnabled(!isToolPreviewsDisabled());
    };
    sync();
    window.addEventListener('storage', sync);
    window.addEventListener(TOOL_PREVIEWS_CHANGED_EVENT, sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener(TOOL_PREVIEWS_CHANGED_EVENT, sync);
    };
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
    if (isOpen && coords && !popoverRef.current?.contains(document.activeElement)) {
      const timer = requestAnimationFrame(() => {
        if (popoverRef.current?.contains(document.activeElement)) return;
        if (firstActionRef.current) {
          firstActionRef.current.focus();
        } else {
          styleRefs.current[studioTheme]?.focus();
        }
      });
      return () => cancelAnimationFrame(timer);
    }
  }, [isOpen, studioTheme, coords]);

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
    if (['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      const forward = e.key === 'ArrowDown' || e.key === 'ArrowRight';
      const index = STUDIO_STYLES.findIndex((style) => style.id === studioTheme);
      const next = STUDIO_STYLES[(index + (forward ? 1 : STUDIO_STYLES.length - 1)) % STUDIO_STYLES.length].id;
      setStudioTheme(next);
      styleRefs.current[next]?.focus();
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
    return <div className={`${label ? 'w-[72px]' : 'w-7'} h-7 rounded-[1px] ${className}`} aria-hidden="true" />;
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        title={actions ? 'Studio: theme, co-draw and help' : 'Appearance (Theme & Color Scheme)'}
        aria-label={actions ? 'Studio options' : 'Appearance (Theme & Color Scheme)'}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-controls={isOpen && coords ? dialogId : undefined}
        data-testid="appearance-button"
        className={`${label ? 'px-2.5 gap-1.5 text-xs' : 'w-7'} h-7 flex items-center justify-center rounded-[1px] pixel-tactile-btn border border-[var(--desk-border)] text-[var(--text-body)] hover:text-[var(--text-heading)] cursor-pointer select-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-wisteria)] ${
          isOpen ? 'bg-[var(--surface-2)] text-[var(--text-heading)] font-bold' : ''
        } ${className}`}
      >
        {/* Pixel-native Palette/Appearance icon */}
        {!actions && <PixelIcon name="palette" size={12} />}
        {label && <span>{label}</span>}
        {actions && <span aria-hidden="true" className="text-[8px]">▼</span>}
      </button>

      {isOpen &&
        coords &&
        createPortal(
          <div
            ref={popoverRef}
            id={dialogId}
            role="dialog"
            aria-modal="false"
            aria-label={actions ? 'Studio options' : 'Appearance settings'}
            className="fixed z-[9999] w-72 max-w-[calc(100vw-24px)] overflow-y-auto bg-[var(--desk-surface)] border border-[var(--desk-border)] rounded-[3px] shadow-2xl p-3 text-xs font-sans text-[var(--text-heading)] select-none animate-in fade-in zoom-in-95 duration-100"
            style={{
              top: `${coords.top}px`,
              right: `${coords.right}px`,
              maxHeight: `calc(100dvh - ${coords.top + 12}px)`,
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-[var(--desk-border)]">
              <span className="font-semibold text-[11px] tracking-wide text-[var(--text-heading)]">
                {actions ? 'Studio' : 'Appearance'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  triggerRef.current?.focus();
                }}
                aria-label={actions ? 'Close studio options' : 'Close appearance popover'}
                className="w-6 h-6 rounded-[1px] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-heading)] hover:bg-[var(--surface-1)] cursor-pointer text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-wisteria)]"
              >
                ✕
              </button>
            </div>

            {actions && <div className="grid grid-cols-2 gap-2 pb-3 mb-3 border-b border-[var(--desk-border)]">
              {actions.map((action, index) => <button key={action.label} ref={index === 0 ? firstActionRef : undefined}
                type="button" data-testid={action.testId} aria-label={action.ariaLabel}
                onClick={() => { setIsOpen(false); triggerRef.current?.focus(); action.onSelect?.(); }}
                className="h-9 flex items-center justify-center gap-1.5 pixel-tactile-btn rounded-[2px] border border-[var(--desk-border)] text-[var(--text-body)] focus-visible:outline focus-visible:outline-1 focus-visible:outline-[var(--accent-gold)]">
                <PixelIcon name={action.icon} size={12} />{action.label}
              </button>)}
            </div>}

            {/* Studio Style Section: a compact grid, each card showing its palette for the current time of day */}
            <div
              role="radiogroup" tabIndex={-1}
              aria-label="Studio style"
              onKeyDown={handleStyleKeyDown}
              className="flex flex-col gap-1.5 mb-3"
            >
              <span className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider" id="studio-style-label">
                Studio style
              </span>

              <div className="grid grid-cols-2 gap-1.5">
                {STUDIO_STYLES.map((style) => {
                  const selected = studioTheme === style.id;
                  const palette = colorScheme === 'light' ? style.day : style.night;
                  return (
                    <button
                      key={style.id}
                      ref={(el) => {
                        styleRefs.current[style.id] = el;
                      }}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      aria-label={`${style.name}: ${colorScheme === 'light' ? style.dayBlurb : style.blurb}`}
                      title={colorScheme === 'light' ? style.dayBlurb : style.blurb}
                      data-testid={`theme-option-${style.id}`}
                      onClick={() => setStudioTheme(style.id)}
                      className={`flex flex-col gap-1.5 p-1.5 rounded-[3px] border-2 text-left cursor-pointer transition-[transform,border-color] duration-150 hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] ${
                        selected ? 'border-[var(--accent-gold)]' : 'border-[var(--desk-border)] hover:border-[var(--desk-border-highlight)]'
                      }`}
                      style={{ backgroundColor: palette.surface }}
                    >
                      <span className="flex h-3 w-full overflow-hidden rounded-[1px] border" style={{ borderColor: palette.ink }} aria-hidden="true">
                        {[palette.bg, palette.raised, palette.primary, palette.accent2, palette.accent3].map((color, index) => (
                          <span key={index} className="flex-1" style={{ backgroundColor: color }} />
                        ))}
                      </span>
                      <span className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-[11px]" style={{ color: palette.heading }}>{style.name}</span>
                        {selected && <span aria-hidden="true" className="text-[10px]" style={{ color: palette.accent }}>●</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Color Scheme Section - Compact pixel-native segmented control */}
            <div className="flex flex-col gap-1.5 pt-2 border-t border-[var(--desk-border)]">
              <span className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider" id="color-scheme-label">
                Time of day
              </span>
              <div
                role="radiogroup" tabIndex={-1}
                aria-label="Time of day"
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
                  <span>Night</span>
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
                  <span>Day</span>
                </button>
              </div>
            </div>

            {/* Help preferences: hover previews, one-time tips, and the welcome journey */}
            <div className="pt-2 border-t border-[var(--desk-border)] flex flex-col gap-1.5">
              <StudioToggle
                label="Tool Previews"
                checked={toolPreviewsEnabled}
                onChange={(enabled) => setToolPreviewsDisabled(!enabled)}
              />
              <StudioToggle label="Tips" checked={tipsEnabled} onChange={setTipsEnabled} />
              <button
                type="button"
                data-testid="replay-welcome"
                onClick={() => {
                  setIsOpen(false);
                  requestWelcome();
                }}
                className="mt-1 h-8 w-full pixel-tactile-btn rounded-[2px] text-xs text-[var(--text-body)] cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-gold)]"
              >
                Replay welcome
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
