// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useViewportSelection } from '@/hooks/viewport/useViewportSelection';
import { useViewportSelectionTransform } from '@/hooks/viewport/useViewportSelectionTransform';
import { useStudioStore } from '@/stores/studioStore';
import { makeCanvas } from './helpers/mockCanvas';

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
    return makeCanvas(this.width || 32, this.height || 32).getContext('2d');
  });
  useStudioStore.getState().resetToNewProject();
  useStudioStore.getState().setSelection({ x: 3, y: 4, w: 2, h: 2 });
});
afterEach(() => { cleanup(); document.body.replaceChildren(); vi.restoreAllMocks(); });

function setup() {
  const layerId = useStudioStore.getState().activeLayerId;
  const canvas = makeCanvas(32, 32); const capture = vi.fn(); const commit = vi.fn(); const render = vi.fn();
  const { result } = renderHook(() => {
    const selection = useStudioStore(state => state.selection);
    const selected = useViewportSelection({
      canvasWidth: 32, canvasHeight: 32, activeLayerId: layerId,
      previewCanvasRef: { current: canvas }, getOrCreateLayerCanvas: () => canvas,
      renderComposite: render, captureSnapshot: capture, commitSnapshot: commit, ownsTransformShortcuts: false,
    });
    const transformed = useViewportSelectionTransform({
      canvasWidth: 32, canvasHeight: 32, activeLayerId: layerId, selection, selectionMask: null,
      floatingSelection: selected.floatingSelection, setFloatingSelection: selected.setFloatingSelection,
      setSelection: useStudioStore.getState().setSelection, getOrCreateLayerCanvas: () => canvas,
      renderComposite: render, captureSnapshot: capture, commitSnapshot: commit, bumpBufferVersion: vi.fn(),
      liftSelectionToFloating: selected.liftSelectionToFloating, commitFloatingSelection: selected.commitFloatingSelection,
    });
    return { ...selected, ...transformed };
  });
  act(() => { result.current.setFloatingSelection({ canvas: makeCanvas(2, 2), x: 3, y: 4, w: 2, h: 2 }); });
  capture.mockClear(); commit.mockClear(); render.mockClear();
  return { result, capture, commit, render };
}
function press(key: string, target: EventTarget = window, init: KeyboardEventInit = {}) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
  act(() => { target.dispatchEvent(event); });
}

describe('Selection keyboard boundaries with both viewport hooks mounted', () => {
  it('initializes pasted transform bounds and pivot after the source marquee is cancelled', () => {
    const { result, capture, commit } = setup();
    press('c', window, { ctrlKey: true, code: 'KeyC' }); press('Escape');
    expect(result.current.floatingSelection).toBeNull();
    press('v', window, { ctrlKey: true, code: 'KeyV' });
    expect(result.current.floatingSelection).toMatchObject({ x: 15, y: 15, w: 2, h: 2 });
    expect(result.current.transform).toMatchObject({ x: 15, y: 15, w: 2, h: 2, pivot: { x: 16, y: 16 }, rotation: 0, scaleX: 1, scaleY: 1 });
    expect(capture).not.toHaveBeenCalled(); expect(commit).not.toHaveBeenCalled();
  });

  it.each(['Delete', 'Enter', 'Escape', 'ArrowRight', 'h', 'v'])('preserves selection and history for %s behind a dialog', key => {
    const { result, capture, commit, render } = setup();
    const before = result.current.floatingSelection; const transform = result.current.transform;
    const dialog = document.createElement('dialog'); dialog.setAttribute('open', ''); document.body.append(dialog);
    press(key);
    expect(result.current.floatingSelection).toBe(before); expect(result.current.transform).toBe(transform);
    expect(useStudioStore.getState().selection).toEqual({ x: 3, y: 4, w: 2, h: 2 });
    expect(capture).not.toHaveBeenCalled(); expect(commit).not.toHaveBeenCalled(); expect(render).not.toHaveBeenCalled();
  });

  it('nudges once with a consistent transform position and pivot', () => {
    const { result } = setup(); const pivot = result.current.transform.pivot;
    press('ArrowRight');
    expect(result.current.floatingSelection?.x).toBe(4); expect(result.current.transform.x).toBe(4);
    expect(result.current.transform.pivot.x).toBe(pivot.x + 1);
    press('ArrowDown', window, { shiftKey: true });
    expect(result.current.floatingSelection?.y).toBe(14); expect(result.current.transform.y).toBe(14);
  });

  it('cancels without committing the floating selection first', () => {
    const { result, capture, commit } = setup(); press('Escape');
    expect(result.current.floatingSelection).toBeNull(); expect(useStudioStore.getState().selection).toBeNull();
    expect(capture).not.toHaveBeenCalled(); expect(commit).not.toHaveBeenCalled();
  });

  it('leaves Enter and arrows on buttons to native control activation', () => {
    const { result, commit } = setup(); const before = result.current.floatingSelection;
    const button = document.createElement('button'); document.body.append(button); button.focus();
    press('Enter', button); press('ArrowRight', button);
    expect(result.current.floatingSelection).toBe(before); expect(commit).not.toHaveBeenCalled();
  });

  it('leaves editable and pre-handled navigation unchanged', () => {
    const { result } = setup(); const before = result.current.floatingSelection;
    const editor = document.createElement('div'); editor.setAttribute('contenteditable', 'true'); document.body.append(editor);
    press('Delete', editor);
    const event = new KeyboardEvent('keydown', { key: 'ArrowRight', cancelable: true }); event.preventDefault();
    act(() => { window.dispatchEvent(event); });
    expect(result.current.floatingSelection).toBe(before);
  });

  it('does not consume Shift+H/V as a selection flip', () => {
    const { result } = setup(); const before = result.current.floatingSelection;
    press('h', window, { code: 'KeyH', shiftKey: true }); press('v', window, { code: 'KeyV', shiftKey: true });
    expect(result.current.floatingSelection).toBe(before);
  });
});
