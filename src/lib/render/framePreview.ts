import type { AnimationFrame } from '@/types/canvas';
import { getBufferGeneration, getBufferRevision } from '@/lib/engine/bufferRegistry';
import { registerMemoryUsage, reserveMemory } from '@/lib/safety/memoryBudget';
import { compositeFrame } from './compositor';

const previews = new Set<HTMLCanvasElement>();
registerMemoryUsage('previews', () => [...previews].reduce((bytes, canvas) => bytes + canvas.width * canvas.height * 4, 0));

export function retainFramePreview(canvas: HTMLCanvasElement): () => void {
  previews.add(canvas);
  return () => { previews.delete(canvas); canvas.width = 0; canvas.height = 0; };
}

/** Raster revisions live outside Zustand. Recompute on notifications, render only when this frame changes. */
export function frameVisualKey(frame: AnimationFrame | undefined): string {
  if (!frame) return '';
  return JSON.stringify([frame.id, frame.layers.map(layer => [layer.id, layer.visible, layer.opacity, layer.blendMode,
    getBufferGeneration(layer.id), getBufferRevision(layer.id)])]);
}

export function previewSize(width: number, height: number, maxSize: number) {
  const scale = Math.min(maxSize / width, maxSize / height, 1);
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** Retain only the small preview; dispose of its admitted native composite immediately. */
export function drawFramePreview(canvas: HTMLCanvasElement, frame: AnimationFrame | undefined, width: number, height: number): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = false;
  if (frame) {
    // Scaling each translucent layer first changes premultiplied rounding in
    // WebKit. Composite at native size, then sample the finished pixels once.
    const release = reserveMemory(width * height * 4, 'Sampling frame preview');
    let composite: HTMLCanvasElement | null = null;
    try {
      composite = compositeFrame([frame], 0, width, height, { freshCanvas: true });
      if (composite) ctx.drawImage(composite, 0, 0, canvas.width, canvas.height);
    } finally {
      if (composite) { composite.width = 0; composite.height = 0; }
      release();
    }
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}
