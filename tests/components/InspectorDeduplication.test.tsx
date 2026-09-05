// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { VolumetricOpticsSection } from '@/components/layout/inspector/VolumetricOpticsSection';
import { TilesetDecomposerSection } from '@/components/layout/inspector/TilesetDecomposerSection';
import { studioEvents } from '@/lib/events/studioEvents';

describe('Inspector Control Deduplication', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('VolumetricOpticsSection excludes misplaced 47-Blob Autotile Edges and duplicate Ground Drop Shadow buttons', () => {
    render(<VolumetricOpticsSection />);

    // Primary action button must be present
    expect(screen.getByRole('button', { name: /Render Volumetric Optics/i })).toBeDefined();

    // The misplaced buttons must be completely absent
    expect(screen.queryByRole('button', { name: /47-Blob Autotile Edges/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Ground Drop Shadow/i })).toBeNull();
  });

  it('TilesetDecomposerSection renders 47-Blob Autotile Edges and emits studioEvents', () => {
    const emitSpy = vi.spyOn(studioEvents, 'emit');

    render(<TilesetDecomposerSection />);

    const blobBtn = screen.getByRole('button', { name: /47-Blob Autotile Edges/i });
    expect(blobBtn).toBeDefined();

    fireEvent.click(blobBtn);

    expect(emitSpy).toHaveBeenCalledWith('pixibun:apply-47-blob');
  });
});
