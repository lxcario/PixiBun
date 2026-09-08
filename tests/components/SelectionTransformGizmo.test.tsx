// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { SelectionTransformGizmo } from '@/components/studio/SelectionTransformGizmo';
import { TransformState } from '@/hooks/viewport/useViewportSelectionTransform';

describe('SelectionTransformGizmo Component', () => {
  afterEach(cleanup);

  const baseTransform: TransformState = {
    x: 10,
    y: 10,
    w: 20,
    h: 20,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    pivot: { x: 20, y: 20 },
    isTransforming: false,
    activeHandle: null,
  };

  const mockHandlers = {
    onHandlePointerDown: vi.fn(),
    onPointerMove: vi.fn(),
    onPointerUp: vi.fn(),
    onCommit: vi.fn(),
    onCancel: vi.fn(),
    onFlipH: vi.fn(),
    onFlipV: vi.fn(),
    onRotate90CW: vi.fn(),
    onRotate90CCW: vi.fn(),
  };

  it('renders all 8 transform handles and center pivot', () => {
    render(
      <SelectionTransformGizmo
        canvasWidth={64}
        canvasHeight={64}
        zoom={200}
        selectionMask={null}
        transform={baseTransform}
        {...mockHandlers}
      />
    );

    const handleIds = ['tl', 'tc', 'tr', 'mr', 'br', 'bc', 'bl', 'ml'];
    for (const id of handleIds) {
      const handleEl = screen.getByTestId(`gizmo-handle-${id}`);
      expect(handleEl).toBeDefined();
    }

    const pivotEl = screen.getByTestId('gizmo-pivot');
    expect(pivotEl).toBeDefined();
  });

  it('renders outer rotation zones on all 4 corners', () => {
    render(
      <SelectionTransformGizmo
        canvasWidth={64}
        canvasHeight={64}
        zoom={100}
        selectionMask={null}
        transform={baseTransform}
        {...mockHandlers}
      />
    );

    expect(screen.getByTestId('gizmo-rotate-tl')).toBeDefined();
    expect(screen.getByTestId('gizmo-rotate-tr')).toBeDefined();
    expect(screen.getByTestId('gizmo-rotate-br')).toBeDefined();
    expect(screen.getByTestId('gizmo-rotate-bl')).toBeDefined();
  });

  it('renders HUD bar and triggers commit / cancel callbacks', () => {
    render(
      <SelectionTransformGizmo
        canvasWidth={64}
        canvasHeight={64}
        zoom={100}
        selectionMask={null}
        transform={baseTransform}
        {...mockHandlers}
      />
    );

    const commitBtn = screen.getByTestId('gizmo-commit-btn');
    const cancelBtn = screen.getByTestId('gizmo-cancel-btn');

    fireEvent.click(commitBtn);
    expect(mockHandlers.onCommit).toHaveBeenCalledTimes(1);

    fireEvent.click(cancelBtn);
    expect(mockHandlers.onCancel).toHaveBeenCalledTimes(1);
  });

  it('displays live degree badge when rotation is non-zero', () => {
    const rotatedTransform: TransformState = {
      ...baseTransform,
      rotation: Math.PI / 4, // 45 degrees
    };

    render(
      <SelectionTransformGizmo
        canvasWidth={64}
        canvasHeight={64}
        zoom={100}
        selectionMask={null}
        transform={rotatedTransform}
        {...mockHandlers}
      />
    );

    const badge = screen.getByTestId('gizmo-degree-badge');
    expect(badge).toBeDefined();
    expect(badge.textContent).toBe('45.0°');
  });

  it('renders per-pixel contour marching ants when selectionMask is provided', () => {
    const mask = new Uint8Array(64 * 64);
    mask[10 * 64 + 10] = 1;

    const { container } = render(
      <SelectionTransformGizmo
        canvasWidth={64}
        canvasHeight={64}
        zoom={100}
        selectionMask={mask}
        transform={baseTransform}
        {...mockHandlers}
      />
    );

    const marchingAntsPaths = container.querySelectorAll('.marching-ants-black');
    expect(marchingAntsPaths.length).toBeGreaterThanOrEqual(1);
  });

  it('does not render interactive transform handles or drag body when interactive=false', () => {
    const { container } = render(
      <SelectionTransformGizmo
        canvasWidth={64}
        canvasHeight={64}
        zoom={100}
        selectionMask={null}
        transform={baseTransform}
        interactive={false}
        {...mockHandlers}
      />
    );

    // Interactive controls should NOT be rendered
    expect(screen.queryByTestId('selection-transform-gizmo')).toBeNull();
    expect(screen.queryByTestId('gizmo-translate-body')).toBeNull();
    expect(screen.queryByTestId('gizmo-pivot')).toBeNull();

    // Non-interactive marching ants box should still be present with pointer-events-none
    const marchingAntsRects = container.querySelectorAll('.marching-ants-black');
    expect(marchingAntsRects.length).toBeGreaterThanOrEqual(1);
  });

  describe('Transform Pointer Math & Layout Mocking', () => {
    let centerCanvasArea: HTMLDivElement;

    beforeEach(() => {
      if (!Element.prototype.setPointerCapture) {
        Element.prototype.setPointerCapture = vi.fn();
      }
      if (!Element.prototype.releasePointerCapture) {
        Element.prototype.releasePointerCapture = vi.fn();
      }

      // Mount realistic #center-canvas-area in document body
      centerCanvasArea = document.createElement('div');
      centerCanvasArea.id = 'center-canvas-area';
      vi.spyOn(centerCanvasArea, 'getBoundingClientRect').mockReturnValue({
        left: 100,
        top: 50,
        width: 400,
        height: 400,
        right: 500,
        bottom: 450,
        x: 100,
        y: 50,
        toJSON: () => {},
      });
      document.body.appendChild(centerCanvasArea);
    });

    afterEach(() => {
      centerCanvasArea.remove();
    });

    it('calculates inverse zoom affine coordinates on handle pointer down', () => {
      const zoom = 200; // scale = 2
      render(
        <SelectionTransformGizmo
          canvasWidth={64}
          canvasHeight={64}
          zoom={zoom}
          selectionMask={null}
          transform={baseTransform}
          {...mockHandlers}
        />
      );

      const handleBr = screen.getByTestId('gizmo-handle-br');

      // Click at client coordinates (140, 90)
      // With rect at (100, 50) and scale 2:
      // canvasX = (140 - 100) / 2 = 20
      // canvasY = (90 - 50) / 2 = 20
      fireEvent.pointerDown(handleBr, {
        clientX: 140,
        clientY: 90,
        pointerId: 1,
      });

      expect(mockHandlers.onHandlePointerDown).toHaveBeenCalledWith(
        'br',
        { x: 140, y: 90 },
        { x: 20, y: 20 }
      );
    });

    it('calculates inverse coordinates for translation body and rotation zones', () => {
      const zoom = 400; // scale = 4
      render(
        <SelectionTransformGizmo
          canvasWidth={64}
          canvasHeight={64}
          zoom={zoom}
          selectionMask={null}
          transform={baseTransform}
          {...mockHandlers}
        />
      );

      const translateBody = screen.getByTestId('gizmo-translate-body');
      // client (160, 110) => canvas: (160 - 100) / 4 = 15, (110 - 50) / 4 = 15
      fireEvent.pointerDown(translateBody, {
        clientX: 160,
        clientY: 110,
        pointerId: 1,
      });
      expect(mockHandlers.onHandlePointerDown).toHaveBeenCalledWith(
        'translate',
        { x: 160, y: 110 },
        { x: 15, y: 15 }
      );

      const rotateTr = screen.getByTestId('gizmo-rotate-tr');
      // client (180, 70) => canvas: (180 - 100) / 4 = 20, (70 - 50) / 4 = 5
      fireEvent.pointerDown(rotateTr, {
        clientX: 180,
        clientY: 70,
        pointerId: 1,
      });
      expect(mockHandlers.onHandlePointerDown).toHaveBeenCalledWith(
        'rotate',
        { x: 180, y: 70 },
        { x: 20, y: 5 }
      );
    });

    it('dispatches onPointerMove with modifiers when isTransforming is true', () => {
      const zoom = 100; // scale = 1
      const activeTransform: TransformState = {
        ...baseTransform,
        isTransforming: true,
        activeHandle: 'br',
      };

      render(
        <SelectionTransformGizmo
          canvasWidth={64}
          canvasHeight={64}
          zoom={zoom}
          selectionMask={null}
          transform={activeTransform}
          {...mockHandlers}
        />
      );

      // client (150, 80) => canvas: (150 - 100) / 1 = 50, (80 - 50) / 1 = 30
      fireEvent.pointerMove(window, {
        clientX: 150,
        clientY: 80,
        shiftKey: true,
        altKey: true,
      });

      expect(mockHandlers.onPointerMove).toHaveBeenCalledWith(
        { x: 50, y: 30 },
        { shiftKey: true, altKey: true }
      );

      fireEvent.pointerUp(window);
      expect(mockHandlers.onPointerUp).toHaveBeenCalledTimes(1);
    });
  });

  describe('Zoom-Range Hitbox Invariance (100% to 6400%)', () => {
    const extremeZooms = [100, 200, 800, 1600, 3200, 6400];
    const handleIds = ['tl', 'tc', 'tr', 'mr', 'br', 'bc', 'bl', 'ml'];

    extremeZooms.forEach((zoomLevel) => {
      it(`maintains invariant 18x18px screen-space hitboxes at ${zoomLevel}% zoom`, () => {
        const { unmount } = render(
          <SelectionTransformGizmo
            canvasWidth={64}
            canvasHeight={64}
            zoom={zoomLevel}
            selectionMask={null}
            transform={baseTransform}
            {...mockHandlers}
          />
        );

        // Verify all 8 handles keep invariant 18px hitbox in CSS screen pixels
        for (const id of handleIds) {
          const handleEl = screen.getByTestId(`gizmo-handle-${id}`);
          expect(handleEl.style.width).toBe('18px');
          expect(handleEl.style.height).toBe('18px');

          // Inner visible box maintains invariant 8px size
          const visualBox = handleEl.firstElementChild as HTMLElement;
          expect(visualBox).not.toBeNull();
          expect(visualBox.style.width).toBe('8px');
          expect(visualBox.style.height).toBe('8px');
        }

        // Verify pivot reticle retains invariant 20px (w-5 h-5) container
        const pivotEl = screen.getByTestId('gizmo-pivot');
        expect(pivotEl.className).toContain('w-5');
        expect(pivotEl.className).toContain('h-5');

        // Verify 4 outer rotation zones retain invariant 24px (w-6 h-6) touch targets
        ['tl', 'tr', 'br', 'bl'].forEach((corner) => {
          const rotZone = screen.getByTestId(`gizmo-rotate-${corner}`);
          expect(rotZone.className).toContain('w-6');
          expect(rotZone.className).toContain('h-6');
        });

        unmount();
      });
    });
  });
});

