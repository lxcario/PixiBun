/** @vitest-environment happy-dom */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { useViewportTransform, WHEEL_PAN_COMMIT_MS } from '@/hooks/viewport/useViewportTransform';
import { endLivePan, getLivePan, subscribeLivePan } from '@/lib/viewport/livePan';

afterEach(() => {
  cleanup();
  endLivePan();
  vi.useRealTimers();
});

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
    vi.useFakeTimers();
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
    // panX - deltaY = 100 - 40 = 60, panY unchanged; shown at once, stored when the wheel goes quiet
    expect(getLivePan()).toEqual({ x: 60, y: 50 });
    expect(setPan).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(WHEEL_PAN_COMMIT_MS); });
    expect(setPan).toHaveBeenCalledTimes(1);
    expect(setPan).toHaveBeenCalledWith(60, 50);
    expect(getLivePan()).toBeNull();
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

describe('accumulateWheelZoom', () => {
  it('steps once per mouse notch', async () => {
    const { accumulateWheelZoom } = await import('@/hooks/viewport/useViewportTransform');
    const state = { total: 0, at: 0 };
    expect(accumulateWheelZoom(state, { deltaY: -100, deltaMode: 0, ctrlKey: false, timeStamp: 1000 })).toBe(-100);
    expect(accumulateWheelZoom(state, { deltaY: 100, deltaMode: 0, ctrlKey: false, timeStamp: 1050 })).toBe(100);
  });

  it('adds up small touchpad deltas into one step instead of one step per event', async () => {
    const { accumulateWheelZoom } = await import('@/hooks/viewport/useViewportTransform');
    const state = { total: 0, at: 0 };
    const steps = Array.from({ length: 12 }, (_, i) => accumulateWheelZoom(state, { deltaY: -8, deltaMode: 0, ctrlKey: false, timeStamp: 1000 + i * 8 }));
    expect(steps.filter(Boolean)).toHaveLength(1);
  });

  it('treats a pause or a reversal as a new gesture', async () => {
    const { accumulateWheelZoom } = await import('@/hooks/viewport/useViewportTransform');
    const state = { total: 0, at: 0 };
    accumulateWheelZoom(state, { deltaY: -40, deltaMode: 0, ctrlKey: false, timeStamp: 1000 });
    expect(accumulateWheelZoom(state, { deltaY: -40, deltaMode: 0, ctrlKey: false, timeStamp: 2000 })).toBe(0);
    expect(accumulateWheelZoom(state, { deltaY: 40, deltaMode: 0, ctrlKey: false, timeStamp: 2010 })).toBe(0);
  });

  it('uses a shorter step for pinch (Ctrl) gestures and converts line deltas', async () => {
    const { accumulateWheelZoom } = await import('@/hooks/viewport/useViewportTransform');
    expect(accumulateWheelZoom({ total: 0, at: 0 }, { deltaY: -20, deltaMode: 0, ctrlKey: true, timeStamp: 10 })).toBe(-20);
    expect(accumulateWheelZoom({ total: 0, at: 0 }, { deltaY: 3, deltaMode: 1, ctrlKey: false, timeStamp: 10 })).toBe(99);
  });
});

