// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import { CursorStatusBadge, subscribeCursorHUD, updateCursorHUD } from '@/components/layout/CursorStatusBadge';

describe('CursorStatusBadge component', () => {
  afterEach(() => {
    act(() => {
      updateCursorHUD(null);
    });
    cleanup();
  });

  it('does not render when cursor coords are null', () => {
    const { container } = render(<CursorStatusBadge />);
    expect(container.firstChild).toBeNull();
  });

  it('renders coordinate values when updateCursorHUD is called', () => {
    render(<CursorStatusBadge />);

    act(() => {
      updateCursorHUD({ x: 14, y: 28 });
    });

    const badge = screen.getByTestId('cursor-status-badge');
    expect(badge).toBeDefined();
    expect(badge.textContent).toContain('X: 14 Y: 28');
  });

  it('clears display when updateCursorHUD is set to null', () => {
    const { container } = render(<CursorStatusBadge />);

    act(() => {
      updateCursorHUD({ x: 5, y: 10 });
    });
    expect(screen.getByTestId('cursor-status-badge')).toBeDefined();

    act(() => {
      updateCursorHUD(null);
    });
    expect(container.firstChild).toBeNull();
  });
  it('notifies subscribers only when the canvas pixel changes', () => {
    const seen: Array<{ x: number; y: number } | null> = [];
    const unsubscribe = subscribeCursorHUD((c) => seen.push(c));
    updateCursorHUD({ x: 3, y: 4 });
    updateCursorHUD({ x: 3, y: 4 });
    updateCursorHUD({ x: 3, y: 4 });
    updateCursorHUD({ x: 4, y: 4 });
    updateCursorHUD(null);
    updateCursorHUD(null);
    unsubscribe();
    expect(seen).toEqual([null, { x: 3, y: 4 }, { x: 4, y: 4 }, null]);
  });

  it('gives a late subscriber the current coordinates', () => {
    updateCursorHUD({ x: 7, y: 9 });
    render(<CursorStatusBadge />);
    expect(screen.getByTestId('cursor-status-badge').textContent).toContain('X: 7 Y: 9');
  });
});
