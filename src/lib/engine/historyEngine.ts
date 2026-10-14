import type { HistoryStep, PixelHistoryStep, StructuralHistoryStep, LayerBufferBackup } from '@/types/canvas';
import { studioEvents } from '@/lib/events/studioEvents';
import { registerMemoryUsage, reserveMemory } from '@/lib/safety/memoryBudget';
import { estimateClipBytes } from '@/lib/animation/reviewMetadata';
import { estimatePaletteBytes } from '@/lib/color/paletteSemantics';
import { motionRigBytes } from '@/lib/animation/motionRigDocument';
import { researchBytes } from '@/lib/research/recipes';
import { isPatchStep, pastePatch } from '@/lib/engine/pixelPatch';
export type { HistoryStep, PixelHistoryStep, StructuralHistoryStep, LayerBufferBackup };

export interface ReplayBaselineLayer {
  layerId: string;
  frameIndex: number;
  imageData: ImageData;
  opacity?: number;
  blendMode?: string;
  visible?: boolean;
  name?: string;
  order?: number;
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
  /** Roll back stacks, accounting and replay baseline if a synchronous commit fails. */
  transaction<T>(operation: () => T): T;
  /**
   * Push a completed stroke snapshot; drops redo tail, prunes to maxDepth and maxBytes, returns new undo depth.
   * `origin` is the whole layer before a pixel step; it seeds the replay baseline the first time a layer is
   * edited, so timelapse export can rebuild full frames from dirty-rectangle patches.
   */
  push(step: HistoryStep, origin?: ImageData): number;
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
  readonly redoDepth: number;
  readonly undoBytes: number;
  readonly redoBytes: number;
  readonly totalBytes: number;
  readonly isTruncated: boolean;
  readonly evictionCount: number;
  readonly maxBytes: number;
  readonly maxDepth: number;
}

/**
 * Undo and redo stacks are independently depth-bounded, while their combined
 * retained HistoryStep payload is constrained by the configured 64 MiB history
 * byte envelope. Pixel steps keep only the rectangle they changed, so the byte
 * budget, not the depth, is what normally limits Undo.
 * The replay baseline is separately bounded by current project raster complexity
 * and does not grow with session duration.
 */
export const DEFAULT_HISTORY_MAX_DEPTH = 4096;
export const DEFAULT_HISTORY_MAX_BYTES = 64 * 1024 * 1024; // 64 MiB

/**
 * Calculates approximate byte size of a HistoryStep.
 */
