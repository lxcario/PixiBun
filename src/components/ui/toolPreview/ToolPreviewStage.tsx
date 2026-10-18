'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { Scene } from '../ToolMotionPreview';
import { CHECKER_DARK, CHECKER_LIGHT, checkerSquarePx } from '@/lib/render/transparencyChecker';
import { ART_H, ART_W, type Pt } from './raster';
import { brushGhost, crosshair, ring, type Overlay } from './overlay';
import type { Clip, Phase } from './clips';
import styles from '../ToolMotionPreview.module.css';

/** Screen pixels per art pixel: the 32×24 canvas plays at 224×168. */
export const STAGE_SCALE = 7;
export const STAGE_W = ART_W * STAGE_SCALE;
export const STAGE_H = ART_H * STAGE_SCALE;

const LOOP_MS = 3600;
const ACTION_START = 0.16;
const ACTION_END = 0.72;
const FADE_START = 0.93;

const clamp = (v: number) => Math.max(0, Math.min(1, v));
const easeInOut = (v: number) => (v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2);
const easeOut = (v: number) => 1 - Math.pow(1 - clamp(v), 3);

let clipsModule: Promise<typeof import('./clips')> | null = null;
const loadClips = () => (clipsModule ??= import('./clips'));

/** Start fetching the clip engine on hover intent, so the first card opens playing. */
export function preloadToolClips(): void {
  loadClips().catch(() => { clipsModule = null; });
}

export function phaseAt(t: number): Phase {
  return t < ACTION_START ? 'before' : t < ACTION_END ? 'action' : 'result';
}

/** Action progress at loop time t, eased like a hand that speeds up and settles. */
export function actionAt(t: number): number {
  return easeInOut(clamp((t - ACTION_START) / (ACTION_END - ACTION_START)));
}

interface PointerState { at: Pt; pressed: boolean; pressedFor: number }

/** Where the pointer is: it glides in, works, and eases off when the result lands. */
function pointerAt(clip: Clip, t: number): PointerState | null {
  if (clip.kind === 'run' || !clip.pointer) return null;
  const start = clip.pointer(0);
  const rest: Pt = { x: Math.min(ART_W - 2, start.x + 6), y: Math.min(ART_H - 2, start.y + 5) };
  if (t < ACTION_START) {
    const e = easeOut(t / ACTION_START);
    return { at: { x: rest.x + (start.x - rest.x) * e, y: rest.y + (start.y - rest.y) * e }, pressed: false, pressedFor: 0 };
  }
  const a = actionAt(t);
  if (t < ACTION_END) {
    const at = clip.kind === 'drag' ? clip.pointer(a) : start;
    const pressed = clip.kind === 'drag' || t < ACTION_START + 0.06;
    return { at, pressed, pressedFor: (t - ACTION_START) * LOOP_MS };
  }
  const end = clip.pointer(1);
  // Ease off the result, staying on the canvas.
  const drift = easeOut((t - ACTION_END) / 0.18) * 2.5;
  const away = (v: number, max: number) => (v + drift > max - 1 ? v - drift : v + drift);
  return { at: { x: away(end.x, ART_W), y: away(end.y, ART_H) }, pressed: false, pressedFor: 0 };
}

function drawChecker(ctx: CanvasRenderingContext2D) {
  // The studio's own checker rule: squares follow the art grid and never shrink below 8px.
  const square = checkerSquarePx(STAGE_SCALE * 100) / STAGE_SCALE;
  ctx.fillStyle = CHECKER_LIGHT;
  ctx.fillRect(0, 0, ART_W, ART_H);
  ctx.fillStyle = CHECKER_DARK;
  for (let y = 0; y < ART_H; y += square) {
    for (let x = 0; x < ART_W; x += square) {
      if ((x / square + y / square) % 2) ctx.fillRect(x, y, square, square);
    }
  }
}

function drawGrid(ctx: CanvasRenderingContext2D, px: number) {
  ctx.save();
  ctx.strokeStyle = 'rgba(40, 24, 60, 0.07)';
  ctx.lineWidth = px;
  ctx.beginPath();
  for (let x = 1; x < ART_W; x++) { ctx.moveTo(x, 0); ctx.lineTo(x, ART_H); }
  for (let y = 1; y < ART_H; y++) { ctx.moveTo(0, y); ctx.lineTo(ART_W, y); }
  ctx.stroke();
  ctx.restore();
}

interface Readout { phase: Phase; label: string; pos: Pt | null }

/**
 * A pocket copy of the studio canvas playing one clip on a loop: before, the
 * tool at work, the result. Hovering the stage scrubs through the clip.
 */
