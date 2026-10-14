'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { PixiBunLogo } from '@/components/ui/PixiBunLogo';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { DayNightSwitch } from '@/components/landing/DayNightSwitch';
import { PLAYGROUND_LESSONS, getTemplateRows, type PlaygroundLesson } from '@/lib/art/playgroundLessons';
import { LESSON_PALETTE } from '@/lib/art/lessonPalette';
import { coachForFrame, coachForLesson, lessonScore, progressMessage } from '@/lib/art/playgroundCoach';
import { evaluateStencilCoverage } from '@/lib/art/stencilEvaluator';
import { LessonPreview } from './LessonPreview';
import { PixelBurst } from './PixelBurst';
import { MATCH_SCORE } from './playgroundUi';
import { runTraceDemo } from './traceDemo';

type Point = { x: number; y: number };
type Tool = 'pen' | 'fill' | 'eraser';

const DOODLE_SIZE = 32;
const DOODLE_COLORS = ['#252034', '#f0be7c', '#e47779', '#a3be8c', '#8cb9c9', '#f7e6c4'];
/** Phone lessons stay on the small 16×16 canvas, where a fingertip is one pixel. */
const POCKET_LESSONS = PLAYGROUND_LESSONS.filter(lesson => (lesson.canvasSize ?? 16) === 16);

const chip = 'h-10 px-3 inline-flex items-center justify-center gap-1.5 rounded-[2px] text-sm font-semibold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] disabled:opacity-40';

function pointFrom(event: React.PointerEvent<HTMLCanvasElement>, size: number): Point {
  const rect = event.currentTarget.getBoundingClientRect();
  return {
    x: Math.max(0, Math.min(size - 1, Math.floor((event.clientX - rect.left) * size / rect.width))),
    y: Math.max(0, Math.min(size - 1, Math.floor((event.clientY - rect.top) * size / rect.height))),
  };
}

function strokeLine(ctx: CanvasRenderingContext2D, from: Point, to: Point, color: string | null) {
  const steps = Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y));
  for (let step = 0; step <= steps; step++) {
    const x = Math.round(from.x + (to.x - from.x) * (steps ? step / steps : 0));
    const y = Math.round(from.y + (to.y - from.y) * (steps ? step / steps : 0));
    if (color === null) ctx.clearRect(x, y, 1, 1);
    else { ctx.fillStyle = color; ctx.fillRect(x, y, 1, 1); }
  }
}

/** Four-way flood fill of the region under `start`, on a small canvas. */
function floodFill(ctx: CanvasRenderingContext2D, size: number, start: Point, color: string) {
  const image = ctx.getImageData(0, 0, size, size);
  const data = image.data;
  const at = (x: number, y: number) => (y * size + x) * 4;
  const target = data.slice(at(start.x, start.y), at(start.x, start.y) + 4);
  const probe = document.createElement('canvas').getContext('2d');
  if (!probe) return;
  probe.fillStyle = color;
  probe.fillRect(0, 0, 1, 1);
  const paint = probe.getImageData(0, 0, 1, 1).data;
  if (target.every((value, i) => value === paint[i])) return;
  const same = (i: number) => data[i] === target[0] && data[i + 1] === target[1] && data[i + 2] === target[2] && data[i + 3] === target[3];
  const stack = [start];
  while (stack.length) {
    const { x, y } = stack.pop()!;
    if (x < 0 || y < 0 || x >= size || y >= size) continue;
    const i = at(x, y);
    if (!same(i)) continue;
    data.set(paint, i);
    stack.push({ x: x + 1, y }, { x: x - 1, y }, { x, y: y + 1 }, { x, y: y - 1 });
  }
  ctx.putImageData(image, 0, 0);
}

function downloadCanvas(canvas: HTMLCanvasElement, name: string) {
  const link = document.createElement('a');
  link.download = name;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

/** The colors a pose uses, most common first. */
function poseColors(lesson: PlaygroundLesson, frameIndex: number): string[] {
  const counts = new Map<string, number>();
  for (const row of getTemplateRows(lesson.frames[frameIndex] ?? lesson.frames[0])) {
    for (const char of row) {
      const color = LESSON_PALETTE[char];
      if (color) counts.set(color, (counts.get(color) ?? 0) + 1);
    }
  }
  // The outline ink comes first: a pose starts with its outline.
  const ink = LESSON_PALETTE.o;
  return [...counts.entries()].sort((a, b) => Number(b[0] === ink) - Number(a[0] === ink) || b[1] - a[1]).map(([color]) => color).slice(0, 6);
}

const FrameThumb: React.FC<{ image: ImageData | undefined; version: number }> = ({ image, version }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx || !image) return;
    ctx.putImageData(image, 0, 0);
  }, [image, version]);
  return <canvas ref={ref} width={16} height={16} aria-hidden="true" className="w-full h-full pixelated" style={{ imageRendering: 'pixelated' }} />;
};

