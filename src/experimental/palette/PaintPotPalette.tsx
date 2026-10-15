'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { create } from 'zustand';
import { useStudioStore } from '@/stores/studioStore';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { ArtistColorPicker } from '@/components/ui/ArtistColorPicker';
import { PalettePanel } from '@/components/layout/inspector/PalettePanel';
import { generateOklchRamp } from '@/lib/color/rampGenerator';
import { parsePaletteFile } from '@/lib/color/lospecPalette';
import { reportImportError } from '@/lib/project/importFile';
import { SafeJson } from '@/lib/safety/safeJson';
import { lazyPanel } from '@/components/system/lazyPanel';
import './paintPot.css';

const PaletteLibraryModal = lazyPanel(
  () => import('@/components/modals/PaletteLibraryModal').then(m => m.PaletteLibraryModal),
  'Palette library'
);

/* ── Recent colors: the last colors you actually settled on (drags are debounced away) ── */
const RECENT_KEY = 'pixibun:labs:recent-colors';
const RECENT_MAX = 10;
const useRecent = create<{ colors: string[]; push: (c: string) => void }>((set, get) => ({
  colors: (() => { if (typeof window === 'undefined') return []; try { const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]'); return Array.isArray(v) ? v.filter((c): c is string => typeof c === 'string').slice(0, RECENT_MAX) : []; } catch { return []; } })(),
  push: c => {
    const color = c.toUpperCase();
    const colors = [color, ...get().colors.filter(x => x !== color)].slice(0, RECENT_MAX);
    set({ colors });
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(colors)); } catch { /* Recent colors are a convenience. */ }
  },
}));

function useTrackRecent() {
  const primary = useStudioStore(s => s.primaryColor);
  useEffect(() => {
    const t = setTimeout(() => useRecent.getState().push(primary), 700);
    return () => clearTimeout(t);
  }, [primary]);
}

