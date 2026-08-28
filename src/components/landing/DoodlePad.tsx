'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

const COLS = 32;
const ROWS = 20;

const SWATCHES = [
  { name: 'Wisteria', hex: '#c792df' },
  { name: 'Plum ink', hex: '#3a2e4c' },
  { name: 'Lamplight', hex: '#f0be7c' },
  { name: 'Paper', hex: '#ede8f4' },
] as const;

const EMPTY_A = '#e9e3f0';
const EMPTY_B = '#efeaf6';
const ERASER = -1;

// A little heart so the pad never greets anyone empty.
const HEART_ROWS = ['.11.11.', '1111111', '1111111', '.11111.', '..111..', '...1...'];

function seedHeart(cells: Uint8Array): void {
  HEART_ROWS.forEach((row, dy) => {
    for (let dx = 0; dx < row.length; dx++) {
      if (row[dx] === '1') cells[(7 + dy) * COLS + 12 + dx] = 1;
    }
  });
}

export const DoodlePad: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cellsRef = useRef<Uint8Array>(new Uint8Array(COLS * ROWS));
  const drawingRef = useRef(false);
  const swatchRef = useRef<number>(0);

  const repaint = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const cellW = canvas.width / COLS;
    const cellH = canvas.height / ROWS;
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const value = cellsRef.current[y * COLS + x];
        ctx.fillStyle =
          value === 0
            ? (x + y) % 2 === 0 ? EMPTY_A : EMPTY_B
            : SWATCHES[value - 1].hex;
        ctx.fillRect(x * cellW, y * cellH, cellW, cellH);
      }
    }
  }, []);

  useEffect(() => {
    seedHeart(cellsRef.current);
    repaint();
  }, [repaint]);

  const paintAt = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const col = Math.floor(((clientX - rect.left) / rect.width) * COLS);
      const row = Math.floor(((clientY - rect.top) / rect.height) * ROWS);
      if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return;
      cellsRef.current[row * COLS + col] = swatchRef.current === ERASER ? 0 : swatchRef.current + 1;
      repaint();
    },
    [repaint]
  );

  const [active, setActive] = useState<number>(0);

  const selectSwatch = (index: number) => {
    swatchRef.current = index;
    setActive(index);
  };

  const handleClear = () => {
    cellsRef.current.fill(0);
    repaint();
  };

  return (
    <div className="flex flex-col gap-2">
      <canvas
        ref={canvasRef}
        width={512}
        height={320}
        className="w-full pixelated border-2 border-border-dark cursor-crosshair touch-none select-none"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          drawingRef.current = true;
          paintAt(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (drawingRef.current) paintAt(e.clientX, e.clientY);
        }}
        onPointerUp={(e) => {
          drawingRef.current = false;
          e.currentTarget.releasePointerCapture(e.pointerId);
        }}
        onPointerCancel={() => {
          drawingRef.current = false;
        }}
      />

      <div className="flex items-center gap-1.5 flex-wrap">
        {SWATCHES.map((swatch, i) => (
          <button
            key={swatch.hex}
            onClick={() => selectSwatch(i)}
            title={swatch.name}
            aria-label={`Pick ${swatch.name}`}
            aria-pressed={active === i}
            style={{ backgroundColor: swatch.hex }}
            className={`w-7 h-7 rounded-[3px] border-2 border-border-dark cursor-pointer transition-transform hover:scale-105 ${
              active === i ? 'ring-2 ring-lamp ring-offset-1 ring-offset-surface-raised' : ''
            } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lamp`}
          />
        ))}
        <button
          onClick={() => selectSwatch(ERASER)}
          title="Eraser"
          aria-pressed={active === ERASER}
          className={`px-2 h-7 text-[11px] font-mono font-bold rounded-[3px] border-2 border-border-dark bg-surface cursor-pointer transition-transform hover:scale-105 ${
            active === ERASER ? 'ring-2 ring-lamp ring-offset-1 ring-offset-surface-raised' : ''
          } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lamp`}
        >
          Erase
        </button>

        <button
          onClick={handleClear}
          title="Clear the pad"
          className="ml-auto px-2 h-7 text-[11px] font-mono font-bold rounded-[3px] border-2 border-border-dark bg-surface-inset hover:bg-surface cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lamp"
        >
          Start over
        </button>
      </div>

      <p className="text-[11px] font-mono text-text-secondary">
        Your doodle stays right here on the page. Nothing uploads, ever.
      </p>
    </div>
  );
};