export function calculateStepBytes(step: HistoryStep): number {
  if (step.type === 'structural') {
    let bytes = 1024; // Base object overhead
    bytes += motionRigBytes(step.motionRigs);
    bytes += step.clips?.reduce((total, clip) => total + estimateClipBytes(clip), 0) ?? 0;
    bytes += step.palettes?.reduce((total, palette) => total + estimatePaletteBytes(palette), 0) ?? 0;
    bytes += step.frames.reduce((total, frame) => total + frame.layers.reduce((sum, layer) => sum + researchBytes(layer.research), 0), 0);
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
    return dataLen + (step.expectedImageData?.data?.byteLength ?? 0) + 512;
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
  let undoBytes = 0;
  let redoBytes = 0;
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
    };
  }

  function createBlankImageData(w: number, h: number): ImageData {
    return {
      width: w,
      height: h,
      data: new Uint8ClampedArray(w * h * 4),
      colorSpace: 'srgb',
    };
  }

  function baselineLayer(frameIndex: number, layerId: string): ReplayBaselineLayer | undefined {
    return baselineCheckpoint?.frames.find((f) => f.frameIndex === frameIndex)?.layers.find((l) => l.layerId === layerId);
  }

  /** Store a whole-layer image in the baseline. `imageData` must not be shared with a retained step. */
  function setBaselineLayer(step: PixelHistoryStep, imageData: ImageData): void {
    const fIdx = step.frameIndex ?? 0;
    if (!baselineCheckpoint) {
      baselineCheckpoint = { width: imageData.width, height: imageData.height, frames: [], activeFrameIndex: fIdx, totalBytes: 0 };
    }
    let frame = baselineCheckpoint.frames.find((f) => f.frameIndex === fIdx);
    if (!frame) {
      frame = { frameIndex: fIdx, layers: [] };
      baselineCheckpoint.frames.push(frame);
    }
    const existingLayer = frame.layers.find((l) => l.layerId === step.layerId);
    if (existingLayer) {
      existingLayer.imageData = imageData;
      if (step.layerName) existingLayer.name = step.layerName;
      if (step.layerBlendMode) existingLayer.blendMode = step.layerBlendMode;
    } else {
      frame.layers.push({
        layerId: step.layerId,
        frameIndex: fIdx,
        imageData,
        name: step.layerName,
        opacity: 1,
        blendMode: step.layerBlendMode ?? 'source-over',
        visible: true,
        order: frame.layers.length,
      });
    }
    // Recalculate bounded totalBytes from active baseline buffers
    let total = 1024;
    for (const f of baselineCheckpoint.frames) {
      total += 512;
      for (const l of f.layers) {
        total += l.imageData.data.byteLength + 512;
      }
    }
    baselineCheckpoint.totalBytes = total;
  }

  function updateBaselineFromEvicted(evicted: HistoryStep): void {
    if (evicted.type === 'pixel' && evicted.imageData) {
      if (!isPatchStep(evicted)) {
        setBaselineLayer(evicted, cloneImageData(evicted.imageData));
        return;
      }
      // A patch lands on the layer the baseline already holds; the baseline then
      // shows the layer right after the evicted change.
      const known = baselineLayer(evicted.frameIndex ?? 0, evicted.layerId)?.imageData;
      if (!known && !baselineCheckpoint) return;
      const next = known ? cloneImageData(known) : createBlankImageData(baselineCheckpoint!.width, baselineCheckpoint!.height);
      pastePatch(next, evicted.imageData, evicted.x, evicted.y);
      if (evicted.expectedImageData) pastePatch(next, evicted.expectedImageData, evicted.x, evicted.y);
      setBaselineLayer(evicted, next);
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

        const width = baselineCheckpoint.width;
        const height = baselineCheckpoint.height;

        // Collect new/updated buffers from layerBuffers
        const bufMap = new Map<string, ImageData>();
        if (evicted.layerBuffers && evicted.layerBuffers.length > 0) {
          for (const buf of evicted.layerBuffers) {
            if (buf.imageData) {
              bufMap.set(buf.layerId, cloneImageData(buf.imageData));
            }
          }
        }

        if (evicted.frames && evicted.frames.length > 0) {
          // Synchronize frames list: remove frames that no longer exist
          baselineCheckpoint.frames = baselineCheckpoint.frames.filter(
            (f) => f.frameIndex < evicted.frames.length
          );

          for (let fIdx = 0; fIdx < evicted.frames.length; fIdx++) {
            const af = evicted.frames[fIdx];
            let frame = baselineCheckpoint.frames.find((f) => f.frameIndex === fIdx);
            if (!frame) {
              frame = { frameIndex: fIdx, layers: [] };
              baselineCheckpoint.frames.push(frame);
            }

            const existingLayersMap = new Map<string, ReplayBaselineLayer>(
              frame.layers.map((l) => [l.layerId, l])
            );

            // Rebuild frame.layers to match af.layers structure and order
            const nextLayers: ReplayBaselineLayer[] = [];
            for (let lIdx = 0; lIdx < af.layers.length; lIdx++) {
              const al = af.layers[lIdx];
              const existing = existingLayersMap.get(al.id);

              let imgData: ImageData;
              if (bufMap.has(al.id)) {
                imgData = bufMap.get(al.id)!;
              } else if (existing?.imageData) {
                imgData = existing.imageData;
              } else {
                imgData = createBlankImageData(width, height);
              }

              nextLayers.push({
                layerId: al.id,
                frameIndex: fIdx,
                name: al.name,
                imageData: imgData,
                opacity: al.opacity ?? 1,
                blendMode: al.blendMode ?? 'source-over',
                visible: al.visible ?? true,
                order: af.layers.length - 1 - lIdx,
              });
            }
            frame.layers = nextLayers;
          }
        } else if (evicted.layerBuffers && evicted.layerBuffers.length > 0) {
          const fIdx = evicted.frameIndex ?? 0;
          let frame = baselineCheckpoint.frames.find((f) => f.frameIndex === fIdx);
          if (!frame) {
            frame = { frameIndex: fIdx, layers: [] };
            baselineCheckpoint.frames.push(frame);
          }
          for (const [layerId, imgData] of bufMap.entries()) {
            const existingLayer = frame.layers.find((l) => l.layerId === layerId);
            if (existingLayer) {
              existingLayer.imageData = imgData;
            } else {
              frame.layers.push({
                layerId,
                frameIndex: fIdx,
                imageData: imgData,
                opacity: 1,
                blendMode: 'source-over',
                visible: true,
                order: frame.layers.length,
              });
            }
          }
        }

        // Recalculate bounded totalBytes from active baseline buffers
        let total = 1024;
        for (const f of baselineCheckpoint.frames) {
          total += 512;
          for (const l of f.layers) {
            total += l.imageData.data.byteLength + 512;
          }
        }
        baselineCheckpoint.totalBytes = total;
      }
    }
  }

  function evictUntilWithinBudget(incomingBytes: number): void {
    while (
      undoStack.length > 0 &&
      (undoBytes + redoBytes + incomingBytes > limitBytes || undoStack.length >= limitDepth)
    ) {
      const evicted = undoStack.shift()!;
      undoBytes = Math.max(0, undoBytes - calculateStepBytes(evicted));
      isTruncated = true;
      evictionCount++;
      updateBaselineFromEvicted(evicted);
    }
  }

  return {
    transaction<T>(operation: () => T): T {
      // Escrow retains evicted steps/baseline until the commit succeeds. Pixels are
      // immutable snapshots: clone only the metadata that baseline eviction mutates.
      const release = reserveMemory(undoBytes + redoBytes + (baselineCheckpoint?.totalBytes ?? 0), 'History transaction rollback');
      const saved = { undoStack, redoStack, undoBytes, redoBytes, isTruncated, evictionCount, baselineCheckpoint };
      try {
        undoStack = undoStack.slice();
        redoStack = redoStack.slice();
        if (baselineCheckpoint) baselineCheckpoint = {
          ...baselineCheckpoint,
          frames: baselineCheckpoint.frames.map(frame => ({ ...frame, layers: frame.layers.map(layer => ({ ...layer })) })),
        };
        return operation();
      }
      catch (error) {
        ({ undoStack, redoStack, undoBytes, redoBytes, isTruncated, evictionCount, baselineCheckpoint } = saved);
        throw error;
      } finally { release(); }
    },
    push(step: HistoryStep, origin?: ImageData): number {
      const stepBytes = calculateStepBytes(step);

      // Oversized entry safety:
      // This snapshot is the state before an edit that has already happened.
      // Without it, older undo steps and the redo branch no longer form a
      // continuous path through the current canvas state.
      if (stepBytes > limitBytes) {
        undoStack = [];
        redoStack = [];
        undoBytes = 0;
        redoBytes = 0;
        baselineCheckpoint = null;
        isTruncated = true;
        try {
          studioEvents.emit('pixibun:toast', {
            message: `This edit exceeds the undo memory limit (${(stepBytes / (1024 * 1024)).toFixed(1)} MiB > ${(limitBytes / (1024 * 1024)).toFixed(0)} MiB). Earlier Undo and Redo history was cleared to keep restoration safe.`,
            type: 'error',
          });
        } catch {
          // In headless tests or non-DOM environments, ignore event dispatch error
        }
        return 0;
      }

      // In push, a new edit invalidates redo!
      // Clearing redo resets redo retained bytes to exactly 0.
      redoStack = [];
      redoBytes = 0;

      // Evict oldest entries until within both depth and byte budget
      evictUntilWithinBudget(stepBytes);

      // First edit of a layer: remember the whole layer once, so replay has a
      // full image for later patches to land on.
      if (origin && step.type !== 'structural' && origin.width > 0 && origin.height > 0
        && (!baselineCheckpoint || (baselineCheckpoint.width === origin.width && baselineCheckpoint.height === origin.height))
        && !baselineLayer(step.frameIndex ?? 0, step.layerId)
        && !undoStack.some((s) => s.type !== 'structural' && s.layerId === step.layerId && s.frameIndex === step.frameIndex)) {
        setBaselineLayer(step, origin);
      }

      undoStack.push(step);
      undoBytes += stepBytes;
      return undoStack.length;
    },

    undo(currentState?: HistoryStep): HistoryStep | null {
      if (undoStack.length === 0) return null;
      const step = undoStack.pop()!;
      undoBytes = Math.max(0, undoBytes - calculateStepBytes(step));

      let retainedCurrentState = false;
      if (currentState) {
        const currentBytes = calculateStepBytes(currentState);
        if (currentBytes <= limitBytes) {
          while (
            redoStack.length > 0 &&
            (undoBytes + redoBytes + currentBytes > limitBytes || redoStack.length >= limitDepth)
          ) {
            const evicted = redoStack.shift()!;
            redoBytes = Math.max(0, redoBytes - calculateStepBytes(evicted));
          }
          if (undoBytes + redoBytes + currentBytes <= limitBytes && redoStack.length < limitDepth) {
            redoStack.push(currentState);
            redoBytes += currentBytes;
            retainedCurrentState = true;
          }
        }
      }
      if (!retainedCurrentState) {
        // A missing intermediate state makes every older redo entry unreachable.
        redoStack = [];
        redoBytes = 0;
        if (currentState) isTruncated = true;
      }
      return step;
    },

    redo(currentState?: HistoryStep): HistoryStep | null {
      if (redoStack.length === 0) return null;
      const step = redoStack.pop()!;
      redoBytes = Math.max(0, redoBytes - calculateStepBytes(step));

      if (currentState) {
        const currentBytes = calculateStepBytes(currentState);
        if (currentBytes > limitBytes) {
          // The redo target can be restored, but without this intermediate
          // snapshot no older undo or later redo step is safely reachable.
          undoStack = [];
          redoStack = [];
          undoBytes = 0;
          redoBytes = 0;
          baselineCheckpoint = null;
          isTruncated = true;
          studioEvents.emit('pixibun:toast', {
            message: 'Redo restored the edit, but its prior state exceeds the undo memory limit. Undo and Redo history was cleared to avoid skipping artwork states.',
            type: 'error',
          });
        } else {
          evictUntilWithinBudget(currentBytes);
          while (
            redoStack.length > 0 &&
            undoBytes + redoBytes + currentBytes > limitBytes
          ) {
            const evicted = redoStack.shift()!;
            redoBytes = Math.max(0, redoBytes - calculateStepBytes(evicted));
          }
          if (undoBytes + redoBytes + currentBytes <= limitBytes && undoStack.length < limitDepth) {
            undoStack.push(currentState);
            undoBytes += currentBytes;
          } else {
            undoStack = [];
            redoStack = [];
            undoBytes = 0;
            redoBytes = 0;
            baselineCheckpoint = null;
            isTruncated = true;
          }
        }
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
      undoBytes = 0;
      redoBytes = 0;
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

    get redoDepth(): number {
      return redoStack.length;
    },

    get undoBytes(): number {
      return Math.max(0, undoBytes);
    },

    get redoBytes(): number {
      return Math.max(0, redoBytes);
    },

    get totalBytes(): number {
      return Math.max(0, undoBytes + redoBytes);
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
let retainedViewportHistory: { projectId: string; engine: HistoryEngine } | null = null;

/** One live route handoff; project opens still clear the viewport history. */
export function rememberViewportHistory(projectId: string, engine: HistoryEngine): void {
  retainedViewportHistory = { projectId, engine };
}
export function readViewportHistory(projectId: string): HistoryEngine {
  return retainedViewportHistory?.projectId === projectId ? retainedViewportHistory.engine : createHistoryEngine();
}
export function forgetViewportHistory(): void { retainedViewportHistory = null; }
registerMemoryUsage('history', () => {
  const bytes = (engine: HistoryEngine | null) => (engine?.totalBytes ?? 0) + (engine?.getBaseline()?.totalBytes ?? 0);
  const retained = retainedViewportHistory?.engine ?? null;
  return bytes(activeGlobalHistoryEngine) + (retained !== activeGlobalHistoryEngine ? bytes(retained) : 0);
});

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


