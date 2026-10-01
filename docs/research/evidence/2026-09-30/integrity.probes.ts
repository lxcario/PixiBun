// @vitest-environment happy-dom
// Diagnostic probes assert observed defects, not desired product behavior.
// Outside the normal suite: do not treat these as permanent regression contracts.
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { makeCanvas } from '../../../../tests/helpers/mockCanvas';
import { useStudioStore } from '@/stores/studioStore';
import { clearAllBuffers, getOrCreateBuffer, hasBuffer, touchBuffer } from '@/lib/engine/bufferRegistry';
import { buildAutosavePayloadAsync } from '@/lib/project/serialize';
import { clearPersistedRevisions, commitPersistedRevisions } from '@/lib/project/persistenceRevisions';
import { createHistoryEngine, setGlobalHistoryEngine } from '@/lib/engine/historyEngine';
import { restoreStructuralWorkspace } from '@/lib/engine/structuralHistory';
import { buildCanvasPaletteIndexMap, generateLoopAnimationCanvases } from '@/lib/export/shaderExporter';
import { CoDrawBridge } from '@/lib/sync/coDrawBridge';
import { runRotSpriteInWorker, _setWorkerFactoryForTesting, _resetSharedWorkerForTesting } from '@/lib/engine/workerDispatcher';
import type { StructuralHistoryStep } from '@/types/canvas';
import type { StructurePayload } from '@/lib/sync/p2pSync';
import { useArtisanEvents } from '@/hooks/viewport/events/useArtisanEvents';
import { studioEvents } from '@/lib/events/studioEvents';
import { exportAnimationToWebmAsync } from '@/lib/export/webmEncoder';
import { createAnimatedGifBlobAsync, encodeGifRawFrames } from '@/lib/export/gifEncoder';

beforeEach(() => {
  const contexts = new WeakMap<HTMLCanvasElement, CanvasRenderingContext2D>();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
    let ctx = contexts.get(this);
    if (!ctx) {
      ctx = makeCanvas(this.width || 32, this.height || 32).getContext('2d')!;
      contexts.set(this, ctx);
    }
    return ctx;
  });
  clearAllBuffers();
  clearPersistedRevisions();
  setGlobalHistoryEngine(null);
  useStudioStore.getState().resetToNewProject('audit-project');
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  clearAllBuffers();
  clearPersistedRevisions();
  setGlobalHistoryEngine(null);
  _resetSharedWorkerForTesting();
});

it('A1: delayed encoding captures an unencoded revision and skips the next encoding', async () => {
  let release!: () => void;
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(callback => {
    release = () => callback(new Blob(['snapshot-before-new-stroke'], { type: 'image/png' }));
  });
  const state = useStudioStore.getState();
  const entry = getOrCreateBuffer(state.activeLayerId, 32, 32);
  const beforeRevision = entry.contentRevision;
  const pending = buildAutosavePayloadAsync();
  touchBuffer(state.activeLayerId);
  state.setDirty(true);
  release();
  const payload = await pending;
  expect(payload.capturedRevisions.get(state.activeLayerId)?.revision).toBe(beforeRevision + 1);
  commitPersistedRevisions(state.currentProjectId, payload.capturedRevisions);
  const retry = await buildAutosavePayloadAsync();
  expect(retry.dirtyLayerCount).toBe(0);
  expect(retry.layerBlobs).toHaveLength(0);
});

it('A2: restoring a deleted frame does not restore its deleted clip', () => {
  useStudioStore.getState().addFrame();
  useStudioStore.getState().addClip('only-second-frame', 1, 1, '#ffffff');
  const engine = createHistoryEngine();
  setGlobalHistoryEngine(engine);
  useStudioStore.getState().deleteFrame(1);
  const target = engine.peekUndo() as StructuralHistoryStep;
  restoreStructuralWorkspace({ ...target, canvasWidth: 32, canvasHeight: 32 });
  expect(useStudioStore.getState().frames).toHaveLength(2);
  expect(useStudioStore.getState().clips.some(c => c.name === 'only-second-frame')).toBe(false);
});

it('A3: structural restoration retains a removed layer buffer', () => {
  const initial = useStudioStore.getState();
  const originalFrames = structuredClone(initial.frames);
  initial.addLayer('temporary');
  const removedId = useStudioStore.getState().activeLayerId;
  getOrCreateBuffer(removedId, 32, 32);
  restoreStructuralWorkspace({ canvasWidth: 32, canvasHeight: 32, frames: originalFrames,
    activeFrameIndex: 0, activeLayerId: originalFrames[0].layers[0].id });
  expect(useStudioStore.getState().frames[0].layers.some(l => l.id === removedId)).toBe(false);
  expect(hasBuffer(removedId)).toBe(true);
});

it('A4: clip selection changes the active frame without changing the active layer', () => {
  useStudioStore.getState().addFrame();
  useStudioStore.getState().addClip('first-frame', 0, 0, '#ffffff');
  const clip = useStudioStore.getState().clips.find(c => c.name === 'first-frame')!;
  useStudioStore.getState().setActiveClipId(clip.id);
  const state = useStudioStore.getState();
  expect(state.activeFrameIndex).toBe(0);
  expect(state.frames[0].layers.some(l => l.id === state.activeLayerId)).toBe(false);
});

it('A5: merge keeps a hidden lower layer hidden despite visible upper artwork', () => {
  const lowerId = useStudioStore.getState().activeLayerId;
  useStudioStore.getState().setLayerOpacity(lowerId, 0.5);
  useStudioStore.getState().toggleLayerVisibility(lowerId);
  useStudioStore.getState().addLayer('visible upper');
  const upperId = useStudioStore.getState().activeLayerId;
  getOrCreateBuffer(upperId, 32, 32).ctx.fillRect(0, 0, 1, 1);
  useStudioStore.getState().mergeLayerDown(upperId);
  const remaining = useStudioStore.getState().frames[0].layers[0];
  expect(remaining.visible).toBe(false);
  expect(remaining.opacity).toBe(0.5);
});

