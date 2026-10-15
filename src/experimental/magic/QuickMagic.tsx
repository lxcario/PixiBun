'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { studioEvents } from '@/lib/events/studioEvents';
import './quickMagic.css';

type SpellId = 'outline' | 'shadow' | 'light' | 'shine' | 'tidy' | 'smooth';
type Mood = 'sunset' | 'moonlight' | 'neon';

/** What each spell does, in words a beginner would use, and what happens after the tap. */
const SPELLS: { id: SpellId; name: string; does: string; after: string; kind: 'layer' | 'gizmo' | 'paint' }[] = [
  { id: 'outline', name: 'Outline', does: 'A clean 1px line around your art', after: 'Added on its own layer', kind: 'layer' },
  { id: 'shadow', name: 'Drop shadow', does: 'A soft shadow under your art', after: 'Added on its own layer', kind: 'layer' },
  { id: 'light', name: 'Light it', does: 'Shade it like a lamp is shining', after: 'Drag the lamp, then Apply', kind: 'gizmo' },
  { id: 'shine', name: 'Shine', does: 'Little glints on the bright edges', after: 'Drag the lamp, then Apply', kind: 'gizmo' },
  { id: 'tidy', name: 'Tidy pixels', does: 'Removes lonely stray pixels', after: 'Tidied', kind: 'paint' },
  { id: 'smooth', name: 'Smooth lines', does: 'Fixes jaggy steps in lines', after: 'Smoothed', kind: 'paint' },
];

const MOODS: { id: Mood; name: string; swatch: string }[] = [
  { id: 'sunset', name: 'Sunset', swatch: 'linear-gradient(135deg, #ffcf7a, #f0707a 55%, #6b3a8c)' },
  { id: 'moonlight', name: 'Moonlight', swatch: 'linear-gradient(135deg, #cfe3ff, #5f7fd0 55%, #1e2350)' },
  { id: 'neon', name: 'Neon', swatch: 'linear-gradient(135deg, #7affe0, #ff5ad8 55%, #3a1a6b)' },
];

function luminance(hex: string) {
  const n = parseInt(hex.replace('#', '').slice(0, 6), 16);
  return Number.isNaN(n) ? 1 : ((n >> 16) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114) / 255;
}

/* A tiny 8×8 bun that every preview card animates. */
const BUN = [
  '.x....x.',
  '.xx..xx.',
  '.xxxxxx.',
  'xxxxxxxx',
  'xx.xx.xx',
  'xxxxxxxx',
  'xxxxxxxx',
  '.xxxxxx.',
];

function BunPreview({ spell }: { spell: SpellId | Mood }) {
  const cells: React.ReactNode[] = [];
  BUN.forEach((row, y) => row.split('').forEach((c, x) => {
    if (c === 'x') cells.push(<rect key={`${x}-${y}`} x={x + 4} y={y + 4} width={1} height={1} className="qm-px" />);
    else if (c === '.' && y === 4) cells.push(<rect key={`e${x}-${y}`} x={x + 4} y={y + 4} width={1} height={1} className="qm-eye" />);
  }));
  return (
    <svg viewBox="2 2 12 12" className={`qm-preview qm-preview-${spell}`} shapeRendering="crispEdges" aria-hidden="true">
      {spell === 'shadow' && <rect x={5} y={12} width={8} height={2} className="qm-shadow" />}
      {spell === 'outline' && <rect x={3.5} y={3.5} width={9} height={9} className="qm-outline" rx={1.5} />}
      {spell === 'tidy' && (<><rect x={2} y={2} width={1} height={1} className="qm-stray" /><rect x={13} y={5} width={1} height={1} className="qm-stray qm-stray-2" /><rect x={2} y={12} width={1} height={1} className="qm-stray qm-stray-3" /></>)}
      <g className="qm-body">{cells}</g>
      {spell === 'light' && <circle cx={13} cy={3} r={1.4} className="qm-lamp" />}
      {spell === 'shine' && <rect x={6} y={6} width={1} height={1} className="qm-glint" />}
      {spell === 'smooth' && <rect x={11} y={7} width={1} height={1} className="qm-jag" />}
    </svg>
  );
}

