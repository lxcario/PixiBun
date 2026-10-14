'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { compositeFrame } from '@/lib/render/compositor';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { getNextZoomStep, getPrevZoomStep, MIN_ZOOM, MAX_ZOOM } from '@/config/zoom';
import { executeStudioCommand } from '@/config/studioCommands';

export function NavigatorPanel() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const dragging = useRef(false);
  const width = useStudioStore((s) => s.canvasWidth);
  const height = useStudioStore((s) => s.canvasHeight);
  const frames = useStudioStore((s) => s.frames);
  const frame = useStudioStore((s) => s.activeFrameIndex);
  const version = useStudioStore((s) => s.bufferVersion);
  const zoom = useStudioStore((s) => s.zoom);
  const panX = useStudioStore((s) => s.panX);
  const panY = useStudioStore((s) => s.panY);
  const setPan = useStudioStore((s) => s.setPan);
  const setZoom = useStudioStore((s) => s.setZoom);
  const setZoomAndPan = useStudioStore((s) => s.setZoomAndPan);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [grid, setGrid] = useState(false);

  useEffect(() => {
    const el = document.getElementById('main-content');
    if (!el) return;
    const update = () => setViewport({ width: el.clientWidth, height: el.clientHeight });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const scale = Math.min(224 / width, 112 / height);
  const w = width * scale;
  const h = height * scale;
  const left = (224 - w) / 2;
  const top = (112 - h) / 2;

  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, 224, 112);
    ctx.imageSmoothingEnabled = false;
    ctx.save();
    ctx.beginPath();
    ctx.rect(left, top, w, h);
    ctx.clip();
    for (let y = top; y < top + h; y += 6) {
      for (let x = left; x < left + w; x += 6) {
        ctx.fillStyle =
          (Math.round((x - left) / 6) + Math.round((y - top) / 6)) % 2 ? '#2e2b36' : '#221f29';
        ctx.fillRect(x, y, 6, 6);
      }
    }
    const image = compositeFrame(frames, frame, width, height, { freshCanvas: false });
    if (image) ctx.drawImage(image, left, top, w, h);
    ctx.restore();

    if (grid && width <= 128 && height <= 128) {
      ctx.strokeStyle = 'rgba(240, 190, 124, 0.35)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      for (let x = 0; x <= width; x++) {
        ctx.moveTo(left + x * scale, top);
        ctx.lineTo(left + x * scale, top + h);
      }
      for (let y = 0; y <= height; y++) {
        ctx.moveTo(left, top + y * scale);
        ctx.lineTo(left + w, top + y * scale);
      }
      ctx.stroke();
    }
  }, [frames, frame, version, width, height, grid, left, top, w, h, scale]);

  const move = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const r = e.currentTarget.getBoundingClientRect();
      const x = Math.max(0, Math.min(width, (((e.clientX - r.left) * 224) / r.width - left) / scale));
      const y = Math.max(0, Math.min(height, (((e.clientY - r.top) * 112) / r.height - top) / scale));
      setPan(((width / 2 - x) * zoom) / 100, ((height / 2 - y) * zoom) / 100);
    },
    [height, left, scale, setPan, top, width, zoom]
  );

  const visibleW = viewport.width / (zoom / 100);
  const visibleH = viewport.height / (zoom / 100);

  const handleFit = () => executeStudioCommand('view-fit-screen');

  return (
    <section
      aria-label="Canvas navigator"
      className="shrink-0 border-t border-[var(--desk-border)] bg-[var(--desk-surface)] p-2.5 flex flex-col gap-2"
    >
      {/* 1. Header with Badges */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <PixelIcon name="preview" size={11} className="text-[var(--accent-gold)]" />
          <span className="font-semibold text-[11px] text-[var(--text-heading)]">Navigator</span>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[10px]">
          <span
            className="px-1.5 py-0.5 rounded-[2px] bg-[var(--surface-0)] border border-[var(--desk-border)] text-[var(--text-muted)]"
            title="Canvas dimensions"
          >
            {width} × {height}
          </span>
          <span
            className="px-1.5 py-0.5 rounded-[2px] bg-[var(--surface-0)] border border-[var(--accent-gold)]/40 text-[var(--accent-gold)] font-bold"
            title="Current zoom"
          >
            {Math.round(zoom)}%
          </span>
        </div>
      </div>

      {/* 2. Sleek Screen Bezel */}
      <div className="relative w-full h-[120px] mx-auto rounded-[3px] overflow-hidden bg-[var(--surface-0)] border border-[var(--desk-border)] shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] flex items-center justify-center">
        <button type="button" className="relative w-[224px] h-[112px] shrink-0 p-0 outline-offset-2"
          aria-label="Canvas overview. Click or drag to pan; arrow keys pan, Shift moves eight pixels, Enter centers."
          onClick={event => { if (event.detail === 0) setPan(0, 0); }}
          onKeyDown={event => {
            const direction = { ArrowLeft: [1, 0], ArrowRight: [-1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[event.key];
            if (!direction) return;
            event.preventDefault(); event.stopPropagation();
            const step = (event.shiftKey ? 8 : 1) * zoom / 100;
            setPan(panX + direction[0] * step, panY + direction[1] * step);
          }}>
        <canvas
          ref={canvas}
          width={224}
          height={112}
          data-testid="navigator-canvas"
          className="block w-[224px] h-[112px] touch-none cursor-crosshair select-none"
          aria-hidden="true"
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            e.preventDefault();
            e.currentTarget.parentElement?.focus();
            dragging.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            move(e);
          }}
          onPointerMove={(e) => {
            if (dragging.current) move(e);
          }}
          onPointerUp={() => {
            dragging.current = false;
          }}
          onPointerCancel={() => {
            dragging.current = false;
          }}
          onLostPointerCapture={() => {
            dragging.current = false;
          }}
        />

        {/* Viewport Frustum Box */}
        <div
          className="absolute pointer-events-none border-2 border-[var(--accent-gold)] shadow-[0_0_6px_rgba(240,190,124,0.5)] rounded-[1px]"
          data-testid="navigator-view-bounds"
          aria-hidden="true"
          style={{
            left: left + (width / 2 - panX / (zoom / 100) - visibleW / 2) * scale,
            top: top + (height / 2 - panY / (zoom / 100) - visibleH / 2) * scale,
            width: visibleW * scale,
            height: visibleH * scale,
          }}
        />
        </button>
      </div>

      {/* 3. Interactive Zoom Slider Strip */}
      <div className="flex items-center gap-1.5 px-0.5">
        <button
          type="button"
          onClick={() => setZoom(getPrevZoomStep(zoom))}
          title="Zoom out"
          aria-label="Zoom out"
          className="w-5 h-5 flex items-center justify-center rounded-[2px] bg-[var(--surface-0)] border border-[var(--desk-border)] text-xs text-[var(--text-body)] hover:text-[var(--text-heading)] hover:border-[var(--accent-gold)]/50 active:translate-y-[1px] cursor-pointer"
        >
          -
        </button>
        <input
          type="range"
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          value={Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(zoom)))}
          onChange={(e) => setZoom(Number(e.target.value))}
          aria-label="Navigator zoom slider"
          className="flex-1 h-1 accent-[var(--accent-gold)] bg-[var(--surface-0)] rounded cursor-pointer"
        />
        <button
          type="button"
          onClick={() => setZoom(getNextZoomStep(zoom))}
          title="Zoom in"
          aria-label="Zoom in"
          className="w-5 h-5 flex items-center justify-center rounded-[2px] bg-[var(--surface-0)] border border-[var(--desk-border)] text-xs text-[var(--text-body)] hover:text-[var(--text-heading)] hover:border-[var(--accent-gold)]/50 active:translate-y-[1px] cursor-pointer"
        >
          +
        </button>
      </div>

      {/* 4. Action Pills & Grid Toggle */}
      <div className="flex items-center gap-1 text-[10px]">
        <button
          type="button"
          onClick={() => setZoomAndPan(100, 0, 0)}
          className="px-2 py-0.5 rounded-[2px] bg-[var(--surface-0)] border border-[var(--desk-border)] text-[var(--text-body)] hover:text-[var(--text-heading)] hover:border-[var(--accent-gold)]/50 cursor-pointer active:translate-y-[1px]"
        >
          1:1
        </button>
        <button
          type="button"
          onClick={handleFit}
          className="px-2 py-0.5 rounded-[2px] bg-[var(--surface-0)] border border-[var(--desk-border)] text-[var(--text-body)] hover:text-[var(--text-heading)] hover:border-[var(--accent-gold)]/50 cursor-pointer active:translate-y-[1px]"
        >
          Fit canvas
        </button>
        <button
          type="button"
          onClick={() => setPan(0, 0)}
          title="Center canvas without changing zoom"
          className="px-2 py-0.5 rounded-[2px] bg-[var(--surface-0)] border border-[var(--desk-border)] text-[var(--text-body)] hover:text-[var(--text-heading)] hover:border-[var(--accent-gold)]/50 cursor-pointer active:translate-y-[1px]"
        >
          Center
        </button>
        <label className="ml-auto flex items-center gap-1 text-[10px] text-[var(--text-muted)] hover:text-[var(--text-heading)] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={grid}
            disabled={width > 128 || height > 128}
            onChange={(e) => setGrid(e.target.checked)}
            className="rounded-[1px] accent-[var(--accent-gold)] cursor-pointer"
          />
          <span>Grid</span>
        </label>
      </div>
    </section>
  );
}
