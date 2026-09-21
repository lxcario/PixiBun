import type { HistoryStep, PixelHistoryStep, StructuralHistoryStep, LayerBufferBackup } from '@/types/canvas';
import { studioEvents } from '@/lib/events/studioEvents';
export type { HistoryStep, PixelHistoryStep, StructuralHistoryStep, LayerBufferBackup };

export interface ReplayBaselineLayer {
  layerId: string;
  frameIndex: number;
  imageData: ImageData;
  opacity?: number;
  blendMode?: string;
  visible?: boolean;
  name?: string;
}

export interface ReplayBaselineFrame {
  frameIndex: number;
  layers: ReplayBaselineLayer[];
}

export interface ReplayBaselineCheckpoint {
  width: number;
  height: number;
  frames: ReplayBaselineFrame[];
  activeFrameIndex?: number;
  totalBytes: number;
}

export interface HistoryEngineOptions {
  maxDepth?: number;
  maxBytes?: number;
}

export interface HistoryEngine {
  /** Push a completed stroke snapshot; drops redo tail, prunes to maxDepth and maxBytes, returns new undo depth. */
  push(step: HistoryStep): number;
  /** Pop undo stack; if currentState is provided, pushes it to redo stack; returns the step to restore, or null if nothing to undo. */
  undo(currentState?: HistoryStep): HistoryStep | null;
  /** Pop redo stack; if currentState is provided, pushes it to undo stack; returns the step to restore, or null if nothing to redo. */
  redo(currentState?: HistoryStep): HistoryStep | null;
  /** Peek at the top of the undo stack without popping. */
  peekUndo(): HistoryStep | null;
  /** Peek at the top of the redo stack without popping. */
  peekRedo(): HistoryStep | null;
  /** Clear both stacks (new drawing, canvas resize, frame switch). */
  clear(): void;
  /** Get an immutable array copy of all history steps in the undo stack (for process replay speedpaint export). */
  getHistory(): readonly HistoryStep[];
  /** Get the retained baseline checkpoint across layers/frames prior to earliest retained step (for process replay after eviction). */
  getBaseline(): ReplayBaselineCheckpoint | null;
  /** Set or replace the retained baseline checkpoint explicitly. */
  setBaseline(checkpoint: ReplayBaselineCheckpoint | null): void;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly depth: number;
  readonly totalBytes: number;
  readonly isTruncated: boolean;
  readonly evictionCount: number;
  readonly maxBytes: number;
  readonly maxDepth: number;
}

export const DEFAULT_HISTORY_MAX_DEPTH = 50;
export const DEFAULT_HISTORY_MAX_BYTES = 64 * 1024 * 1024; // 64 MiB

/**
 * Calculates approximate byte size of a HistoryStep.
 */
export function calculateStepBytes(step: HistoryStep): number {
  if (step.type === 'structural') {
    let bytes = 1024; // Base object overhead
    if (step.layerBuffers) {
      for (const b of step.layerBuffers) {
        if (b.imageData?.data) {
          bytes += b.imageData.data.byteLength;
        } else if (b.imageData) {
          bytes += (b.imageData.width || 0) * (b.imageData.height || 0) * 4;
        }
      }
    }
    if (step.frames) {
      for (const f of step.frames) {
        bytes += 256 + (f.layers?.length ?? 0) * 256;
      }
    }
    return bytes;
  } else {
    // Pixel step
    const dataLen = step.imageData?.data?.byteLength ??
      (step.imageData ? (step.imageData.width || 0) * (step.imageData.height || 0) * 4 : 0);
    return dataLen + 512;
  }
}