export function ToolPreviewStage({ scene, toolName }: { scene: Scene; toolName: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const posRef = useRef<HTMLSpanElement>(null);
  const scrub = useRef<number | null>(null);
  const [readout, setReadout] = useState<Readout | null>(null);
  const [scrubbing, setScrubbing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    canvas.width = Math.round(STAGE_W * dpr);
    canvas.height = Math.round(STAGE_H * dpr);
    const art = document.createElement('canvas');
    art.width = ART_W;
    art.height = ART_H;
    const artCtx = art.getContext('2d');
    if (!artCtx) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let clip: Clip | null = null;
    let disposed = false;
    let frame = 0;
    let started = performance.now();
    let shown = '';
    const unit = STAGE_SCALE * dpr;
    const px = 1 / STAGE_SCALE;

    const paintArt = (step: number, alpha = 1, time = -1, phase: Phase = 'action') => {
      if (!clip) return;
      const live = time < 0 ? undefined : phase === 'before' ? clip.intro : phase === 'result' ? clip.loop : undefined;
      const raster = live ? live(time) : clip.frame(step);
      artCtx.putImageData(new ImageData(new Uint8ClampedArray(raster.data), ART_W, ART_H), 0, 0);
      ctx.globalAlpha = alpha;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(art, 0, 0, ART_W, ART_H);
      ctx.globalAlpha = 1;
    };

    const render = (t: number, time: number) => {
      ctx.setTransform(unit, 0, 0, unit, 0, 0);
      drawChecker(ctx);
      if (!clip) return;
      const phase = phaseAt(t);
      const a = actionAt(t);
      const step = phase === 'before' ? 0 : phase === 'result' ? clip.steps : Math.round(a * clip.steps);
      // Flipbook clips play live before the action and from the moment the result lands.
      const clock = phase === 'result' ? (t - ACTION_END) * LOOP_MS : t * LOOP_MS;
      paintArt(step, 1, clock, phase);
      // The loop breathes: the result melts back into the starting canvas.
      if (t > FADE_START && scrub.current === null) paintArt(0, easeOut((t - FADE_START) / (1 - FADE_START)), 0, 'before');
      drawGrid(ctx, px);
      const o: Overlay = { ctx, px, time };
      clip.overlay?.({ ...o, time: (phase === 'result' && clip.loop) || (phase === 'before' && clip.intro) ? clock : time }, a, phase);
      const pointer = pointerAt(clip, t);
      if (pointer) {
        if (pointer.pressed) ring(o, pointer.at, pointer.pressedFor / 420, '#f0be7c', 9);
        if (clip.brush) brushGhost(o, pointer.at, clip.brush, pointer.pressed);
        crosshair(o, pointer.at);
      }
      canvas.dataset.previewPhase = phase;
      progressRef.current?.style.setProperty('--clip-progress', String(t));
      if (posRef.current) {
        posRef.current.textContent = pointer
          ? `x${String(Math.round(pointer.at.x)).padStart(2, '0')} y${String(Math.round(pointer.at.y)).padStart(2, '0')}`
          : `${ART_W}×${ART_H}`;
      }
      const label = clip.labels[phase === 'before' ? 0 : phase === 'action' ? 1 : 2];
      if (label + phase !== shown) {
        shown = label + phase;
        setReadout({ phase, label, pos: pointer?.at ?? null });
      }
    };

    const tick = (now: number) => {
      const t = scrub.current ?? ((now - started) % LOOP_MS) / LOOP_MS;
      if (scrub.current !== null) started = now - scrub.current * LOOP_MS;
      render(t, now);
      if (!reduce || scrub.current !== null) frame = requestAnimationFrame(tick);
    };

    render(0, 0);
    loadClips().then(({ clipFor }) => {
      if (disposed) return;
      clip = clipFor(scene);
      started = performance.now();
      if (reduce) render(0.86, 0);
      else frame = requestAnimationFrame(tick);
    }).catch(() => {});

    const onScrub = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(tick);
    };
    canvas.addEventListener('pixibun:scrub', onScrub);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      canvas.removeEventListener('pixibun:scrub', onScrub);
    };
  }, [scene]);

  const scrubTo = (event: React.PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    scrub.current = clamp((event.clientX - box.left) / box.width) * 0.999;
    if (!scrubbing) setScrubbing(true);
    canvasRef.current?.dispatchEvent(new Event('pixibun:scrub'));
  };
  const release = () => {
    scrub.current = null;
    setScrubbing(false);
    canvasRef.current?.dispatchEvent(new Event('pixibun:scrub'));
  };

  return (
    <div className={styles.player} data-scrubbing={scrubbing || undefined}>
      <div
        className={styles.stage}
        onPointerMove={(event) => { if (event.pointerType === 'mouse') scrubTo(event); }}
        onPointerLeave={release}
        data-step-label={readout?.label}
      >
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          style={{ width: STAGE_W, height: STAGE_H }}
          data-scene={scene}
          role="img"
          aria-label={`${toolName}: ${readout?.label ?? 'animated demonstration'}`}
        />
      </div>
      <div className={styles.status} aria-hidden="true">
        <span key={readout?.label} className={styles.caption} data-phase={readout?.phase ?? 'before'}>
          {readout?.label ?? 'loading…'}
        </span>
        <span ref={posRef} className={styles.readout} />
      </div>
      <div ref={progressRef} className={styles.progress} aria-hidden="true">
        <span data-seg="before" />
        <span data-seg="action" />
        <span data-seg="result" />
        <i className={styles.playhead} />
      </div>
    </div>
  );
}
