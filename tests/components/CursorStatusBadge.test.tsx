// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import { CursorStatusBadge, updateCursorHUD } from '@/components/layout/CursorStatusBadge';

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
});