export function createHistoryEngine(
  optionsOrMaxDepth: number | HistoryEngineOptions = DEFAULT_HISTORY_MAX_DEPTH
): HistoryEngine {
  const options: HistoryEngineOptions =
    typeof optionsOrMaxDepth === 'number'
      ? { maxDepth: optionsOrMaxDepth, maxBytes: DEFAULT_HISTORY_MAX_BYTES }
      : optionsOrMaxDepth;

  const limitDepth = Math.max(1, options.maxDepth ?? DEFAULT_HISTORY_MAX_DEPTH);
  const limitBytes = Math.max(1024, options.maxBytes ?? DEFAULT_HISTORY_MAX_BYTES);

  let undoStack: HistoryStep[] = [];
  let redoStack: HistoryStep[] = [];
  let totalBytes = 0;
  let isTruncated = false;
  let evictionCount = 0;
  let baselineCheckpoint: ReplayBaselineCheckpoint | null = null;

  function cloneImageData(src: ImageData): ImageData {
    const copy = new Uint8ClampedArray(src.data);
    return {
      width: src.width,
      height: src.height,
      data: copy,
      colorSpace: src.colorSpace ?? 'srgb',
    } as ImageData;
  }

  function updateBaselineFromEvicted(evicted: HistoryStep): void {
    if (evicted.type === 'pixel' && evicted.imageData) {
      const fIdx = evicted.frameIndex ?? 0;
      const w = evicted.imageData.width;
      const h = evicted.imageData.height;
      if (!baselineCheckpoint) {
        baselineCheckpoint = {
          width: w,
          height: h,
          frames: [
            {
              frameIndex: fIdx,
              layers: [
                {
                  layerId: evicted.layerId,
                  frameIndex: fIdx,
                  imageData: cloneImageData(evicted.imageData),
                  name: evicted.layerName,
                  opacity: 1,
                  blendMode: 'source-over',
                  visible: true,
                },
              ],
            },
          ],
          activeFrameIndex: fIdx,
          totalBytes: evicted.imageData.data.byteLength + 1024,
        };
      } else {
        let frame = baselineCheckpoint.frames.find((f) => f.frameIndex === fIdx);
        if (!frame) {
          frame = { frameIndex: fIdx, layers: [] };
          baselineCheckpoint.frames.push(frame);
          baselineCheckpoint.totalBytes += 512;
        }
        const existingLayer = frame.layers.find((l) => l.layerId === evicted.layerId);
        if (existingLayer) {
          baselineCheckpoint.totalBytes -= existingLayer.imageData.data.byteLength;
          existingLayer.imageData = cloneImageData(evicted.imageData);
          baselineCheckpoint.totalBytes += existingLayer.imageData.data.byteLength;
        } else {
          frame.layers.push({
            layerId: evicted.layerId,
            frameIndex: fIdx,
            imageData: cloneImageData(evicted.imageData),
            name: evicted.layerName,
            opacity: 1,
            blendMode: 'source-over',
            visible: true,
          });
          baselineCheckpoint.totalBytes += evicted.imageData.data.byteLength + 512;
        }
      }
    } else if (evicted.type === 'structural') {
      if (!baselineCheckpoint && evicted.canvasWidth && evicted.canvasHeight) {
        baselineCheckpoint = {
          width: evicted.canvasWidth,
          height: evicted.canvasHeight,
          frames: [],
          activeFrameIndex: evicted.activeFrameIndex ?? 0,
          totalBytes: 1024,
        };
      }
      if (baselineCheckpoint) {
        if (evicted.canvasWidth && evicted.canvasHeight) {
          baselineCheckpoint.width = evicted.canvasWidth;
          baselineCheckpoint.height = evicted.canvasHeight;
        }
        if (evicted.layerBuffers && evicted.layerBuffers.length > 0) {
          const fIdx = evicted.frameIndex ?? 0;
          let frame = baselineCheckpoint.frames.find((f) => f.frameIndex === fIdx);
          if (!frame) {
            frame = { frameIndex: fIdx, layers: [] };
            baselineCheckpoint.frames.push(frame);
            baselineCheckpoint.totalBytes += 512;
          }
          for (const buf of evicted.layerBuffers) {
            const existingLayer = frame.layers.find((l) => l.layerId === buf.layerId);
            if (existingLayer) {
              baselineCheckpoint.totalBytes -= existingLayer.imageData.data.byteLength;
              existingLayer.imageData = cloneImageData(buf.imageData);
              baselineCheckpoint.totalBytes += existingLayer.imageData.data.byteLength;
            } else {
              frame.layers.push({
                layerId: buf.layerId,
                frameIndex: fIdx,
                imageData: cloneImageData(buf.imageData),
                opacity: 1,
                blendMode: 'source-over',
                visible: true,
              });
              baselineCheckpoint.totalBytes += buf.imageData.data.byteLength + 512;
            }
          }
        }
        if (evicted.frames) {
          for (let fIdx = 0; fIdx < evicted.frames.length; fIdx++) {
            const af = evicted.frames[fIdx];
            let frame = baselineCheckpoint.frames.find((f) => f.frameIndex === fIdx);
            if (!frame) {
              frame = { frameIndex: fIdx, layers: [] };
              baselineCheckpoint.frames.push(frame);
            }
            for (const al of af.layers) {
              const existing = frame.layers.find((l) => l.layerId === al.id);
              if (existing) {
                existing.opacity = al.opacity;
                existing.blendMode = al.blendMode;
                existing.visible = al.visible;
                existing.name = al.name;
              }
            }
          }
        }
      }
    }
  }

  return {
    push(step: HistoryStep): number {
      const stepBytes = calculateStepBytes(step);

      // Oversized entry safety:
      // An individual step that exceeds maxBytes cannot be safely retained without
      // violating the memory budget. Reject it, clear redo, and notify the user.
      if (stepBytes > limitBytes) {
        redoStack = [];
        isTruncated = true;
        try {
          studioEvents.emit('pixibun:toast', {
            message: `History entry exceeds undo memory budget (${(stepBytes / (1024 * 1024)).toFixed(1)} MiB > ${(limitBytes / (1024 * 1024)).toFixed(0)} MiB) and cannot be undone.`,
            type: 'error',
          });
        } catch {
          // In headless tests or non-DOM environments, ignore event dispatch error
        }
        return undoStack.length;
      }

      // Evict oldest entries until within both depth and byte budget
      while (
        undoStack.length > 0 &&
        (totalBytes + stepBytes > limitBytes || undoStack.length >= limitDepth)
      ) {
        const evicted = undoStack.shift()!;
        totalBytes -= calculateStepBytes(evicted);
        isTruncated = true;
        evictionCount++;
        updateBaselineFromEvicted(evicted);
      }

      undoStack.push(step);
      totalBytes += stepBytes;
      redoStack = [];
      return undoStack.length;
    },

    undo(currentState?: HistoryStep): HistoryStep | null {
      if (undoStack.length === 0) return null;
      const step = undoStack.pop()!;
      totalBytes -= calculateStepBytes(step);

      if (currentState) {
        const currentBytes = calculateStepBytes(currentState);
        if (currentBytes <= limitBytes) {
          while (redoStack.length >= limitDepth) {
            redoStack.shift();
          }
          redoStack.push(currentState);
        }
      }
      return step;
    },

    redo(currentState?: HistoryStep): HistoryStep | null {
      if (redoStack.length === 0) return null;
      const step = redoStack.pop()!;

      if (currentState) {
        const currentBytes = calculateStepBytes(currentState);
        while (
          undoStack.length > 0 &&
          (totalBytes + currentBytes > limitBytes || undoStack.length >= limitDepth)
        ) {
          const evicted = undoStack.shift()!;
          totalBytes -= calculateStepBytes(evicted);
          isTruncated = true;
          evictionCount++;
        }
        undoStack.push(currentState);
        totalBytes += currentBytes;
      }
      return step;
    },

    peekUndo(): HistoryStep | null {
      return undoStack.length > 0 ? undoStack[undoStack.length - 1] : null;
    },

    peekRedo(): HistoryStep | null {
      return redoStack.length > 0 ? redoStack[redoStack.length - 1] : null;
    },

    clear(): void {
      undoStack = [];
      redoStack = [];
      totalBytes = 0;
      isTruncated = false;
      evictionCount = 0;
      baselineCheckpoint = null;
    },

    getHistory(): readonly HistoryStep[] {
      return [...undoStack];
    },

    getBaseline(): ReplayBaselineCheckpoint | null {
      return baselineCheckpoint;
    },

    setBaseline(checkpoint: ReplayBaselineCheckpoint | null): void {
      baselineCheckpoint = checkpoint;
    },

    get canUndo(): boolean {
      return undoStack.length > 0;
    },

    get canRedo(): boolean {
      return redoStack.length > 0;
    },

    get depth(): number {
      return undoStack.length;
    },

    get totalBytes(): number {
      return Math.max(0, totalBytes);
    },

    get isTruncated(): boolean {
      return isTruncated;
    },

    get evictionCount(): number {
      return evictionCount;
    },

    get maxBytes(): number {
      return limitBytes;
    },

    get maxDepth(): number {
      return limitDepth;
    },
  };
}

let activeGlobalHistoryEngine: HistoryEngine | null = null;

export function setGlobalHistoryEngine(engine: HistoryEngine | null): void {
  activeGlobalHistoryEngine = engine;
}

export function getGlobalHistoryEngine(): HistoryEngine | null {
  return activeGlobalHistoryEngine;
}

export function getGlobalHistory(): readonly HistoryStep[] {
  return activeGlobalHistoryEngine ? activeGlobalHistoryEngine.getHistory() : [];
}

export function getGlobalBaselineCheckpoint(): ReplayBaselineCheckpoint | null {
  return activeGlobalHistoryEngine ? activeGlobalHistoryEngine.getBaseline() : null;
}

export function isGlobalHistoryTruncated(): boolean {
  return activeGlobalHistoryEngine ? activeGlobalHistoryEngine.isTruncated : false;
}