/** Trace a short lesson one frame at a time, then watch it play. */
function PocketLesson() {
  const reduceMotion = Boolean(useReducedMotion());
  const [lessonId, setLessonId] = useState(POCKET_LESSONS[0]?.id ?? '');
  const lesson = POCKET_LESSONS.find(item => item.id === lessonId) ?? POCKET_LESSONS[0];
  const coach = coachForLesson(lesson);
  const size = 16;
  const [frameIndex, setFrameIndex] = useState(0);
  const [tool, setTool] = useState<Tool>('pen');
  const colors = useMemo(() => poseColors(lesson, frameIndex), [lesson, frameIndex]);
  const [color, setColor] = useState(colors[0] ?? '#3a2e4c');
  const [scores, setScores] = useState<number[]>(() => lesson.frames.map(() => 0));
  const [version, setVersion] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
  const [demo, setDemo] = useState(0);
  const [burst, setBurst] = useState<number | null>(null);
  const [messy, setMessy] = useState(false);
  const framesRef = useRef<ImageData[]>([]);
  const drawRef = useRef<HTMLCanvasElement>(null);
  const guideRef = useRef<HTMLCanvasElement>(null);
  const ghostRef = useRef<HTMLCanvasElement>(null);
  const lastPoint = useRef<Point | null>(null);

  const template = lesson.frames[frameIndex];
  const frameCoach = coachForFrame(lesson, frameIndex);
  const score = scores[frameIndex] ?? 0;
  const matched = score >= MATCH_SCORE;
  const allMatched = scores.every(value => value >= MATCH_SCORE);

  // A new lesson starts with empty frames and a demo of the first pose.
  useEffect(() => {
    framesRef.current = lesson.frames.map(() => new ImageData(size, size));
    setScores(lesson.frames.map(() => 0));
    setFrameIndex(0);
    setPlaying(false);
    setVersion(v => v + 1);
    setDemo(d => d + 1);
  }, [lesson]);

  useEffect(() => { if (!colors.includes(color)) setColor(colors[0] ?? color); }, [colors, color]);

  // Show the current frame's drawing.
  useEffect(() => {
    const ctx = drawRef.current?.getContext('2d');
    const image = framesRef.current[frameIndex];
    if (!ctx || !image || playing) return;
    ctx.putImageData(image, 0, 0);
  }, [frameIndex, version, playing]);

  // The guide: the previous drawing as a faint onion skin, then the target pose.
  useEffect(() => {
    const ctx = guideRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, size, size);
    if (!showGuide || playing || !template) return;
    const previous = framesRef.current[frameIndex - 1];
    if (previous) {
      const onion = document.createElement('canvas');
      onion.width = size; onion.height = size;
      const octx = onion.getContext('2d');
      if (octx) {
        octx.putImageData(previous, 0, 0);
        octx.globalCompositeOperation = 'source-in';
        octx.fillStyle = '#b48fe0';
        octx.fillRect(0, 0, size, size);
        ctx.globalAlpha = 0.35;
        ctx.drawImage(onion, 0, 0);
      }
    }
    getTemplateRows(template).forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const fill = LESSON_PALETTE[row[x]];
        if (!fill) continue;
        ctx.globalAlpha = 0.42; ctx.fillStyle = fill; ctx.fillRect(x, y, 1, 1);
        ctx.globalAlpha = 0.12; ctx.fillStyle = '#5b4a78'; ctx.fillRect(x, y, 1, 1);
      }
    });
    ctx.globalAlpha = 1;
  }, [template, frameIndex, showGuide, playing, version]);

  // Ghost-draw the pose when asked (and when a new lesson or frame begins).
  useEffect(() => {
    const ctx = ghostRef.current?.getContext('2d');
    if (!ctx || !template || !demo) return;
    return runTraceDemo(ctx, template, size, size, { reduceMotion, onDone: () => undefined });
  }, [demo, template, reduceMotion]);

  // Flip through the frames at their own timings.
  useEffect(() => {
    if (!playing) return;
    const ctx = drawRef.current?.getContext('2d');
    if (!ctx) return;
    let index = 0;
    let timer: ReturnType<typeof setTimeout>;
    const show = () => {
      const image = framesRef.current[index];
      if (image) ctx.putImageData(image, 0, 0);
      timer = setTimeout(() => { index = (index + 1) % lesson.frames.length; show(); }, lesson.frames[index]?.recommendedHoldMs ?? 120);
    };
    show();
    return () => clearTimeout(timer);
  }, [playing, lesson]);

  const commit = useCallback(() => {
    const ctx = drawRef.current?.getContext('2d', { willReadFrequently: true });
    if (!ctx || !template) return;
    framesRef.current[frameIndex] = ctx.getImageData(0, 0, size, size);
    const { score: next, messy: spilled } = lessonScore(evaluateStencilCoverage(ctx, size, size, template), 1);
    setMessy(spilled);
    setScores(prev => {
      if (prev[frameIndex] < MATCH_SCORE && next >= MATCH_SCORE) setBurst(Date.now());
      return prev.map((value, i) => (i === frameIndex ? next : value));
    });
    setVersion(v => v + 1);
  }, [frameIndex, template]);

  const goTo = (index: number) => {
    setPlaying(false);
    setMessy(false);
    setFrameIndex(index);
    if ((scores[index] ?? 0) === 0) setDemo(d => d + 1);
  };

  const handleDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (playing) return;
    const ctx = drawRef.current?.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    ghostRef.current?.getContext('2d')?.clearRect(0, 0, size, size);
    setDemo(0);
    const point = pointFrom(event, size);
    if (tool === 'fill') { floodFill(ctx, size, point, color); commit(); return; }
    event.currentTarget.setPointerCapture(event.pointerId);
    lastPoint.current = point;
    strokeLine(ctx, point, point, tool === 'eraser' ? null : color);
  };
  const handleMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = drawRef.current?.getContext('2d');
    if (!lastPoint.current || !ctx) return;
    const point = pointFrom(event, size);
    strokeLine(ctx, lastPoint.current, point, tool === 'eraser' ? null : color);
    lastPoint.current = point;
  };
  const handleUp = () => { if (lastPoint.current) { lastPoint.current = null; commit(); } };

  const clearFrame = () => {
    drawRef.current?.getContext('2d')?.clearRect(0, 0, size, size);
    commit();
  };
  const copyPrevious = () => {
    const ctx = drawRef.current?.getContext('2d');
    const previous = framesRef.current[frameIndex - 1];
    if (!ctx || !previous) return;
    ctx.putImageData(previous, 0, 0);
    commit();
  };
  const saveStrip = () => {
    const strip = document.createElement('canvas');
    strip.width = size * lesson.frames.length; strip.height = size;
    const ctx = strip.getContext('2d');
    if (!ctx) return;
    framesRef.current.forEach((image, i) => ctx.putImageData(image, i * size, 0));
    downloadCanvas(strip, `pixibun-pocket-${lesson.id}.png`);
  };

  return (
    <div className="flex flex-col gap-4">
      <div role="radiogroup" aria-label="Lessons" className="-mx-4 px-4 flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
        {POCKET_LESSONS.map(item => {
          const active = item.id === lesson.id;
          return (
            <button key={item.id} type="button" role="radio" aria-checked={active} onClick={() => setLessonId(item.id)}
              className={`shrink-0 flex flex-col items-center gap-1 p-1.5 w-[84px] rounded-[2px] border-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] ${active ? 'border-[var(--accent-gold)] bg-[var(--surface-3)]' : 'border-[var(--desk-border)] bg-[var(--desk-surface)]'}`}>
              <LessonPreview lesson={item} mode="loop" size={44} playing={active ? undefined : false} className="bg-[var(--lesson-paper)]" />
              <span className="font-display text-[10px] leading-tight text-[var(--text-heading)] text-center">{coachForLesson(item).title}</span>
            </button>
          );
        })}
      </div>

      <section aria-label="Lesson coach" className="relative p-3 border-2 border-[var(--ink)] bg-[var(--desk-surface)] shadow-[0_4px_0_var(--ink)]">
        <PixelBurst burstKey={burst} />
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={playing ? 'play' : `${lesson.id}-${frameIndex}`}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
            {playing ? (
              <>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--accent-gold)]">Playing</p>
                <h2 className="mt-1 font-display text-lg leading-tight">Your {coach.title}</h2>
                <p className="mt-1 text-sm text-[var(--text-body)]">{coach.bigIdea}</p>
              </>
            ) : (
              <>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--accent-gold)]">Frame {frameIndex + 1} of {lesson.frames.length}</p>
                <h2 className="mt-1 font-display text-lg leading-tight">{frameCoach.title}</h2>
                <p className="mt-1 text-sm leading-relaxed text-[var(--text-body)]">{frameCoach.hint}</p>
              </>
            )}
          </motion.div>
        </AnimatePresence>
        {!playing && (
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1 flex gap-[3px]" aria-hidden="true">
              {Array.from({ length: 10 }, (_, i) => (
                <span key={i} className={`h-2.5 flex-1 border border-[var(--ink)] ${i < Math.round(score / 10) ? (matched ? 'bg-[var(--accent-sage)]' : 'bg-[var(--accent-gold)]') : 'bg-[var(--surface-0)]'}`} />
              ))}
            </div>
            <span className="font-mono text-xs tabular-nums">{matched ? 'Matched!' : `${score}%`}</span>
          </div>
        )}
        {!playing && (
          <p role="status" aria-live="polite" className="mt-1.5 text-xs text-[var(--text-muted)]">
            {progressMessage(score, matched, false, messy)}
          </p>
        )}
      </section>

      <div className="relative w-full aspect-square border-4 border-[var(--ink)] bg-white shadow-[0_6px_0_var(--ink)]"
        style={{ backgroundImage: 'linear-gradient(to right, rgba(58,46,76,.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(58,46,76,.08) 1px, transparent 1px)', backgroundSize: '6.25% 6.25%' }}>
        <canvas ref={guideRef} width={size} height={size} aria-hidden="true" className="absolute inset-0 w-full h-full pixelated pointer-events-none" style={{ imageRendering: 'pixelated' }} />
        <canvas ref={drawRef} width={size} height={size} role="img" aria-label="Lesson canvas"
          onPointerDown={handleDown} onPointerMove={handleMove} onPointerUp={handleUp} onPointerCancel={handleUp}
          className="absolute inset-0 w-full h-full touch-none cursor-crosshair pixelated" style={{ imageRendering: 'pixelated' }} />
        <canvas ref={ghostRef} width={size} height={size} aria-hidden="true" className="absolute inset-0 w-full h-full pixelated pointer-events-none" style={{ imageRendering: 'pixelated' }} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Drawing tools" className="flex gap-1.5">
          {([['pen', 'Pen'], ['fill', 'Fill'], ['eraser', 'Eraser']] as const).map(([id, label]) => (
            <button key={id} type="button" aria-pressed={tool === id} aria-label={label} title={label} onClick={() => setTool(id)}
              className={`w-11 h-11 flex items-center justify-center rounded-[2px] cursor-pointer ${tool === id ? 'pixel-primary-btn' : 'pixel-tactile-btn text-[var(--text-body)]'}`}>
              <PixelIcon name={id === 'fill' ? 'bucket' : id} size={18} />
            </button>
          ))}
        </div>
        <div role="group" aria-label="Colors" className="flex flex-wrap gap-1.5">
          {colors.map(swatch => (
            <button key={swatch} type="button" aria-label={`Use color ${swatch}`} aria-pressed={tool !== 'eraser' && color === swatch}
              onClick={() => { setColor(swatch); if (tool === 'eraser') setTool('pen'); }}
              className={`w-9 h-9 rounded-[2px] border-2 cursor-pointer ${tool !== 'eraser' && color === swatch ? 'border-[var(--text-heading)] ring-2 ring-[var(--accent-gold)]' : 'border-[var(--ink)]'}`}
              style={{ backgroundColor: swatch }} />
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setDemo(d => d + 1)} disabled={playing} className={`${chip} pixel-tactile-btn text-[var(--text-heading)]`}>
          <PixelIcon name="play" size={11} /> Show me
        </button>
        {frameIndex > 0 && !matched && (
          <button type="button" onClick={copyPrevious} disabled={playing} className={`${chip} pixel-tactile-btn text-[var(--text-heading)]`}>
            <PixelIcon name="copy" size={12} /> Start from last frame
          </button>
        )}
        <button type="button" aria-pressed={showGuide} onClick={() => setShowGuide(v => !v)} className={`${chip} pixel-tactile-btn text-[var(--text-heading)]`}>
          <PixelIcon name={showGuide ? 'eye' : 'eye-off'} size={13} /> Guide
        </button>
        <button type="button" onClick={clearFrame} disabled={playing} className={`${chip} pixel-tactile-btn text-[var(--text-muted)]`}>
          <PixelIcon name="trash" size={13} /> Clear frame
        </button>
      </div>

      <div className="flex items-center gap-2 p-2 border-2 border-[var(--ink)] bg-[var(--desk-surface)]">
        <button type="button" onClick={() => setPlaying(p => !p)} aria-pressed={playing}
          className={`${chip} h-12 min-w-[84px] font-display ${playing ? 'pixel-tactile-btn text-[var(--text-heading)]' : 'pixel-primary-btn'}`}>
          <PixelIcon name={playing ? 'pause' : 'play'} size={13} /> {playing ? 'Pause' : 'Play'}
        </button>
        <ol aria-label="Frames" className="flex-1 flex gap-1.5 overflow-x-auto">
          {lesson.frames.map((_, i) => (
            <li key={i} className="shrink-0">
              <button type="button" onClick={() => goTo(i)} aria-current={i === frameIndex && !playing ? 'true' : undefined}
                aria-label={`Frame ${i + 1}: ${coachForFrame(lesson, i).title}${(scores[i] ?? 0) >= MATCH_SCORE ? ' (done)' : ''}`}
                className={`relative w-11 h-11 p-0.5 border-2 bg-[var(--lesson-paper)] cursor-pointer ${i === frameIndex && !playing ? 'border-[var(--accent-gold)]' : 'border-[var(--desk-border)]'}`}>
                <LessonPreview lesson={lesson} mode="still" frameIndex={i} size={36} playing={false} className="absolute inset-0.5 opacity-20" />
                <span className="relative block w-full h-full"><FrameThumb image={framesRef.current[i]} version={version} /></span>
                {(scores[i] ?? 0) >= MATCH_SCORE && <span aria-hidden="true" className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center bg-[var(--accent-sage)] border border-[var(--ink)] text-[9px] text-[var(--ink)]">✓</span>}
              </button>
            </li>
          ))}
        </ol>
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={() => goTo(Math.max(0, frameIndex - 1))} disabled={frameIndex === 0 || playing}
          className={`${chip} flex-1 pixel-tactile-btn text-[var(--text-heading)]`}>← Back</button>
        {frameIndex < lesson.frames.length - 1 ? (
          <button type="button" onClick={() => goTo(frameIndex + 1)} disabled={playing}
            className={`${chip} flex-[2] font-display ${matched ? 'pixel-primary-btn' : 'pixel-tactile-btn text-[var(--text-heading)]'}`}>
            <span className="truncate">Next: {coachForFrame(lesson, frameIndex + 1).title}</span> <span aria-hidden="true">→</span>
          </button>
        ) : (
          <button type="button" onClick={() => setPlaying(true)} disabled={playing}
            className={`${chip} flex-[2] font-display ${allMatched ? 'pixel-primary-btn' : 'pixel-tactile-btn text-[var(--text-heading)]'}`}>
            Watch it move →
          </button>
        )}
      </div>

      <button type="button" onClick={saveStrip} className={`${chip} h-12 pixel-primary-btn font-display`}>
        <PixelIcon name="export" size={13} /> Save PNG
      </button>
      <p className="text-xs text-center text-[var(--text-muted)]">Saves every frame side by side. Open PixiBun on a bigger screen for the full lesson Studio.</p>
    </div>
  );
}

/** A free 32 × 32 sketch, saved as a PNG. */
function FreeDoodle() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastPoint = useRef<Point | null>(null);
  const [color, setColor] = useState(DOODLE_COLORS[0]);
  const [eraser, setEraser] = useState(false);

  useEffect(() => {
    const context = canvasRef.current?.getContext('2d');
    if (context) context.imageSmoothingEnabled = false;
  }, []);

  const paint = (from: Point, to: Point) => {
    const context = canvasRef.current?.getContext('2d');
    if (context) strokeLine(context, from, to, eraser ? null : color);
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-[var(--text-body)]">Draw a 32 × 32 pixel sketch with your finger, then save it as a PNG.</p>
      <div className="w-full aspect-square overflow-hidden border-4 border-[var(--ink)] bg-white shadow-[0_6px_0_var(--ink)]"
        style={{ backgroundImage: 'conic-gradient(#eee 25%, white 0 50%, #eee 0 75%, white 0)', backgroundSize: '24px 24px' }}>
        <canvas ref={canvasRef} width={DOODLE_SIZE} height={DOODLE_SIZE} role="img" aria-label="Pocket doodle canvas"
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            const point = pointFrom(event, DOODLE_SIZE);
            lastPoint.current = point;
            paint(point, point);
          }}
          onPointerMove={(event) => {
            if (!lastPoint.current) return;
            const point = pointFrom(event, DOODLE_SIZE);
            paint(lastPoint.current, point);
            lastPoint.current = point;
          }}
          onPointerUp={() => { lastPoint.current = null; }}
          onPointerCancel={() => { lastPoint.current = null; }}
          className="h-full w-full touch-none cursor-crosshair" style={{ imageRendering: 'pixelated' }} />
      </div>
      <div className="flex flex-wrap items-center gap-2" aria-label="Drawing colors">
        {DOODLE_COLORS.map((swatch) => <button key={swatch} type="button" aria-label={`Use ${swatch} color`}
          aria-pressed={!eraser && color === swatch} onClick={() => { setColor(swatch); setEraser(false); }}
          className={`h-10 w-10 rounded-[2px] border-2 cursor-pointer ${!eraser && color === swatch ? 'border-[var(--text-heading)] ring-2 ring-[var(--accent-gold)]' : 'border-[var(--ink)]'}`}
          style={{ backgroundColor: swatch }} />)}
        <button type="button" aria-pressed={eraser} onClick={() => setEraser(true)}
          className={`${chip} ${eraser ? 'pixel-primary-btn' : 'pixel-tactile-btn text-[var(--text-heading)]'}`}>Eraser</button>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => canvasRef.current?.getContext('2d')?.clearRect(0, 0, DOODLE_SIZE, DOODLE_SIZE)}
          className={`${chip} h-12 flex-1 pixel-tactile-btn text-[var(--text-heading)]`}>Clear</button>
        <button type="button" onClick={() => { if (canvasRef.current) downloadCanvas(canvasRef.current, 'pixibun-pocket-doodle.png'); }}
          className={`${chip} h-12 flex-1 pixel-primary-btn font-display`}>Save PNG</button>
      </div>
    </div>
  );
}

