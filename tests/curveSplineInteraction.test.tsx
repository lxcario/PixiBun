// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { useCurvePointerHandler } from '@/hooks/viewport/useCurvePointerHandler';
import { useStudioStore } from '@/stores/studioStore';
import type { Point } from '@/lib/canvas/rasterMath';

describe('Interactive Curve / Spline Pointer Handler', () => {
  let mockDrawPoints = vi.fn<(points: Point[], color: string, isErase: boolean) => void>();
  let mockCaptureSnapshot = vi.fn<(desc: string) => void>();
  let mockCommitSnapshot = vi.fn<() => void>();
  let mockDiscardSnapshot = vi.fn<() => void>();
  let mockPerformUndo = vi.fn<() => void>();
  let mockRenderComposite = vi.fn<() => void>();
  let previewCanvas: HTMLCanvasElement;

  beforeEach(() => {
    mockDrawPoints = vi.fn<(points: Point[], color: string, isErase: boolean) => void>();
    mockCaptureSnapshot = vi.fn<(desc: string) => void>();
    mockCommitSnapshot = vi.fn<() => void>();
    mockDiscardSnapshot = vi.fn<() => void>();
    mockPerformUndo = vi.fn<() => void>();
    mockRenderComposite = vi.fn<() => void>();

    previewCanvas = document.createElement('canvas');
    previewCanvas.width = 64;
    previewCanvas.height = 64;

    useStudioStore.setState((state) => {
      state.tools.activeTool = 'curve';
      state.tools.brushSize = 1;
      state.tools.curveTightness = 0.5;
      state.primaryColor = '#ff0055';
      state.secondaryColor = '#00ffff';
      state.zoom = 100;
      state.activeFrameIndex = 0;
      state.frames = [
        {
          id: 'frame-1',
          durationMs: 100,
          layers: [{ id: 'layer-1', name: 'Layer 1', visible: true, locked: false, opacity: 1, blendMode: 'source-over' }],
        },
      ];
      state.activeLayerId = 'layer-1';
      return state;
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  const createPointerEvent = (props: Partial<React.PointerEvent> = {}): React.PointerEvent =>
    ({
      button: 0,
      shiftKey: false,
      altKey: false,
      ctrlKey: false,
      metaKey: false,
      clientX: 0,
      clientY: 0,
      ...props,
    } as unknown as React.PointerEvent);

  it('starts in idle mode with isAdjusting false', () => {
    const previewCanvasRef = { current: previewCanvas };
    const { result } = renderHook(() =>
      useCurvePointerHandler({
        canvasWidth: 64,
        canvasHeight: 64,
        previewCanvasRef,
        drawPointsOnActiveLayer: mockDrawPoints,
        captureSnapshot: mockCaptureSnapshot,
        commitSnapshot: mockCommitSnapshot,
        discardSnapshot: mockDiscardSnapshot,
        renderComposite: mockRenderComposite,
      })
    );

    expect(result.current.isAdjusting).toBe(false);
  });

  it('enters drafting mode on pointer down and transitions to adjusting mode on release', () => {
    const previewCanvasRef = { current: previewCanvas };
    const { result } = renderHook(() =>
      useCurvePointerHandler({
        canvasWidth: 64,
        canvasHeight: 64,
        previewCanvasRef,
        drawPointsOnActiveLayer: mockDrawPoints,
        captureSnapshot: mockCaptureSnapshot,
        commitSnapshot: mockCommitSnapshot,
        discardSnapshot: mockDiscardSnapshot,
        renderComposite: mockRenderComposite,
      })
    );

    const startPt: Point = { x: 10, y: 30 };
    const endPt: Point = { x: 50, y: 30 };

    act(() => {
      const handledDown = result.current.onPointerDown(createPointerEvent(), startPt);
      expect(handledDown).toBe(true);
    });

    expect(result.current.isAdjusting).toBe(false);

    act(() => {
      const handledMove = result.current.onPointerMove(createPointerEvent(), endPt);
      expect(handledMove).toBe(true);
    });

    act(() => {
      const handledUp = result.current.onPointerUp(createPointerEvent(), endPt);
      expect(handledUp).toBe(true);
    });

    // After releasing baseline, transitions to adjusting mode!
    expect(result.current.isAdjusting).toBe(true);
    expect(mockCaptureSnapshot).toHaveBeenCalledWith('Bézier Curve');
    expect(mockDrawPoints).not.toHaveBeenCalled(); // Not committed yet
  });

  it('allows dragging the control handle to bend the curve and commits on Enter', () => {
    const previewCanvasRef = { current: previewCanvas };
    const { result } = renderHook(() =>
      useCurvePointerHandler({
        canvasWidth: 64,
        canvasHeight: 64,
        previewCanvasRef,
        drawPointsOnActiveLayer: mockDrawPoints,
        captureSnapshot: mockCaptureSnapshot,
        commitSnapshot: mockCommitSnapshot,
        discardSnapshot: mockDiscardSnapshot,
        renderComposite: mockRenderComposite,
      })
    );

    const startPt: Point = { x: 10, y: 30 };
    const endPt: Point = { x: 50, y: 30 };

    // Step 1: Draw baseline
    act(() => {
      result.current.onPointerDown(createPointerEvent(), startPt);
      result.current.onPointerMove(createPointerEvent(), endPt);
      result.current.onPointerUp(createPointerEvent(), endPt);
    });

    expect(result.current.isAdjusting).toBe(true);

    // Step 2: Grab middle control point (near midpoint x=30, y=30)
    const midHandlePt: Point = { x: 30, y: 30 };
    act(() => {
      const handledGrab = result.current.onPointerDown(createPointerEvent(), midHandlePt);
      expect(handledGrab).toBe(true);
    });

    // Drag control point upwards to bend the curve
    const bentPt: Point = { x: 30, y: 10 };
    act(() => {
      const handledDrag = result.current.onPointerMove(createPointerEvent(), bentPt);
      expect(handledDrag).toBe(true);
    });

    act(() => {
      result.current.onPointerUp(createPointerEvent(), bentPt);
    });

    // Still in adjustment mode for further precision
    expect(result.current.isAdjusting).toBe(true);

    // Commit using Enter key
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });

    expect(result.current.isAdjusting).toBe(false);
    expect(mockDrawPoints).toHaveBeenCalledTimes(1);
    expect(mockCommitSnapshot).toHaveBeenCalledTimes(1);
    expect(mockRenderComposite).toHaveBeenCalledTimes(1);

    // Check that points were drawn
    const pointsDrawn = mockDrawPoints.mock.calls[0][0] as Point[];
    expect(pointsDrawn.length).toBeGreaterThan(5);
    // Verified start and end points are included
    expect(pointsDrawn[0]).toEqual(startPt);
    expect(pointsDrawn[pointsDrawn.length - 1]).toEqual(endPt);
  });

  it('cancels without drawing on Escape key', () => {
    const previewCanvasRef = { current: previewCanvas };
    const { result } = renderHook(() =>
      useCurvePointerHandler({
        canvasWidth: 64,
        canvasHeight: 64,
        previewCanvasRef,
        drawPointsOnActiveLayer: mockDrawPoints,
        captureSnapshot: mockCaptureSnapshot,
        commitSnapshot: mockCommitSnapshot,
        discardSnapshot: mockDiscardSnapshot,
        renderComposite: mockRenderComposite,
      })
    );

    act(() => {
      result.current.onPointerDown(createPointerEvent(), { x: 10, y: 10 });
      result.current.onPointerMove(createPointerEvent(), { x: 40, y: 40 });
      result.current.onPointerUp(createPointerEvent(), { x: 40, y: 40 });
    });

    expect(result.current.isAdjusting).toBe(true);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });

    expect(result.current.isAdjusting).toBe(false);
    expect(mockDrawPoints).not.toHaveBeenCalled();
    expect(mockDiscardSnapshot).toHaveBeenCalledTimes(1);
  });

  it('clicking outside handles commits active curve and starts new curve', () => {
    const previewCanvasRef = { current: previewCanvas };
    const { result } = renderHook(() =>
      useCurvePointerHandler({
        canvasWidth: 64,
        canvasHeight: 64,
        previewCanvasRef,
        drawPointsOnActiveLayer: mockDrawPoints,
        captureSnapshot: mockCaptureSnapshot,
        commitSnapshot: mockCommitSnapshot,
        discardSnapshot: mockDiscardSnapshot,
        renderComposite: mockRenderComposite,
      })
    );

    // Draw first curve
    act(() => {
      result.current.onPointerDown(createPointerEvent(), { x: 10, y: 10 });
      result.current.onPointerMove(createPointerEvent(), { x: 20, y: 10 });
      result.current.onPointerUp(createPointerEvent(), { x: 20, y: 10 });
    });
    expect(result.current.isAdjusting).toBe(true);

    // Click far away (e.g. at x: 55, y: 55)
    act(() => {
      result.current.onPointerDown(createPointerEvent(), { x: 55, y: 55 });
    });

    // The first curve was committed
    expect(mockDrawPoints).toHaveBeenCalledTimes(1);
    expect(mockCommitSnapshot).toHaveBeenCalledTimes(1);
    // And is now drafting the next curve
    expect(result.current.isAdjusting).toBe(false);
  });

  it('auto-commits pending curve when switching active tool', () => {
    const previewCanvasRef = { current: previewCanvas };
    const { result } = renderHook(() =>
      useCurvePointerHandler({
        canvasWidth: 64,
        canvasHeight: 64,
        previewCanvasRef,
        drawPointsOnActiveLayer: mockDrawPoints,
        captureSnapshot: mockCaptureSnapshot,
        commitSnapshot: mockCommitSnapshot,
        discardSnapshot: mockDiscardSnapshot,
        renderComposite: mockRenderComposite,
      })
    );

    act(() => {
      result.current.onPointerDown(createPointerEvent(), { x: 10, y: 10 });
      result.current.onPointerMove(createPointerEvent(), { x: 30, y: 30 });
      result.current.onPointerUp(createPointerEvent(), { x: 30, y: 30 });
    });
    expect(result.current.isAdjusting).toBe(true);

    // Switch tool to pen
    act(() => {
      useStudioStore.setState((s) => {
        s.tools.activeTool = 'pen';
        return s;
      });
    });

    expect(result.current.isAdjusting).toBe(false);
    expect(mockDrawPoints).toHaveBeenCalledTimes(1);
    expect(mockCommitSnapshot).toHaveBeenCalledTimes(1);
  });

  it('allows adjusting the start endpoint and end endpoint handles', () => {
    const previewCanvasRef = { current: previewCanvas };
    const { result } = renderHook(() =>
      useCurvePointerHandler({
        canvasWidth: 64,
        canvasHeight: 64,
        previewCanvasRef,
        drawPointsOnActiveLayer: mockDrawPoints,
        captureSnapshot: mockCaptureSnapshot,
        commitSnapshot: mockCommitSnapshot,
        discardSnapshot: mockDiscardSnapshot,
        renderComposite: mockRenderComposite,
      })
    );

    // Baseline: (10, 10) to (50, 50)
    act(() => {
      result.current.onPointerDown(createPointerEvent(), { x: 10, y: 10 });
      result.current.onPointerMove(createPointerEvent(), { x: 50, y: 50 });
      result.current.onPointerUp(createPointerEvent(), { x: 50, y: 50 });
    });
    expect(result.current.isAdjusting).toBe(true);

    // Drag start handle from (10, 10) to (5, 15)
    act(() => {
      result.current.onPointerDown(createPointerEvent(), { x: 10, y: 10 });
      result.current.onPointerMove(createPointerEvent(), { x: 5, y: 15 });
      result.current.onPointerUp(createPointerEvent(), { x: 5, y: 15 });
    });

    // Drag end handle from (50, 50) to (60, 45)
    act(() => {
      result.current.onPointerDown(createPointerEvent(), { x: 50, y: 50 });
      result.current.onPointerMove(createPointerEvent(), { x: 60, y: 45 });
      result.current.onPointerUp(createPointerEvent(), { x: 60, y: 45 });
    });

    // Manual commit via apply action
    act(() => {
      result.current.commit();
    });

    expect(result.current.isAdjusting).toBe(false);
    expect(mockDrawPoints).toHaveBeenCalledTimes(1);
    const pointsDrawn = mockDrawPoints.mock.calls[0][0] as Point[];
    expect(pointsDrawn[0]).toEqual({ x: 5, y: 15 });
    expect(pointsDrawn[pointsDrawn.length - 1]).toEqual({ x: 60, y: 45 });
  });

  it('manual cancel clears adjusting mode and discards snapshot', () => {
    const previewCanvasRef = { current: previewCanvas };
    const { result } = renderHook(() =>
      useCurvePointerHandler({
        canvasWidth: 64,
        canvasHeight: 64,
        previewCanvasRef,
        drawPointsOnActiveLayer: mockDrawPoints,
        captureSnapshot: mockCaptureSnapshot,
        commitSnapshot: mockCommitSnapshot,
        discardSnapshot: mockDiscardSnapshot,
        renderComposite: mockRenderComposite,
      })
    );

    act(() => {
      result.current.onPointerDown(createPointerEvent(), { x: 10, y: 10 });
      result.current.onPointerMove(createPointerEvent(), { x: 50, y: 50 });
      result.current.onPointerUp(createPointerEvent(), { x: 50, y: 50 });
    });
    expect(result.current.isAdjusting).toBe(true);

    act(() => {
      result.current.cancel();
    });

    expect(result.current.isAdjusting).toBe(false);
    expect(mockDrawPoints).not.toHaveBeenCalled();
    expect(mockDiscardSnapshot).toHaveBeenCalledTimes(1);
  });

  it('enables re-editing after commit and restores adjusting state with performUndo', () => {
    const previewCanvasRef = { current: previewCanvas };
    const { result } = renderHook(() =>
      useCurvePointerHandler({
        canvasWidth: 64,
        canvasHeight: 64,
        previewCanvasRef,
        drawPointsOnActiveLayer: mockDrawPoints,
        captureSnapshot: mockCaptureSnapshot,
        commitSnapshot: mockCommitSnapshot,
        discardSnapshot: mockDiscardSnapshot,
        performUndo: mockPerformUndo,
        renderComposite: mockRenderComposite,
      })
    );

    // Draw baseline and commit
    act(() => {
      result.current.onPointerDown(createPointerEvent(), { x: 10, y: 10 });
      result.current.onPointerMove(createPointerEvent(), { x: 40, y: 10 });
      result.current.onPointerUp(createPointerEvent(), { x: 40, y: 10 });
    });
    expect(result.current.isAdjusting).toBe(true);
    expect(result.current.canReEdit).toBe(false);

    act(() => {
      result.current.commit();
    });
    expect(result.current.isAdjusting).toBe(false);
    expect(result.current.canReEdit).toBe(true);

    // Call reEdit()
    act(() => {
      const ok = result.current.reEdit();
      expect(ok).toBe(true);
    });

    expect(mockPerformUndo).toHaveBeenCalledTimes(1);
    expect(result.current.isAdjusting).toBe(true);
    expect(result.current.canReEdit).toBe(false);
    expect(result.current.adjustingCurve?.start).toEqual({ x: 10, y: 10 });
  });

  it('re-edits with Enter key or Ctrl+Z after commit', () => {
    const previewCanvasRef = { current: previewCanvas };
    const { result } = renderHook(() =>
      useCurvePointerHandler({
        canvasWidth: 64,
        canvasHeight: 64,
        previewCanvasRef,
        drawPointsOnActiveLayer: mockDrawPoints,
        captureSnapshot: mockCaptureSnapshot,
        commitSnapshot: mockCommitSnapshot,
        discardSnapshot: mockDiscardSnapshot,
        performUndo: mockPerformUndo,
        renderComposite: mockRenderComposite,
      })
    );

    act(() => {
      result.current.onPointerDown(createPointerEvent(), { x: 10, y: 10 });
      result.current.onPointerMove(createPointerEvent(), { x: 40, y: 10 });
      result.current.onPointerUp(createPointerEvent(), { x: 40, y: 10 });
      result.current.commit();
    });
    expect(result.current.canReEdit).toBe(true);

    // Press Enter to re-edit
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });
    expect(mockPerformUndo).toHaveBeenCalledTimes(1);
    expect(result.current.isAdjusting).toBe(true);
    expect(result.current.canReEdit).toBe(false);

    // Commit again and re-edit with Ctrl+Z
    act(() => {
      result.current.commit();
    });
    expect(result.current.canReEdit).toBe(true);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }));
    });
    expect(mockPerformUndo).toHaveBeenCalledTimes(2);
    expect(result.current.isAdjusting).toBe(true);
  });

  it('clicking on or near the committed curve automatically re-edits and grabs handle', () => {
    const previewCanvasRef = { current: previewCanvas };
    const { result } = renderHook(() =>
      useCurvePointerHandler({
        canvasWidth: 64,
        canvasHeight: 64,
        previewCanvasRef,
        drawPointsOnActiveLayer: mockDrawPoints,
        captureSnapshot: mockCaptureSnapshot,
        commitSnapshot: mockCommitSnapshot,
        discardSnapshot: mockDiscardSnapshot,
        performUndo: mockPerformUndo,
        renderComposite: mockRenderComposite,
      })
    );

    act(() => {
      result.current.onPointerDown(createPointerEvent(), { x: 10, y: 20 });
      result.current.onPointerMove(createPointerEvent(), { x: 50, y: 20 });
      result.current.onPointerUp(createPointerEvent(), { x: 50, y: 20 });
      result.current.commit();
    });
    expect(result.current.canReEdit).toBe(true);

    // Click near start handle { x: 10, y: 20 }
    act(() => {
      const handled = result.current.onPointerDown(createPointerEvent(), { x: 11, y: 20 });
      expect(handled).toBe(true);
    });

    expect(mockPerformUndo).toHaveBeenCalledTimes(1);
    expect(result.current.isAdjusting).toBe(true);
    expect(result.current.adjustingCurve?.draggingHandle).toBe('start');
  });

  it('clicking far away from committed curve dismisses re-edit and drafts new curve', () => {
    const previewCanvasRef = { current: previewCanvas };
    const { result } = renderHook(() =>
      useCurvePointerHandler({
        canvasWidth: 64,
        canvasHeight: 64,
        previewCanvasRef,
        drawPointsOnActiveLayer: mockDrawPoints,
        captureSnapshot: mockCaptureSnapshot,
        commitSnapshot: mockCommitSnapshot,
        discardSnapshot: mockDiscardSnapshot,
        performUndo: mockPerformUndo,
        renderComposite: mockRenderComposite,
      })
    );

    act(() => {
      result.current.onPointerDown(createPointerEvent(), { x: 10, y: 10 });
      result.current.onPointerMove(createPointerEvent(), { x: 20, y: 10 });
      result.current.onPointerUp(createPointerEvent(), { x: 20, y: 10 });
      result.current.commit();
    });
    expect(result.current.canReEdit).toBe(true);

    // Click far away at (50, 50)
    act(() => {
      result.current.onPointerDown(createPointerEvent(), { x: 50, y: 50 });
    });

    // Dismisses re-edit and starts drafting a new curve
    expect(result.current.canReEdit).toBe(false);
    expect(mockPerformUndo).not.toHaveBeenCalled();
    expect(result.current.isAdjusting).toBe(false);
  });
});

