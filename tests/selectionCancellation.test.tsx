// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useViewportPointerEvents } from '@/hooks/viewport/useViewportPointerEvents';
import { useSelectionPointerHandler } from '@/hooks/viewport/useSelectionPointerHandler';
import { useStudioStore } from '@/stores/studioStore';
import { makeCanvas } from './helpers/mockCanvas';
import React from 'react';

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
    return makeCanvas(this.width || 32, this.height || 32).getContext('2d');
  });
  useStudioStore.getState().resetToNewProject();
});

afterEach(() => {
  cleanup();
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe('Selection cancellation when clicking outside canvas or switching tools', () => {
  it('cancels active selection when pointer down occurs outside canvas area (coords is null)', () => {
    const cancelSelection = vi.fn(() => {
      useStudioStore.getState().setSelection(null, null);
    });

    useStudioStore.getState().setSelection({ x: 4, y: 4, w: 10, h: 10 });
    expect(useStudioStore.getState().selection).toEqual({ x: 4, y: 4, w: 10, h: 10 });

    const canvas = makeCanvas(32, 32);
    const mockRef = { current: null };
    const boolRef = { current: false };

    const { result } = renderHook(() =>
      useViewportPointerEvents({
        canvasWidth: 32,
        canvasHeight: 32,
        panX: 0,
        panY: 0,
        setPan: vi.fn(),
        isPanning: false,
        setIsPanning: vi.fn(),
        panStart: { x: 0, y: 0 },
        setPanStart: vi.fn(),
        clientToCanvasCoords: () => null, // Outside canvas area!
        isDrawing: false,
        setIsDrawing: vi.fn(),
        isDrawingRef: boolRef,
        strokeStart: null,
        setStrokeStart: vi.fn(),
        lastPoint: null,
        setLastPoint: vi.fn(),
        cursorCoordsRef: mockRef,
        currentStrokeSnapshotRef: mockRef,
        drawPointsOnActiveLayer: vi.fn(),
        captureSnapshot: vi.fn(),
        commitSnapshot: vi.fn(),
        setPrimaryColor: vi.fn(),
        renderBrushGhost: vi.fn(),
        renderComposite: vi.fn(),
        getOrCreateLayerCanvas: () => canvas,
        previewCanvasRef: { current: canvas },
        floatingSelection: null,
        setFloatingSelection: vi.fn(),
        isDraggingSelection: false,
        setIsDraggingSelection: vi.fn(),
        dragOffset: { x: 0, y: 0 },
        setDragOffset: vi.fn(),
        lassoPoints: [],
        setLassoPoints: vi.fn(),
        selectionModifierRef: { current: 'replace' },
        baseSelectionMaskRef: { current: null },
        liftSelectionToFloating: vi.fn(),
        commitFloatingSelection: vi.fn(),
        createBoxMask: vi.fn(() => new Uint8Array(32 * 32)),
        mergeSelectionMask: vi.fn(() => ({ box: null, mask: null })),
        lockedWarningTimerRef: { current: null },
        setLockedWarning: vi.fn(),
        cancelSelection,
      })
    );

    // Simulate clicking in the workspace well outside the canvas
    const pointerEvent = {
      button: 0,
      altKey: false,
      clientX: 5,
      clientY: 5,
      pointerType: 'mouse',
      isPrimary: true,
    } as unknown as React.PointerEvent;

    act(() => {
      result.current.handlePointerDown(pointerEvent);
    });

    expect(cancelSelection).toHaveBeenCalled();
    expect(useStudioStore.getState().selection).toBeNull();
  });

  it('cancels floating selection when pointer down occurs outside canvas area', () => {
    const cancelSelection = vi.fn(() => {
      useStudioStore.getState().setSelection(null, null);
    });

    const canvas = makeCanvas(32, 32);
    const mockRef = { current: null };
    const boolRef = { current: false };

    const { result } = renderHook(() =>
      useViewportPointerEvents({
        canvasWidth: 32,
        canvasHeight: 32,
        panX: 0,
        panY: 0,
        setPan: vi.fn(),
        isPanning: false,
        setIsPanning: vi.fn(),
        panStart: { x: 0, y: 0 },
        setPanStart: vi.fn(),
        clientToCanvasCoords: () => null, // Outside canvas area!
        isDrawing: false,
        setIsDrawing: vi.fn(),
        isDrawingRef: boolRef,
        strokeStart: null,
        setStrokeStart: vi.fn(),
        lastPoint: null,
        setLastPoint: vi.fn(),
        cursorCoordsRef: mockRef,
        currentStrokeSnapshotRef: mockRef,
        drawPointsOnActiveLayer: vi.fn(),
        captureSnapshot: vi.fn(),
        commitSnapshot: vi.fn(),
        setPrimaryColor: vi.fn(),
        renderBrushGhost: vi.fn(),
        renderComposite: vi.fn(),
        getOrCreateLayerCanvas: () => canvas,
        previewCanvasRef: { current: canvas },
        floatingSelection: { canvas, x: 2, y: 2, w: 8, h: 8 },
        setFloatingSelection: vi.fn(),
        isDraggingSelection: false,
        setIsDraggingSelection: vi.fn(),
        dragOffset: { x: 0, y: 0 },
        setDragOffset: vi.fn(),
        lassoPoints: [],
        setLassoPoints: vi.fn(),
        selectionModifierRef: { current: 'replace' },
        baseSelectionMaskRef: { current: null },
        liftSelectionToFloating: vi.fn(),
        commitFloatingSelection: vi.fn(),
        createBoxMask: vi.fn(() => new Uint8Array(32 * 32)),
        mergeSelectionMask: vi.fn(() => ({ box: null, mask: null })),
        lockedWarningTimerRef: { current: null },
        setLockedWarning: vi.fn(),
        cancelSelection,
      })
    );

    const pointerEvent = {
      button: 0,
      altKey: false,
      clientX: 500,
      clientY: 500,
      pointerType: 'mouse',
      isPrimary: true,
    } as unknown as React.PointerEvent;

    act(() => {
      result.current.handlePointerDown(pointerEvent);
    });

    expect(cancelSelection).toHaveBeenCalled();
  });

  it('deselects on single click without dragging when selection already exists in select-box', () => {
    useStudioStore.getState().setActiveTool('select-box');
    useStudioStore.getState().setSelection({ x: 5, y: 5, w: 10, h: 10 });

    const canvas = makeCanvas(32, 32);

    const baseSelectionMaskRef = { current: new Uint8Array(32 * 32).fill(1, 5, 15) };
    const selectionModifierRef = { current: 'replace' as const };

    const { result } = renderHook(() =>
      useSelectionPointerHandler({
        canvasWidth: 32,
        canvasHeight: 32,
        floatingSelection: null,
        setFloatingSelection: vi.fn(),
        isDraggingSelection: false,
        setIsDraggingSelection: vi.fn(),
        dragOffset: { x: 0, y: 0 },
        setDragOffset: vi.fn(),
        lassoPoints: [],
        setLassoPoints: vi.fn(),
        selectionModifierRef,
        baseSelectionMaskRef,
        liftSelectionToFloating: vi.fn(),
        commitFloatingSelection: vi.fn(),
        createBoxMask: vi.fn(() => new Uint8Array(32 * 32)),
        mergeSelectionMask: vi.fn(() => ({ box: null, mask: null })),
        isDrawingRef: { current: true },
        setIsDrawing: vi.fn(),
        strokeStart: { x: 2, y: 2 },
        setStrokeStart: vi.fn(),
        lastPoint: { x: 2, y: 2 },
        setLastPoint: vi.fn(),
        getOrCreateLayerCanvas: () => canvas,
        previewCanvasRef: { current: canvas },
        renderComposite: vi.fn(),
      })
    );

    // Pointer up at the exact same coordinates (single click, 0 drag)
    act(() => {
      const handled = result.current.onPointerUp(undefined, { x: 2, y: 2 });
      expect(handled).toBe(true);
    });

    expect(useStudioStore.getState().selection).toBeNull();
  });

  // Audit defect 2: the selection limits the pen instead of being dropped by it.
  it('keeps the selection when drawing with pen inside an active selection', () => {
    useStudioStore.getState().setActiveTool('pen');
    useStudioStore.getState().setSelection({ x: 4, y: 4, w: 10, h: 10 });

    const canvas = makeCanvas(32, 32);
    const mockRef = { current: null };
    const boolRef = { current: false };

    const { result } = renderHook(() =>
      useViewportPointerEvents({
        canvasWidth: 32,
        canvasHeight: 32,
        panX: 0,
        panY: 0,
        setPan: vi.fn(),
        isPanning: false,
        setIsPanning: vi.fn(),
        panStart: { x: 0, y: 0 },
        setPanStart: vi.fn(),
        clientToCanvasCoords: () => ({ x: 10, y: 10 }),
        isDrawing: false,
        setIsDrawing: vi.fn(),
        isDrawingRef: boolRef,
        strokeStart: null,
        setStrokeStart: vi.fn(),
        lastPoint: null,
        setLastPoint: vi.fn(),
        cursorCoordsRef: mockRef,
        currentStrokeSnapshotRef: mockRef,
        drawPointsOnActiveLayer: vi.fn(),
        captureSnapshot: vi.fn(),
        commitSnapshot: vi.fn(),
        setPrimaryColor: vi.fn(),
        renderBrushGhost: vi.fn(),
        renderComposite: vi.fn(),
        getOrCreateLayerCanvas: () => canvas,
        previewCanvasRef: { current: canvas },
        floatingSelection: null,
        setFloatingSelection: vi.fn(),
        isDraggingSelection: false,
        setIsDraggingSelection: vi.fn(),
        dragOffset: { x: 0, y: 0 },
        setDragOffset: vi.fn(),
        lassoPoints: [],
        setLassoPoints: vi.fn(),
        selectionModifierRef: { current: 'replace' },
        baseSelectionMaskRef: { current: null },
        liftSelectionToFloating: vi.fn(),
        commitFloatingSelection: vi.fn(),
        createBoxMask: vi.fn(() => new Uint8Array(32 * 32)),
        mergeSelectionMask: vi.fn(() => ({ box: null, mask: null })),
        lockedWarningTimerRef: { current: null },
        setLockedWarning: vi.fn(),
      })
    );

    const pointerEvent = {
      button: 0,
      altKey: false,
      clientX: 10,
      clientY: 10,
      pointerType: 'mouse',
      isPrimary: true,
      currentTarget: document.createElement('div'),
    } as unknown as React.PointerEvent;

    act(() => {
      result.current.handlePointerDown(pointerEvent);
    });

    expect(useStudioStore.getState().selection).toEqual({ x: 4, y: 4, w: 10, h: 10 });
  });
});
