/**
 * workspaceEnvelopeGuard.ts
 *
 * Centralized prospective capacity enforcement for PixiBun Atelier.
 * Reuses canonical WORKSPACE_ENVELOPE and validateProjectResourceBudget.
 *
 * Ensures all live structural mutations (add layer, duplicate layer,
 * add frame, duplicate frame, generated/tagged layers, imports, structural undo/redo)
 * validate their exact prospective outcome BEFORE:
 * - recording structural history;
 * - allocating or cloning layer buffers;
 * - mutating Zustand state;
 * - marking the workspace dirty.
 */

import { WORKSPACE_ENVELOPE } from '@/config/canvasLimits';
import {
  validateProjectResourceBudget,
  type FrameWithLayers,
} from '@/lib/project/resourceBudget';

export interface CapacityCheckResult {
  ok: boolean;
  reason?: string;
}

function isValidDimension(dim: number): boolean {
  return Number.isSafeInteger(dim) && dim >= 1 && dim <= WORKSPACE_ENVELOPE.MAX_CANVAS_DIMENSION;
}

/**
 * Validates whether adding `layerCountToAdd` layers to the target frame
 * respects all workspace envelope bounds:
 * 1. Dimensions within 1..2048 whole numbers
 * 2. layerCountToAdd is a positive safe integer
 * 3. Per-frame layer ceiling (max 100 layers)
 * 4. Total project layer ceiling (max 2,000 layers)
 * 5. Aggregate materializable raster footprint ceiling (max 64 MP / 67,108,864 px)
 */
export function canAddLayersToFrame(
  frames: FrameWithLayers[],
  frameIndex: number,
  canvasWidth: number,
  canvasHeight: number,
  layerCountToAdd = 1
): CapacityCheckResult {
  if (!isValidDimension(canvasWidth) || !isValidDimension(canvasHeight)) {
    return {
      ok: false,
      reason: `Canvas dimensions must be whole numbers between 1 and ${WORKSPACE_ENVELOPE.MAX_CANVAS_DIMENSION}.`,
    };
  }

  if (!Number.isSafeInteger(layerCountToAdd) || layerCountToAdd < 1) {
    return {
      ok: false,
      reason: 'Layer count to add must be a positive whole number.',
    };
  }

  if (!Array.isArray(frames) || !Number.isSafeInteger(frameIndex) || frameIndex < 0 || frameIndex >= frames.length) {
    return { ok: false, reason: 'Invalid frame index for layer mutation.' };
  }

  const currentFrame = frames[frameIndex];
  const currentCount = Array.isArray(currentFrame?.layers) ? currentFrame.layers.length : 0;
  const prospectiveCount = currentCount + layerCountToAdd;

  if (prospectiveCount > WORKSPACE_ENVELOPE.MAX_CANVAS_LAYERS) {
    return {
      ok: false,
      reason: `Frame ${frameIndex + 1} exceeds the ${WORKSPACE_ENVELOPE.MAX_CANVAS_LAYERS} layer ceiling.`,
    };
  }

  // Compose prospective frames summary for resource budget evaluation (0 buffer allocations)
  const prospectiveFrames: FrameWithLayers[] = frames.map((f, idx) => {
    const count = Array.isArray(f.layers) ? f.layers.length : 0;
    const newCount = idx === frameIndex ? count + layerCountToAdd : count;
    return { layers: new Array(newCount) };
  });

  const budget = validateProjectResourceBudget(canvasWidth, canvasHeight, prospectiveFrames);
  if (!budget.ok) {
    return { ok: false, reason: budget.error };
  }

  return { ok: true };
}

/**
 * Validates whether adding prospective frames (each specifying its exact layer count)
 * respects all workspace envelope bounds:
 * 1. Dimensions within 1..2048 whole numbers
 * 2. Animation frame ceiling (max 500 frames)
 * 3. Per-frame layer ceiling (1..100 layers) for each added frame
 * 4. Total project layer ceiling (max 2,000 layers)
 * 5. Aggregate materializable raster footprint ceiling (max 64 MP / 67,108,864 px)
 */
export function canAddFramesToProject(
  existingFrames: FrameWithLayers[],
  canvasWidth: number,
  canvasHeight: number,
  incomingFrames: Array<{ layerCount: number }>
): CapacityCheckResult {
  if (!isValidDimension(canvasWidth) || !isValidDimension(canvasHeight)) {
    return {
      ok: false,
      reason: `Canvas dimensions must be whole numbers between 1 and ${WORKSPACE_ENVELOPE.MAX_CANVAS_DIMENSION}.`,
    };
  }

  if (!Array.isArray(existingFrames)) {
    return { ok: false, reason: 'Existing frames must be an array.' };
  }

  if (!Array.isArray(incomingFrames) || incomingFrames.length === 0) {
    return { ok: false, reason: 'Incoming frames must be a non-empty array.' };
  }

  const prospectiveFrameCount = existingFrames.length + incomingFrames.length;
  if (prospectiveFrameCount > WORKSPACE_ENVELOPE.MAX_CANVAS_FRAMES) {
    return {
      ok: false,
      reason: `The project exceeds the ${WORKSPACE_ENVELOPE.MAX_CANVAS_FRAMES} animation frame limit.`,
    };
  }

  for (let i = 0; i < incomingFrames.length; i++) {
    const count = incomingFrames[i]?.layerCount;
    if (!Number.isSafeInteger(count)) {
      return {
        ok: false,
        reason: `Incoming frame ${i + 1} layer count must be a whole number.`,
      };
    }
    if (count < 1) {
      return {
        ok: false,
        reason: `Incoming frame ${i + 1} must contain at least 1 layer.`,
      };
    }
    if (count > WORKSPACE_ENVELOPE.MAX_CANVAS_LAYERS) {
      return {
        ok: false,
        reason: `Frame exceeds the ${WORKSPACE_ENVELOPE.MAX_CANVAS_LAYERS} layer ceiling.`,
      };
    }
  }

  const prospectiveFrames: FrameWithLayers[] = [
    ...existingFrames.map((f) => ({
      layers: new Array(Array.isArray(f.layers) ? f.layers.length : 0),
    })),
    ...incomingFrames.map((f) => ({
      layers: new Array(f.layerCount),
    })),
  ];

  const budget = validateProjectResourceBudget(canvasWidth, canvasHeight, prospectiveFrames);
  if (!budget.ok) {
    return { ok: false, reason: budget.error };
  }

  return { ok: true };
}

