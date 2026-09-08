// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
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
});
