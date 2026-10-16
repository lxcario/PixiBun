'use client';

import React, { useState, useRef, useEffect, useId, useSyncExternalStore } from 'react';
import { motion } from 'motion/react';
import { useThemeStore, type StudioTheme } from '@/stores/themeStore';
import { LabsSwitchboard } from '@/experimental/LabsSwitchboard';
import { STUDIO_THEMES } from '@/lib/theme/registry';
import { usePreferencesStore } from '@/stores/preferencesStore';
import { PixelIcon, type PixelIconName } from '@/components/ui/PixelIcon';
import { FloatingPanel } from '@/components/ui/surfaces/FloatingPanel';
import { Reveal } from '@/components/ui/surfaces/SpringSurface';
import { SNAP, spring } from '@/lib/motion/springs';
import { useReducedMotion } from '@/lib/motion/useReducedMotion';
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

const subscribeNothing = () => () => {};

function Moon() {
  return (
    <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor" shapeRendering="crispEdges" className="pixelated shrink-0" aria-hidden="true">
      <path d="M12 9.5A5.5 5.5 0 0 1 6.5 4a5.55 5.55 0 0 1 .45-2.2A6 6 0 1 0 14.2 8.9c-.68.4-1.45.6-2.2.6z" />
    </svg>
  );
}

function Sun() {
  return (
    <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor" shapeRendering="crispEdges" className="pixelated shrink-0" aria-hidden="true">
      <circle cx="8" cy="8" r="3" />
      <rect x="7" y="1" width="2" height="2" /><rect x="7" y="13" width="2" height="2" />
      <rect x="1" y="7" width="2" height="2" /><rect x="13" y="7" width="2" height="2" />
      <rect x="3" y="3" width="2" height="2" /><rect x="11" y="11" width="2" height="2" />
      <rect x="11" y="3" width="2" height="2" /><rect x="3" y="11" width="2" height="2" />
    </svg>
  );
}

/** A settings row with a switch; the hidden checkbox carries the name, state and keyboard. */
function SwitchRow({ label, hint, checked, onChange, ariaLabel }: {
  label: string; hint?: string; checked: boolean; onChange: (checked: boolean) => void; ariaLabel: string;
}) {
  return (
    <label className="pb-row">
      <span className="pb-row-text">
        <span className="pb-row-label">{label}</span>
        {hint && <span className="pb-row-hint">{hint}</span>}
      </span>
      <input type="checkbox" className="sr-only peer" checked={checked} aria-label={ariaLabel} onChange={(e) => onChange(e.target.checked)} />
      <span aria-hidden="true" className="pb-switch" />
    </label>
  );
}

