import { reserveMemory } from '@/lib/safety/memoryBudget';
import { validateExportGeometry } from './exportGeometryValidation';

export async function withExportMemory<T>(frames: HTMLCanvasElement[], scale: number, work: () => Promise<T>, maxAggregatePixels?: number, format = 'Animation'): Promise<T> {
  if (frames?.length) {
    const validation = validateExportGeometry(frames[0].width * scale, frames[0].height * scale, { frameCount: frames.length, maxAggregatePixels });
    if (!validation.valid) throw new RangeError(`${format} export aborted: ${validation.error}`);
  }
  const sourceBytes = frames?.reduce((sum, frame) => sum + frame.width * frame.height * 4, 0) ?? 0;
  // Account for supplied composite canvases, scaled pixels and codec/output copies.
  // This is a conservative admission estimate, not browser/codec process memory.
  const release = reserveMemory(sourceBytes * (1 + 3 * scale * scale), 'Animation export');
  try { return await work(); } finally { release(); }
}
