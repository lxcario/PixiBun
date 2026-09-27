import { useEffect } from 'react';
import { planSpriteCleanup, type SpriteCleanupOptions, type SpriteCleanupStats } from '@/lib/ai/spriteCleanup';
import { touchBuffer } from '@/lib/engine/bufferRegistry';
import { DEFAULT_HISTORY_MAX_BYTES } from '@/lib/engine/historyEngine';
import { pushStructuralHistoryStep } from '@/lib/engine/structuralHistory';
import { studioEvents } from '@/lib/events/studioEvents';
import { coDrawBridge } from '@/lib/sync/coDrawBridge';
import { useStudioStore } from '@/stores/studioStore';
import type { ViewportEventContext } from './types';

type CleanupRequest = { options: SpriteCleanupOptions; allFrames: boolean };

export function useSpriteCleanupEvents({
  canvasWidth, canvasHeight, getOrCreateLayerCanvas, renderComposite,
  captureSnapshot, commitSnapshot, bumpBufferVersion,
}: ViewportEventContext) {
  useEffect(() => {
    const run = (request: CleanupRequest, apply: boolean) => {
      const state = useStudioStore.getState();
      const currentFrame = state.frames[state.activeFrameIndex];
      const layerIndex = currentFrame?.layers.findIndex((layer) => layer.id === state.activeLayerId) ?? -1;
      if (layerIndex < 0) return;
      const candidates = request.allFrames
        ? state.frames.map((frame) => frame.layers[layerIndex]).filter((layer) => Boolean(layer))
        : [currentFrame.layers[layerIndex]];
      const skippedLocked = candidates.filter((layer) => layer.locked).length;
      const targets = candidates.filter((layer) => !layer.locked);
      if (targets.length === 0) {
        studioEvents.emit('pixibun:toast', { type: 'error', message: 'Unlock the layer before cleaning it.' });
        return;
      }
      if (request.allFrames && targets.length * canvasWidth * canvasHeight * 8 > DEFAULT_HISTORY_MAX_BYTES / 2) {
        studioEvents.emit('pixibun:toast', {
          type: 'error', message: 'Too many frame pixels for one undoable cleanup. Choose This frame.',
        });
        return;
      }

      const stats: SpriteCleanupStats = {
        removedFaint: 0, hardenedAlpha: 0, removedSpecks: 0, simplifiedColors: 0,
        thinnedLinePixels: 0, changedPixels: 0, sourceColors: 0, resultColors: 0,
      };
      const edits: Array<{
        id: string; ctx: CanvasRenderingContext2D; before: ImageData; after: Uint8ClampedArray;
      }> = [];
      let beforePreview: string | undefined;
      let afterPreview: string | undefined;
      const preview = (pixels: Uint8ClampedArray) => {
        const source = document.createElement('canvas');
        source.width = canvasWidth;
        source.height = canvasHeight;
        const sourceCtx = source.getContext('2d');
        if (!sourceCtx) return undefined;
        const image = sourceCtx.createImageData(canvasWidth, canvasHeight);
        image.data.set(pixels);
        sourceCtx.putImageData(image, 0, 0);
        const thumbnail = document.createElement('canvas');
        const scale = Math.min(1, 160 / Math.max(canvasWidth, canvasHeight));
        thumbnail.width = Math.max(1, Math.round(canvasWidth * scale));
        thumbnail.height = Math.max(1, Math.round(canvasHeight * scale));
        const thumbnailCtx = thumbnail.getContext('2d');
        if (!thumbnailCtx) return undefined;
        thumbnailCtx.imageSmoothingEnabled = false;
        thumbnailCtx.drawImage(source, 0, 0, thumbnail.width, thumbnail.height);
        return thumbnail.toDataURL('image/png');
      };
      for (const layer of targets) {
        const ctx = getOrCreateLayerCanvas(layer.id).getContext('2d', { willReadFrequently: true });
        if (!ctx) continue;
        const before = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
        const plan = planSpriteCleanup(before, request.options);
        stats.removedFaint += plan.stats.removedFaint;
        stats.hardenedAlpha += plan.stats.hardenedAlpha;
        stats.removedSpecks += plan.stats.removedSpecks;
        stats.simplifiedColors += plan.stats.simplifiedColors;
        stats.thinnedLinePixels += plan.stats.thinnedLinePixels;
        stats.changedPixels += plan.stats.changedPixels;
        stats.sourceColors = Math.max(stats.sourceColors, plan.stats.sourceColors);
        stats.resultColors = Math.max(stats.resultColors, plan.stats.resultColors);
        if (!apply && layer.id === state.activeLayerId && canvasWidth * canvasHeight <= 1_000_000) {
          beforePreview = preview(before.data);
          afterPreview = preview(plan.data);
        }
        if (apply && plan.stats.changedPixels > 0) edits.push({ id: layer.id, ctx, before, after: plan.data });
      }
      if (apply && edits.length > 0) {
        if (request.allFrames) {
          pushStructuralHistoryStep('Analyze & Crisp (All Frames)', {
            affectedLayerIds: edits.map((edit) => edit.id),
          });
        } else {
          captureSnapshot('Analyze & Crisp');
        }
        for (const edit of edits) {
          const original = new ImageData(new Uint8ClampedArray(edit.before.data), canvasWidth, canvasHeight);
          edit.before.data.set(edit.after);
          edit.ctx.putImageData(edit.before, 0, 0);
          touchBuffer(edit.id);
          coDrawBridge.notifyStrokeCommitted(edit.id, original);
        }
        if (request.allFrames) {
          const affected = new Set(edits.map((edit) => edit.id));
          useStudioStore.setState((draft) => {
            for (const frame of draft.frames) for (const layer of frame.layers) {
              if (affected.has(layer.id)) layer.effect = undefined;
            }
          });
          state.setDirty(true);
        } else {
          commitSnapshot();
        }
        renderComposite();
        bumpBufferVersion();
      }
      studioEvents.emit('pixibun:sprite-cleanup-report', {
        phase: apply ? 'applied' : 'scan', stats, frames: targets.length, skippedLocked,
        beforePreview, afterPreview,
      });
      if (apply) studioEvents.emit('pixibun:toast', {
        type: 'success',
        message: stats.changedPixels > 0
          ? `Cleaned ${stats.changedPixels} pixel${stats.changedPixels === 1 ? '' : 's'} across ${targets.length} frame${targets.length === 1 ? '' : 's'}. Undo restores the original.`
          : 'No cleanup changes were needed.',
      });
    };
    const unscan = studioEvents.on('pixibun:sprite-cleanup-scan', (request) => run(request, false));
    const unapply = studioEvents.on('pixibun:sprite-cleanup-apply', (request) => run(request, true));
    return () => { unscan(); unapply(); };
  }, [canvasWidth, canvasHeight, getOrCreateLayerCanvas, renderComposite,
    captureSnapshot, commitSnapshot, bumpBufferVersion]);
}
