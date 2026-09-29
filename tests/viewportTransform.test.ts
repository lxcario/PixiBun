/** @vitest-environment happy-dom */
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useViewportTransform } from '@/hooks/viewport/useViewportTransform';

describe('useViewportTransform', () => {
  const setupHook = (initialZoom = 1600, initialPanX = 0, initialPanY = 0) => {
    let currentZoom = initialZoom;
    let currentPanX = initialPanX;
    let currentPanY = initialPanY;

    const setZoom = vi.fn((z: number) => {
      currentZoom = z;
    });
    const setPan = vi.fn((x: number, y: number) => {
      currentPanX = x;
      currentPanY = y;
    });

    // Mock container
    const mockContainer = document.createElement('div');
    vi.spyOn(mockContainer, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      top: 50,
      width: 800,
      height: 600,
      right: 900,
      bottom: 650,
      x: 100,
      y: 50,
      toJSON: () => {},
    });

    const containerRef = { current: mockContainer };
    const mainCanvasRef = { current: document.createElement('canvas') };

    const { result, rerender } = renderHook(() =>
      useViewportTransform({
        containerRef,
        mainCanvasRef,
        canvasWidth: 32,
        canvasHeight: 32,
        zoom: currentZoom,
        setZoom,
        panX: currentPanX,
        panY: currentPanY,
        setPan,
      })
    );

    return {
      result,
      rerender,
      setZoom,
      setPan,
      getZoom: () => currentZoom,
      getPan: () => ({ x: currentPanX, y: currentPanY }),
      container: mockContainer,
    };
  };

  it('zooms in when scrolling mouse wheel up (deltaY < 0)', () => {
    const { result, setZoom } = setupHook(1600);

    const wheelEvent = {
      preventDefault: vi.fn(),
      deltaY: -100,
      deltaX: 0,
      shiftKey: false,
      ctrlKey: false,
      metaKey: false,
      clientX: 500,
      clientY: 350,
    } as unknown as React.WheelEvent;

    act(() => {
      result.current.handleWheel(wheelEvent);
    });

    expect(wheelEvent.preventDefault).toHaveBeenCalled();
    // Ladder step after 1600 is 2400
    expect(setZoom).toHaveBeenCalledWith(2400);
  });

  it('zooms out when scrolling mouse wheel down (deltaY > 0)', () => {
    const { result, setZoom } = setupHook(1600);

    const wheelEvent = {
      preventDefault: vi.fn(),
      deltaY: 100,
      deltaX: 0,
      shiftKey: false,
      ctrlKey: false,
      metaKey: false,
      clientX: 500,
      clientY: 350,
    } as unknown as React.WheelEvent;

    act(() => {
      result.current.handleWheel(wheelEvent);
    });

    expect(wheelEvent.preventDefault).toHaveBeenCalled();
    // Ladder step before 1600 is 1200
    expect(setZoom).toHaveBeenCalledWith(1200);
  });

  it('zooms anchored to mouse position without drifting', () => {
    // Container: left: 100, top: 50, width: 800, height: 600 -> center is at client (500, 350)
    // If mouse is at client (500, 350) and pan is (0, 0), mouse is at exact canvas center
    const { result, setPan } = setupHook(1600, 0, 0);

    const wheelEvent = {
      preventDefault: vi.fn(),
      deltaY: -100,
      deltaX: 0,
      shiftKey: false,
      clientX: 500,
      clientY: 350,
    } as unknown as React.WheelEvent;

    act(() => {
      result.current.handleWheel(wheelEvent);
    });

    // Cursor at center: pan should stay (0, 0)
    expect(setPan).toHaveBeenCalledWith(0, 0);
  });

  it('pans horizontally when holding Shift + scrolling mouse wheel', () => {
    const { result, setPan } = setupHook(1600, 100, 50);

    const wheelEvent = {
      preventDefault: vi.fn(),
      deltaY: 40,
      deltaX: 0,
      shiftKey: true,
      clientX: 500,
      clientY: 350,
    } as unknown as React.WheelEvent;

    act(() => {
      result.current.handleWheel(wheelEvent);
    });

    expect(wheelEvent.preventDefault).toHaveBeenCalled();
    // panX - deltaY = 100 - 40 = 60, panY unchanged
    expect(setPan).toHaveBeenCalledWith(60, 50);
  });

  it('clamps zoom within 10% and 6400%', () => {
    // Zoom max clamp
    const { result: maxResult, setZoom: setZoomMax } = setupHook(6400);
    const wheelUp = {
      preventDefault: vi.fn(),
      deltaY: -100,
      deltaX: 0,
      shiftKey: false,
      clientX: 500,
      clientY: 350,
    } as unknown as React.WheelEvent;

    act(() => {
      maxResult.current.handleWheel(wheelUp);
    });
    // Already at 6400, cannot exceed 6400
    expect(setZoomMax).not.toHaveBeenCalled();

    // Zoom min clamp
    const { result: minResult, setZoom: setZoomMin } = setupHook(10);
    const wheelDown = {
      preventDefault: vi.fn(),
      deltaY: 100,
      deltaX: 0,
      shiftKey: false,
      clientX: 500,
      clientY: 350,
    } as unknown as React.WheelEvent;

    act(() => {
      minResult.current.handleWheel(wheelDown);
    });
    // Already at 10, cannot decrease below 10
    expect(setZoomMin).not.toHaveBeenCalled();
  });

  it('resets zoom to 16x (1600%) with handleResetZoom', () => {
    const { result, setZoom, setPan } = setupHook(400, 50, 50);

    act(() => {
      result.current.handleResetZoom();
    });

    expect(setZoom).toHaveBeenCalledWith(1600);
    expect(setPan).toHaveBeenCalledWith(0, 0);
  });

  it('atomically updates zoom and pan via setZoomAndPan when provided', () => {
    const setZoomAndPan = vi.fn();
    const setZoom = vi.fn();
    const setPan = vi.fn();

    const mockContainer = document.createElement('div');
    vi.spyOn(mockContainer, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      top: 50,
      width: 800,
      height: 600,
      right: 900,
      bottom: 650,
      x: 100,
      y: 50,
      toJSON: () => {},
    });

    const { result } = renderHook(() =>
      useViewportTransform({
        containerRef: { current: mockContainer },
        mainCanvasRef: { current: document.createElement('canvas') },
        canvasWidth: 32,
        canvasHeight: 32,
        zoom: 1600,
        setZoom,
        panX: 0,
        panY: 0,
        setPan,
        setZoomAndPan,
      })
    );

    const wheelEvent = {
      preventDefault: vi.fn(),
      deltaY: -100,
      deltaX: 0,
      shiftKey: false,
      clientX: 500,
      clientY: 350,
    } as unknown as React.WheelEvent;

    act(() => {
      result.current.handleWheel(wheelEvent);
    });

    // Ladder step after 1600 is 2400; center cursor keeps pan at (0, 0)
    expect(setZoomAndPan).toHaveBeenCalledWith(2400, 0, 0);
    expect(setZoom).not.toHaveBeenCalled();
    expect(setPan).not.toHaveBeenCalled();
  });
});
