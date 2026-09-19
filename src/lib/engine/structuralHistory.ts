/**
 * structuralHistory.ts
 *
 * Implements the structural snapshot recorder for the Hybrid Command Pattern history engine.
 * Records full layer/frame tree metadata and raster pixel buffers before destructive
 * structural mutations (layer deletions, merges, duplications, reordering, frame changes).
 */

import { useStudioStore } from '@/stores/studioStore';
import { getOrCreateBuffer, hasBuffer } from '@/lib/engine/bufferRegistry';
import { getGlobalHistoryEngine, StructuralHistoryStep, LayerBufferBackup } from '@/lib/engine/historyEngine';

/**
 * Captures pixel buffers across all frames and layers in the current project.
 */
export function captureProjectBuffers(): LayerBufferBackup[] {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return [];
  }

  const state = useStudioStore.getState();
  const buffers: LayerBufferBackup[] = [];
  const seen = new Set<string>();

  for (const frame of state.frames) {
    for (const layer of frame.layers) {
      if (!seen.has(layer.id) && hasBuffer(layer.id)) {
        seen.add(layer.id);
        const entry = getOrCreateBuffer(layer.id, state.canvasWidth, state.canvasHeight);
        const data = entry.ctx.getImageData(0, 0, state.canvasWidth, state.canvasHeight);
        buffers.push({
          layerId: layer.id,
          imageData: data,
        });
      }
    }
  }

  return buffers;
}

/**
 * Pushes a structural history snapshot onto the active global history engine
 * before a structural mutation takes place.
 */
export function pushStructuralHistoryStep(description: string): void {
  const engine = getGlobalHistoryEngine();
  if (!engine) return;

  const state = useStudioStore.getState();
  const step: StructuralHistoryStep = {
    type: 'structural',
    description,
    frameIndex: state.activeFrameIndex,
    frames: structuredClone(state.frames),
    activeFrameIndex: state.activeFrameIndex,
    activeLayerId: state.activeLayerId,
    layerBuffers: captureProjectBuffers(),
  };

  engine.push(step);
  state.setCanUndo(true);
  state.setCanRedo(false);
}
