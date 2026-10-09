/** Stage an entire import before publishing pixels, metadata and one Undo step. */
import type { ImageImportConfirmPayload } from '@/types/import';
import type { AnimationFrame, Layer } from '@/types/canvas';
import type { ColorPalette } from '@/types/palette';
import { useStudioStore } from '@/stores/studioStore';
import { validateWorkspaceStructure } from '@/lib/project/workspaceEnvelopeGuard';
import { studioEvents } from '@/lib/events/studioEvents';
import { createEntry, snapshotBuffers, replaceAllBuffers } from '@/lib/engine/bufferRegistry';
import { commitWorkspace } from '@/lib/engine/workspaceTransaction';
import { pushStructuralHistoryStep } from '@/lib/engine/structuralHistory';
import { createId } from '@/lib/engine/id';
import { MAX_METADATA_NAME_LENGTH, metadataNameError } from '@/lib/project/metadataAdmission';
import { MAX_PROJECT_PALETTES, paletteEntryError } from '@/lib/color/paletteAdmission';
import { estimatePaletteBytes } from '@/lib/color/paletteSemantics';
import { reserveMemory } from '@/lib/safety/memoryBudget';

export interface ImageImportExecutionResult { ok: boolean; reason?: string }

export function executeImageImport(data: ImageImportConfirmPayload): ImageImportExecutionResult {
  let release: (() => void) | undefined;
  try {
    const state = useStudioStore.getState();
    const { target, filename, canvas, slicedFrames } = data;
    const sheet = target === 'sprite-sheet-append' || target === 'sprite-sheet-replace';
    if (sheet !== Boolean(slicedFrames?.length)) throw new Error('The import destination does not match the supplied image frames.');
    const width = data.resizeCanvasToMatch?.width ?? state.canvasWidth;
    const height = data.resizeCanvasToMatch?.height ?? state.canvasHeight;
    const resized = width !== state.canvasWidth || height !== state.canvasHeight;
    const sources = sheet ? slicedFrames! : [canvas];
    if (sources.some(source => !source || source.width < 1 || source.height < 1)) throw new Error('The imported image is empty.');
    if (sheet && sources.some(source => source.width > width || source.height > height)) {
      throw new Error('Sprite sheet cells exceed the canvas. Resize the canvas to the cell size before importing.');
    }

    const frames = structuredClone(state.frames);
    const activeFrame = frames[state.activeFrameIndex];
    if (!activeFrame) throw new Error('The import destination frame is unavailable.');
    const stem = filename ? filename.replace(/\.[^/.]+$/, '') : 'Imported';
    const layerName = sheet ? `Sprite Sheet: ${stem}`.slice(0, MAX_METADATA_NAME_LENGTH) : stem;
    if (target === 'new-layer') {
      const error = metadataNameError(layerName, 'layer');
      if (error) throw new Error(error);
    }
    const blankLayer = (): Layer => ({ id: createId('layer'), name: 'Base Layer', visible: true, locked: false, opacity: 1, blendMode: 'source-over' });
    const newFrame = (): AnimationFrame => {
      const layers = activeFrame.layers.filter(layer => !layer.tag).map(layer => ({
        ...structuredClone(layer), id: createId('layer'), effect: undefined,
      }));
      return { id: createId('frame'), durationMs: 100, layers: layers.length ? layers : [blankLayer()] };
    };
    const writes = new Map<string, HTMLCanvasElement>();
    const cleared = new Set<string>();
    let activeFrameIndex = state.activeFrameIndex;
    let activeLayerId = state.activeLayerId;
    if (sheet) {
      const start = target === 'sprite-sheet-replace' ? 0 : frames.length;
      if (target === 'sprite-sheet-replace') {
        // Deleted frames are protected too; replacement must not discard locked artwork.
        if (frames.some(frame => frame.layers.some(layer => layer.locked))) throw new Error('Unlock the layers before replacing sprite-sheet frames.');
        frames.splice(sources.length);
      }
      for (let i = 0; i < sources.length; i++) {
        const frame = frames[start + i] ?? newFrame();
        frames[start + i] = frame;
        for (const layer of frame.layers) { cleared.add(layer.id); layer.effect = undefined; }
        const layer = frame.layers[0];
        if (!layer) throw new Error('The import destination layer is unavailable.');
        Object.assign(layer, { name: layerName, visible: true, opacity: 1, blendMode: 'source-over' });
        writes.set(layer.id, sources[i]);
      }
      activeFrameIndex = target === 'sprite-sheet-replace' ? 0 : frames.length - 1;
      activeLayerId = frames[activeFrameIndex].layers[0].id;
    } else {
      let layer: Layer | undefined;
      if (target === 'new-layer') {
        layer = { ...blankLayer(), name: layerName };
        activeFrame.layers.unshift(layer);
      } else if (target === 'new-frame') {
        const frame = newFrame(); frames.push(frame);
        activeFrameIndex = frames.length - 1;
        layer = frame.layers[0];
      } else {
        layer = activeFrame.layers.find(layer => layer.id === activeLayerId);
        if (layer?.locked) throw new Error('Unlock the layer before replacing its image.');
      }
      if (!layer) throw new Error('The import destination layer is unavailable.');
      layer.effect = undefined;
      activeLayerId = layer.id;
      writes.set(layer.id, canvas);
      cleared.add(layer.id);
    }
    const capacity = validateWorkspaceStructure(width, height, frames);
    if (!capacity.ok) throw new Error(capacity.reason || 'Import exceeds workspace capacity limits.');

    let palette: ColorPalette | undefined;
    if (data.addToPalette && data.extractedPalette.length) {
      const name = filename ? `Palette: ${stem}` : 'Imported Palette';
      const error = paletteEntryError(name, data.extractedPalette);
      if (error) throw new Error(error);
      if (state.palettes.length >= MAX_PROJECT_PALETTES) throw new Error(`A project can have at most ${MAX_PROJECT_PALETTES} palettes.`);
      palette = { id: createId('palette'), name, colors: [...data.extractedPalette] };
    }

    const previous = snapshotBuffers();
    const removedFrameIds = new Set(state.frames.filter(frame => !frames.some(next => next.id === frame.id)).map(frame => frame.id));
    const finalIds = new Set(frames.flatMap(frame => frame.layers.map(layer => layer.id)));
    const affected = new Set(cleared);
    for (const id of previous.keys()) if (resized || !finalIds.has(id)) affected.add(id);
    const stagedIds = [...finalIds].filter(id => cleared.has(id) || (resized && previous.has(id)));
    release = reserveMemory(stagedIds.length * width * height * 4, 'Image import staging');
    const staged = new Map([...previous].filter(([id]) => finalIds.has(id)));
    for (const id of stagedIds) {
      const existing = previous.get(id);
      const entry = createEntry(width, height, (existing?.contentRevision ?? 0) + 1, true);
      // A fresh transparent surface implements Replace, including smaller input images.
      if (writes.has(id)) entry.ctx.drawImage(writes.get(id)!, 0, 0);
      else if (!cleared.has(id) && existing) entry.ctx.drawImage(existing.canvas, 0, 0);
      staged.set(id, entry);
    }
    commitWorkspace(() => {
      if (!pushStructuralHistoryStep(sheet ? 'Import Sprite Sheet' : 'Import Image', {
        affectedLayerIds: [...affected], includePalettes: Boolean(palette) || removedFrameIds.size > 0, includeEmptyBuffers: true,
        redoBufferCount: [...affected].filter(id => staged.has(id)).length,
        redoCanvasWidth: width, redoCanvasHeight: height,
        addedLayerCount: Math.max(0, frames.reduce((count, frame) => count + frame.layers.length, 0) - state.frames.reduce((count, frame) => count + frame.layers.length, 0)),
        addedFrameCount: Math.max(0, frames.length - state.frames.length),
        addedMetadataBytes: palette ? estimatePaletteBytes(palette) : 0,
      })) throw new Error('Import was refused because its Undo snapshot could not be admitted.');
      replaceAllBuffers(staged);
      useStudioStore.setState(current => {
        current.frames = frames;
        current.canvasWidth = width; current.canvasHeight = height;
        current.activeFrameIndex = activeFrameIndex; current.activeLayerId = activeLayerId;
        if (target === 'sprite-sheet-replace') {
          for (const palette of current.palettes) if (palette.semantics) {
            palette.semantics.bindings = palette.semantics.bindings.filter(binding => !removedFrameIds.has(binding.frameId));
          }
          current.clips = current.clips.filter(clip => clip.startFrame < frames.length).map(clip => ({
            ...clip, endFrame: Math.min(clip.endFrame, frames.length - 1), toFrame: Math.min(clip.toFrame ?? clip.endFrame, frames.length - 1),
          }));
          if (!current.clips.some(clip => clip.id === current.activeClipId)) current.activeClipId = null;
          if (current.motionPart && removedFrameIds.has(current.motionPart.sourceFrameId)) {
            current.motionPart = null; current.motionHistory = null; current.motionPreviewIndex = null;
          }
        }
        if (palette) { current.palettes.push(palette); current.currentPaletteId = palette.id; }
        if (resized) { current.selection = null; current.selectionMask = null; }
        current.isDirty = true; current.editRevision += 1; current.bufferVersion += 1;
      });
    });
    return { ok: true };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Failed to import image.';
    studioEvents.emit('pixibun:toast', { type: 'error', message: reason });
    return { ok: false, reason };
  } finally { release?.(); }
}
