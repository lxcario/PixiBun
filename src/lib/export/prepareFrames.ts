import type { AnimationFrame } from '@/types/canvas';
import { compositeFrame } from '@/lib/render/compositor';
import { reserveMemory } from '@/lib/safety/memoryBudget';
import { frameVisualKey } from '@/lib/render/framePreview';

/** Own the source composites before allocating them, including preparation failures. */
export function prepareExportFrames(frames: AnimationFrame[], width: number, height: number) {
  const releaseMemory = reserveMemory(frames.length * width * height * 4, 'Preparing animation frames');
  const canvases: HTMLCanvasElement[] = [];
  const release = () => { for (const canvas of canvases) { canvas.width = 0; canvas.height = 0; } releaseMemory(); };
  try {
    for (let i = 0; i < frames.length; i++) {
      const canvas = compositeFrame(frames, i, width, height, { freshCanvas: true });
      if (!canvas) throw new Error(`Frame ${i + 1} could not be rendered. Retry the export.`);
      canvases.push(canvas);
    }
    return { canvases, release };
  } catch (error) { release(); throw error; }
}

/** Yield before and between composites so cancellation can stop preparation itself. */
export async function prepareExportFramesAsync(frames: AnimationFrame[], width: number, height: number, signal: AbortSignal) {
  signal.throwIfAborted();
  const releaseMemory = reserveMemory(frames.length * width * height * 4, 'Preparing animation frames');
  const canvases: HTMLCanvasElement[] = [];
  const keys = frames.map(frameVisualKey);
  const release = () => { for (const canvas of canvases) { canvas.width = 0; canvas.height = 0; } releaseMemory(); };
  try {
    for (let i = 0; i < frames.length; i++) {
      await new Promise<void>(resolve => setTimeout(resolve, 0));
      signal.throwIfAborted();
      if (frameVisualKey(frames[i]) !== keys[i]) throw new Error('Artwork changed while preparing the animation. Retry the export.');
      const canvas = compositeFrame(frames, i, width, height, { freshCanvas: true });
      if (!canvas) throw new Error(`Frame ${i + 1} could not be rendered. Retry the export.`);
      canvases.push(canvas);
    }
    return { canvases, release };
  } catch (error) { release(); throw error; }
}