export const AppearancePopover: React.FC<AppearancePopoverProps> = ({ className = '', label, actions }) => {
  const dialogId = useId();
  const thumbId = useId();
  const reduce = useReducedMotion();
  const { studioTheme, setStudioTheme, colorScheme, setColorScheme } = useThemeStore();
  const [isOpen, setIsOpen] = useState(false);
  const mounted = useSyncExternalStore(subscribeNothing, () => true, () => false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const styleRefs = useRef<Partial<Record<StudioTheme, HTMLButtonElement | null>>>({});
  const darkRef = useRef<HTMLButtonElement>(null);
  const lightRef = useRef<HTMLButtonElement>(null);
  const firstActionRef = useRef<HTMLButtonElement>(null);

  const [toolPreviewsEnabled, setToolPreviewsEnabled] = useState(true);
  const tipsEnabled = usePreferencesStore((s) => s.tipsEnabled);
  const setTipsEnabled = usePreferencesStore((s) => s.setTipsEnabled);
  const requestWelcome = usePreferencesStore((s) => s.requestWelcome);

  useEffect(() => {
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

  const close = () => {
    setIsOpen(false);
    triggerRef.current?.focus();
  };

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

  const thumb = <motion.span layoutId={thumbId} className="pb-segment-thumb" transition={reduce ? { duration: 0 } : spring(SNAP)} />;

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
        aria-controls={isOpen ? dialogId : undefined}
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

      <FloatingPanel
        open={isOpen}
        anchorRef={triggerRef}
        onClose={() => setIsOpen(false)}
        width={328}
        id={dialogId}
        role="dialog"
        aria-modal="false"
        aria-label={actions ? 'Studio options' : 'Appearance settings'}
        className="w-[328px] max-w-[calc(100vw-24px)] select-none"
        initialFocus={() => {
          if (firstActionRef.current) firstActionRef.current.focus();
          else styleRefs.current[useThemeStore.getState().studioTheme]?.focus();
        }}
      >
        <Reveal className="pb-panel-head">
          <div>
            <p className="pb-panel-title">{actions ? 'Studio' : 'Appearance'}</p>
            <p className="pb-panel-sub">{actions ? 'Your desk, your way.' : 'Style and time of day.'}</p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label={actions ? 'Close studio options' : 'Close appearance popover'}
            className="pb-close"
          >
            <svg viewBox="0 0 10 10" width="10" height="10" aria-hidden="true" shapeRendering="crispEdges"><path d="M0 0h2v2h2v2h2V2h2V0h2v2H8v2H6v2h2v2h2v2H8V8H6V6H4v2H2v2H0V8h2V6h2V4H2V2H0z" fill="currentColor" /></svg>
          </button>
        </Reveal>

        {actions && (
          <Reveal className="grid grid-cols-2 gap-2 mb-1">
            {actions.map((action, index) => (
              <button
                key={action.label}
                ref={index === 0 ? firstActionRef : undefined}
                type="button"
                data-testid={action.testId}
                aria-label={action.ariaLabel}
                onClick={() => { close(); action.onSelect?.(); }}
                className="pb-button"
              >
                <PixelIcon name={action.icon} size={13} />{action.label}
              </button>
            ))}
          </Reveal>
        )}

        {/* Studio style: each card is a tiny scene of that theme at the current time of day */}
        <Reveal>
          <p className="pb-eyebrow" id="studio-style-label">Studio style</p>
          <div
            role="radiogroup"
            tabIndex={-1}
            aria-label="Studio style"
            onKeyDown={handleStyleKeyDown}
            className="grid grid-cols-2 gap-1.5"
          >
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
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setStudioTheme(style.id)}
                  className="pb-swatch"
                  style={{ backgroundColor: palette.surface }}
                >
                  <span aria-hidden="true" className="pb-swatch-scene" style={{ background: `linear-gradient(180deg, ${palette.bg}, ${palette.sunken})` }}>
                    <span className="pb-swatch-orb" style={{ background: palette.primary, boxShadow: `0 0 10px ${palette.primary}` }} />
                    <span className="pb-swatch-card" style={{ background: palette.raised, borderColor: palette.ink }} />
                    <span className="pb-swatch-dots">
                      <span style={{ background: palette.accent }} /><span style={{ background: palette.accent2 }} /><span style={{ background: palette.accent3 }} />
                    </span>
                  </span>
                  <span className="pb-swatch-name" style={{ color: palette.heading }}>
                    {style.name}
                    {selected && (
                      <span aria-hidden="true" className="pb-swatch-check" style={{ background: palette.primary, color: palette.primaryFg }}>
                        <svg viewBox="0 0 10 8" width="8" height="7" shapeRendering="crispEdges"><path d="M8 0h2v2H8v2H6v2H4v2H2V6H0V4h2v2h2V4h2V2h2z" fill="currentColor" /></svg>
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </Reveal>

        {/* Time of day: a segmented control whose thumb slides on the tabs' spring */}
        <Reveal>
          <p className="pb-eyebrow" id="color-scheme-label">Time of day</p>
          <div
            role="radiogroup"
            tabIndex={-1}
            aria-label="Time of day"
            onKeyDown={handleSchemeKeyDown}
            className="pb-segment"
          >
            <button
              ref={darkRef}
              type="button"
              role="radio"
              aria-checked={colorScheme === 'dark'}
              tabIndex={colorScheme === 'dark' ? 0 : -1}
              data-testid="scheme-option-dark"
              onClick={() => setColorScheme('dark')}
              className="pb-segment-option"
            >
              {colorScheme === 'dark' && thumb}
              <Moon /><span>Night</span>
            </button>
            <button
              ref={lightRef}
              type="button"
              role="radio"
              aria-checked={colorScheme === 'light'}
              tabIndex={colorScheme === 'light' ? 0 : -1}
              data-testid="scheme-option-light"
              onClick={() => setColorScheme('light')}
              className="pb-segment-option"
            >
              {colorScheme === 'light' && thumb}
              <Sun /><span>Day</span>
            </button>
          </div>
        </Reveal>

        {actions && <Reveal><LabsSwitchboard /></Reveal>}

        {/* Help preferences: hover previews, one-time tips, and the welcome journey */}
        <Reveal>
          <p className="pb-eyebrow">Help</p>
          <div className="pb-group">
            <SwitchRow label="Tool previews" hint="Little animations when you hover a tool" ariaLabel="Tool Previews"
              checked={toolPreviewsEnabled} onChange={(enabled) => setToolPreviewsDisabled(!enabled)} />
            <SwitchRow label="Tips" hint="One-time hints as you discover things" ariaLabel="Tips"
              checked={tipsEnabled} onChange={setTipsEnabled} />
            <button
              type="button"
              data-testid="replay-welcome"
              onClick={() => {
                setIsOpen(false);
                requestWelcome();
              }}
              className="pb-row"
            >
              <span className="pb-row-text"><span className="pb-row-label">Replay welcome</span><span className="pb-row-hint">Meet Bun and set up your desk again</span></span>
              <span aria-hidden="true" className="text-[var(--text-muted)]">›</span>
            </button>
          </div>
        </Reveal>
      </FloatingPanel>
    </>
  );
};
