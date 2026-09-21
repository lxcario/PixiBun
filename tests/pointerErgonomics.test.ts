// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  analyzePointerEvent,
  computeModulatedBrushSize,
  PALM_REJECTION_THRESHOLD_PX,
} from '@/lib/canvas/pointerErgonomics';
import { useBrushPointerHandler } from '@/hooks/viewport/useBrushPointerHandler';
import { useStudioStore } from '@/stores/studioStore';

describe('Pointer & Stylus Ergonomics Suite (Milestone C4)', () => {
  describe('analyzePointerEvent', () => {
    it('accurately distinguishes mouse, pen, and touch inputs', () => {
      const mouse = analyzePointerEvent({ pointerType: 'mouse', button: 0 });
      expect(mouse.isMouse).toBe(true);
      expect(mouse.isPen).toBe(false);
      expect(mouse.isTouch).toBe(false);

      const pen = analyzePointerEvent({ pointerType: 'pen', button: 0 });
      expect(pen.isMouse).toBe(false);
      expect(pen.isPen).toBe(true);
      expect(pen.isTouch).toBe(false);

      const touch = analyzePointerEvent({ pointerType: 'touch', width: 12, height: 12 });
      expect(touch.isMouse).toBe(false);
      expect(touch.isPen).toBe(false);
      expect(touch.isTouch).toBe(true);
    });

    it('detects stylus eraser button (button 5) and eraser bitmask (buttons & 32)', () => {
      const standardPen = analyzePointerEvent({ pointerType: 'pen', button: 0, buttons: 1 });
      expect(standardPen.isEraser).toBe(false);

      const eraserTip = analyzePointerEvent({ pointerType: 'pen', button: 5, buttons: 32 });
      expect(eraserTip.isEraser).toBe(true);

      const eraserBitmaskOnly = analyzePointerEvent({ pointerType: 'pen', button: 0, buttons: 32 });
      expect(eraserBitmaskOnly.isEraser).toBe(true);

      // Mouse with button 5 should not be treated as a stylus eraser
      const mouseButton5 = analyzePointerEvent({ pointerType: 'mouse', button: 5 });
      expect(mouseButton5.isEraser).toBe(false);
    });

    it('identifies and rejects accidental capacitive palm contacts on touch screens', () => {
      expect(PALM_REJECTION_THRESHOLD_PX).toBe(32);
      // Normal finger tip contact (~12px to 20px)
      const fingerTouch = analyzePointerEvent({
        pointerType: 'touch',
        width: 16,
        height: 16,
      });
      expect(fingerTouch.isPalmContact).toBe(false);

      // Broad resting palm contact (> PALM_REJECTION_THRESHOLD_PX)
      const palmTouchWide = analyzePointerEvent({
        pointerType: 'touch',
        width: 45,
        height: 18,
      });
      expect(palmTouchWide.isPalmContact).toBe(true);

      const palmTouchTall = analyzePointerEvent({
        pointerType: 'touch',
        width: 20,
        height: 50,
      });
      expect(palmTouchTall.isPalmContact).toBe(true);

      // Stylus contact should never be rejected as palm contact even with broad reporting
      const widePen = analyzePointerEvent({
        pointerType: 'pen',
        width: 50,
        height: 50,
      });
      expect(widePen.isPalmContact).toBe(false);
    });

    it('normalizes stylus pressure safely within [0, 1] range', () => {
      expect(analyzePointerEvent({ pointerType: 'pen', pressure: 0.75 }).pressure).toBe(0.75);
      expect(analyzePointerEvent({ pointerType: 'pen', pressure: -0.2 }).pressure).toBe(0);
      expect(analyzePointerEvent({ pointerType: 'pen', pressure: 1.5 }).pressure).toBe(1);
      expect(analyzePointerEvent({ pointerType: 'pen', pressure: NaN }).pressure).toBe(0.5);
      expect(analyzePointerEvent({ pointerType: 'pen' }).pressure).toBe(0.5);
    });
  });

  describe('computeModulatedBrushSize', () => {
    it('returns unmodified base size when pressure dynamics are disabled', () => {
      expect(computeModulatedBrushSize(4, 0.2, false)).toBe(4);
      expect(computeModulatedBrushSize(4, 1.0, false)).toBe(4);
    });

    it('scales brush size dynamically according to normalized pen pressure', () => {
      // At light pressure (0.2), brush is modulated down
      const light = computeModulatedBrushSize(4, 0.2, true);
      expect(light).toBeLessThanOrEqual(4);
      expect(light).toBeGreaterThanOrEqual(1);

      // At full pressure (1.0), brush reaches 125%
      const heavy = computeModulatedBrushSize(4, 1.0, true);
      expect(heavy).toBe(5); // round(4 * (0.5 + 0.75)) = round(4 * 1.25) = 5
    });
  });

  describe('Stylus Inversion in Brush Handler', () => {
    it('automatically activates erase mode when pen eraser tip is pressed even while pen tool is active', () => {
      useStudioStore.setState((s) => ({
        ...s,
        tools: { ...s.tools, activeTool: 'pen' },
      }));

      const mockDraw = vi.fn();
      const mockSetLastPoint = vi.fn();

      const { result } = renderHook(() =>
        useBrushPointerHandler({
          drawPointsOnActiveLayer: mockDraw,
          lastPoint: null,
          setLastPoint: mockSetLastPoint,
        })
      );

      const simulatedEraserTipEvent = {
        pointerType: 'pen',
        button: 5,
        buttons: 32,
        shiftKey: false,
      } as unknown as React.PointerEvent;

      result.current.onPointerDown(simulatedEraserTipEvent, { x: 10, y: 12 });

      expect(mockDraw).toHaveBeenCalledTimes(1);
      // Argument 3 is isErase: should be true!
      expect(mockDraw).toHaveBeenCalledWith([{ x: 10, y: 12 }], expect.any(String), true);
    });
  });
});