function isLight(hex: string) {
  const n = parseInt(hex.slice(1, 7), 16);
  if (Number.isNaN(n)) return false;
  return ((n >> 16) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000 > 150;
}

function Disclosure({ title, hint, icon, defaultOpen = false, children, testId }: {
  title: string; hint?: string; icon: React.ComponentProps<typeof PixelIcon>['name']; defaultOpen?: boolean; children: React.ReactNode; testId?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="pp-section">
      <button type="button" aria-expanded={open} data-testid={testId} onClick={() => setOpen(o => !o)} className="pp-disclosure">
        <span className="pp-disclosure-icon"><PixelIcon name={icon} size={12} /></span>
        <span className="flex-1 min-w-0 text-left">
          <span className="block text-xs font-semibold text-[var(--text-heading)]">{title}</span>
          {hint && <span className="block text-[10px] leading-[14px] text-[var(--text-muted)] truncate">{hint}</span>}
        </span>
        <span aria-hidden="true" className={`pp-chevron ${open ? 'is-open' : ''}`}>›</span>
      </button>
      {open && <div className="pp-disclosure-body">{children}</div>}
    </section>
  );
}

/**
 * Labs: "Paint pot" palette. Your two paint colors and the palette's swatches come
 * first, as big chips; hue-shifted shades and recent colors are one tap away; the
 * full mixer and the palette workshop (create, scan, import, roles, cycling) wait
 * behind disclosures instead of filling the panel.
 */
export const PaintPotPalette: React.FC = () => {
  useTrackRecent();
  const palettes = useStudioStore(s => s.palettes);
  const currentPaletteId = useStudioStore(s => s.currentPaletteId);
  const selectPalette = useStudioStore(s => s.selectPalette);
  const primary = useStudioStore(s => s.primaryColor);
  const secondary = useStudioStore(s => s.secondaryColor);
  const setPrimary = useStudioStore(s => s.setPrimaryColor);
  const setSecondary = useStudioStore(s => s.setSecondaryColor);
  const swapColors = useStudioStore(s => s.swapColors);
  const generateAndAddRamp = useStudioStore(s => s.generateAndAddRamp);
  const removePaletteColor = useStudioStore(s => s.removePaletteColor);
  const addExtractedPalette = useStudioStore(s => s.addExtractedPalette);
  const recent = useRecent(s => s.colors);

  const palette = palettes.find(p => p.id === currentPaletteId) ?? palettes[0];
  const paletteIndex = Math.max(0, palettes.findIndex(p => p.id === palette.id));
  const [target, setTarget] = useState<'primary' | 'secondary'>('primary');
  const [mixerOpen, setMixerOpen] = useState(false);
  const [browsing, setBrowsing] = useState(false);
  const [dropping, setDropping] = useState(false);
  const shades = useMemo(() => { try { return generateOklchRamp(primary); } catch { return []; } }, [primary]);
  const paletteHas = (c: string) => palette.colors.some(x => x.toLowerCase() === c.toLowerCase());
  const shadesMissing = shades.filter(c => !paletteHas(c)).length;

  const flipPalette = (step: number) => {
    if (palettes.length < 2) return;
    selectPalette(palettes[(paletteIndex + step + palettes.length) % palettes.length].id);
  };

  const editColor = (which: 'primary' | 'secondary') => {
    if (mixerOpen && target === which) { setMixerOpen(false); return; }
    setTarget(which);
    setMixerOpen(true);
  };

  const importFile = (file: File) => {
    if (file.size > SafeJson.MAX_PAYLOAD_BYTES) { reportImportError(new Error('Palette file exceeds the 50 MB limit.')); return; }
    file.text().then(text => {
      const pal = parsePaletteFile(text, file.name);
      addExtractedPalette(pal.name, pal.colors);
    }).catch(reportImportError);
  };

  return (
    <div
      data-testid="paint-pot-palette"
      className={`pp-root ${dropping ? 'is-dropping' : ''}`}
      onDragOver={e => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setDropping(true); } }}
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropping(false); }}
      onDrop={e => { e.preventDefault(); setDropping(false); const f = e.dataTransfer.files?.[0]; if (f) importFile(f); }}
    >
      {/* 1. The two paints you are holding */}
      <section className="pp-hero" aria-label="Your paint colors">
        <div className="pp-pots">
          <button
            type="button"
            className={`pp-pot pp-pot-main ${mixerOpen && target === 'primary' ? 'is-editing' : ''}`}
            style={{ ['--pot' as string]: primary }}
            onClick={() => editColor('primary')}
            aria-label={`Main color ${primary}. Click to mix.`}
            title="Main color: left click paints with this. Click to mix."
          />
          <button
            type="button"
            className={`pp-pot pp-pot-second ${mixerOpen && target === 'secondary' ? 'is-editing' : ''}`}
            style={{ ['--pot' as string]: secondary }}
            onClick={() => editColor('secondary')}
            aria-label={`Second color ${secondary}. Click to mix.`}
            title="Second color: right click paints with this. Click to mix."
          />
          <button type="button" className="pp-swap" onClick={swapColors} aria-label="Swap main and second color" title="Swap colors (X)">
            <span aria-hidden="true">⇄</span>
          </button>
        </div>
        <div className="flex-1 min-w-0">
          <p className="pp-eyebrow">Painting with</p>
          <p className="pp-hex">{primary.toUpperCase()}</p>
          <p className="text-[10px] leading-[14px] text-[var(--text-muted)]">
            Second <span className="font-mono text-[var(--text-body)]">{secondary.toUpperCase()}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => editColor(target)}
          aria-expanded={mixerOpen}
          data-testid="paint-pot-mix"
          className={`pp-mix-btn ${mixerOpen ? 'is-on' : ''}`}
          title="Mix a custom color"
        >
          <PixelIcon name="palette" size={12} /> Mix
        </button>
      </section>

      {mixerOpen && (
        <section className="pp-mixer" aria-label="Color mixer">
          <div className="pp-segment" role="group" aria-label="Color to mix">
            {(['primary', 'secondary'] as const).map(t => (
              <button key={t} type="button" aria-pressed={target === t} onClick={() => setTarget(t)} className={target === t ? 'is-on' : ''}>
                <span className="pp-dot" style={{ background: t === 'primary' ? primary : secondary }} />
                {t === 'primary' ? 'Main' : 'Second'}
              </button>
            ))}
          </div>
          <ArtistColorPicker color={target === 'primary' ? primary : secondary} onChange={target === 'primary' ? setPrimary : setSecondary} />
        </section>
      )}

      {/* 2. The palette: big chips, flip through palettes with the arrows */}
      <section className="pp-section" aria-label="Palette swatches">
        <div className="pp-palette-bar">
          <button type="button" className="pp-flip" onClick={() => flipPalette(-1)} disabled={palettes.length < 2} aria-label="Previous palette">‹</button>
          <label className="pp-palette-name">
            <span className="sr-only">Color palette preset</span>
            <select value={palette.id} onChange={e => selectPalette(e.target.value)} aria-label="Color palette preset">
              {palettes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <span className="pp-count">{palette.colors.length}</span>
          </label>
          <button type="button" className="pp-flip" onClick={() => flipPalette(1)} disabled={palettes.length < 2} aria-label="Next palette">›</button>
          <button type="button" className="pp-browse" onClick={() => setBrowsing(true)} title="Browse the palette library" aria-label="Browse palettes">
            <PixelIcon name="layers" size={12} />
          </button>
        </div>

        <div className="pp-swatches" role="group" aria-label={`${palette.name} colors`}>
          {palette.colors.map((color, idx) => {
            const isMain = color.toLowerCase() === primary.toLowerCase();
            const isSecond = !isMain && color.toLowerCase() === secondary.toLowerCase();
            return (
              <div key={`${color}-${idx}`} className="pp-swatch-wrap">
                <button
                  type="button"
                  aria-pressed={isMain}
                  className={`pp-swatch ${isMain ? 'is-main' : ''} ${isSecond ? 'is-second' : ''} ${isLight(color) ? 'is-light' : ''}`}
                  style={{ ['--sw' as string]: color }}
                  onClick={() => setPrimary(color)}
                  onContextMenu={e => { e.preventDefault(); setSecondary(color); }}
                  aria-label={`Select color ${color}`}
                  title={`${color.toUpperCase()} · #${idx}  (click: main · right-click: second)`}
                >
                  {isMain && <span aria-hidden="true" className="pp-badge">1</span>}
                  {isSecond && <span aria-hidden="true" className="pp-badge">2</span>}
                </button>
                {isMain && palette.colors.length > 1 && (
                  <button
                    type="button"
                    className="pp-remove"
                    onClick={() => removePaletteColor(palette.id, idx)}
                    aria-label={`Remove color ${color} from palette`}
                    title="Remove from palette (artwork stays unchanged)"
                  >×</button>
                )}
              </div>
            );
          })}
        </div>
        <p className="pp-tip">
          <b>Click</b> main · <b>right-click</b> second · drop a <span className="font-mono">.hex</span>/<span className="font-mono">.gpl</span> file to import
        </p>
      </section>

      {/* 3. Shades of the main color: warm highlights, cool shadows, like a pixel artist would ramp it */}
      {shades.length > 0 && (
        <section className="pp-section" aria-label="Shades of the main color">
          <div className="pp-row-head">
            <span className="pp-eyebrow">Shades</span>
            <button
              type="button"
              className="pp-link"
              disabled={shadesMissing === 0}
              onClick={() => generateAndAddRamp(primary)}
              title="Add these warm-to-cool shades to the palette"
            >
              {shadesMissing === 0 ? 'In palette ✓' : `+ Add ${shadesMissing} to palette`}
            </button>
          </div>
          <div className="pp-ramp">
            {shades.map((c, i) => (
              <button
                key={`${c}-${i}`}
                type="button"
                className={`pp-ramp-step ${c.toLowerCase() === primary.toLowerCase() ? 'is-main' : ''}`}
                style={{ ['--sw' as string]: c }}
                onClick={() => setPrimary(c)}
                onContextMenu={e => { e.preventDefault(); setSecondary(c); }}
                aria-label={`Use shade ${c}`}
                title={c}
              />
            ))}
          </div>
        </section>
      )}

      {/* 4. Recent colors */}
      {recent.length > 1 && (
        <section className="pp-section" aria-label="Recent colors">
          <div className="pp-row-head"><span className="pp-eyebrow">Recent</span></div>
          <div className="pp-recent">
            {recent.map(c => (
              <button
                key={c}
                type="button"
                className={`pp-recent-dot ${c.toLowerCase() === primary.toLowerCase() ? 'is-main' : ''}`}
                style={{ ['--sw' as string]: c }}
                onClick={() => setPrimary(c)}
                onContextMenu={e => { e.preventDefault(); setSecondary(c); }}
                aria-label={`Use recent color ${c}`}
                title={c}
              />
            ))}
          </div>
        </section>
      )}

      {/* 5. Everything else, out of the way until needed */}
      <Disclosure title="Palette workshop" hint="Create, scan the canvas, import, roles, color cycling" icon="sparkles" testId="paint-pot-workshop">
        <PalettePanel basics={false} />
      </Disclosure>

      {browsing && <PaletteLibraryModal onClose={() => setBrowsing(false)} />}
    </div>
  );
};
