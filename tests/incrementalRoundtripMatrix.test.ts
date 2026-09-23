// @vitest-environment happy-dom
import 'fake-indexeddb/auto';
import { Blob as NodeBlob } from 'node:buffer';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { makeCanvas, type ImageDataShim } from './helpers/mockCanvas';
import { db, autoSaveWorkspaceDetailed, loadLatestSavedWorkspace, getLayerBlobsForProject } from '@/lib/storage/db';
import {
  hydrateProject,
  buildAutosavePayloadAsync,
  commitPersistedRevisions,
  clearPersistedRevisions,
} from '@/lib/project/serialize';
import { useStudioStore } from '@/stores/studioStore';
import {
  getOrCreateBuffer,
  clearAllBuffers,
  touchBuffer,
  getBufferRevision,
} from '@/lib/engine/bufferRegistry';
import { createHistoryEngine, type PixelHistoryStep } from '@/lib/engine/historyEngine';
import { ImageHeaderProbe } from '@/lib/safety/imageHeaderProbe';
import type { LayerEffectRecipe } from '@/types/canvas';

describe('Incremental-Autosave Round-Trip Matrix (B3–B7, B17–B22)', () => {
  const blobPayloadMap = new Map<string, ImageDataShim>();
  let nextBlobId = 1;

  beforeEach(async () => {
    vi.stubGlobal('Blob', NodeBlob);
    blobPayloadMap.clear();
    nextBlobId = 1;

    const contextMap = new WeakMap<HTMLCanvasElement, CanvasRenderingContext2D>();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      let ctx = contextMap.get(this);
      if (!ctx) {
        const mock = makeCanvas(this.width || 32, this.height || 32);
        ctx = mock.getContext('2d') as unknown as CanvasRenderingContext2D;
        contextMap.set(this, ctx);
      }
      return ctx;
    });

    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,cG5n');

    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (this: HTMLCanvasElement, callback) {
      const ctx = this.getContext('2d') as unknown as { _imageData?: ImageDataShim };
      const imgData = ctx?._imageData;
      const id = `mock-blob-${nextBlobId++}`;
      if (imgData) {
        blobPayloadMap.set(id, {
          width: imgData.width,
          height: imgData.height,
          data: new Uint8ClampedArray(imgData.data),
        });
      }
      const blob = new NodeBlob([id]) as unknown as Blob;
      callback(blob);
    });

    vi.spyOn(ImageHeaderProbe, 'probe').mockResolvedValue({ width: 32, height: 32, format: 'PNG' });

    vi.stubGlobal(
      'createImageBitmap',
      vi.fn().mockImplementation(async (blob: Blob) => {
        const text = typeof blob.text === 'function' ? await blob.text() : '';
        const stored = blobPayloadMap.get(text);
        return {
          width: 32,
          height: 32,
          close: vi.fn(),
          _imageData: stored,
        };
      })
    );

    await db.open();
    await db.projects.clear();
    await db.layerBlobs.clear();
    clearPersistedRevisions();
    clearAllBuffers();
    useStudioStore.getState().resetToNewProject();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    clearAllBuffers();
    clearPersistedRevisions();
  });

  async function performIncrementalSaveAndHydrate(projectId: string) {
    const payload = await buildAutosavePayloadAsync(projectId);
    const success = await autoSaveWorkspaceDetailed(
      projectId,
      payload.project,
      undefined,
      payload.layerBlobs
    );
    expect(success.ok).toBe(true);
    commitPersistedRevisions(projectId, payload.capturedRevisions);

    // Save state is in DB. Now wipe the in-memory store and buffer registry completely.
    clearAllBuffers();
    useStudioStore.getState().resetToNewProject();

    // Fresh hydrate from IndexedDB
    const saved = await loadLatestSavedWorkspace();
    expect(saved?.id).toBe(projectId);
    const blobs = await getLayerBlobsForProject(projectId);
    const parsedProject = JSON.parse(saved!.dataJson);
    await hydrateProject(parsedProject, projectId, blobs);

    return {
      savedProject: parsedProject,
      blobs,
    };
  }

  // 1. Brush stroke
  it('round-trips brush stroke mutations through incremental autosave to fresh hydrate', async () => {
    const store = useStudioStore.getState();
    const projectId = store.currentProjectId;
    const layerId = store.activeLayerId;
    const buf = getOrCreateBuffer(layerId, 32, 32);

    // Brush painting
    buf.ctx.fillStyle = '#ff0000';
    buf.ctx.fillRect(4, 4, 2, 2);
    touchBuffer(layerId);
    expect(getBufferRevision(layerId)).toBeGreaterThanOrEqual(2);

    await performIncrementalSaveAndHydrate(projectId);

    // Verify hydrated buffer has the red brush pixels at (4, 4)
    const hydratedBuf = getOrCreateBuffer(layerId, 32, 32);
    const pixel = hydratedBuf.ctx.getImageData(4, 4, 1, 1).data;
    expect(pixel[0]).toBe(255); // Red
    expect(pixel[3]).toBe(255); // Alpha
  });

  // 2. Eraser mutation
  it('round-trips eraser mutations through incremental autosave to fresh hydrate', async () => {
    const store = useStudioStore.getState();
    const projectId = store.currentProjectId;
    const layerId = store.activeLayerId;
    const buf = getOrCreateBuffer(layerId, 32, 32);

    // Initial paint
    buf.ctx.fillStyle = '#00ff00';
    buf.ctx.fillRect(0, 0, 10, 10);
    touchBuffer(layerId);
    await performIncrementalSaveAndHydrate(projectId);

    // Erase center region
    const activeBuf = getOrCreateBuffer(layerId, 32, 32);
    activeBuf.ctx.clearRect(4, 4, 2, 2);
    touchBuffer(layerId);

    await performIncrementalSaveAndHydrate(projectId);

    const hydratedBuf = getOrCreateBuffer(layerId, 32, 32);
    const erasedPixel = hydratedBuf.ctx.getImageData(4, 4, 1, 1).data;
    expect(erasedPixel[3]).toBe(0); // Transparent after erase
  });

  // 3. Undo
  it('round-trips undo mutations through incremental autosave to fresh hydrate', async () => {
    const store = useStudioStore.getState();
    const projectId = store.currentProjectId;
    const layerId = store.activeLayerId;
    const engine = createHistoryEngine(20);
    const buf = getOrCreateBuffer(layerId, 32, 32);

    // Stroke 1: blue
    buf.ctx.fillStyle = '#0000ff';
    buf.ctx.fillRect(0, 0, 4, 4);
    const stroke1Data = buf.ctx.getImageData(0, 0, 32, 32);
    engine.push({
      type: 'pixel',
      layerId,
      frameIndex: 0,
      imageData: stroke1Data,
      description: 'Stroke 1',
    });

    // Stroke 2: yellow
    buf.ctx.fillStyle = '#ffff00';
    buf.ctx.fillRect(10, 10, 4, 4);
    const stroke2Data = buf.ctx.getImageData(0, 0, 32, 32);

    // Perform undo
    const restored = engine.undo({
      type: 'pixel',
      layerId,
      frameIndex: 0,
      imageData: stroke2Data,
      description: 'Stroke 2',
    }) as PixelHistoryStep;
    expect(restored).toBeDefined();
    buf.ctx.putImageData(restored.imageData, 0, 0);
    touchBuffer(layerId);

    await performIncrementalSaveAndHydrate(projectId);

    const hydratedBuf = getOrCreateBuffer(layerId, 32, 32);
    // Stroke 1 pixels exist
    expect(hydratedBuf.ctx.getImageData(0, 0, 1, 1).data[2]).toBe(255);
    // Undone Stroke 2 pixels do not exist
    expect(hydratedBuf.ctx.getImageData(10, 10, 1, 1).data[3]).toBe(0);
  });

  // 4. Redo
  it('round-trips redo mutations through incremental autosave to fresh hydrate', async () => {
    const store = useStudioStore.getState();
    const projectId = store.currentProjectId;
    const layerId = store.activeLayerId;
    const engine = createHistoryEngine(20);
    const buf = getOrCreateBuffer(layerId, 32, 32);

    // Initial blank snapshot
    engine.push({
      type: 'pixel',
      layerId,
      frameIndex: 0,
      imageData: buf.ctx.getImageData(0, 0, 32, 32),
      description: 'Blank',
    });

    // Paint purple
    buf.ctx.fillStyle = '#800080';
    buf.ctx.fillRect(6, 6, 3, 3);
    const paintedData = buf.ctx.getImageData(0, 0, 32, 32);

    // Undo it
    engine.undo({
      type: 'pixel',
      layerId,
      frameIndex: 0,
      imageData: paintedData,
      description: 'Purple',
    });

    // Redo it
    const redone = engine.redo() as PixelHistoryStep;
    expect(redone).toBeDefined();
    buf.ctx.putImageData(redone.imageData, 0, 0);
    touchBuffer(layerId);

    await performIncrementalSaveAndHydrate(projectId);

    const hydratedBuf = getOrCreateBuffer(layerId, 32, 32);
    const pixel = hydratedBuf.ctx.getImageData(6, 6, 1, 1).data;
    expect(pixel[0]).toBe(128); // Red
    expect(pixel[2]).toBe(128); // Blue
  });

  // 5. Fill
  it('round-trips flood fill mutations through incremental autosave to fresh hydrate', async () => {
    const store = useStudioStore.getState();
    const projectId = store.currentProjectId;
    const layerId = store.activeLayerId;
    const buf = getOrCreateBuffer(layerId, 32, 32);

    // Flood fill whole layer with teal
    buf.ctx.fillStyle = '#008080';
    buf.ctx.fillRect(0, 0, 32, 32);
    touchBuffer(layerId);

    await performIncrementalSaveAndHydrate(projectId);

    const hydratedBuf = getOrCreateBuffer(layerId, 32, 32);
    const pixel = hydratedBuf.ctx.getImageData(16, 16, 1, 1).data;
    expect(pixel[1]).toBe(128); // Green
    expect(pixel[2]).toBe(128); // Blue
  });

  // 6. Line / Shape
  it('round-trips geometric line and rectangle shape mutations through incremental autosave to fresh hydrate', async () => {
    const store = useStudioStore.getState();
    const projectId = store.currentProjectId;
    const layerId = store.activeLayerId;
    const buf = getOrCreateBuffer(layerId, 32, 32);

    // Draw box outline
    buf.ctx.fillStyle = '#ffffff';
    buf.ctx.fillRect(2, 2, 8, 1);
    buf.ctx.fillRect(2, 2, 1, 8);
    touchBuffer(layerId);

    await performIncrementalSaveAndHydrate(projectId);

    const hydratedBuf = getOrCreateBuffer(layerId, 32, 32);
    expect(hydratedBuf.ctx.getImageData(2, 2, 1, 1).data[0]).toBe(255);
    expect(hydratedBuf.ctx.getImageData(5, 2, 1, 1).data[0]).toBe(255);
  });

  // 7. Selection transform
  it('round-trips selection transform commits through incremental autosave to fresh hydrate', async () => {
    const store = useStudioStore.getState();
    const projectId = store.currentProjectId;
    const layerId = store.activeLayerId;
    const buf = getOrCreateBuffer(layerId, 32, 32);

    // Initial shape at (2, 2)
    buf.ctx.fillStyle = '#ff8800';
    buf.ctx.fillRect(2, 2, 4, 4);

    // Simulate transform: move to (12, 12)
    buf.ctx.clearRect(2, 2, 4, 4);
    buf.ctx.fillRect(12, 12, 4, 4);
    touchBuffer(layerId);

    await performIncrementalSaveAndHydrate(projectId);

    const hydratedBuf = getOrCreateBuffer(layerId, 32, 32);
    expect(hydratedBuf.ctx.getImageData(2, 2, 1, 1).data[3]).toBe(0); // Origin empty
    expect(hydratedBuf.ctx.getImageData(12, 12, 1, 1).data[0]).toBe(255); // Dest has pixels
  });

  // 8. Tween
  it('round-trips tween animation frame generation through incremental autosave to fresh hydrate', async () => {
    const store = useStudioStore.getState();
    const projectId = store.currentProjectId;

    // Add frame 2
    store.addFrame();
    expect(useStudioStore.getState().frames.length).toBe(2);

    // Simulate tween interpolation adding frame in between
    useStudioStore.setState((s) => {
      s.frames.splice(1, 0, {
        id: 'tween-frame',
        durationMs: 80,
        layers: [
          {
            id: 'tween-layer-1',
            name: 'Tween Layer',
            visible: true,
            locked: false,
            opacity: 1,
            blendMode: 'source-over',
          },
        ],
      });
      s.editRevision += 1;
    });

    const tweenBuf = getOrCreateBuffer('tween-layer-1', 32, 32);
    tweenBuf.ctx.fillStyle = '#00ffff';
    tweenBuf.ctx.fillRect(5, 5, 5, 5);
    touchBuffer('tween-layer-1');

    await performIncrementalSaveAndHydrate(projectId);

    const reloadedStore = useStudioStore.getState();
    expect(reloadedStore.frames.length).toBe(3);
    expect(reloadedStore.frames[1].id).toBe('tween-frame');
    expect(reloadedStore.frames[1].durationMs).toBe(80);
  });

  // 9. Import
  it('round-trips project imports through incremental autosave to fresh hydrate', async () => {
    const store = useStudioStore.getState();
    const projectId = store.currentProjectId;

    // Mutate state as if imported
    useStudioStore.setState((s) => {
      s.projectName = 'Imported Masterpiece';
      s.canvasWidth = 32;
      s.canvasHeight = 32;
      s.frames = [
        {
          id: 'imported-frame-1',
          durationMs: 120,
          layers: [
            {
              id: 'imported-layer-1',
              name: 'Foreground',
              visible: true,
              locked: false,
              opacity: 0.9,
              blendMode: 'multiply',
            },
          ],
        },
      ];
      s.activeLayerId = 'imported-layer-1';
      s.editRevision += 1;
    });

    const importedBuf = getOrCreateBuffer('imported-layer-1', 32, 32);
    importedBuf.ctx.fillStyle = '#aabbcc';
    importedBuf.ctx.fillRect(1, 1, 2, 2);
    touchBuffer('imported-layer-1');

    await performIncrementalSaveAndHydrate(projectId);

    const reloadedStore = useStudioStore.getState();
    expect(reloadedStore.projectName).toBe('Imported Masterpiece');
    expect(reloadedStore.frames[0].layers[0].name).toBe('Foreground');
    expect(reloadedStore.frames[0].layers[0].blendMode).toBe('multiply');
    expect(reloadedStore.frames[0].layers[0].opacity).toBe(0.9);

    const reloadedBuf = getOrCreateBuffer('imported-layer-1', 32, 32);
    const pixel = reloadedBuf.ctx.getImageData(1, 1, 1, 1).data;
    expect(pixel[0]).toBe(0xaa);
    expect(pixel[1]).toBe(0xbb);
    expect(pixel[2]).toBe(0xcc);
    expect(pixel[3]).toBe(255);
  });

  // 10. Photometric commit
  it('round-trips photometric effect commit with recipe metadata through incremental autosave to fresh hydrate', async () => {
    const store = useStudioStore.getState();
    const projectId = store.currentProjectId;
    const layerId = store.activeLayerId;

    const photometricRecipe: LayerEffectRecipe = {
      id: 'fx-photometric-1',
      kind: 'photometric',
      version: 1,
      sourceMode: 'composite-excluding-self',
      params: {
        lightAzimuth: 135,
        lightElevation: 45,
        shadingTones: 2,
        specularHighlight: true,
      },
      updatedAt: Date.now(),
    };

    useStudioStore.setState((s) => {
      const active = s.frames[s.activeFrameIndex].layers.find((l) => l.id === layerId);
      if (active) {
        active.tag = 'photometric';
        active.effect = photometricRecipe;
      }
      s.editRevision += 1;
    });

    const photoBuf = getOrCreateBuffer(layerId, 32, 32);
    photoBuf.ctx.fillStyle = '#ffaa33';
    photoBuf.ctx.fillRect(8, 8, 4, 4);
    touchBuffer(layerId);

    await performIncrementalSaveAndHydrate(projectId);

    const reloadedStore = useStudioStore.getState();
    const activeLayer = reloadedStore.frames[0].layers.find((l) => l.id === layerId);
    expect(activeLayer?.tag).toBe('photometric');
    expect(activeLayer?.effect?.kind).toBe('photometric');
    expect(activeLayer?.effect?.params.lightAzimuth).toBe(135);
  });

  // 11. Remote co-draw sync
  it('round-trips remote co-draw peer sync through incremental autosave to fresh hydrate', async () => {
    const store = useStudioStore.getState();
    const projectId = store.currentProjectId;
    const layerId = store.activeLayerId;
    const buf = getOrCreateBuffer(layerId, 32, 32);

    // Simulate remote co-draw peer stroke arrival
    buf.ctx.fillStyle = '#e91e63';
    buf.ctx.fillRect(14, 14, 3, 3);
    touchBuffer(layerId); // Co-draw bridge touches buffer on remote stroke

    await performIncrementalSaveAndHydrate(projectId);

    const hydratedBuf = getOrCreateBuffer(layerId, 32, 32);
    const pixel = hydratedBuf.ctx.getImageData(14, 14, 1, 1).data;
    expect(pixel[0]).toBe(233); // Red
    expect(pixel[1]).toBe(30);  // Green
    expect(pixel[2]).toBe(99);  // Blue
  });

  // 12. Duplicate layer / frame
  it('round-trips duplicate layer and duplicate frame mutations through incremental autosave to fresh hydrate', async () => {
    const store = useStudioStore.getState();
    const projectId = store.currentProjectId;

    // Draw on original layer
    const origLayerId = store.activeLayerId;
    const origBuf = getOrCreateBuffer(origLayerId, 32, 32);
    origBuf.ctx.fillStyle = '#33cc33';
    origBuf.ctx.fillRect(0, 0, 8, 8);
    touchBuffer(origLayerId);

    // Duplicate layer
    store.duplicateLayer(origLayerId);
    const stateAfterLayerDup = useStudioStore.getState();
    expect(stateAfterLayerDup.frames[0].layers.length).toBe(2);
    const duplicatedLayerId = stateAfterLayerDup.frames[0].layers[1].id;
    touchBuffer(duplicatedLayerId);

    // Duplicate frame
    store.duplicateFrame(0);
    const stateAfterFrameDup = useStudioStore.getState();
    expect(stateAfterFrameDup.frames.length).toBe(2);

    await performIncrementalSaveAndHydrate(projectId);

    const reloadedStore = useStudioStore.getState();
    expect(reloadedStore.frames.length).toBe(2);
    expect(reloadedStore.frames[0].layers.length).toBe(2);
    expect(reloadedStore.frames[1].layers.length).toBe(2);
  });

  // 13. Atomic transaction rollback
  it('enforces atomic transaction rollback: when bulkPut fails inside Dexie transaction, neither project metadata nor blobs commit', async () => {
    const store = useStudioStore.getState();
    const projectId = 'proj-atomic-rollback-test';
    const layerId = store.activeLayerId;
    const buf = getOrCreateBuffer(layerId, 32, 32);
    buf.ctx.fillRect(0, 0, 4, 4);
    touchBuffer(layerId);

    const payload = await buildAutosavePayloadAsync(projectId);

    // Force error inside Dexie transaction during layerBlobs write
    vi.spyOn(db.layerBlobs, 'bulkAdd').mockRejectedValueOnce(new Error('Simulated IO Failure'));

    const success = await autoSaveWorkspaceDetailed(
      projectId,
      payload.project,
      undefined,
      payload.layerBlobs
    );

    // Autosave returned failure
    expect(success.ok).toBe(false);

    // Transaction was rolled back: project record was NOT created in DB!
    const projectInDb = await db.projects.get(projectId);
    expect(projectInDb).toBeUndefined();

    // Blobs were NOT created in DB!
    const blobsInDb = await getLayerBlobsForProject(projectId);
    expect(blobsInDb).toHaveLength(0);
  });
});
