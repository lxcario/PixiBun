// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeCanvas } from './helpers/mockCanvas';
import { useStudioStore } from '@/stores/studioStore';
import { clearAllBuffers, getBufferRegistryUsage, getOrCreateBuffer, snapshotBuffers } from '@/lib/engine/bufferRegistry';
import { restoreStructuralWorkspace } from '@/lib/engine/structuralHistory';
import { useViewportDrawing } from '@/hooks/viewport/useViewportDrawing';
import { coDrawBridge, CoDrawBridge } from '@/lib/sync/coDrawBridge';
import { P2PSyncSession, type StructurePayload } from '@/lib/sync/p2pSync';
import { CrdtPixelBuffer, type PixelOp } from '@/lib/collab/crdtPixelBuffer';
import { buildCanvasPaletteIndexMap, generateLoopAnimationCanvases } from '@/lib/export/shaderExporter';

beforeEach(() => {
  const contexts = new WeakMap<HTMLCanvasElement, CanvasRenderingContext2D>();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
    let ctx = contexts.get(this);
    if (!ctx) {
      const mock = makeCanvas(this.width || 32, this.height || 32);
      ctx = mock.getContext('2d')!; contexts.set(this, ctx);
      Object.defineProperty(this, '_imageData', { configurable: true, get: () => mock._imageData });
    }
    return ctx;
  });
  clearAllBuffers();
  useStudioStore.getState().resetToNewProject();
});
afterEach(() => { coDrawBridge.disconnect(); cleanup(); clearAllBuffers(); vi.restoreAllMocks(); });
const raster = (id: string) => getOrCreateBuffer(id, 32, 32);
const pixels = (id: string) => Array.from(raster(id).ctx.getImageData(0, 0, 32, 32).data);
const drawing = () => renderHook(() => useViewportDrawing({ canvasWidth: 32, canvasHeight: 32,
  getOrCreateLayerCanvas: id => raster(id).canvas, renderComposite: vi.fn() }));

describe('live raster ownership', () => {
  it('releases orphan buffers across repeated undo/branch cycles and retains redo pixels', () => {
    const hook = drawing();
    const base = useStudioStore.getState().activeLayerId;
    raster(base).ctx.fillStyle = '#ff0000'; raster(base).ctx.fillRect(1, 1, 1, 1);
    const expected = pixels(base);
    for (let n = 0; n < 12; n++) {
      act(() => useStudioStore.getState().duplicateFrame(0));
      const copy = useStudioStore.getState().activeLayerId;
      expect(pixels(copy)).toEqual(expected);
      act(() => hook.result.current.performUndo());
      expect(getBufferRegistryUsage()).toEqual({ count: 1, bytes: 32 * 32 * 4 });
      expect(snapshotBuffers().has(copy)).toBe(false);
      act(() => hook.result.current.performRedo());
      expect(pixels(copy)).toEqual(expected);
      act(() => hook.result.current.performUndo());
      // The next duplicate branches history; abandoned redo canvases stay absent.
    }
    expect(pixels(base)).toEqual(expected);
  });
  it('stages restored pixels before metadata publication and leaves originals intact on staging failure', () => {
    const state = useStudioStore.getState(); const id = state.activeLayerId;
    raster(id);
    const before = snapshotBuffers();
    const backup = raster(id).ctx.createImageData(32, 32); backup.data[3] = 255;
    const observed: number[] = [];
    const unsubscribe = useStudioStore.subscribe(() => observed.push(pixels(id)[3]));
    restoreStructuralWorkspace({ canvasWidth: 32, canvasHeight: 32, frames: structuredClone(state.frames),
      activeFrameIndex: 0, activeLayerId: id, layerBuffers: [{ layerId: id, imageData: backup }] });
    unsubscribe();
    expect(observed).toEqual([255]);
    expect(snapshotBuffers().get(id)).not.toBe(before.get(id));
    const restored = snapshotBuffers();
    vi.mocked(HTMLCanvasElement.prototype.getContext).mockImplementationOnce(() => null);
    expect(() => restoreStructuralWorkspace({ canvasWidth: 64, canvasHeight: 64,
      frames: state.frames, activeFrameIndex: 0, activeLayerId: id })).toThrow();
    expect(snapshotBuffers()).toEqual(restored);
    expect(useStudioStore.getState().canvasWidth).toBe(32);
  });
});