import { render, screen, fireEvent } from '@testing-library/react';
import { CenterViewport } from '@/components/layout/CenterViewport';
import { makeCanvas } from './helpers/mockCanvas';
import { clearAllBuffers, getOrCreateBuffer } from '@/lib/engine/bufferRegistry';

describe('CenterViewport Curve Adjustment Floating Toolbar UI', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement & { _mockCanvas?: ReturnType<typeof makeCanvas> }) {
      if (!this._mockCanvas) {
        this._mockCanvas = makeCanvas(this.width || 32, this.height || 32);
      }
      return this._mockCanvas.getContext('2d');
    });
    vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      right: 320,
      bottom: 320,
      width: 320,
      height: 320,
      x: 0,
      y: 0,
      toJSON: () => {},
    } as DOMRect);

    HTMLElement.prototype.setPointerCapture = vi.fn();
    HTMLElement.prototype.releasePointerCapture = vi.fn();

    clearAllBuffers();
    useStudioStore.getState().resetToNewProject();
    useStudioStore.setState((s) => {
      s.tools.activeTool = 'curve';
      return s;
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    clearAllBuffers();
  });

  it('renders and interacts with curve adjustment toolbar on canvas interaction', () => {
    render(<CenterViewport />);

    // Initially, toolbar is not visible
    expect(screen.queryByTestId('curve-adjustment-toolbar')).toBeNull();

    const mainCanvas = screen.getByTestId('main-composite-canvas');

    // Step 1: Draw baseline on main canvas
    act(() => {
      fireEvent.pointerDown(mainCanvas, { clientX: 20, clientY: 20, button: 0 });
      fireEvent.pointerMove(mainCanvas, { clientX: 80, clientY: 80, button: 0 });
      fireEvent.pointerUp(mainCanvas, { clientX: 80, clientY: 80, button: 0 });
    });

    // Curve adjustment toolbar and screen-space handles should now appear!
    const toolbar = screen.getByTestId('curve-adjustment-toolbar');
    expect(toolbar).toBeDefined();
    expect(toolbar.textContent).toContain('Curve');
    expect(toolbar.textContent).toContain('Drag handles');
    expect(toolbar.textContent).toContain('Apply (Enter)');
    expect(toolbar.textContent).toContain('Cancel (Esc)');

    // Gizmo handles should be rendered
    expect(screen.getByTestId('curve-handle-start')).toBeDefined();
    expect(screen.getByTestId('curve-handle-end')).toBeDefined();
    expect(screen.getByTestId('curve-handle-control')).toBeDefined();

    // Click Apply button
    const applyBtn = screen.getByRole('button', { name: /Apply/i });
    act(() => {
      fireEvent.click(applyBtn);
    });

    // Toolbar should disappear after committing
    expect(screen.queryByTestId('curve-adjustment-toolbar')).toBeNull();
    expect(screen.queryByTestId('curve-adjustment-gizmo')).toBeNull();

    // Check layer buffer:
    const activeLayerId = useStudioStore.getState().activeLayerId!;
    const buffer = getOrCreateBuffer(activeLayerId, 32, 32);
    const ctx = buffer.canvas.getContext('2d');
    const imgData = ctx?.getImageData(0, 0, 32, 32).data;
    let nonZeroPixels = 0;
    if (imgData) {
      for (let i = 3; i < imgData.length; i += 4) {
        if (imgData[i] > 0) nonZeroPixels++;
      }
    }
    expect(nonZeroPixels).toBeGreaterThan(0);
  });

  it('bakes curve pixels onto active layer buffer when clicking Apply button with real pointer events', () => {
    render(<CenterViewport />);
    const mainCanvas = screen.getByTestId('main-composite-canvas');

    act(() => {
      fireEvent.pointerDown(mainCanvas, { clientX: 20, clientY: 20, button: 0 });
      fireEvent.pointerMove(mainCanvas, { clientX: 80, clientY: 80, button: 0 });
      fireEvent.pointerUp(mainCanvas, { clientX: 80, clientY: 80, button: 0 });
    });

    const applyBtn = screen.getByRole('button', { name: /Apply/i });
    act(() => {
      fireEvent.pointerDown(applyBtn, { clientX: 160, clientY: 300, button: 0 });
      fireEvent.pointerUp(applyBtn, { clientX: 160, clientY: 300, button: 0 });
      fireEvent.click(applyBtn);
    });

    // Toolbar should disappear
    expect(screen.queryByTestId('curve-adjustment-toolbar')).toBeNull();

    // Check layer buffer:
    const activeLayerId = useStudioStore.getState().activeLayerId!;
    const buffer = getOrCreateBuffer(activeLayerId, 32, 32);
    const ctx = buffer.canvas.getContext('2d');
    const imgData = ctx?.getImageData(0, 0, 32, 32).data;
    let nonZeroPixels = 0;
    if (imgData) {
      for (let i = 3; i < imgData.length; i += 4) {
        if (imgData[i] > 0) nonZeroPixels++;
      }
    }
    expect(nonZeroPixels).toBeGreaterThan(0);
  });

  it('renders re-edit toolbar in CenterViewport after Apply and clicking Re-edit restores adjustment gizmo', () => {
    render(<CenterViewport />);
    const mainCanvas = screen.getByTestId('main-composite-canvas');

    act(() => {
      fireEvent.pointerDown(mainCanvas, { clientX: 20, clientY: 20, button: 0 });
      fireEvent.pointerMove(mainCanvas, { clientX: 80, clientY: 80, button: 0 });
      fireEvent.pointerUp(mainCanvas, { clientX: 80, clientY: 80, button: 0 });
    });

    const applyBtn = screen.getByRole('button', { name: /Apply/i });
    act(() => {
      fireEvent.click(applyBtn);
    });

    // Adjustment toolbar is gone, but re-edit toolbar appears!
    expect(screen.queryByTestId('curve-adjustment-toolbar')).toBeNull();
    const reEditToolbar = screen.getByTestId('curve-reedit-toolbar');
    expect(reEditToolbar).toBeDefined();

    // Click Re-edit Curve button
    const reEditBtn = screen.getByRole('button', { name: /Re-edit Curve/i });
    act(() => {
      fireEvent.click(reEditBtn);
    });

    // Now adjustment toolbar and gizmo are restored!
    expect(screen.getByTestId('curve-adjustment-toolbar')).toBeDefined();
    expect(screen.queryByTestId('curve-reedit-toolbar')).toBeNull();
  });
});

