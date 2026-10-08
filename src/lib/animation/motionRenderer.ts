import type { PixelBuffer } from '@/lib/canvas/rotSprite';
import { reserveMemory } from '@/lib/safety/memoryBudget';
import type { MotionPart, MotionPose } from './pixiMotion';
import { motionRasterPlacement, renderPlacedMotionRaster, type PlacedMotionRaster } from './motionRaster';
import { MOTION_EDIT_LIMITS } from './motionEditing';
import { MAX_CANVAS_DIMENSION } from '@/config/canvasLimits';

export interface MotionRenderRequest {
  id: number;
  raster: PixelBuffer;
  bounds: MotionPart['bounds'];
  pivot: MotionPart['pivot'];
  pose: MotionPose;
  width: number;
  height: number;
}
interface RenderJob {
  part: MotionPart; pose: MotionPose; width: number; height: number;
  placement?: ReturnType<typeof motionRasterPlacement>;
  resolve: (image: PlacedMotionRaster) => void; reject: (error: unknown) => void;
}
const cancelled = () => new DOMException('Motion rendering superseded or cancelled.', 'AbortError');

/** One dedicated worker, one active request and one replaceable latest preview.
 * Disposal cannot interrupt unrelated layer/procedural workers. */
export function createMotionRenderer(factory: () => Worker | null = () => typeof Worker === 'undefined' ? null
  : new Worker(new URL('../../workers/motion.worker.ts', import.meta.url), { type: 'module' }), timeoutMs = 10000) {
  let worker: Worker | null = null, active: RenderJob | null = null, queued: RenderJob | null = null;
  let disposed = false, id = 0, timer: ReturnType<typeof setTimeout> | undefined;
  let release: (() => void) | undefined;
  const finish = (error?: unknown, result?: PlacedMotionRaster) => {
    const job = active; active = null; clearTimeout(timer); release?.(); release = undefined;
    if (job) {
      if (error) job.reject(error);
      else {
        const box = job.placement!;
        if (!result || result.width !== box.width || result.height !== box.height ||
          result.destX !== box.destX || result.destY !== box.destY ||
          !(result.data instanceof Uint8ClampedArray) || result.data.length !== box.width * box.height * 4) {
          job.reject(new Error('Invalid motion renderer response.'));
        } else job.resolve(result);
      }
    }
    if (!disposed && queued) { const next = queued; queued = null; start(next); }
  };
  const crash = (error: unknown, owner: Worker | null) => {
    if (worker !== owner) return;
    worker?.terminate(); worker = null;
    finish(error);
  };
  const start = (job: RenderJob) => {
    active = job;
    try {
      const { part, pose, width, height } = job;
      if (![width, height, part.bounds.w, part.bounds.h].every(v => Number.isSafeInteger(v) && v > 0 && v <= MAX_CANVAS_DIMENSION) ||
        ![part.bounds.x, part.bounds.y].every(Number.isSafeInteger) ||
        part.bounds.x < 0 || part.bounds.y < 0 || part.bounds.x + part.bounds.w > width || part.bounds.y + part.bounds.h > height ||
        ![part.pivot.x, part.pivot.y, pose.translationX, pose.translationY].every(v => Number.isFinite(v) && Math.abs(v) <= MOTION_EDIT_LIMITS.coordinate) ||
        !Number.isFinite(pose.rotation) || Math.abs(pose.rotation) > MOTION_EDIT_LIMITS.rotation ||
        part.raster.width !== part.bounds.w || part.raster.height !== part.bounds.h ||
        !(part.raster.data instanceof Uint8ClampedArray) || part.raster.data.length !== part.bounds.w * part.bounds.h * 4) {
        throw new Error('Invalid motion renderer input.');
      }
      const box = motionRasterPlacement(part.bounds, part.pivot, pose);
      job.placement = box;
      release = reserveMemory((part.bounds.w * part.bounds.h * 90 + box.width * box.height * 16) * 4, 'Motion worker scratch');
      if (!worker) {
        worker = factory();
        if (worker) {
          const owner = worker;
          worker.onmessage = event => {
            const response = event.data;
            if (!active || response?.id !== id) return;
            finish(response.error ? new Error(response.error) : undefined, response.result);
          };
          worker.onerror = () => crash(new Error('Motion worker failed. Retry the operation.'), owner);
          worker.onmessageerror = () => crash(new Error('Could not read the motion worker response.'), owner);
        }
      }
      if (!worker) {
        if (part.bounds.w * part.bounds.h * 64 + box.width * box.height > 1048576) {
          throw new Error('This motion needs Web Worker support. Reduce the selected area or use a browser with workers.');
        }
        timer = setTimeout(() => {
          if (disposed || active !== job) return;
          try {
            finish(undefined, renderPlacedMotionRaster(part.raster, part.bounds, part.pivot, pose));
          } catch (error) { finish(error); }
        }, 0);
        return;
      }
      const request: MotionRenderRequest = { id: ++id, raster: { width: part.bounds.w, height: part.bounds.h,
        data: new Uint8ClampedArray(part.raster.data) }, bounds: part.bounds, pivot: part.pivot, pose, width, height };
      const owner = worker;
      timer = setTimeout(() => crash(new Error('Motion rendering timed out. Retry with a smaller selected area.'), owner), timeoutMs);
      worker.postMessage(request, [request.raster.data.buffer]);
    } catch (error) { finish(error); }
  };
  return {
    render(part: MotionPart, pose: MotionPose, width: number, height: number): Promise<PlacedMotionRaster> {
      if (disposed) return Promise.reject(cancelled());
      return new Promise((resolve, reject) => {
        const job = { part, pose: { ...pose }, width, height, resolve, reject };
        if (active) { queued?.reject(cancelled()); queued = job; } else start(job);
      });
    },
    dispose() {
      if (disposed) return; disposed = true;
      worker?.terminate(); worker = null; queued?.reject(cancelled()); queued = null; finish(cancelled());
    },
  };
}
