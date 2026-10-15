'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useReducedMotion } from 'motion/react';
import { STARTER_TEMPLATES } from '@/lib/art/starterTemplates';
import { paintTemplate } from '@/lib/render/templateRenderer';
import { useThemePalette } from '@/lib/theme/useThemePalette';
import type { MaterialType } from '@/types/tools';
import type { StarterTemplate } from '@/types/landing';
import { HOP_FRAMES, samePixels, spriteSwatches, templatePixels } from './bench/benchArt';
import { BenchStage, STAGE_H, STAGE_W, TURN_LEFT_X, TURN_RIGHT_X, type BenchTool } from './bench/benchStage';

/**
 * The bench: one sprite and four of the Studio's own engines. The visitor
 * paints on a starter, and that same pixel data is what the lamp shades, what
 * RotSprite turns and what the hop exports as a GIF, so every tool shows
 * their own edit. The stage is a single canvas that redraws only when
 * something on it changes.
 */

const TOOLS: ReadonlyArray<{ id: BenchTool; name: string; engine: string; hint: string }> = [
  { id: 'draw', name: 'Draw', engine: 'pixel-perfect pencil', hint: 'paint on it' },
  { id: 'light', name: 'Light', engine: 'lamp + raymarched shadow', hint: 'drag the lamp around' },
  { id: 'turn', name: 'Turn', engine: 'RotSprite', hint: 'drag sideways to turn' },
  { id: 'hop', name: 'Hop', engine: 'GIF + sprite sheet', hint: 'your edits, hopping' },
];

const MATERIALS: ReadonlyArray<{ id: MaterialType; label: string }> = [
  { id: 'matte', label: 'Matte' },
  { id: 'gold', label: 'Gold' },
  { id: 'glass', label: 'Glass' },
  { id: 'fabric', label: 'Fabric' },
];

const SNAPS = [22, 45, 90];
const MAX_SCALE = 4;
const RACK_W = 288;
const GAP = 24;

type FriendId = StarterTemplate['id'];

const FriendSprite: React.FC<{ template: StarterTemplate }> = ({ template }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current) paintTemplate(ref.current, template);
  }, [template]);
  return <canvas ref={ref} width={16} height={16} aria-hidden="true" className="block w-8 h-8" style={{ imageRendering: 'pixelated' }} />;
};

const chip = (active: boolean) =>
  `h-7 px-2.5 rounded-[2px] border-2 font-mono text-[11px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] ${
    active
      ? 'bg-[var(--primary-bg)] text-[var(--primary-fg)] border-[var(--ink)]'
      : 'bg-transparent text-[var(--text-body)] border-[var(--desk-border)] hover:border-[var(--desk-border-highlight)] hover:text-[var(--text-heading)]'
  }`;