it('A6: an opaque pixel at palette index 255 disappears in loop export', () => {
  const source = document.createElement('canvas');
  source.width = 1;
  source.height = 1;
  const ctx = source.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 1, 1);
  const palette = Array.from({ length: 256 }, (_, i) => `#${i.toString(16).padStart(2, '0').repeat(3)}`);
  // API updated in Phase 2; the archived bad-alpha assertion below remains historical.
  expect(buildCanvasPaletteIndexMap(ctx, 1, 1, palette).indices[0]).toBe(255);
  const [loopFrame] = generateLoopAnimationCanvases(source, palette, [], 1, 1);
  expect(loopFrame.getContext('2d')!.getImageData(0, 0, 1, 1).data[3]).toBe(0);
});

it('A7: the bridge accepts incoming structure even while its role is host', () => {
  const bridge = new CoDrawBridge();
  const internal = bridge as unknown as { role: 'host'; adoptStructure(p: StructurePayload): void };
  internal.role = 'host';
  const payload: StructurePayload = {
    width: 16, height: 16,
    frames: [{ id: 'remote-frame', durationMs: 100, layers: [{ id: 'remote-layer', name: 'remote',
      visible: true, locked: false, opacity: 1, blendMode: 'source-over' }] }],
  };
  internal.adoptStructure(payload);
  expect(useStudioStore.getState().frames[0].id).toBe('remote-frame');
  expect(useStudioStore.getState().canvasWidth).toBe(16);
});

it('A8: an aborted operation still runs when worker construction falls back', async () => {
  _setWorkerFactoryForTesting(() => { throw new Error('worker blocked'); });
  const controller = new AbortController();
  controller.abort();
  const output = await runRotSpriteInWorker({ width: 1, height: 1, data: new Uint8ClampedArray([255, 0, 0, 255]) },
    0, undefined, undefined, undefined, undefined, { signal: controller.signal });
  expect(output.data[3]).toBe(255);
});

it('A9: a rejected in-between frame insertion clears artwork in the existing frame', async () => {
  _setWorkerFactoryForTesting(() => { throw new Error('worker blocked'); });
  useStudioStore.getState().addLayer('upper artwork');
  const initial = useStudioStore.getState();
  const firstFrame = structuredClone(initial.frames[0]);
  const upperId = initial.activeLayerId;
  const upper = getOrCreateBuffer(upperId, 32, 32);
  upper.ctx.fillStyle = '#ff0000';
  upper.ctx.fillRect(0, 0, 1, 1);
  useStudioStore.setState({ frames: [firstFrame, ...Array.from({ length: 499 }, (_, i) => ({
    id: `frame-cap-${i}`, durationMs: 100,
    layers: [{ ...firstFrame.layers[0], id: `layer-cap-${i}` }],
  }))] });
  const render = vi.fn();
  renderHook(() => useArtisanEvents({
    canvasWidth: 32, canvasHeight: 32, activeLayerId: upperId,
    getOrCreateLayerCanvas: id => getOrCreateBuffer(id, 32, 32).canvas,
    renderComposite: render, captureSnapshot: vi.fn(), commitSnapshot: vi.fn(),
    bumpBufferVersion: vi.fn(), compositeSourceSnapshot: () => null, updateTaggedLayer: vi.fn(),
  }));
  expect(upper.ctx.getImageData(0, 0, 1, 1).data[3]).toBe(255);
  await act(async () => {
    studioEvents.emit('pixibun:in-between-frame');
    await vi.waitFor(() => expect(render).toHaveBeenCalled());
  });
  expect(useStudioStore.getState().frames).toHaveLength(500);
  expect(useStudioStore.getState().frames[0].id).toBe(firstFrame.id);
  expect(upper.ctx.getImageData(0, 0, 1, 1).data[3]).toBe(0);
});

it('A10: unavailable MediaRecorder produces a four-byte mock video in production code', async () => {
  vi.stubGlobal('MediaRecorder', undefined);
  const frame = document.createElement('canvas');
  frame.width = frame.height = 1;
  const blob = await exportAnimationToWebmAsync([frame], { scale: 1 });
  expect(blob.type).toBe('video/webm');
  expect(blob.size).toBe(4);
});

it('A11: GIF worker failure falls back with detached frame buffers', async () => {
  let detached: Uint8ClampedArray | undefined;
  class FailingWorker {
    onmessage: unknown;
    onerror: ((error: Error) => void) | null = null;
    terminate() {}
    postMessage(message: { frames: { data: Uint8ClampedArray }[] }, transfer: Transferable[]) {
      detached = message.frames[0].data;
      structuredClone(message, { transfer });
      queueMicrotask(() => this.onerror?.(new Error('worker crashed after transfer')));
    }
  }
  vi.stubGlobal('Worker', FailingWorker);
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  const frame = document.createElement('canvas');
  frame.width = frame.height = 1;
  frame.getContext('2d')!.fillStyle = '#ff0000';
  frame.getContext('2d')!.fillRect(0, 0, 1, 1);
  const expected = encodeGifRawFrames([{ width: 1, height: 1, data: new Uint8ClampedArray([255, 0, 0, 255]) }], 8);
  const blob = await createAnimatedGifBlobAsync([frame], 8);
  expect(detached?.byteLength).toBe(0);
  expect(new Uint8Array(await blob.arrayBuffer())).not.toEqual(expected);
});
