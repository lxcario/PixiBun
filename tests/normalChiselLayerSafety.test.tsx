// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { CenterViewport } from '@/components/layout/CenterViewport';
import { useStudioStore } from '@/stores/studioStore';
import { clearAllBuffers, getOrCreateBuffer } from '@/lib/engine/bufferRegistry';
import { studioEvents } from '@/lib/events/studioEvents';
import { makeCanvas } from './helpers/mockCanvas';

describe('Normal Chisel keeps surface directions out of color artwork', () => {
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

  function stroke(tag?: string, locked = false) {
    const state = useStudioStore.getState();
    useStudioStore.setState({
      tools: { ...state.tools, activeTool: 'normal-chisel' },
      frames: state.frames.map(frame => ({ ...frame, layers: frame.layers.map(layer => ({ ...layer, tag, locked })) })),
    });
    const { container } = render(<CenterViewport />);
    const current = useStudioStore.getState();
    const { canvas: buffer, ctx } = getOrCreateBuffer(current.activeLayerId, current.canvasWidth, current.canvasHeight);
    ctx.fillStyle = '#f3e8f6';
    ctx.fillRect(0, 0, buffer.width, buffer.height);
    const before = new Uint8ClampedArray(ctx.getImageData(0, 0, buffer.width, buffer.height).data);
    const toast = vi.fn();
    const unsubscribe = studioEvents.on('pixibun:toast', toast);
    const main = container.querySelector('main')!;
    act(() => {
      for (const type of ['pointerdown', 'pointerup']) {
        main.dispatchEvent(new PointerEvent(type, { clientX: 100, clientY: 100, button: 0, pointerId: 1, bubbles: true }));
      }
    });
    const after = new Uint8ClampedArray(ctx.getImageData(0, 0, buffer.width, buffer.height).data);
    unsubscribe();
    const readPixels = () => {
      const s = useStudioStore.getState();
      return new Uint8ClampedArray(getOrCreateBuffer(s.activeLayerId, s.canvasWidth, s.canvasHeight).ctx.getImageData(0, 0, s.canvasWidth, s.canvasHeight).data);
    };
    return { before, after, toast, readPixels };
  }

  it('refuses a toolbar chisel press on an ordinary color layer without touching pixels or history', () => {
    const { before, after, toast } = stroke();
    expect(after).toEqual(before);
    expect(useStudioStore.getState().canUndo).toBe(false);
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ message: 'Create or select an unlocked surface layer to paint raised edges.' }));
  });

  it('still commits an undoable chisel mark on an editable surface layer', () => {
    const { before, after, toast, readPixels } = stroke('normal');
    expect(after).not.toEqual(before);
    expect(useStudioStore.getState().canUndo).toBe(true);
    expect(toast).not.toHaveBeenCalled();
    act(() => { studioEvents.emit('pixibun:undo'); });
    expect(useStudioStore.getState().canRedo).toBe(true);
    expect(readPixels()).toEqual(before);
    act(() => { studioEvents.emit('pixibun:redo'); });
    expect(readPixels()).toEqual(after);
  });

  it('continues to protect a locked surface layer', () => {
    const { before, after } = stroke('normal', true);
    expect(after).toEqual(before);
    expect(useStudioStore.getState().canUndo).toBe(false);
  });
});