describe('indexed palette alpha', () => {
  it.each([1, 255, 256])('round-trips every register in a %i-color palette', count => {
    const palette = Array.from({ length: count }, (_, i) => '#' + i.toString(16).padStart(2, '0').repeat(3));
    const source = document.createElement('canvas'); source.width = count; source.height = 1;
    const ctx = source.getContext('2d')!; const image = ctx.createImageData(count, 1);
    for (let i = 0; i < count; i++) image.data.set([i, i, i, 255], i * 4);
    ctx.putImageData(image, 0, 0);
    const map = buildCanvasPaletteIndexMap(ctx, count, 1, palette);
    expect(Array.from(map.indices)).toEqual(Array.from({ length: count }, (_, i) => i));
    const output = generateLoopAnimationCanvases(source, palette, [], 1, 1)[0];
    expect(Array.from(output.getContext('2d')!.getImageData(0, 0, count, 1).data)).toEqual(Array.from(image.data));
  });
  it('keeps alpha independent of duplicated colors and selects the first equal RGB register', () => {
    const source = document.createElement('canvas'); source.width = 5; source.height = 1;
    const ctx = source.getContext('2d')!; const image = ctx.createImageData(5, 1);
    const alpha = [0, 1, 29, 128, 255]; alpha.forEach((a, i) => image.data.set([255, 0, 0, a], i * 4));
    ctx.putImageData(image, 0, 0);
    const map = buildCanvasPaletteIndexMap(ctx, 5, 1, ['#ff0000', '#ff0000']);
    expect(Array.from(map.indices)).toEqual([0, 0, 0, 0, 0]);
    expect(Array.from(map.alpha)).toEqual(alpha);
    const output = generateLoopAnimationCanvases(source, ['#ff0000', '#ff0000'], [], 1, 1)[0].getContext('2d')!.getImageData(0, 0, 5, 1).data;
    expect(alpha.map((_, i) => output[i * 4 + 3])).toEqual(alpha);
    expect(() => buildCanvasPaletteIndexMap(ctx, 5, 1, [])).toThrow();
    expect(() => buildCanvasPaletteIndexMap(ctx, 5, 1, Array(257).fill('#ffffff'))).toThrow();
  });
});

it('ignores callbacks retained from a disconnected session generation', () => {
  const bridge = new CoDrawBridge();
  const internal = bridge as unknown as { role: string; createSession(options: object): P2PSyncSession };
  internal.role = 'guest';
  const session = internal.createSession({});
  const callbacks = (session as unknown as { options: { onStructureSync(p: StructurePayload): void } }).options;
  bridge.disconnect(); internal.role = 'guest';
  const before = useStudioStore.getState();
  callbacks.onStructureSync({ width: 32, height: 32, frames: [{ ...before.frames[0], id: 'stale-frame' }] });
  expect(useStudioStore.getState().frames).toBe(before.frames);
  expect(useStudioStore.getState().bufferVersion).toBe(before.bufferVersion);
  bridge.disconnect();
});

it('stages guest artwork before publishing structure and refuses failed preparation without data loss', () => {
  const bridge = new CoDrawBridge();
  const internal = bridge as unknown as { role: string; crdtBuffers: Map<string, CrdtPixelBuffer>; adoptStructure(p: StructurePayload): void };
  internal.role = 'guest';
  const state = useStudioStore.getState(); const id = state.activeLayerId;
  raster(id).ctx.fillStyle = '#ff0000'; raster(id).ctx.fillRect(0, 0, 1, 1);
  const before = pixels(id); const entries = snapshotBuffers();
  const replica = new CrdtPixelBuffer(32, 32, 'host'); replica.setPixel(0, 0, [0, 0, 255, 255]);
  internal.crdtBuffers.set(id, replica);
  const payload = { width: 32, height: 32, frames: structuredClone(state.frames) };
  vi.mocked(HTMLCanvasElement.prototype.getContext).mockImplementationOnce(() => null);
  internal.adoptStructure(payload);
  expect(pixels(id)).toEqual(before); expect(snapshotBuffers()).toEqual(entries);
  expect(useStudioStore.getState().frames).toBe(state.frames);
  expect(internal.crdtBuffers.get(id)).toBe(replica);
  const observed: number[] = []; const unsubscribe = useStudioStore.subscribe(() => observed.push(pixels(id)[2]));
  internal.adoptStructure(payload); unsubscribe();
  expect(observed).toEqual([255]);
  expect(pixels(id)).toEqual(Array.from(replica.toRgbaArray()));
  bridge.disconnect();
});