export const AtelierEngineShowcase: React.FC = () => {
  const reduceMotion = Boolean(useReducedMotion());
  const palette = useThemePalette();
  const [tool, setTool] = useState<BenchTool>('draw');
  const [friendId, setFriendId] = useState<FriendId>('bun');
  const [paint, setPaint] = useState<string | null>('');
  const [mirror, setMirror] = useState(true);
  const [material, setMaterial] = useState<MaterialType>('matte');
  const [edited, setEdited] = useState(false);
  const [saving, setSaving] = useState<'idle' | 'busy' | 'error'>('idle');
  const [scale, setScale] = useState(2);

  const rowRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLCanvasElement>(null);
  const statusRef = useRef<HTMLSpanElement>(null);
  const thumbRefs = useRef<Partial<Record<BenchTool, HTMLCanvasElement | null>>>({});
  const benchRef = useRef<BenchStage | null>(null);
  /** Edits are kept per friend while the page is open. */
  const edits = useRef(new Map<FriendId, Uint8ClampedArray>());
  const pressed = useRef(false);

  const friend = STARTER_TEMPLATES.find((t) => t.id === friendId) ?? STARTER_TEMPLATES[0];
  const swatches = useMemo(() => spriteSwatches(friend.rows), [friend]);
  const activeTool = TOOLS.find((t) => t.id === tool)!;
  const color = paint === null ? null : paint || swatches[0];

  const pixelsFor = useCallback((id: FriendId) => {
    let px = edits.current.get(id);
    if (!px) {
      const template = STARTER_TEMPLATES.find((t) => t.id === id) ?? STARTER_TEMPLATES[0];
      px = templatePixels(template.rows);
      edits.current.set(id, px);
    }
    return px;
  }, []);

  const checkEdited = useCallback(() => {
    const bench = benchRef.current;
    if (!bench) return;
    setEdited(!samePixels(bench.getPixels(), templatePixels(friend.rows)));
  }, [friend]);
  const checkEditedRef = useRef(checkEdited);
  checkEditedRef.current = checkEdited;

  // One bench for the life of the section.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const bench = new BenchStage(stage, {
      reduceMotion,
      onStatus: (text) => {
        if (statusRef.current) statusRef.current.textContent = text;
      },
      onArtChange: () => checkEditedRef.current(),
    });
    benchRef.current = bench;
    bench.setThumbs(thumbRefs.current);
    return () => {
      bench.dispose();
      benchRef.current = null;
    };
    // The bench reads later changes through its setters below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => benchRef.current?.setReduceMotion(reduceMotion), [reduceMotion]);
  useEffect(() => benchRef.current?.setTheme(palette), [palette]);
  useEffect(() => benchRef.current?.setTool(tool), [tool]);
  useEffect(() => benchRef.current?.setMirror(mirror), [mirror]);
  useEffect(() => benchRef.current?.setMaterial(material), [material]);
  useEffect(() => benchRef.current?.setPaint(color), [color]);
  useEffect(() => {
    benchRef.current?.setArt(pixelsFor(friendId));
    checkEditedRef.current();
  }, [friendId, pixelsFor]);

  // Whole-number zoom only, so every art pixel is the same size on screen.
  useEffect(() => {
    const row = rowRef.current;
    if (!row || typeof ResizeObserver === 'undefined') return;
    const wide = window.matchMedia('(min-width: 1024px)');
    const fit = () => {
      const width = row.clientWidth - (wide.matches ? RACK_W + GAP : 0) - 4;
      setScale(Math.max(1, Math.min(MAX_SCALE, Math.floor(width / STAGE_W))));
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(row);
    return () => observer.disconnect();
  }, []);

  const toStage = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return [((event.clientX - rect.left) / rect.width) * STAGE_W, ((event.clientY - rect.top) / rect.height) * STAGE_H] as const;
  };

  const chooseFriend = (id: FriendId) => {
    setFriendId(id);
    setPaint('');
  };

  const reset = () => {
    const fresh = templatePixels(friend.rows);
    edits.current.set(friend.id, fresh);
    benchRef.current?.setArt(fresh);
    setEdited(false);
  };

  const saveGif = async () => {
    const bench = benchRef.current;
    if (!bench || saving === 'busy') return;
    setSaving('busy');
    try {
      const { createAnimatedGifBlobAsync } = await import('@/lib/export/gifEncoder');
      const blob = await createAnimatedGifBlobAsync(bench.hopCanvases(), 8, 4, undefined, undefined, HOP_FRAMES.map((f) => Math.round(f.ms / 10)), true);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `pixibun-${friend.id}-hop.gif`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setSaving('idle');
    } catch {
      setSaving('error');
    }
  };

  const stageW = STAGE_W * scale;
  const stageH = STAGE_H * scale;

  return (
    <section id="engine-showcase" className="bench-section relative overflow-hidden py-14 lg:py-20 scroll-mt-0 bg-[var(--surface-0)] text-[var(--text-heading)]">
      <div aria-hidden="true" className="bench-lamp-glow absolute inset-0 pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-8">
        <div ref={rowRef} className="grid justify-items-center lg:justify-items-stretch justify-center lg:grid-cols-[auto_288px] lg:grid-rows-[auto_1fr]" style={{ gap: GAP }}>
          <header className="w-full max-w-md lg:max-w-none text-center lg:text-left lg:col-start-2 lg:row-start-1 lg:pt-2">
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--accent-gold)]">the bench</p>
            <h2 className="mt-2 font-display text-2xl sm:text-[28px] leading-[1.15] [text-shadow:0_3px_0_var(--ink)]">
              {TOOLS.map((t) => (
                <span key={t.id} className={`lg:block transition-colors duration-200 ${t.id === tool ? 'text-[var(--primary-bg)]' : 'text-[var(--text-heading)] lg:text-[var(--text-muted)]'}`}>
                  {t.name} it.{' '}
                </span>
              ))}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-body)]">The Studio&rsquo;s own engines, all working on the pixels you just drew.</p>
        </header>

          {/* The stage: friends on top, the canvas, then whatever the tool needs */}
          <figure className="m-0 lg:col-start-1 lg:row-start-1 lg:row-span-2 rounded-[4px] border-2 border-[var(--ink)] bg-[var(--desk-surface)] shadow-[0_8px_0_var(--ink)]" style={{ width: stageW + 4 }}>
            <div className="flex items-center gap-1.5 px-2 h-12 border-b-2 border-[var(--ink)] bg-[var(--state-active)]">
              <div role="radiogroup" aria-label="Who is on the bench" className="flex gap-1">
                {STARTER_TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    role="radio"
                    aria-checked={t.id === friendId}
                    aria-label={t.name}
                    title={t.name}
                    onClick={() => chooseFriend(t.id)}
                    className={`grid place-items-center w-9 h-9 rounded-[2px] border-2 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] ${
                      t.id === friendId ? 'border-[var(--ink)] bg-[var(--surface-0)] -translate-y-0.5 shadow-[0_2px_0_var(--ink)]' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <FriendSprite template={t} />
                  </button>
                ))}
              </div>
              <span ref={statusRef} aria-hidden="true" className="ml-auto hidden sm:inline font-mono text-[11px] text-[var(--accent-gold)] tabular-nums whitespace-nowrap" />
              <button
                type="button"
                onClick={reset}
                disabled={!edited}
                aria-label={`Undo every edit to ${friend.name}`}
                title="Start over"
                className="ml-auto sm:ml-2 grid place-items-center w-8 h-8 rounded-[2px] border-2 border-[var(--desk-border)] text-[var(--text-heading)] hover:border-[var(--accent-gold)] disabled:opacity-30 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)]"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path d="M3 2h2v3h5v2H5v1H3V2zm7 3h2v1h1v1h1v5h-1v1h-1v1H5v-2h7V8h-1V7h-1V5z" />
                </svg>
              </button>
            </div>

            <div className="relative" style={{ width: stageW, height: stageH }}>
              <canvas
                ref={stageRef}
                width={STAGE_W}
                height={STAGE_H}
                tabIndex={0}
                role="img"
                aria-label={`${friend.name} on the bench, ${activeTool.name} tool: ${activeTool.hint}. Arrow keys and Space work too; keys 1 to 4 switch tools.`}
                className={`block touch-none select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent-gold)] ${
                  tool === 'draw' ? 'cursor-crosshair' : tool === 'hop' ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
                }`}
                style={{ width: stageW, height: stageH, imageRendering: 'pixelated' }}
                onPointerDown={(event) => {
                  pressed.current = true;
                  try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* not capturable */ }
                  benchRef.current?.pointerDown(...toStage(event));
                }}
                onPointerMove={(event) => {
                  const [x, y] = toStage(event);
                  benchRef.current?.pointerMove(x, y, pressed.current);
                }}
                onPointerUp={() => {
                  pressed.current = false;
                  benchRef.current?.pointerUp();
                }}
                onPointerCancel={() => {
                  pressed.current = false;
                  benchRef.current?.pointerUp();
                }}
                onPointerLeave={() => benchRef.current?.pointerLeave()}
                onKeyDown={(event) => {
                  const pick = TOOLS[Number(event.key) - 1];
                  if (pick && !event.metaKey && !event.ctrlKey) {
                    event.preventDefault();
                    setTool(pick.id);
                  } else if (benchRef.current?.key(event.key, event.shiftKey)) event.preventDefault();
                }}
              />
              <span className="pointer-events-none absolute top-2 left-2 px-1.5 py-0.5 rounded-[2px] bg-[color-mix(in_srgb,var(--surface-0)_80%,transparent)] font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
                {activeTool.hint}
              </span>
              {tool === 'turn' && (
                <>
                  <span className="pointer-events-none absolute bottom-2 -translate-x-1/2 font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--accent-sage)]" style={{ left: (TURN_LEFT_X + 36) * scale }}>
                    RotSprite
                  </span>
                  <span className="pointer-events-none absolute bottom-2 -translate-x-1/2 font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)]" style={{ left: (TURN_RIGHT_X + 36) * scale }}>
                    plain turn
                  </span>
                </>
              )}
            </div>

            {/* What this tool needs, and nothing else */}
            <div className="flex items-center gap-1.5 px-2 h-12 border-t-2 border-[var(--ink)] bg-[var(--desk-surface-raised)] overflow-x-auto">
              {tool === 'draw' && (
                <>
                  <div role="radiogroup" aria-label="Paint colour" className="flex items-center gap-1">
                    {swatches.map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        role="radio"
                        aria-checked={color === hex}
                        aria-label={hex}
                        onClick={() => setPaint(hex)}
                        className={`shrink-0 w-6 h-6 rounded-[2px] border-2 border-[var(--ink)] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] ${color === hex ? '-translate-y-1 shadow-[0_3px_0_var(--ink)]' : ''}`}
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                    <button
                      type="button"
                      role="radio"
                      aria-checked={color === null}
                      aria-label="Eraser"
                      title="Eraser"
                      onClick={() => setPaint(null)}
                      className={`shrink-0 w-6 h-6 rounded-[2px] border-2 border-[var(--ink)] bg-[repeating-conic-gradient(var(--surface-0)_0_25%,var(--desk-border)_0_50%)] bg-[length:8px_8px] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] ${color === null ? '-translate-y-1 shadow-[0_3px_0_var(--ink)]' : ''}`}
                    />
                  </div>
                  <button type="button" aria-pressed={mirror} onClick={() => setMirror((m) => !m)} className={`ml-auto shrink-0 ${chip(mirror)}`} title="Mirror left and right">
                    ⇋ mirror
                  </button>
                </>
              )}
              {tool === 'light' &&
                MATERIALS.map((m) => (
                  <button key={m.id} type="button" aria-pressed={material === m.id} onClick={() => setMaterial(m.id)} className={`shrink-0 ${chip(material === m.id)}`}>
                    {m.label}
                  </button>
                ))}
              {tool === 'turn' &&
                SNAPS.map((angle) => (
                  <button key={angle} type="button" onClick={() => benchRef.current?.turnTo(angle)} className={`shrink-0 ${chip(false)}`}>
                    {angle}°
                  </button>
                ))}
              {tool === 'hop' && (
                <>
                  <button type="button" onClick={saveGif} disabled={saving === 'busy'} className="pixel-primary-btn shrink-0 h-8 px-3 rounded-[2px] font-mono text-[11px] font-bold disabled:opacity-60">
                    {saving === 'busy' ? 'Saving…' : 'Save GIF'}
                  </button>
                  <span role="status" className="font-mono text-[11px] text-[var(--text-muted)] whitespace-nowrap">
                    {saving === 'error' ? 'That did not save. Try again?' : 'lit, transparent, 4× size'}
                  </span>
                </>
              )}
            </div>
          </figure>

          {/* The rack: four tools, each showing what it does to the same pixels */}
          <div className="min-w-0 flex flex-col gap-4 lg:col-start-2 lg:row-start-2" style={{ width: '100%', maxWidth: stageW + 4 }}>
            <div role="radiogroup" aria-label="Tool" className="grid grid-cols-4 lg:grid-cols-1 gap-2">
              {TOOLS.map((t, i) => {
                const active = t.id === tool;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setTool(t.id)}
                    className={`group relative flex flex-col lg:flex-row items-center gap-1.5 lg:gap-3 p-1.5 lg:p-2 text-left rounded-[3px] border-2 transition-[transform,background-color,border-color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] ${
                      active
                        ? 'bg-[var(--primary-bg)] text-[var(--primary-fg)] border-[var(--ink)] shadow-[0_4px_0_var(--ink)] -translate-y-0.5'
                        : 'bg-[var(--desk-surface)] text-[var(--text-heading)] border-[var(--desk-border)] hover:border-[var(--desk-border-highlight)] hover:-translate-y-0.5'
                    }`}
                  >
                    <span className="shrink-0 grid place-items-center rounded-[2px] border-2 border-[var(--ink)] bg-[var(--surface-0)]">
                      <canvas
                        ref={(el) => {
                          thumbRefs.current[t.id] = el;
                        }}
                        width={32}
                        height={32}
                        aria-hidden="true"
                        className="block w-12 h-12 lg:w-16 lg:h-16"
                        style={{ imageRendering: 'pixelated' }}
                      />
                    </span>
                    <span className="min-w-0 text-center lg:text-left">
                      <span className="flex items-baseline justify-center lg:justify-start gap-2">
                        <span className="font-display text-xs lg:text-sm">{t.name}</span>
                        <kbd className={`hidden lg:inline font-mono text-[10px] ${active ? 'opacity-70' : 'text-[var(--text-muted)]'}`}>{i + 1}</kbd>
                      </span>
                      <span className={`hidden lg:block mt-0.5 font-mono text-[10px] leading-snug ${active ? 'opacity-80' : 'text-[var(--text-muted)]'}`}>{t.engine}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <Link
              href={`/studio?template=${friend.id}`}
              className="group inline-flex items-center gap-2 self-start font-mono text-xs font-bold text-[var(--text-heading)] hover:text-[var(--accent-gold)] transition-colors"
            >
              Open {friend.name} in the Studio
              <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};