describe('drag pan and cached canvas bounds', () => {
  const setup = () => {
    const setPan = vi.fn();
    const setZoom = vi.fn();
    const setZoomAndPan = vi.fn();
    const container = document.createElement('div');
    vi.spyOn(container, 'getBoundingClientRect').mockReturnValue(
      { left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600, x: 0, y: 0, toJSON: () => {} }
    );
    // A 32x32 canvas shown at 10x, first laid out at (100, 50).
    const canvas = document.createElement('canvas');
    const rectSpy = vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue(
      { left: 100, top: 50, width: 320, height: 320, right: 420, bottom: 370, x: 100, y: 50, toJSON: () => {} }
    );
    const stage = document.createElement('div');
    const hook = renderHook(() =>
      useViewportTransform({
        containerRef: { current: container },
        mainCanvasRef: { current: canvas },
        stageRef: { current: stage },
        canvasWidth: 32,
        canvasHeight: 32,
        zoom: 1000,
        setZoom,
        panX: 0,
        panY: 0,
        setPan,
        setZoomAndPan,
      })
    );
    return { ...hook, setPan, setZoomAndPan, stage, rectSpy };
  };

  it('moves the stage on every move and writes the store once, on release', () => {
    const { result, setPan, stage } = setup();
    act(() => result.current.beginPan(200, 200));
    expect(result.current.isPanning()).toBe(true);
    for (let k = 1; k <= 120; k++) {
      act(() => { expect(result.current.movePan(200 + k, 200 + k / 2)).toBe(true); });
    }
    expect(setPan).not.toHaveBeenCalled();
    expect(stage.style.transform).toBe('translate(120px, 60px)');
    expect(getLivePan()).toEqual({ x: 120, y: 60 });

    act(() => result.current.endPan());
    expect(setPan).toHaveBeenCalledTimes(1);
    expect(setPan).toHaveBeenCalledWith(120, 60);
    expect(result.current.isPanning()).toBe(false);
    expect(result.current.movePan(500, 500)).toBe(false);
    expect(getLivePan()).toBeNull();
  });

  it('keeps canvas coordinates right mid-gesture while reading the bounds once', () => {
    const { result, rectSpy } = setup();
    expect(result.current.clientToCanvasCoords(105, 55)).toEqual({ x: 0, y: 0 });
    act(() => result.current.beginPan(0, 0));
    for (let k = 1; k <= 40; k++) act(() => { result.current.movePan(k, k / 2); });
    // The canvas has moved 40px right and 20px down with the stage.
    expect(result.current.clientToCanvasCoords(145, 75)).toEqual({ x: 0, y: 0 });
    expect(result.current.clientToCanvasCoords(105, 55)).toBeNull();
    expect(result.current.clientToCanvasCoords(140 + 319, 70 + 319)).toEqual({ x: 31, y: 31 });
    expect(rectSpy).toHaveBeenCalledTimes(1);

    // A new press reads the bounds again.
    act(() => result.current.refreshCanvasRect());
    result.current.clientToCanvasCoords(145, 75);
    expect(rectSpy).toHaveBeenCalledTimes(2);
  });

  it('lets other views follow the gesture and land on the committed pan', () => {
    const { result } = setup();
    const seen: unknown[] = [];
    const unsubscribe = subscribeLivePan((pan, settled) => seen.push(pan ?? { settled }));
    act(() => result.current.beginPan(0, 0));
    act(() => { result.current.movePan(10, 4); });
    act(() => { result.current.movePan(25, 9); });
    act(() => result.current.endPan());
    unsubscribe();
    expect(seen).toEqual([{ x: 10, y: 4 }, { x: 25, y: 9 }, { settled: { x: 25, y: 9 } }]);
  });

  it('zooms from a wheel pan still in preview and settles it with the zoom', () => {
    vi.useFakeTimers();
    const { result, setPan, setZoomAndPan, stage } = setup();
    const wheel = (e: Partial<WheelEvent>) => act(() => result.current.handleWheel({
      preventDefault: vi.fn(), deltaX: 0, deltaY: 0, deltaMode: 0, shiftKey: false, ctrlKey: false,
      clientX: 400, clientY: 300, timeStamp: 1000, ...e,
    } as unknown as WheelEvent));
    wheel({ shiftKey: true, deltaY: 50 });
    expect(stage.style.transform).toBe('translate(-50px, 0px)');
    wheel({ deltaY: -100 });
    // Cursor at the container centre: the zoomed pan scales the previewed pan, not the stale store pan.
    const [zoom, x, y] = setZoomAndPan.mock.calls[0];
    expect(zoom).toBeGreaterThan(1000);
    expect(x).toBe(Math.round(-50 + 50 * (1 - zoom / 1000)));
    expect(y).toBe(0);
    expect(getLivePan()).toBeNull();
    expect(stage.style.transform).toBe(`translate(${x}px, ${y}px)`);
    act(() => { vi.advanceTimersByTime(WHEEL_PAN_COMMIT_MS * 2); });
    expect(setPan).not.toHaveBeenCalled();
  });

  it('publishes an unfinished pan when the viewport unmounts', () => {
    const { result, setPan, unmount } = setup();
    act(() => result.current.beginPan(0, 0));
    act(() => { result.current.movePan(7, 3); });
    unmount();
    expect(setPan).toHaveBeenCalledWith(7, 3);
    expect(getLivePan()).toBeNull();
  });
});
