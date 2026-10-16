// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { TilesetDecomposerSection } from '@/components/layout/inspector/TilesetDecomposerSection';
import { studioEvents } from '@/lib/events/studioEvents';

describe('Inspector Control Deduplication', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('TilesetDecomposerSection offers a contour preview before applying', () => {
    const emitSpy = vi.spyOn(studioEvents, 'emit');

    render(<TilesetDecomposerSection />);
    // The section starts closed; its body is hidden until opened.
    expect(screen.queryByRole('button', { name: /Preview 47-blob contours/i })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Patterns & Tilesets' }));

    const blobBtn = screen.getByRole('button', { name: /Preview 47-blob contours/i });
    expect(blobBtn).toBeDefined();

    fireEvent.click(blobBtn);

    expect(emitSpy).not.toHaveBeenCalledWith('pixibun:apply-47-blob');
  });
});
