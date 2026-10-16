'use client';

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { useStudioStore } from '@/stores/studioStore';
import { usePreferencesStore } from '@/stores/preferencesStore';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { generateShadeStrip } from '@/lib/color/rampGenerator';
import styles from './ColorAccessFlyout.module.css';

export type ColorTarget = 'primary' | 'secondary';

interface ColorAccessFlyoutProps {
  /** The dock the panel grows out of; it aligns with the dock's bottom edge. */
  anchor: HTMLElement | null;
  target: ColorTarget;
  onTargetChange: (target: ColorTarget) => void;
  onClose: (restoreFocus: boolean) => void;
  onOpenSpectrum: (target: ColorTarget) => void;
}

const GAP = 8;
const EDGE = 8;

// Touch screens keep 44px targets; a mouse gets a denser grid that fits a whole palette.
const coarseQuery = '(any-pointer: coarse)';
function subscribeCoarse(onChange: () => void) {
  const media = window.matchMedia?.(coarseQuery);
  media?.addEventListener('change', onChange);
  return () => media?.removeEventListener('change', onChange);
}
const isCoarse = () => Boolean(window.matchMedia?.(coarseQuery).matches) || navigator.maxTouchPoints > 0;

function normalizeHex(value: string): string | null {
  const raw = value.trim().replace(/^#/, '');
  if (/^[\da-f]{3}$/i.test(raw)) return `#${raw.split('').map(c => c + c).join('')}`.toUpperCase();
  if (/^[\da-f]{6}$/i.test(raw)) return `#${raw}`.toUpperCase();
  return null;
}

/** Black or white, whichever reads better on the color. */
function inkOn(hex: string): string {
  const value = normalizeHex(hex) ?? '#000000';
  const [r, g, b] = [1, 3, 5].map(i => parseInt(value.slice(i, i + 2), 16) / 255)
    .map(c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.18 ? '#120c18' : '#ffffff';
}

const sameColor = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/** Arrow keys move between swatches of one group, a row at a time with Up/Down. */
function useGridKeys(columns: number) {
  return useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('button'));
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    if (index < 0) return;
    const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: columns, ArrowUp: -columns }[e.key];
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : step === undefined ? -1 : index + step;
    if (next < 0 || next >= items.length) return;
    e.preventDefault();
    items[next].focus();
  }, [columns]);
}

