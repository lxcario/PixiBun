/**
 * structuralHistory.ts
 *
 * Implements the structural snapshot recorder for the Hybrid Command Pattern history engine.
 * Records layer/frame tree metadata and only affected raster pixel buffers before destructive
 * structural mutations (layer deletions, merges, duplications, reordering, frame changes).
 */

import { useStudioStore } from '@/stores/studioStore';
import { getOrCreateBuffer, hasBuffer, resizeAllBuffers, touchBuffer } from '@/lib/engine/bufferRegistry';
import {
  getGlobalHistoryEngine,
  StructuralHistoryStep,
  LayerBufferBackup,
} from '@/lib/engine/historyEngine';
import type { AnimationFrame, StructuralOpKind } from '@/types/canvas';
import { studioEvents } from '@/lib/events/studioEvents';

/**
 * Captures pixel buffers ONLY for the specified layer IDs.
 * Bounded to affected layers — never scans all layers in the project.
 */
export function captureLayerBuffers(layerIds: string[]): LayerBufferBackup[] {
  if (typeof window === 'undefined' || typeof document === 'undefined' || !layerIds || layerIds.length === 0) {
    return [];
  }

  const state = useStudioStore.getState();
  const buffers: LayerBufferBackup[] = [];
  const seen = new Set<string>();

  for (const layerId of layerIds) {
    if (!seen.has(layerId) && hasBuffer(layerId)) {
      seen.add(layerId);
      const entry = getOrCreateBuffer(layerId, state.canvasWidth, state.canvasHeight);
      const data = entry.ctx.getImageData(0, 0, state.canvasWidth, state.canvasHeight);
      buffers.push({
        layerId,
        imageData: data,
      });
    }
  }

  return buffers;
}


export interface PushStructuralOptions {
  opKind?: StructuralOpKind;
  affectedLayerIds?: string[];
  canvasWidth?: number;
  canvasHeight?: number;
  redoBufferCount?: number;
  addedLayerCount?: number;
  addedFrameCount?: number;
}

/**
 * Pushes a targeted structural history snapshot onto the active global history engine
 * before a structural mutation takes place.
 */
export function pushStructuralHistoryStep(
  description: string,
  options?: PushStructuralOptions
): boolean {
  const engine = getGlobalHistoryEngine();
  if (!engine) return true;

  const state = useStudioStore.getState();
  const affectedIds = options?.affectedLayerIds ?? [];
  const uniqueAffectedIds = [...new Set(affectedIds)].filter(hasBuffer);
  const width = options?.canvasWidth ?? state.canvasWidth;
  const height = options?.canvasHeight ?? state.canvasHeight;
  const metadataBytes = state.frames.reduce((bytes, frame) => bytes + 256 + frame.layers.length * 256, 1024);
  const rasterBytes = width * height * 4;
  const undoBytes = metadataBytes + uniqueAffectedIds.length * rasterBytes;
  const redoBytes = metadataBytes + (options?.addedLayerCount ?? 0) * 256 +
    (options?.addedFrameCount ?? 0) * 256 +
    (options?.redoBufferCount ?? uniqueAffectedIds.length) * rasterBytes;
  const estimatedBytes = Math.max(undoBytes, redoBytes);
  if (estimatedBytes > engine.maxBytes) {
    studioEvents.emit('pixibun:toast', {
      type: 'error',
      message: `This edit needs ${(estimatedBytes / (1024 * 1024)).toFixed(1)} MiB of Undo memory, above the ${(engine.maxBytes / (1024 * 1024)).toFixed(0)} MiB limit. The edit was not applied.`,
    });
    return false;
  }

  const step: StructuralHistoryStep = {
    type: 'structural',
    opKind: options?.opKind ?? 'generic-structural',
    description,
    frameIndex: state.activeFrameIndex,
    frames: structuredClone(state.frames),
    activeFrameIndex: state.activeFrameIndex,
    activeLayerId: state.activeLayerId,
    canvasWidth: width,
    canvasHeight: height,
    layerBuffers: captureLayerBuffers(uniqueAffectedIds),
    affectedLayerIds: affectedIds,
  };

  const depth = engine.push(step);
  state.setCanUndo(engine.canUndo);
  state.setCanRedo(engine.canRedo);
  return depth > 0;
}

export interface StructuralRestorationTarget {
  canvasWidth: number;
  canvasHeight: number;
  frames: AnimationFrame[];
  activeFrameIndex: number;
  activeLayerId?: string;
  layerBuffers?: LayerBufferBackup[];
}

/**
 * Prevalidated structural workspace restoration for history transitions (undo/redo).
 *
 * Direct buffer resizing via `resizeAllBuffers` is necessary because history restoration
 * applies target dimensions and target frames simultaneously in a single transition.
 * Routing through `setCanvasSize` would incorrectly validate historical dimensions against
 * the pre-transition frames currently in the store rather than the historical target frames.
 */
export function restoreStructuralWorkspace(target: StructuralRestorationTarget): void {
  const state = useStudioStore.getState();
  const sizeChanged = target.canvasWidth !== state.canvasWidth || target.canvasHeight !== state.canvasHeight;
  if (sizeChanged) {
    resizeAllBuffers(target.canvasWidth, target.canvasHeight, 'center', false);
  }

  useStudioStore.setState({
    canvasWidth: target.canvasWidth,
    canvasHeight: target.canvasHeight,
    frames: target.frames,
    activeFrameIndex: Math.min(target.activeFrameIndex, Math.max(0, target.frames.length - 1)),
    activeLayerId: target.activeLayerId,
  });

  if (target.layerBuffers) {
    for (const buf of target.layerBuffers) {
      const entry = getOrCreateBuffer(buf.layerId, target.canvasWidth, target.canvasHeight);
      entry.ctx.putImageData(buf.imageData, 0, 0);
      touchBuffer(buf.layerId);
    }
  }
}
