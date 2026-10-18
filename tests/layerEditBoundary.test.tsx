// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { CenterViewport } from '@/components/layout/CenterViewport';
import { useStudioStore } from '@/stores/studioStore';
import { clearAllBuffers, getOrCreateBuffer } from '@/lib/engine/bufferRegistry';
import { studioEvents } from '@/lib/events/studioEvents';
import { HIDDEN_LAYER_MESSAGE, LOCKED_LAYER_MESSAGE } from '@/lib/canvas/layerEditGuard';
import type { ToolType } from '@/types/tools';
import { makeCanvas } from './helpers/mockCanvas';

// Canvas edits change only a visible, unlocked layer: strokes, curves and the
// selection's Cut, Delete, move and paste. Regressions for the 17 October
// audit triage (docs/releases/2026-10-18-audit-triage.md).

describe('canvas edits respect hidden and locked layers', () => {
  beforeEach(() => {
    const canvases = new WeakMap<HTMLCanvasElement, ReturnType<typeof makeCanvas>>();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      let canvas = canvases.get(this);
      if (!canvas || canvas.width !== this.width || canvas.height !== this.height) {
        canvas = makeCanvas(this.width || 32, this.height || 32);
        canvases.set(this, canvas);
        Object.defineProperty(this, '_imageData', { configurable: true, get: () => canvases.get(this)?._imageData });
      }
      return canvas.getContext('2d');
    });
    vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue({
      left: 0, top: 0, right: 320, bottom: 320, width: 320, height: 320,
      x: 0, y: 0, toJSON: () => ({}),
    } as DOMRect);
    vi.stubGlobal('ImageData', class {
      data: Uint8ClampedArray;
      width: number;
      height: number;
      constructor(data: Uint8ClampedArray, width: number, height: number) {
        this.data = data; this.width = width; this.height = height;
      }
    });
    HTMLElement.prototype.setPointerCapture = vi.fn();
    HTMLElement.prototype.releasePointerCapture = vi.fn();
    clearAllBuffers();
    useStudioStore.getState().resetToNewProject();
    studioEvents.emit('pixibun:history-clear');
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    clearAllBuffers();
  });

  function mount(tool: ToolType, layer: { locked?: boolean; visible?: boolean }) {
    const state = useStudioStore.getState();
    useStudioStore.setState({
      tools: { ...state.tools, activeTool: tool },
      frames: state.frames.map(frame => ({ ...frame, layers: frame.layers.map(item => ({ ...item, ...layer })) })),
    });
    const { container } = render(<CenterViewport />);
    const current = useStudioStore.getState();
    const { canvas: buffer, ctx } = getOrCreateBuffer(current.activeLayerId, current.canvasWidth, current.canvasHeight);
    ctx.fillStyle = '#3a2e4c';
    ctx.fillRect(0, 0, buffer.width, buffer.height);
    const read = () => new Uint8ClampedArray(ctx.getImageData(0, 0, buffer.width, buffer.height).data);
    const before = read();
    const toast = vi.fn();
    const unsubscribe = studioEvents.on('pixibun:toast', toast);
    const main = container.querySelector('main')!;
    const pointer = (...types: string[]) => act(() => {
      for (const type of types) {
        main.dispatchEvent(new PointerEvent(type, { clientX: 100, clientY: 100, button: 0, pointerId: 1, bubbles: true }));
      }
    });
    const key = (keyName: string, init: KeyboardEventInit = {}) => act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: keyName, bubbles: true, cancelable: true, ...init }));
    });
    const selectAll = () => act(() => {
      useStudioStore.getState().setSelection({ x: 0, y: 0, w: buffer.width, h: buffer.height }, null);
    });
    return { before, read, toast, pointer, key, selectAll, unsubscribe };
  }

  const toasted = (toast: ReturnType<typeof vi.fn>, message: string) =>
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ type: 'error', message }));

  it.each(['pen', 'eraser', 'line', 'rectangle', 'bucket'] as const)('refuses %s on a hidden layer without pixels or history', tool => {
    // A colour unlike the layer's, so any change would show in its pixels.
    useStudioStore.getState().setPrimaryColor('#ffffff');
    const view = mount(tool, { visible: false });
    view.pointer('pointerdown', 'pointerup');
    expect(view.read()).toEqual(view.before);
    expect(useStudioStore.getState().canUndo).toBe(false);
    toasted(view.toast, HIDDEN_LAYER_MESSAGE);
    view.unsubscribe();
  });

  it('refuses to start a curve on a hidden layer', () => {
    const view = mount('curve', { visible: false });
    view.pointer('pointerdown', 'pointerup');
    view.key('Enter');
    expect(view.read()).toEqual(view.before);
    expect(useStudioStore.getState().canUndo).toBe(false);
    toasted(view.toast, HIDDEN_LAYER_MESSAGE);
    view.unsubscribe();
  });

  it('still paints an undoable stroke on a visible, unlocked layer', () => {
    useStudioStore.getState().setPrimaryColor('#ffffff');
    const view = mount('pen', {});
    view.pointer('pointerdown', 'pointerup');
    expect(view.read()).not.toEqual(view.before);
    expect(useStudioStore.getState().canUndo).toBe(true);
    expect(view.toast).not.toHaveBeenCalled();
    view.unsubscribe();
  });

  it.each([
    ['locked', { locked: true }, LOCKED_LAYER_MESSAGE],
    ['hidden', { visible: false }, HIDDEN_LAYER_MESSAGE],
  ] as const)('keeps a %s layer\'s selected pixels through Delete, Cut and a move drag', (_name, layer, message) => {
    const view = mount('select-box', layer);
    view.selectAll();

    view.key('Delete');
    view.key('x', { ctrlKey: true });
    expect(useStudioStore.getState().selection).not.toBeNull();
    view.pointer('pointerdown', 'pointermove', 'pointerup');

    expect(view.read()).toEqual(view.before);
    expect(useStudioStore.getState().canUndo).toBe(false);
    expect(useStudioStore.getState().hasFloatingSelection).toBe(false);
    toasted(view.toast, message);
    view.unsubscribe();
  });

  it('refuses to paste onto a layer that was locked after copying', () => {
    const view = mount('select-box', {});
    view.selectAll();
    view.key('c', { ctrlKey: true });
    act(() => {
      const state = useStudioStore.getState();
      state.toggleLayerLock(state.activeLayerId);
    });
    view.key('v', { ctrlKey: true });
    expect(useStudioStore.getState().hasFloatingSelection).toBe(false);
    expect(view.read()).toEqual(view.before);
    toasted(view.toast, LOCKED_LAYER_MESSAGE);
    view.unsubscribe();
  });

  it('still deletes selected pixels from an editable layer as one Undo step', () => {
    const view = mount('select-box', {});
    view.selectAll();
    view.key('Delete');
    expect(view.read().every(value => value === 0)).toBe(true);
    expect(useStudioStore.getState().canUndo).toBe(true);
    act(() => { studioEvents.emit('pixibun:undo'); });
    expect(view.read()).toEqual(view.before);
    expect(view.toast).not.toHaveBeenCalled();
    view.unsubscribe();
  });
});