it('propagates actual pixel undo/redo and merge restoration through the wire receiver', () => {
  const hook = drawing();
  const replicas = new Map<string, CrdtPixelBuffer>();
  let structure: StructurePayload;
  const apply = (ops: PixelOp[], id?: string) => { if (id) ops.forEach(op => replicas.get(id)?.applyRemoteOp(op)); };
  const receiver = new P2PSyncSession({ peerId: 'guest', onRemotePixelOps: apply, onInitialSync: apply,
    onStructureSync: payload => {
      structure = payload;
      const ids = new Set(payload.frames.flatMap(frame => frame.layers.map(layer => layer.id)));
      for (const id of replicas.keys()) if (!ids.has(id)) replicas.delete(id);
      for (const id of ids) if (!replicas.has(id)) replicas.set(id, new CrdtPixelBuffer(payload.width, payload.height, 'guest'));
    } });
  const channel = { label: 'pixibun-crdt-sync', readyState: 'open', bufferedAmount: 0, send: vi.fn(), close: vi.fn(),
    onmessage: null as ((event: { data: string }) => void) | null };
  (receiver as unknown as { setupChannel(c: RTCDataChannel): void }).setupChannel(channel as unknown as RTCDataChannel);
  const send = (type: string, payload: object) => { channel.onmessage!({ data: JSON.stringify({ type, peerId: 'host', ...payload }) }); return true; };
  const session = { getState: () => 'connected', disconnect: vi.fn(),
    broadcastStructure: (frames: StructurePayload) => send('STRUCTURE_SYNC', { frames }),
    broadcastInitialSync: (ops: PixelOp[], layerId: string) => send('INITIAL_SYNC', { ops, layerId }),
    broadcastPixelOps: (ops: PixelOp[], layerId: string) => send('PIXEL_OPS', { ops, layerId }) };
  const bridge = coDrawBridge as unknown as { role: string; session: unknown; sendStructureAndSnapshots(): boolean; subscribeToStructureChanges(): void };
  bridge.role = 'host'; bridge.session = session;
  expect(bridge.sendStructureAndSnapshots()).toBe(true); bridge.subscribeToStructureChanges();
  const lower = useStudioStore.getState().activeLayerId;
  const paint = (id: string, color: string, x: number) => act(() => {
    hook.result.current.captureSnapshot('test stroke', id);
    raster(id).ctx.fillStyle = color; raster(id).ctx.fillRect(x, 1, 1, 1);
    hook.result.current.commitSnapshot();
  });
  const equal = () => {
    expect(structure!.frames.map(f => f.layers.map(l => l.id))).toEqual(useStudioStore.getState().frames.map(f => f.layers.map(l => l.id)));
    for (const [id, replica] of replicas) expect(Array.from(replica.toRgbaArray())).toEqual(pixels(id));
  };
  paint(lower, '#ff0000', 1); equal();
  act(() => hook.result.current.performUndo()); equal();
  act(() => hook.result.current.performRedo()); equal();
  act(() => useStudioStore.getState().addLayer('Upper'));
  const upper = useStudioStore.getState().activeLayerId;
  paint(upper, '#0000ff', 2); equal();
  act(() => useStudioStore.getState().mergeLayerDown(upper)); equal();
  expect(replicas.has(upper)).toBe(false);
  act(() => hook.result.current.performUndo()); equal();
  expect(replicas.has(upper)).toBe(true);
  act(() => hook.result.current.performRedo()); equal();
  expect(replicas.has(upper)).toBe(false);
  receiver.disconnect();
});