/**
 * Validates whether replacing project frames (e.g. during sprite-sheet replace import)
 * respects all workspace envelope bounds:
 * 1. Dimensions within 1..2048 whole numbers
 * 2. Animation frame ceiling (1..500 frames)
 * 3. Per-frame layer ceiling (1..100 layers) for each replacement frame
 * 4. Total project layer ceiling (max 2,000 layers)
 * 5. Aggregate materializable raster footprint ceiling (max 64 MP / 67,108,864 px)
 */
export function canReplaceFrames(
  canvasWidth: number,
  canvasHeight: number,
  replacementFrames: Array<{ layerCount: number }>
): CapacityCheckResult {
  if (!isValidDimension(canvasWidth) || !isValidDimension(canvasHeight)) {
    return {
      ok: false,
      reason: `Canvas dimensions must be whole numbers between 1 and ${WORKSPACE_ENVELOPE.MAX_CANVAS_DIMENSION}.`,
    };
  }

  if (!Array.isArray(replacementFrames) || replacementFrames.length === 0) {
    return { ok: false, reason: 'This project has no animation frames to open.' };
  }

  if (replacementFrames.length > WORKSPACE_ENVELOPE.MAX_CANVAS_FRAMES) {
    return {
      ok: false,
      reason: `The project exceeds the ${WORKSPACE_ENVELOPE.MAX_CANVAS_FRAMES} animation frame limit.`,
    };
  }

  for (let i = 0; i < replacementFrames.length; i++) {
    const count = replacementFrames[i]?.layerCount;
    if (!Number.isSafeInteger(count)) {
      return {
        ok: false,
        reason: `Replacement frame ${i + 1} layer count must be a whole number.`,
      };
    }
    if (count < 1) {
      return {
        ok: false,
        reason: `Replacement frame ${i + 1} must contain at least 1 layer.`,
      };
    }
    if (count > WORKSPACE_ENVELOPE.MAX_CANVAS_LAYERS) {
      return {
        ok: false,
        reason: `Frame exceeds the ${WORKSPACE_ENVELOPE.MAX_CANVAS_LAYERS} layer ceiling.`,
      };
    }
  }

  const prospectiveFrames: FrameWithLayers[] = replacementFrames.map((f) => ({
    layers: new Array(f.layerCount),
  }));

  const budget = validateProjectResourceBudget(canvasWidth, canvasHeight, prospectiveFrames);
  if (!budget.ok) {
    return { ok: false, reason: budget.error };
  }

  return { ok: true };
}

/**
 * Validates whether a complete workspace structure (dimensions and frames)
 * satisfies all workspace envelope bounds:
 * 1. Dimensions in 1..2048 whole numbers
 * 2. Animation frame ceiling (1..500 frames)
 * 3. Per-frame layer ceiling (1..100 layers per frame)
 * 4. Total project layer ceiling (max 2,000 layers)
 * 5. Aggregate materializable raster footprint ceiling (max 64 MP / 67,108,864 px)
 */
export function validateWorkspaceStructure(
  canvasWidth: number,
  canvasHeight: number,
  frames: FrameWithLayers[]
): CapacityCheckResult {
  if (!isValidDimension(canvasWidth) || !isValidDimension(canvasHeight)) {
    return {
      ok: false,
      reason: `Canvas dimensions must be whole numbers between 1 and ${WORKSPACE_ENVELOPE.MAX_CANVAS_DIMENSION}.`,
    };
  }

  if (!Array.isArray(frames) || frames.length === 0) {
    return { ok: false, reason: 'This project has no animation frames to open.' };
  }

  if (frames.length > WORKSPACE_ENVELOPE.MAX_CANVAS_FRAMES) {
    return {
      ok: false,
      reason: `The project exceeds the ${WORKSPACE_ENVELOPE.MAX_CANVAS_FRAMES} animation frame limit.`,
    };
  }

  for (let i = 0; i < frames.length; i++) {
    const layers = frames[i]?.layers;
    if (!Array.isArray(layers)) {
      return { ok: false, reason: `Frame ${i + 1} layers must be an array.` };
    }
    const count = layers.length;
    if (count < 1) {
      return {
        ok: false,
        reason: `Frame ${i + 1} must contain at least 1 layer.`,
      };
    }
    if (count > WORKSPACE_ENVELOPE.MAX_CANVAS_LAYERS) {
      return {
        ok: false,
        reason: `Frame ${i + 1} exceeds the ${WORKSPACE_ENVELOPE.MAX_CANVAS_LAYERS} layer ceiling.`,
      };
    }
  }

  const budget = validateProjectResourceBudget(canvasWidth, canvasHeight, frames);
  if (!budget.ok) {
    return { ok: false, reason: budget.error };
  }

  return { ok: true };
}
