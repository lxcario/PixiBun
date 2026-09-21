/**
 * structuralHistory.ts
 *
 * Implements the structural snapshot recorder for the Hybrid Command Pattern history engine.
 * Records layer/frame tree metadata and only affected raster pixel buffers before destructive
 * structural mutations (layer deletions, merges, duplications, reordering, frame changes).
 */

import { useStudioStore } from '@/stores/studioStore';
import { getOrCreateBuffer, hasBuffer } from '@/lib/engine/bufferRegistry';
import {
  getGlobalHistoryEngine,
  StructuralHistoryStep,
  LayerBufferBackup,
} from '@/lib/engine/historyEngine';
import type { StructuralOpKind } from '@/types/canvas';

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

/**
 * Legacy utility retained for compatibility; prefer captureLayerBuffers() to prevent
 * whole-project raster memory multiplication.
 */
export function captureProjectBuffers(): LayerBufferBackup[] {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return [];
  }

  const state = useStudioStore.getState();
  const seen = new Set<string>();
  const layerIds: string[] = [];

  for (const frame of state.frames) {
    for (const layer of frame.layers) {
      if (!seen.has(layer.id) && hasBuffer(layer.id)) {
        seen.add(layer.id);
        layerIds.push(layer.id);
      }
    }
  }

  return captureLayerBuffers(layerIds);
}

export interface PushStructuralOptions {
  opKind?: StructuralOpKind;
  affectedLayerIds?: string[];
  canvasWidth?: number;
  canvasHeight?: number;
}

/**
 * Pushes a targeted structural history snapshot onto the active global history engine
 * before a structural mutation takes place.
 */
export function pushStructuralHistoryStep(
  description: string,
  options?: PushStructuralOptions
): void {
  const engine = getGlobalHistoryEngine();
  if (!engine) return;

  const state = useStudioStore.getState();
  const affectedIds = options?.affectedLayerIds ?? [];

  const step: StructuralHistoryStep = {
    type: 'structural',
    opKind: options?.opKind ?? 'generic-structural',
    description,
    frameIndex: state.activeFrameIndex,
    frames: structuredClone(state.frames),
    activeFrameIndex: state.activeFrameIndex,
    activeLayerId: state.activeLayerId,
    canvasWidth: options?.canvasWidth ?? state.canvasWidth,
    canvasHeight: options?.canvasHeight ?? state.canvasHeight,
    layerBuffers: captureLayerBuffers(affectedIds),
    affectedLayerIds: affectedIds,
  };

  engine.push(step);
  state.setCanUndo(engine.canUndo);
  state.setCanRedo(engine.canRedo);
}
