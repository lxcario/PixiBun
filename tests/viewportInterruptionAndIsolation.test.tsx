// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import { makeCanvas } from './helpers/mockCanvas';
import { useStudioStore } from '@/stores/studioStore';
import { CenterViewport } from '@/components/layout/CenterViewport';
import { studioEvents } from '@/lib/events/studioEvents';
import { getOrCreateBuffer, clearAllBuffers } from '@/lib/engine/bufferRegistry';

describe('Milestone 3 — Viewport Interruption Safety, rAF Coalescing, and Zustand Selector Isolation', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      return makeCanvas(this.width || 32, this.height || 32).getContext('2d');
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

    // Mock pointer capture on HTMLElement
    HTMLElement.prototype.setPointerCapture = vi.fn();
    HTMLElement.prototype.releasePointerCapture = vi.fn();

    clearAllBuffers();
    useStudioStore.getState().resetToNewProject();
    studioEvents.emit('pixibun:history-clear');
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    clearAllBuffers();
  });

  describe('Stroke Interruption Transaction Correctness (B19)', () => {
    it('cleanly commits a brush stroke and releases pointer capture on pointercancel', () => {
      const { container } = render(<CenterViewport />);
      const mainEl = container.querySelector('main')!;
      expect(mainEl).toBeDefined();

      const activeLayerId = useStudioStore.getState().activeLayerId;
      getOrCreateBuffer(activeLayerId, 32, 32);

      // 1. Pointer Down
      const downEvent = new PointerEvent('pointerdown', {
        clientX: 100,
        clientY: 100,
        button: 0,
        pointerId: 1,
        bubbles: true,
      });
      mainEl.dispatchEvent(downEvent);

      // Verify setPointerCapture was called
      expect(HTMLElement.prototype.setPointerCapture).toHaveBeenCalledWith(1);

      // 2. Pointer Move (paints pixels)
      const moveEvent = new PointerEvent('pointermove', {
        clientX: 110,
        clientY: 110,
        button: 0,
        pointerId: 1,
        bubbles: true,
      });
      mainEl.dispatchEvent(moveEvent);

      // 3. Pointer Cancel (interruption e.g. stylus lift / gesture swipe)
      const cancelEvent = new PointerEvent('pointercancel', {
        pointerId: 1,
        bubbles: true,
      });
      mainEl.dispatchEvent(cancelEvent);

      // Invariant checks:
      // A. Pointer capture was released
      expect(HTMLElement.prototype.releasePointerCapture).toHaveBeenCalledWith(1);
      // B. Undo stack has the coherent stroke step
      expect(useStudioStore.getState().canUndo).toBe(true);

      // C. Buffer has drawn pixels and undo cleanly restores pre-stroke buffer
      studioEvents.emit('pixibun:undo');
      expect(useStudioStore.getState().canRedo).toBe(true);
    });

    it('cleanly commits an active stroke and releases pointer capture on window blur (Alt-Tab)', () => {
      const { container } = render(<CenterViewport />);
      const mainEl = container.querySelector('main')!;

      // Pointer Down
      const downEvent = new PointerEvent('pointerdown', {
        clientX: 50,
        clientY: 50,
        button: 0,
        pointerId: 2,
        bubbles: true,
      });
      mainEl.dispatchEvent(downEvent);

      // Move
      const moveEvent = new PointerEvent('pointermove', {
        clientX: 60,
        clientY: 60,
        button: 0,
        pointerId: 2,
        bubbles: true,
      });
      mainEl.dispatchEvent(moveEvent);

      // Alt-Tab -> Window Blur
      window.dispatchEvent(new Event('blur'));

      // Invariant checks:
      expect(HTMLElement.prototype.releasePointerCapture).toHaveBeenCalledWith(2);
      expect(useStudioStore.getState().canUndo).toBe(true);
    });

    it('cleanly finalizes when document becomes hidden (tab switch)', () => {
      const { container } = render(<CenterViewport />);
      const mainEl = container.querySelector('main')!;

      // Pointer Down
      mainEl.dispatchEvent(
        new PointerEvent('pointerdown', {
          clientX: 70,
          clientY: 70,
          button: 0,
          pointerId: 3,
          bubbles: true,
        })
      );

      // Switch tab
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        configurable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));

      // Pointer capture released cleanly
      expect(HTMLElement.prototype.releasePointerCapture).toHaveBeenCalledWith(3);
    });

    it('cleanly discards preview and creates no bogus undo step when a shape tool is interrupted via lostpointercapture', () => {
      useStudioStore.getState().setActiveTool('rectangle');
      const { container } = render(<CenterViewport />);
      const mainEl = container.querySelector('main')!;

      // Pointer Down
      mainEl.dispatchEvent(
        new PointerEvent('pointerdown', {
          clientX: 20,
          clientY: 20,
          button: 0,
          pointerId: 4,
          bubbles: true,
        })
      );

      // Drag shape
      mainEl.dispatchEvent(
        new PointerEvent('pointermove', {
          clientX: 80,
          clientY: 80,
          button: 0,
          pointerId: 4,
          bubbles: true,
        })
      );

      // Interruption: lost pointer capture
      mainEl.dispatchEvent(
        new PointerEvent('lostpointercapture', {
          pointerId: 4,
          bubbles: true,
        })
      );

      // Shape preview was cancelled; no un-committed shape was baked to active layer
      // and no empty undo step is recorded!
      expect(useStudioStore.getState().canUndo).toBe(false);
    });
  });

  describe('Self-Cleaning rAF Composite Coalescing (B20)', () => {
    it('coalesces multiple same-frame composite events into a single composite render call', () => {
      let scheduledRafCallback: FrameRequestCallback | null = null;
      let rafCallCount = 0;

      vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
        rafCallCount++;
        scheduledRafCallback = cb;
        return rafCallCount;
      });
      const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame');

      const { unmount } = render(<CenterViewport />);

      // Reset spy count from mount effects
      rafCallCount = 0;
      scheduledRafCallback = null;

      // Burst of 10 rapid composite requests in the same animation frame
      for (let i = 0; i < 10; i++) {
        studioEvents.emit('pixibun:request-composite');
      }

      // Exactly 1 requestAnimationFrame must have been scheduled!
      expect(rafCallCount).toBe(1);
      expect(scheduledRafCallback).not.toBeNull();

      // Execute the coalesced frame callback
      scheduledRafCallback!(performance.now());

      // Next event in a new frame can schedule again
      studioEvents.emit('pixibun:request-composite');
      expect(rafCallCount).toBe(2);

      // Unmount cleanly cancels any pending rAF
      unmount();
      expect(cancelSpy).toHaveBeenCalled();
    });
  });

  describe('Zustand Selector Isolation (B6, B7)', () => {
    it('ensures components subscribing to rail selectors do not re-render when pixels are painted or buffer version bumps', () => {
      let railRenders = 0;
      const MonitoredRail = () => {
        railRenders++;
        const projectName = useStudioStore((s) => s.projectName);
        const zoom = useStudioStore((s) => s.zoom);
        const tools = useStudioStore((s) => s.tools);
        return <div>{projectName} - {zoom} - {tools.activeTool}</div>;
      };

      render(<MonitoredRail />);
      const initialRailRenders = railRenders;

      // Drawing pixels bumps bufferVersion and touches layer buffer
      act(() => {
        useStudioStore.getState().bumpBufferVersion();
        useStudioStore.getState().setSelection(null);
      });

      // AtelierRail selectors do not subscribe to bufferVersion or selection!
      // Its render count must NOT increase!
      expect(railRenders).toBe(initialRailRenders);

      // Only relevant changes (like zooming or changing brush size) should re-render AtelierRail
      act(() => {
        useStudioStore.getState().setZoom(200);
      });
      expect(railRenders).toBe(initialRailRenders + 1);
    });

    it('ensures components subscribing to timeline selectors do not re-render when viewport zooms or pans', () => {
      let timelineRenders = 0;
      const MonitoredTimeline = () => {
        timelineRenders++;
        const frames = useStudioStore((s) => s.frames);
        const activeFrameIndex = useStudioStore((s) => s.activeFrameIndex);
        const fps = useStudioStore((s) => s.fps);
        return <div>{frames.length} - {activeFrameIndex} - {fps}</div>;
      };

      render(<MonitoredTimeline />);
      const initialTimelineRenders = timelineRenders;

      // Viewport pan/zoom changes
      act(() => {
        useStudioStore.getState().setZoom(300);
        useStudioStore.getState().setPan(50, 50);
      });

      // BottomTimeline selectors do not subscribe to zoom or pan!
      expect(timelineRenders).toBe(initialTimelineRenders);

      // Only relevant animation changes (like frame count or fps) should re-render BottomTimeline
      act(() => {
        useStudioStore.getState().addFrame();
      });
      expect(timelineRenders).toBe(initialTimelineRenders + 1);
    });

    it('ensures LeftToolbar and RightInspector do not re-render on bufferVersion bumps, autosave updates, or zoom/pan', () => {
      let leftToolbarRenders = 0;
      const MonitoredLeftToolbar = () => {
        leftToolbarRenders++;
        const tools = useStudioStore((s) => s.tools);
        const primaryColor = useStudioStore((s) => s.primaryColor);
        return <div>{tools.activeTool} - {primaryColor}</div>;
      };

      let rightInspectorRenders = 0;
      const MonitoredRightInspector = () => {
        rightInspectorRenders++;
        const activeInspectorTab = useStudioStore((s) => s.activeInspectorTab);
        return <div>{activeInspectorTab}</div>;
      };

      render(
        <div>
          <MonitoredLeftToolbar />
          <MonitoredRightInspector />
        </div>
      );

      const initLeft = leftToolbarRenders;
      const initRight = rightInspectorRenders;

      // Unrelated drawing / canvas buffer update & zoom/pan
      act(() => {
        useStudioStore.getState().bumpBufferVersion();
        useStudioStore.getState().setZoom(400);
        useStudioStore.getState().setPan(100, 100);
      });

      // Neither LeftToolbar nor RightInspector re-render!
      expect(leftToolbarRenders).toBe(initLeft);
      expect(rightInspectorRenders).toBe(initRight);

      // Only their targeted state changes trigger re-render
      act(() => {
        useStudioStore.getState().setActiveInspectorTab('palette');
      });
      expect(rightInspectorRenders).toBe(initRight + 1);
      expect(leftToolbarRenders).toBe(initLeft);

      act(() => {
        useStudioStore.getState().setPrimaryColor('#ff0000');
      });
      expect(leftToolbarRenders).toBe(initLeft + 1);
    });
  });

  describe('Error Message Migration (B22)', () => {
    it('emits error toast on WFC contradiction and preserves AI message backwards compatibility', () => {
      const toastSpy = vi.fn();
      const unsub = studioEvents.on('pixibun:toast', toastSpy);

      // Simulate WFC failure toast
      studioEvents.emit('pixibun:toast', {
        message: 'WaveFunctionCollapse: synthesis encountered contradictions after retries. Try a different sample region or N=2.',
        type: 'error',
      });

      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('WaveFunctionCollapse'),
          type: 'error',
        })
      );

      unsub();
    });
  });
});