/**
 * Labs: Quick magic. One tap per effect, with a moving picture of what it does,
 * so a beginner never has to read a settings panel to get a result. Every spell
 * either previews first (lamp), lands on its own layer, or is one Ctrl+Z away.
 */
export const QuickMagic: React.FC = () => {
  const palette = useStudioStore(s => s.palettes.find(p => p.id === s.currentPaletteId) ?? s.palettes[0]);
  const lightAzimuth = useStudioStore(s => s.tools.lightAzimuth);
  const lightElevation = useStudioStore(s => s.tools.lightElevation);
  const [done, setDone] = useState<{ id: string; text: string; undoable: boolean } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const flash = (id: string, text: string, undoable: boolean) => {
    setDone({ id, text, undoable });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setDone(null), 4200);
  };

  const outlineColor = () => {
    const colors = palette?.colors ?? [];
    return colors.length ? colors.reduce((a, b) => (luminance(b) < luminance(a) ? b : a)) : '#1b1424';
  };

  const cast = (id: SpellId) => {
    const spell = SPELLS.find(s => s.id === id)!;
    switch (id) {
      case 'outline': studioEvents.emit('pixibun:auto-outline', { color: outlineColor(), thickness: 1 }); break;
      case 'shadow': studioEvents.emit('pixibun:render-cast-shadow-auto', { shadowStyle: 'drop' }); break;
      case 'light': studioEvents.emit('pixibun:photometric-gizmo-start', { auto: true }); break;
      case 'shine': studioEvents.emit('pixibun:highlight', { lightAzimuth, lightElevation, highlightColor: '#FFFFFF' }); break;
      case 'tidy': studioEvents.emit('pixibun:remove-strays'); break;
      case 'smooth': studioEvents.emit('pixibun:clean-jaggies'); break;
    }
    flash(id, spell.after, spell.kind !== 'gizmo');
  };

  const castMood = (mood: Mood) => {
    studioEvents.emit('pixibun:color-grade', { grade: mood });
    flash(mood, `${MOODS.find(m => m.id === mood)!.name} mood`, true);
  };

  const undo = () => { studioEvents.emit('pixibun:undo'); setDone(null); };

  return (
    <section data-testid="quick-magic" aria-labelledby="qm-title" className="qm-root">
      <div className="qm-head">
        <p className="insp-eyebrow text-[var(--accent-gold)]">Quick magic</p>
        <h2 id="qm-title" className="qm-title">Tap a spell</h2>
        <p className="qm-sub">Works on the whole drawing. Changed your mind? <kbd className="insp-kbd">Ctrl</kbd>+<kbd className="insp-kbd">Z</kbd></p>
      </div>

      <div className="qm-grid">
        {SPELLS.map(spell => {
          const isDone = done?.id === spell.id;
          return (
            <div key={spell.id} className={`qm-card ${isDone ? 'is-done' : ''}`}>
              <button
                type="button"
                className="qm-cast"
                onClick={() => cast(spell.id)}
                data-testid={`quick-magic-${spell.id}`}
                title={spell.does}
              >
                <span className="qm-thumb"><BunPreview spell={spell.id} /></span>
                <span className="qm-name">{spell.name}</span>
                <span className="qm-does">{isDone ? done.text : spell.does}</span>
              </button>
              {isDone && done.undoable && (
                <button type="button" className="qm-undo" onClick={undo} aria-label={`Undo ${spell.name}`}>Undo</button>
              )}
            </div>
          );
        })}
      </div>

      <div className="qm-moods" role="group" aria-label="Color mood">
        <span className="qm-moods-label">Mood</span>
        {MOODS.map(m => (
          <button
            key={m.id}
            type="button"
            className={`qm-mood ${done?.id === m.id ? 'is-done' : ''}`}
            onClick={() => castMood(m.id)}
            data-testid={`quick-magic-mood-${m.id}`}
            title={`Recolor the drawing with a ${m.name.toLowerCase()} mood`}
          >
            <span className="qm-mood-swatch" style={{ background: m.swatch }} />
            {m.name}
          </button>
        ))}
        {done && MOODS.some(m => m.id === done.id) && (
          <button type="button" className="qm-undo qm-undo-inline" onClick={undo}>Undo</button>
        )}
      </div>
    </section>
  );
};
