/**
 * imageImportExecution.ts
 *
 * Encapsulates the complete execution pipeline for image imports:
 * - prospective capacity checks before any state changes, buffer allocations, or history clears;
 * - atomic dimension matching if requested;
 * - layer/frame creation, pixel drawing, palette integration, and notification.
 */

import type { ImageImportConfirmPayload } from '@/types/import';
import { useStudioStore } from '@/stores/studioStore';
import { WORKSPACE_ENVELOPE } from '@/config/canvasLimits';
import {
  canAddLayersToFrame,
  canAddFramesToProject,
  canReplaceFrames,
  validateWorkspaceStructure,
} from '@/lib/project/workspaceEnvelopeGuard';
import { studioEvents } from '@/lib/events/studioEvents';
import { getOrCreateBuffer, touchBuffer } from '@/lib/engine/bufferRegistry';

export interface ImageImportExecutionResult {
  ok: boolean;
  reason?: string;
}

export function executeImageImport(confirmData: ImageImportConfirmPayload): ImageImportExecutionResult {
  const { canvas, target, extractedPalette, addToPalette, filename, resizeCanvasToMatch, slicedFrames } = confirmData;
  const store = useStudioStore.getState();

  const targetWidth = resizeCanvasToMatch ? resizeCanvasToMatch.width : store.canvasWidth;
  const targetHeight = resizeCanvasToMatch ? resizeCanvasToMatch.height : store.canvasHeight;

  if (resizeCanvasToMatch) {
    if (
      !Number.isInteger(targetWidth) ||
      !Number.isInteger(targetHeight) ||
      targetWidth < 1 ||
      targetWidth > WORKSPACE_ENVELOPE.MAX_CANVAS_DIMENSION ||
      targetHeight < 1 ||
      targetHeight > WORKSPACE_ENVELOPE.MAX_CANVAS_DIMENSION
    ) {
      const message = `Canvas dimensions must be whole numbers between 1 and ${WORKSPACE_ENVELOPE.MAX_CANVAS_DIMENSION}.`;
      studioEvents.emit('pixibun:toast', {
        message,
        type: 'error',
      });
      return { ok: false, reason: message };
    }
  }

  // Prospective capacity validation BEFORE any state mutation, buffer allocation, or history clearing:
  if (slicedFrames && slicedFrames.length > 0) {
    if (target === 'sprite-sheet-replace') {
      const existingCount = store.frames.length;
      const newCount = slicedFrames.length;
      const activeFrame = store.frames[store.activeFrameIndex] || store.frames[0];
      const untaggedLayerCount = activeFrame ? activeFrame.layers.filter((l) => !l.tag).length : 1;
      const incomingLayerCount = Math.max(1, untaggedLayerCount);

      const replacementFrames: Array<{ layerCount: number }> = [];
      for (let i = 0; i < newCount; i++) {
        if (i < existingCount) {
          replacementFrames.push({ layerCount: store.frames[i]?.layers?.length ?? 1 });
        } else {
          replacementFrames.push({ layerCount: incomingLayerCount });
        }
      }

      const capacity = canReplaceFrames(targetWidth, targetHeight, replacementFrames);
      if (!capacity.ok) {
        const message = capacity.reason || 'Import exceeds workspace capacity limits.';
        studioEvents.emit('pixibun:toast', {
          message,
          type: 'error',
        });
        return { ok: false, reason: message };
      }
    } else {
      // sprite-sheet-append
      const activeFrame = store.frames[store.activeFrameIndex] || store.frames[0];
      const untaggedLayerCount = activeFrame ? activeFrame.layers.filter((l) => !l.tag).length : 1;
      const incomingLayerCount = Math.max(1, untaggedLayerCount);
      const incomingFrames = Array.from({ length: slicedFrames.length }, () => ({
        layerCount: incomingLayerCount,
      }));

      const capacity = canAddFramesToProject(store.frames, targetWidth, targetHeight, incomingFrames);
      if (!capacity.ok) {
        const message = capacity.reason || 'Import exceeds workspace capacity limits.';
        studioEvents.emit('pixibun:toast', {
          message,
          type: 'error',
        });
        return { ok: false, reason: message };
      }
    }
  } else {
    if (target === 'new-layer') {
      const capacity = canAddLayersToFrame(store.frames, store.activeFrameIndex, targetWidth, targetHeight, 1);
      if (!capacity.ok) {
        const message = capacity.reason || 'Import exceeds workspace capacity limits.';
        studioEvents.emit('pixibun:toast', {
          message,
          type: 'error',
        });
        return { ok: false, reason: message };
      }
    } else if (target === 'new-frame') {
      const activeFrame = store.frames[store.activeFrameIndex] || store.frames[0];
      const untaggedLayerCount = activeFrame ? activeFrame.layers.filter((l) => !l.tag).length : 1;
      const incomingLayerCount = Math.max(1, untaggedLayerCount);
      const capacity = canAddFramesToProject(store.frames, targetWidth, targetHeight, [{ layerCount: incomingLayerCount }]);
      if (!capacity.ok) {
        const message = capacity.reason || 'Import exceeds workspace capacity limits.';
        studioEvents.emit('pixibun:toast', {
          message,
          type: 'error',
        });
        return { ok: false, reason: message };
      }
    } else if (resizeCanvasToMatch) {
      const budget = validateWorkspaceStructure(targetWidth, targetHeight, store.frames);
      if (!budget.ok) {
        const message = budget.reason || 'Import exceeds workspace capacity limits.';
        studioEvents.emit('pixibun:toast', {
          message,
          type: 'error',
        });
        return { ok: false, reason: message };
      }
    }
  }

  // 1. If user chose to match image dimensions, resize canvas first!
  //    History is invalidated because undo snapshots hold old-dimension ImageData.
  if (resizeCanvasToMatch) {
    try {
      store.setCanvasSize(resizeCanvasToMatch.width, resizeCanvasToMatch.height, 'top-left', false);
      studioEvents.emit('pixibun:history-clear');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to resize canvas';
      studioEvents.emit('pixibun:toast', { message, type: 'error' });
      return { ok: false, reason: message };
    }
  }

  const currentStore = useStudioStore.getState();
  const width = currentStore.canvasWidth;
  const height = currentStore.canvasHeight;

  if (slicedFrames && slicedFrames.length > 0) {
    if (target === 'sprite-sheet-replace') {
      const existingCount = currentStore.frames.length;
      const newCount = slicedFrames.length;

      // 1. Draw frame 0 onto the first frame's active layer
      const targetLayerId = currentStore.activeLayerId;
      if (targetLayerId) {
        const layerBuf = getOrCreateBuffer(targetLayerId, width, height);
        const ctx = layerBuf.canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.clearRect(0, 0, width, height);
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(slicedFrames[0], 0, 0, width, height);
          touchBuffer(targetLayerId);
        }
      }

      // 2. Overwrite existing frames 1..min(existingCount, newCount) - 1
      const overwriteCount = Math.min(existingCount, newCount);
      for (let i = 1; i < overwriteCount; i++) {
        const frame = currentStore.frames[i];
        const lId = frame?.layers[0]?.id;
        if (lId) {
          const buf = getOrCreateBuffer(lId, width, height);
          const fCtx = buf.canvas.getContext('2d', { willReadFrequently: true });
          if (fCtx) {
            fCtx.clearRect(0, 0, width, height);
            fCtx.imageSmoothingEnabled = false;
            fCtx.drawImage(slicedFrames[i], 0, 0, width, height);
            touchBuffer(lId);
          }
        }
      }

      // 3. If new frames > existing frames, add new frames for the remainder
      for (let i = existingCount; i < newCount; i++) {
        currentStore.addFrame();
        const st = useStudioStore.getState();
        const frame = st.frames[st.activeFrameIndex];
        const lId = frame?.layers[0]?.id || st.activeLayerId;
        const buf = getOrCreateBuffer(lId, width, height);
        const fCtx = buf.canvas.getContext('2d', { willReadFrequently: true });
        if (fCtx) {
          fCtx.clearRect(0, 0, width, height);
          fCtx.imageSmoothingEnabled = false;
          fCtx.drawImage(slicedFrames[i], 0, 0, width, height);
          touchBuffer(lId);
        }
      }

      // 4. If existing frames > new frames, delete excess frames from the end
      for (let i = existingCount - 1; i >= newCount; i--) {
        currentStore.deleteFrame(i);
      }

      currentStore.setActiveFrame(0);
    } else {
      // sprite-sheet-append (or default)
      for (let i = 0; i < slicedFrames.length; i++) {
        currentStore.addFrame();
        const st = useStudioStore.getState();
        const frame = st.frames[st.activeFrameIndex];
        const lId = frame?.layers[0]?.id || st.activeLayerId;
        const buf = getOrCreateBuffer(lId, width, height);
        const fCtx = buf.canvas.getContext('2d', { willReadFrequently: true });
        if (fCtx) {
          fCtx.clearRect(0, 0, width, height);
          fCtx.imageSmoothingEnabled = false;
          fCtx.drawImage(slicedFrames[i], 0, 0, width, height);
          touchBuffer(lId);
        }
      }
    }
  } else {
    let targetLayerId = currentStore.activeLayerId;

    if (target === 'new-layer') {
      const layerName = filename ? filename.replace(/\.[^/.]+$/, '') : 'Imported';
      currentStore.addLayer(layerName);
      targetLayerId = useStudioStore.getState().activeLayerId;
    } else if (target === 'new-frame') {
      currentStore.addFrame();
      const frame = useStudioStore.getState().frames[useStudioStore.getState().activeFrameIndex];
      targetLayerId = frame?.layers[0]?.id || currentStore.activeLayerId;
    }

    if (targetLayerId) {
      const layerBuf = getOrCreateBuffer(targetLayerId, width, height);
      const ctx = layerBuf.canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(canvas, 0, 0);
        touchBuffer(targetLayerId);
      }
    }
  }

  // Palette integration
  if (addToPalette && extractedPalette && extractedPalette.length > 0) {
    const paletteName = filename ? `Palette: ${filename.replace(/\.[^/.]+$/, '')}` : 'Imported Palette';
    store.addExtractedPalette(paletteName, extractedPalette);
  }

  currentStore.bumpBufferVersion();
  return { ok: true };
}
