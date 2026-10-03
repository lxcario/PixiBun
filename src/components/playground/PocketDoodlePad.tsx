'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';

const SIZE = 32;
const COLORS = ['#252034', '#f0be7c', '#e47779', '#a3be8c', '#8cb9c9', '#f7e6c4'];
type Point = { x: number; y: number };

export function PocketDoodlePad() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastPoint = useRef<Point | null>(null);
  const [color, setColor] = useState(COLORS[0]);
  const [eraser, setEraser] = useState(false);

  useEffect(() => {
    const context = canvasRef.current?.getContext('2d');
    if (context) context.imageSmoothingEnabled = false;
  }, []);

  const pointFromEvent = (event: React.PointerEvent<HTMLCanvasElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(SIZE - 1, Math.floor((event.clientX - rect.left) * SIZE / rect.width))),
      y: Math.max(0, Math.min(SIZE - 1, Math.floor((event.clientY - rect.top) * SIZE / rect.height))),
    };
  };

  const paint = useCallback((from: Point, to: Point) => {
    const context = canvasRef.current?.getContext('2d');
    if (!context) return;
    const steps = Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y));
    for (let step = 0; step <= steps; step++) {
      const x = Math.round(from.x + (to.x - from.x) * (steps ? step / steps : 0));
      const y = Math.round(from.y + (to.y - from.y) * (steps ? step / steps : 0));
      if (eraser) context.clearRect(x, y, 1, 1);
      else {
        context.fillStyle = color;
        context.fillRect(x, y, 1, 1);
      }
    }
  }, [color, eraser]);

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = pointFromEvent(event);
    lastPoint.current = point;
    paint(point, point);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!lastPoint.current) return;
    const point = pointFromEvent(event);
    paint(lastPoint.current, point);
    lastPoint.current = point;
  };

  const savePng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'pixibun-pocket-doodle.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <main id="main-workspace" tabIndex={-1} className="lg:hidden min-h-dvh bg-[var(--desk-bg)] px-4 py-6 text-[var(--text-heading)] font-mono">
      <div className="mx-auto flex w-full max-w-md flex-col gap-5">
        <header className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-[var(--accent-gold)]">PIXIBUN PLAYGROUND</p>
            <h1 className="text-xl font-bold">Pocket Doodle Pad</h1>
          </div>
          <Link href="/" className="rounded border border-[var(--desk-border)] px-3 py-2 text-xs">Home</Link>
        </header>
        <p className="text-sm text-[var(--text-body)]">Draw a 32 × 32 pixel sketch with your finger, then save it as a PNG.</p>
        <div className="w-full aspect-square overflow-hidden rounded border-4 border-[var(--desk-border)] bg-white"
          style={{ backgroundImage: 'conic-gradient(#eee 25%, white 0 50%, #eee 0 75%, white 0)', backgroundSize: '24px 24px' }}>
          <canvas ref={canvasRef} width={SIZE} height={SIZE} role="img" aria-label="Pocket doodle canvas"
            onPointerDown={handlePointerDown} onPointerMove={handlePointerMove}
            onPointerUp={() => { lastPoint.current = null; }}
            onPointerCancel={() => { lastPoint.current = null; }}
            className="h-full w-full touch-none cursor-crosshair" style={{ imageRendering: 'pixelated' }} />
        </div>
        <div className="flex flex-wrap items-center gap-2" aria-label="Drawing colors">
          {COLORS.map((swatch) => <button key={swatch} type="button" aria-label={`Use ${swatch} color`}
            aria-pressed={!eraser && color === swatch} onClick={() => { setColor(swatch); setEraser(false); }}
            className={`h-10 w-10 rounded border-2 ${!eraser && color === swatch ? 'border-[var(--text-heading)] ring-2 ring-[var(--accent-gold)]' : 'border-[var(--desk-border)]'}`}
            style={{ backgroundColor: swatch }} />)}
          <button type="button" aria-pressed={eraser} onClick={() => setEraser(true)}
            className="rounded border border-[var(--desk-border)] px-3 py-2 text-sm">Eraser</button>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => canvasRef.current?.getContext('2d')?.clearRect(0, 0, SIZE, SIZE)}
            className="flex-1 rounded border border-[var(--desk-border)] px-3 py-3 text-sm">Clear</button>
          <button type="button" onClick={savePng}
            className="flex-1 rounded bg-[var(--accent-gold)] px-3 py-3 text-sm font-bold text-[var(--desk-bg)]">Save PNG</button>
        </div>
      </div>
    </main>
  );
}