export function ColorAccessFlyout({ anchor, target, onTargetChange, onClose, onOpenSpectrum }: ColorAccessFlyoutProps) {
  const primaryColor = useStudioStore(s => s.primaryColor);
  const secondaryColor = useStudioStore(s => s.secondaryColor);
  const setPrimaryColor = useStudioStore(s => s.setPrimaryColor);
  const setSecondaryColor = useStudioStore(s => s.setSecondaryColor);
  const swapColors = useStudioStore(s => s.swapColors);
  const palettes = useStudioStore(s => s.palettes);
  const currentPaletteId = useStudioStore(s => s.currentPaletteId);
  const recentColors = useStudioStore(s => s.recentColors);
  const setActiveInspectorTab = useStudioStore(s => s.setActiveInspectorTab);
  const setActiveTool = useStudioStore(s => s.setActiveTool);
  const keymap = usePreferencesStore(s => s.keymap);
  const coarse = useSyncExternalStore(subscribeCoarse, isCoarse, () => false);
  const reduceMotion = useReducedMotion();

  const panelRef = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<{ left: number; bottom: number; maxHeight: number } | null>(null);

  const palette = palettes.find(p => p.id === currentPaletteId) ?? palettes[0];
  const paletteColors = palette?.colors ?? [];
  const targetColor = target === 'primary' ? primaryColor : secondaryColor;
  const other: ColorTarget = target === 'primary' ? 'secondary' : 'primary';
  const shades = useMemo(() => generateShadeStrip(targetColor), [targetColor]);
  const columns = coarse ? 7 : 8;
  const gridKeys = useGridKeys(columns);
  const stripKeys = useGridKeys(99);

  const apply = useCallback((color: string, to: ColorTarget = target) => {
    if (to === 'primary') setPrimaryColor(color);
    else setSecondaryColor(color);
  }, [setPrimaryColor, setSecondaryColor, target]);

  // Click paints the edited color; Shift+click or right-click paints the other one.
  const swatchHandlers = (color: string) => ({
    onClick: (e: React.MouseEvent) => apply(color, e.shiftKey ? other : target),
    onContextMenu: (e: React.MouseEvent) => { e.preventDefault(); apply(color, other); },
  });

  // Grow out of the dock: bottoms aligned, never past the top of the window.
  useLayoutEffect(() => {
    const measure = () => {
      const rect = anchor?.getBoundingClientRect();
      const rail = anchor?.closest('aside')?.getBoundingClientRect();
      if (!rect) return;
      const bottom = Math.max(EDGE, window.innerHeight - rect.bottom);
      setPlace({ left: (rail?.right ?? rect.right) + GAP, bottom, maxHeight: window.innerHeight - bottom - EDGE });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [anchor]);

  // Keyboard users land on the color being edited; Esc returns them to the dock.
  useEffect(() => {
    panelRef.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      e.preventDefault();
      onClose(panelRef.current?.contains(document.activeElement) ?? false);
    };
    const onPointerDown = (e: PointerEvent) => {
      const node = e.target as Node;
      if (!panelRef.current?.contains(node) && !anchor?.contains(node)) onClose(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [anchor, onClose]);

  const [draft, setDraft] = useState<string | null>(null);
  const hexValue = draft ?? targetColor.toUpperCase();
  const commitDraft = () => {
    if (draft === null) return;
    const hex = normalizeHex(draft);
    if (hex) apply(hex);
    setDraft(null);
  };

  const paintsWith = (which: ColorTarget) => keymap === 'classic'
    ? (which === 'primary' ? 'Paint' : '⇧ Paint')
    : (which === 'primary' ? 'Left click' : 'Right click');

  const chip = (which: ColorTarget) => {
    const color = which === 'primary' ? primaryColor : secondaryColor;
    const editing = which === target;
    return (
      <button
        type="button"
        aria-pressed={editing}
        onClick={() => onTargetChange(which)}
        className={styles.chip}
        data-which={which}
        style={{ '--chip': color, '--chip-ink': inkOn(color) } as React.CSSProperties}
        title={`${which === 'primary' ? 'Primary' : 'Secondary'} color: ${paintsWith(which).toLowerCase()} on the canvas paints with it. Click to edit it here.`}
      >
        {/* Name first so it leads the accessible name; the fill sits above it visually. */}
        <span className={styles.chipMeta}>
          <span className={styles.chipName}>{which === 'primary' ? 'Primary' : 'Secondary'}</span>
          <span className={styles.chipHow}>{paintsWith(which)}</span>
        </span>
        <span className={styles.chipFill}>
          <span className={styles.chipHex}>{color.toUpperCase()}</span>
        </span>
      </button>
    );
  };

  const marks = (color: string) => ({
    'data-primary': sameColor(color, primaryColor) || undefined,
    'data-secondary': sameColor(color, secondaryColor) || undefined,
  });

  return (
    <motion.div
      ref={panelRef}
      role="dialog"
      aria-label="Color quick access flyout"
      data-testid="color-access-flyout"
      data-touch={coarse || undefined}
      className={styles.panel}
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94, x: -10 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, x: -6 }}
      transition={{ type: 'spring', stiffness: 520, damping: 36, mass: 0.7 }}
      style={{
        left: place?.left ?? 64,
        bottom: place?.bottom ?? EDGE,
        maxHeight: place?.maxHeight,
        visibility: place ? 'visible' : 'hidden',
      }}
    >
      <header className={styles.header}>
        <span className={styles.title}>
          <PixelIcon name="swatches" size={16} />
          Colors
        </span>
        <button type="button" onClick={() => onClose(true)} aria-label="Close color access" className={styles.close}>
          <kbd aria-hidden="true">Esc</kbd>
          <span aria-hidden="true">✕</span>
        </button>
      </header>

      <div className={styles.targets} role="group" aria-label="Color being edited">
        {chip('primary')}
        <button type="button" onClick={swapColors} aria-label="Swap colors" title="Swap primary and secondary (X)" className={styles.swap}>
          <svg viewBox="0 0 16 16" width="16" height="16" shapeRendering="crispEdges" aria-hidden="true">
            <path fill="currentColor" d="M4 3h7v1H4zM10 2h1v1h-1zM10 4h1v1h-1zM11 3h1v1h-1zM5 12h7v1H5zM5 11h1v1H5zM5 13h1v1H5zM4 12h1v1H4z" />
          </svg>
        </button>
        {chip('secondary')}
      </div>

      <div className={styles.editRow}>
        <label className={styles.hex}>
          <span className={styles.hexSwatch} style={{ background: targetColor }} aria-hidden="true" />
          <span className="sr-only">{target === 'primary' ? 'Primary' : 'Secondary'} hex value</span>
          <input
            value={hexValue}
            spellCheck={false}
            maxLength={7}
            aria-invalid={draft !== null && normalizeHex(draft) === null}
            onChange={e => setDraft(e.target.value)}
            onBlur={commitDraft}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); commitDraft(); }
              if (e.key === 'Escape' && draft !== null) { e.preventDefault(); setDraft(null); }
            }}
          />
        </label>
        <button
          type="button"
          className={styles.iconButton}
          aria-label="Pick a color from the canvas"
          title="Eyedropper (I): click the canvas to pick a color"
          onClick={() => { setActiveTool('eyedropper'); onClose(false); }}
        >
          <PixelIcon name="eyedropper" size={16} />
        </button>
        <button
          type="button"
          className={styles.textButton}
          onClick={() => onOpenSpectrum(target)}
          title="Open the full color picker (or double-click a color well)"
        >
          Picker…
        </button>
      </div>

      <section className={styles.section} aria-labelledby="color-access-shades">
        <div className={styles.sectionHead}>
          <span id="color-access-shades" className={styles.label}>Shades</span>
          <span className={styles.note} title="Shadows lean cool and highlights lean warm, the way pixel artists build color ramps by hand.">hue-shifted</span>
        </div>
        {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions -- arrow keys roam the buttons inside */}
        <div className={styles.strip} onKeyDown={stripKeys}>
          {shades.map((color, index) => (
            <button
              key={`${color}-${index}`}
              type="button"
              className={styles.swatch}
              data-base={sameColor(color, targetColor) || undefined}
              style={{ background: color }}
              aria-label={`Shade ${color}`}
              title={`${color}${sameColor(color, targetColor) ? ' (current)' : ''}`}
              {...swatchHandlers(color)}
            />
          ))}
        </div>
      </section>

      {palette && (
        <section className={`${styles.section} ${styles.paletteSection}`} aria-labelledby="color-access-palette">
          <div className={styles.sectionHead}>
            <span id="color-access-palette" className={styles.label} title={palette.name}>{palette.name}</span>
            <span className={styles.note}>{paletteColors.length}</span>
            <button
              type="button"
              className={styles.link}
              onClick={() => { setActiveInspectorTab('palette'); onClose(false); }}
              aria-label="Edit palette in the Palette panel"
              title="Edit, sort and swap palettes in the Palette panel"
            >
              Edit <span aria-hidden="true">▸</span>
            </button>
          </div>
          {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions -- arrow keys roam the buttons inside */}
          <div className={styles.grid} style={{ '--columns': columns } as React.CSSProperties} onKeyDown={gridKeys}>
            {paletteColors.map((color, index) => (
              <button
                key={`${color}-${index}`}
                type="button"
                className={styles.swatch}
                {...marks(color)}
                style={{ background: color }}
                aria-label={`Palette color ${color}`}
                title={`${color} · click: ${target} · right-click: ${other}`}
                {...swatchHandlers(color)}
              />
            ))}
          </div>
        </section>
      )}

      {recentColors.length > 0 && (
        <section className={styles.section} aria-labelledby="color-access-recent">
          <div className={styles.sectionHead}>
            <span id="color-access-recent" className={styles.label}>Recent</span>
          </div>
          {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions -- arrow keys roam the buttons inside */}
          <div className={styles.grid} style={{ '--columns': columns } as React.CSSProperties} onKeyDown={gridKeys}>
            {recentColors.slice(0, columns).map((color, index) => (
              <button
                key={`${color}-${index}`}
                type="button"
                className={styles.swatch}
                {...marks(color)}
                style={{ background: color }}
                aria-label={`Recent color ${color}`}
                title={`${color} (recent)`}
                {...swatchHandlers(color)}
              />
            ))}
          </div>
        </section>
      )}

      <footer className={styles.footer}>
        <button
          type="button"
          className={styles.textButton}
          onClick={() => { setPrimaryColor('#000000'); setSecondaryColor('#ffffff'); }}
          aria-label="Reset default black and white colors"
          title="Black primary, white secondary (Shift+D)"
        >
          <span className={styles.bw} aria-hidden="true" />
          Reset
        </button>
        <p className={styles.hint}>
          Click sets <b>{target}</b>. Right-click or <kbd>⇧</kbd> click sets {other}.
        </p>
      </footer>
    </motion.div>
  );
}
