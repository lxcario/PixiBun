// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, screen, cleanup } from '@testing-library/react';
import { PixelLightBulbGizmo } from '@/components/studio/PixelLightBulbGizmo';

describe('PixelLightBulbGizmo Component', () => {
  afterEach(() => {
    cleanup();
  });

  const dummyCanvasRef = { current: null };

  it('renders the interactive on-canvas light bulb gizmo with HUD controls', () => {
    const onCommit = vi.fn();
    const onCancel = vi.fn();

    render(
      <PixelLightBulbGizmo
        canvasWidth={32}
        canvasHeight={32}
        zoom={1600}
        mainCanvasRef={dummyCanvasRef}
        onCommit={onCommit}
        onCancel={onCancel}
      />
    );

    expect(screen.getByTestId('pixel-light-bulb-gizmo')).toBeDefined();
    expect(screen.getByRole('toolbar', { name: 'Live Light Bulb Controls' })).toBeDefined();
    expect(screen.getByRole('slider', { name: /Directional Light Bulb/i })).toBeDefined();
    expect(screen.getByText(/Live Light Bulb/i)).toBeDefined();
  });

  it('handles Apply and Cancel button clicks', () => {
    const onCommit = vi.fn();
    const onCancel = vi.fn();

    render(
      <PixelLightBulbGizmo
        canvasWidth={32}
        canvasHeight={32}
        zoom={1600}
        mainCanvasRef={dummyCanvasRef}
        onCommit={onCommit}
        onCancel={onCancel}
      />
    );

    const applyBtn = screen.getByRole('button', { name: /Apply/i });
    fireEvent.click(applyBtn);
    expect(onCommit).toHaveBeenCalledTimes(1);

    const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelBtn);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('triggers onCommit when Enter key is pressed', () => {
    const onCommit = vi.fn();
    const onCancel = vi.fn();

    render(
      <PixelLightBulbGizmo
        canvasWidth={32}
        canvasHeight={32}
        zoom={1600}
        mainCanvasRef={dummyCanvasRef}
        onCommit={onCommit}
        onCancel={onCancel}
      />
    );

    fireEvent.keyDown(window, { key: 'Enter' });
    expect(onCommit).toHaveBeenCalledTimes(1);
  });

  it('triggers onCancel when Escape key is pressed', () => {
    const onCommit = vi.fn();
    const onCancel = vi.fn();

    render(
      <PixelLightBulbGizmo
        canvasWidth={32}
        canvasHeight={32}
        zoom={1600}
        mainCanvasRef={dummyCanvasRef}
        onCommit={onCommit}
        onCancel={onCancel}
      />
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
