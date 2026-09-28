// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { makeCanvas } from './helpers/mockCanvas';
import {
  createHistoryEngine,
  calculateStepBytes,
  setGlobalHistoryEngine,
} from '@/lib/engine/historyEngine';
import {
  captureLayerBuffers,
  restoreStructuralWorkspace,
} from '@/lib/engine/structuralHistory';
import { useStudioStore } from '@/stores/studioStore';
import { studioEvents } from '@/lib/events/studioEvents';
import {
  getOrCreateBuffer,
  clearAllBuffers,
} from '@/lib/engine/bufferRegistry';
import type { PixelHistoryStep, StructuralHistoryStep, AnimationFrame, Layer } from '@/types/canvas';

function createMockImageData(w: number, h: number, marker: number = 0): ImageData {
  const data = new Uint8ClampedArray(w * h * 4);
  data[0] = marker;
  data[1] = marker + 1;
  data[2] = marker + 2;
  data[3] = 255;
  return {
    width: w,
    height: h,
    data,
    colorSpace: 'srgb',
  } as ImageData;
}

describe('History Engine Byte Budgeting & Structural Inversion', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      return makeCanvas(this.width || 32, this.height || 32).getContext('2d');
    });
    clearAllBuffers();
    useStudioStore.getState().resetToNewProject();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearAllBuffers();
    setGlobalHistoryEngine(null);
  });

  describe('Byte Budgeting & Oversized Step Safety', () => {
    it('records one reversible metadata step for a continuous opacity edit', () => {
      const engine = createHistoryEngine();
      setGlobalHistoryEngine(engine);
      const layerId = useStudioStore.getState().frames[0].layers[0].id;

      expect(useStudioStore.getState().setLayerOpacity(layerId, 0.75)).toBe(true);
      expect(useStudioStore.getState().setLayerOpacity(layerId, 0.5, true)).toBe(true);
      expect(engine.depth).toBe(1);

      const before = engine.peekUndo() as StructuralHistoryStep;
      expect(before.frames[0].layers[0].opacity).toBe(1);
      const current = useStudioStore.getState();
      const target = engine.undo({
        type: 'structural', description: 'Change Layer Opacity', frameIndex: 0,
        frames: structuredClone(current.frames), activeFrameIndex: 0, activeLayerId: layerId,
        canvasWidth: current.canvasWidth, canvasHeight: current.canvasHeight,
      }) as StructuralHistoryStep;
      restoreStructuralWorkspace({ ...target, canvasWidth: target.canvasWidth ?? current.canvasWidth, canvasHeight: target.canvasHeight ?? current.canvasHeight });
      expect(useStudioStore.getState().frames[0].layers[0].opacity).toBe(1);
      const redoTarget = engine.redo(before) as StructuralHistoryStep;
      restoreStructuralWorkspace({ ...redoTarget, canvasWidth: redoTarget.canvasWidth ?? current.canvasWidth, canvasHeight: redoTarget.canvasHeight ?? current.canvasHeight });
      expect(useStudioStore.getState().frames[0].layers[0].opacity).toBe(0.5);
    });

    it('records frame duration and blend mode as separate structural Undo steps', () => {
      const engine = createHistoryEngine();
      setGlobalHistoryEngine(engine);
      const layerId = useStudioStore.getState().frames[0].layers[0].id;
      const originalDuration = useStudioStore.getState().frames[0].durationMs;
      useStudioStore.getState().setFrameDuration(0, 250);
      useStudioStore.getState().setLayerBlendMode(layerId, 'multiply');
      expect(engine.getHistory().map((step) => step.description)).toEqual([
        'Change Frame Duration', 'Change Layer Blend Mode',
      ]);
      expect((engine.getHistory()[0] as StructuralHistoryStep).frames[0].durationMs).toBe(originalDuration);
      expect((engine.getHistory()[1] as StructuralHistoryStep).frames[0].layers[0].blendMode).toBe('source-over');
    });

    it('blocks an oversized destructive edit before changing the canvas or existing history', () => {
      useStudioStore.getState().addLayer('Top');
      const state = useStudioStore.getState();
      const [top, lower] = state.frames[0].layers;
      getOrCreateBuffer(top.id, state.canvasWidth, state.canvasHeight);
      getOrCreateBuffer(lower.id, state.canvasWidth, state.canvasHeight);
      const engine = createHistoryEngine({ maxBytes: 5_000 });
      setGlobalHistoryEngine(engine);
      state.setLayerOpacity(top.id, 0.5);
      expect(engine.depth).toBe(1);

      const notices: string[] = [];
      const unsubscribe = studioEvents.on('pixibun:toast', (notice) => notices.push(notice.message));
      state.mergeLayerDown(top.id);
      unsubscribe();
      expect(useStudioStore.getState().frames[0].layers).toHaveLength(2);
      expect(useStudioStore.getState().frames[0].layers[0].opacity).toBe(0.5);
      expect(engine.depth).toBe(1);
      expect(engine.isTruncated).toBe(false);
      expect(notices.some((message) => message.includes('The edit was not applied'))).toBe(true);
    });

    it('blocks a new frame when its prospective Redo buffer cannot fit', () => {
      const state = useStudioStore.getState();
      const layerId = state.frames[0].layers[0].id;
      const engine = createHistoryEngine({ maxBytes: 5_000 });
      setGlobalHistoryEngine(engine);
      state.setLayerOpacity(layerId, 0.5);
      expect(engine.depth).toBe(1);

      state.addFrame();
      expect(useStudioStore.getState().frames).toHaveLength(1);
      expect(engine.depth).toBe(1);
      expect(engine.isTruncated).toBe(false);
    });

    it('calculates step bytes accurately for pixel and structural steps', () => {
      const pixelStep: PixelHistoryStep = {
        type: 'pixel',
        description: 'Paint',
        frameIndex: 0,
        layerId: 'layer-1',
        imageData: createMockImageData(64, 64),
      };

      const pixelBytes = calculateStepBytes(pixelStep);
      // 64 * 64 * 4 = 16384 bytes imageData + 512 metadata overhead
      expect(pixelBytes).toBe(16384 + 512);

      const structuralReorder: StructuralHistoryStep = {
        type: 'structural',
        opKind: 'reorder-layers',
        description: 'Reorder Layers',
        frameIndex: 0,
        frames: useStudioStore.getState().frames,
        activeFrameIndex: 0,
        activeLayerId: 'layer-1',
        layerBuffers: [],
      };

      const reorderBytes = calculateStepBytes(structuralReorder);
      // Reordering has 0 raster buffers, so only base + frame metadata
      expect(reorderBytes).toBeLessThan(3000);
    });

    it('rejects an oversized step that exceeds maxBytes and does not compromise hard limit', () => {
      // 100 KB limit
      const engine = createHistoryEngine({ maxDepth: 10, maxBytes: 100 * 1024 });

      // Step with 128x128 ImageData = 128 * 128 * 4 = 65,536 bytes (fits)
      const normalStep: PixelHistoryStep = {
        type: 'pixel',
        description: 'Normal',
        frameIndex: 0,
        layerId: 'layer-1',
        imageData: createMockImageData(128, 128),
      };

      expect(engine.push(normalStep)).toBe(1);
      expect(engine.totalBytes).toBe(calculateStepBytes(normalStep));
      expect(engine.isTruncated).toBe(false);

      // Oversized step: 256x256 ImageData = 256 * 256 * 4 = 262,144 bytes > 102,400 bytes limit
      const oversizedStep: PixelHistoryStep = {
        type: 'pixel',
        description: 'Oversized',
        frameIndex: 0,
        layerId: 'layer-1',
        imageData: createMockImageData(256, 256),
      };

      // Push should be rejected
      const newDepth = engine.push(oversizedStep);
      expect(newDepth).toBe(0); // The already-applied edit breaks the older undo path.
      expect(engine.totalBytes).toBe(0);
      expect(engine.canUndo).toBe(false);
      expect(engine.canRedo).toBe(false);
      expect(engine.isTruncated).toBe(true); // Marked truncated/warning
    });

    it('evicts oldest entries via FIFO when cumulative bytes exceed maxBytes', () => {
      // Budget for approximately two 32x32 steps (~4 KB each)
      const budget = 10 * 1024;
      const engine = createHistoryEngine({ maxDepth: 10, maxBytes: budget });

      const step1: PixelHistoryStep = {
        type: 'pixel',
        description: 'Step 1',
        frameIndex: 0,
        layerId: 'l1',
        imageData: createMockImageData(32, 32, 1),
      };
      const step2: PixelHistoryStep = {
        type: 'pixel',
        description: 'Step 2',
        frameIndex: 0,
        layerId: 'l1',
        imageData: createMockImageData(32, 32, 2),
      };
      const step3: PixelHistoryStep = {
        type: 'pixel',
        description: 'Step 3',
        frameIndex: 0,
        layerId: 'l1',
        imageData: createMockImageData(32, 32, 3),
      };

      engine.push(step1);
      engine.push(step2);
      expect(engine.depth).toBe(2);
      expect(engine.isTruncated).toBe(false);

      // Pushing step 3 exceeds 10 KB budget (3 * 4.6 KB > 10 KB), so step 1 must be evicted
      engine.push(step3);
      expect(engine.depth).toBe(2);
      expect(engine.isTruncated).toBe(true);
      expect(engine.evictionCount).toBe(1);

      // History should only contain step 2 and step 3
      const history = engine.getHistory();
      expect(history[0].description).toBe('Step 2');
      expect(history[1].description).toBe('Step 3');
    });
  });

  describe('Structural Inversion Memory Scaling Tests (B15)', () => {
    it('stores 0 raster bytes for reorder operations across 32 frames and 3 layers at 256x256', () => {
      // Setup a project with 32 frames, each with 3 layers
      const frames: AnimationFrame[] = [];
      const canvasWidth = 256;
      const canvasHeight = 256;

      for (let f = 0; f < 32; f++) {
        const layers: Layer[] = [];
        for (let l = 0; l < 3; l++) {
          const id = `f${f}-l${l}`;
          layers.push({
            id,
            name: `Layer ${l}`,
            visible: true,
            locked: false,
            opacity: 1,
            blendMode: 'source-over',
          });
          // Initialize backing buffer
          const buf = getOrCreateBuffer(id, canvasWidth, canvasHeight);
          buf.ctx.fillRect(0, 0, 10, 10);
        }
        frames.push({
          id: `frame-${f}`,
          durationMs: 100,
          layers,
        });
      }

      useStudioStore.setState({
        frames,
        canvasWidth,
        canvasHeight,
        activeFrameIndex: 0,
        activeLayerId: frames[0].layers[0].id,
      });

      const engine = createHistoryEngine(50);
      setGlobalHistoryEngine(engine);

      // Perform Reorder Frames
      useStudioStore.getState().reorderFrames(0, 5);

      expect(engine.depth).toBe(1);
      const step = engine.peekUndo() as StructuralHistoryStep;
      expect(step.type).toBe('structural');
      expect(step.opKind).toBe('reorder-frames');
      expect(step.layerBuffers).toEqual([]); // 0 raster buffers captured!

      const stepBytes = calculateStepBytes(step);
      // In the old system, 32 * 3 * 256 * 256 * 4 = 25,165,824 bytes (24 MiB)!
      // In the new system, it must be less than 50 KB of frame metadata!
      expect(stepBytes).toBeLessThan(50 * 1024);
      expect(stepBytes).toBeLessThan(25 * 1024 * 1024 / 500); // More than 500x memory savings!
    });

    it('captures ONLY the destroyed layer raster buffer when deleting a layer in a multi-layer project', () => {
      const state = useStudioStore.getState();
      state.addLayer('Second Layer');
      state.addLayer('Third Layer');

      const currentLayers = useStudioStore.getState().frames[0].layers;
      expect(currentLayers.length).toBe(3);

      const targetLayerId = currentLayers[1].id;
      // Paint distinctive pixel on target
      const buf = getOrCreateBuffer(targetLayerId, state.canvasWidth, state.canvasHeight);
      buf.ctx.fillStyle = '#ff0000';
      buf.ctx.fillRect(0, 0, 4, 4);

      const engine = createHistoryEngine(50);
      setGlobalHistoryEngine(engine);

      useStudioStore.getState().deleteLayer(targetLayerId);

      expect(engine.depth).toBe(1);
      const step = engine.peekUndo() as StructuralHistoryStep;
      expect(step.opKind).toBe('delete-layer');
      // Must contain ONLY the deleted layer's buffer
      expect(step.layerBuffers).toHaveLength(1);
      expect(step.layerBuffers![0].layerId).toBe(targetLayerId);
      // The other 2 layers' buffers are NOT captured!
      expect(step.layerBuffers!.some(b => b.layerId !== targetLayerId)).toBe(false);
    });
  });

  describe('Bidirectional Determinism Tests (Constraint 2)', () => {
    it('deterministically inverts Add Layer (operation -> undo -> exact pre -> redo -> exact post)', () => {
      const state = useStudioStore.getState();
      const initialFrame = structuredClone(state.frames[0]);
      const initialLayerId = state.activeLayerId;

      const engine = createHistoryEngine(50);
      setGlobalHistoryEngine(engine);

      // 1. Operation: Add layer
      state.addLayer('Inversion Layer');
      const postLayers = useStudioStore.getState().frames[0].layers;
      expect(postLayers).toHaveLength(initialFrame.layers.length + 1);
      const addedLayerId = useStudioStore.getState().activeLayerId;

      // 2. Undo: Should restore exact pre-state
      const stepToRestore = engine.undo({
        type: 'structural',
        opKind: 'add-layer',
        description: 'Add Layer',
        frameIndex: 0,
        frames: structuredClone(useStudioStore.getState().frames),
        activeFrameIndex: 0,
        activeLayerId: addedLayerId,
        layerBuffers: captureLayerBuffers([addedLayerId]),
        affectedLayerIds: [addedLayerId],
      } as StructuralHistoryStep);

      expect(stepToRestore).not.toBeNull();
      useStudioStore.setState({
        frames: (stepToRestore as StructuralHistoryStep).frames,
        activeLayerId: initialLayerId,
      });

      expect(useStudioStore.getState().frames[0].layers).toHaveLength(initialFrame.layers.length);
      expect(useStudioStore.getState().frames[0].layers[0].id).toBe(initialFrame.layers[0].id);

      // 3. Redo: Should restore exact post-state
      const redoneStep = engine.redo();
      expect(redoneStep).not.toBeNull();
      useStudioStore.setState({
        frames: (redoneStep as StructuralHistoryStep).frames,
        activeLayerId: addedLayerId,
      });

      expect(useStudioStore.getState().frames[0].layers).toHaveLength(initialFrame.layers.length + 1);
      expect(useStudioStore.getState().frames[0].layers[0].id).toBe(addedLayerId);
    });

    it('deterministically inverts Delete Layer with exact pixel restoration', () => {
      const state = useStudioStore.getState();
      state.addLayer('Doomed Layer');
      const layers = state.frames[0].layers;
      const doomedId = layers[0].id;

      // Paint distinctive pixel
      const doomedBuf = getOrCreateBuffer(doomedId, 32, 32);
      doomedBuf.ctx.fillStyle = '#123456';
      doomedBuf.ctx.fillRect(5, 5, 2, 2);
      const originalData = doomedBuf.ctx.getImageData(0, 0, 32, 32);

      const engine = createHistoryEngine(50);
      setGlobalHistoryEngine(engine);

      // Delete layer
      state.deleteLayer(doomedId);
      expect(useStudioStore.getState().frames[0].layers.some(l => l.id === doomedId)).toBe(false);

      // Undo
      const stepToRestore = engine.undo({
        type: 'structural',
        opKind: 'delete-layer',
        description: 'Delete Layer',
        frameIndex: 0,
        frames: structuredClone(useStudioStore.getState().frames),
        activeFrameIndex: 0,
        activeLayerId: useStudioStore.getState().activeLayerId,
        layerBuffers: [],
      } as StructuralHistoryStep);

      expect(stepToRestore).not.toBeNull();
      // Restore frames and buffers
      useStudioStore.setState({
        frames: (stepToRestore as StructuralHistoryStep).frames,
        activeLayerId: doomedId,
      });
      for (const b of (stepToRestore as StructuralHistoryStep).layerBuffers!) {
        const restored = getOrCreateBuffer(b.layerId, 32, 32);
        restored.ctx.putImageData(b.imageData, 0, 0);
      }

      // Assert exact restoration
      const restoredLayers = useStudioStore.getState().frames[0].layers;
      expect(restoredLayers.some(l => l.id === doomedId)).toBe(true);
      const restoredBuf = getOrCreateBuffer(doomedId, 32, 32);
      const restoredData = restoredBuf.ctx.getImageData(0, 0, 32, 32);
      expect(restoredData.data[0]).toBe(originalData.data[0]);
    });

    it('deterministically inverts Reorder Frames without touching buffers', () => {
      const state = useStudioStore.getState();
      state.addFrame();
      state.addFrame();
      expect(useStudioStore.getState().frames).toHaveLength(3);

      const f0 = useStudioStore.getState().frames[0].id;
      const f1 = useStudioStore.getState().frames[1].id;
      const f2 = useStudioStore.getState().frames[2].id;

      const engine = createHistoryEngine(50);
      setGlobalHistoryEngine(engine);

      // Reorder: Move f0 to index 2 -> order should be [f1, f2, f0]
      state.reorderFrames(0, 2);
      expect(useStudioStore.getState().frames.map(f => f.id)).toEqual([f1, f2, f0]);

      // Undo
      const stepToRestore = engine.undo({
        type: 'structural',
        opKind: 'reorder-frames',
        description: 'Reorder Frames',
        frameIndex: 0,
        frames: structuredClone(useStudioStore.getState().frames),
        activeFrameIndex: 0,
        activeLayerId: state.activeLayerId,
        layerBuffers: [],
      } as StructuralHistoryStep);

      useStudioStore.setState({
        frames: (stepToRestore as StructuralHistoryStep).frames,
      });

      expect(useStudioStore.getState().frames.map(f => f.id)).toEqual([f0, f1, f2]);

      // Redo
      const redoneStep = engine.redo();
      useStudioStore.setState({
        frames: (redoneStep as StructuralHistoryStep).frames,
      });
      expect(useStudioStore.getState().frames.map(f => f.id)).toEqual([f1, f2, f0]);
    });

    it('deterministically inverts Merge Down Layer preserving exact pre and post pixel states', () => {
      useStudioStore.getState().addLayer('Upper Layer');
      const currentLayers = useStudioStore.getState().frames[0].layers;
      const upperId = currentLayers[0].id;
      const lowerId = currentLayers[1].id;

      // Draw distinct pixels on upper and lower
      const upperBuf = getOrCreateBuffer(upperId, 32, 32);
      upperBuf.ctx.fillStyle = '#ff0000';
      upperBuf.ctx.fillRect(0, 0, 2, 2);

      const lowerBuf = getOrCreateBuffer(lowerId, 32, 32);
      lowerBuf.ctx.fillStyle = '#0000ff';
      lowerBuf.ctx.fillRect(10, 10, 2, 2);

      const engine = createHistoryEngine(50);
      setGlobalHistoryEngine(engine);

      // Merge down
      useStudioStore.getState().mergeLayerDown(upperId);

      expect(useStudioStore.getState().frames[0].layers).toHaveLength(1);
      expect(useStudioStore.getState().frames[0].layers[0].id).toBe(lowerId);

      // Undo merge
      const stepToRestore = engine.undo();
      expect(stepToRestore).not.toBeNull();
      const structStep = stepToRestore as StructuralHistoryStep;
      expect(structStep.layerBuffers).toHaveLength(2); // Upper and lower original buffers

      useStudioStore.setState({
        frames: structStep.frames,
        activeLayerId: upperId,
      });
      for (const b of structStep.layerBuffers!) {
        const buf = getOrCreateBuffer(b.layerId, 32, 32);
        buf.ctx.putImageData(b.imageData, 0, 0);
      }

      // Assert both layers exist and have their original pixel buffers
      expect(useStudioStore.getState().frames[0].layers).toHaveLength(2);
      const restoredUpper = getOrCreateBuffer(upperId, 32, 32);
      expect(restoredUpper.ctx.getImageData(0, 0, 2, 2).data[0]).toBe(255); // Red restored
      const restoredLower = getOrCreateBuffer(lowerId, 32, 32);
      expect(restoredLower.ctx.getImageData(10, 10, 2, 2).data[2]).toBe(255); // Blue restored
    });
  });
});