/**
 * The Playground on small screens: the same lessons, sized for a fingertip,
 * plus a free doodle pad. It never touches the Studio workspace.
 */
export function PocketDoodlePad() {
  const [mode, setMode] = useState<'lesson' | 'doodle'>('lesson');
  return (
    <main id="main-workspace" tabIndex={-1} className="lg:hidden min-h-dvh bg-[var(--desk-bg)] px-4 pt-4 pb-10 text-[var(--text-heading)]"
      style={{ '--lesson-paper': '#fbf8f2' } as React.CSSProperties}>
      <div className="mx-auto flex w-full max-w-md flex-col gap-4">
        <header className="flex items-center justify-between gap-3">
          <PixiBunLogo showSubtitle={false} />
          <div className="flex items-center gap-2">
            <DayNightSwitch />
            <Link href="/" className={`${chip} h-9 pixel-tactile-btn text-[var(--text-heading)] text-xs`}>Home</Link>
          </div>
        </header>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--accent-gold)]">PixiBun Playground</p>
          <h1 className="mt-1 font-display text-2xl leading-tight [text-shadow:0_3px_0_var(--ink)]">Pocket Doodle Pad</h1>
        </div>
        <div role="tablist" aria-label="Pad mode" className="grid grid-cols-2 p-1 border-2 border-[var(--ink)] bg-[var(--desk-surface)]">
          {([['lesson', 'Lesson'], ['doodle', 'Free doodle']] as const).map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={mode === id} onClick={() => setMode(id)}
              className="relative h-10 text-sm font-semibold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)]">
              {mode === id && <motion.span layoutId="pocket-mode" className="absolute inset-0 bg-[var(--primary-bg)] border border-[var(--ink)]" transition={{ type: 'spring', stiffness: 500, damping: 36 }} />}
              <span className={`relative ${mode === id ? 'text-[var(--primary-fg)]' : 'text-[var(--text-body)]'}`}>{label}</span>
            </button>
          ))}
        </div>
        {mode === 'lesson' ? <PocketLesson /> : <FreeDoodle />}
      </div>
    </main>
  );
}
