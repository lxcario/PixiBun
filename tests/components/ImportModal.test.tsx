// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ImportModal, ImportPayload } from '@/components/modals/ImportModal';
import { useStudioStore } from '@/stores/studioStore';
import { makeCanvas, type MockCtx } from '../helpers/mockCanvas';

describe('ImportModal Component & Sprite Sheet Slicer', () => {
  let originalGetContext: typeof HTMLCanvasElement.prototype.getContext;

  beforeEach(() => {
    const contextMap = new WeakMap<HTMLCanvasElement, MockCtx>();
    originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, contextId: string) {
      if (contextId === '2d') {
        let ctx = contextMap.get(this);
        if (!ctx) {
          const mc = makeCanvas(this.width || 64, this.height || 64);
          ctx = mc.getContext('2d') as MockCtx;
          contextMap.set(this, ctx);
        }
        return ctx;
      }
      return null;
    } as unknown as typeof HTMLCanvasElement.prototype.getContext;

    useStudioStore.setState({
      projectName: 'Test Project',
      canvasWidth: 32,
      canvasHeight: 32,
      frames: [
        {
          id: 'f1',
          durationMs: 100,
          layers: [
            {
              id: 'l1',
              name: 'Layer 1',
              visible: true,
              locked: false,
              opacity: 1,
              blendMode: 'source-over',
            },
          ],
        },
      ],
      activeFrameIndex: 0,
      activeLayerId: 'l1',
    });
  });

  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    cleanup();
    vi.restoreAllMocks();
  });

  const mockImagePayload: ImportPayload = {
    type: 'image',
    filename: 'hero_spritesheet.png',
    dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    imgWidth: 64,
    imgHeight: 32,
  };

  it('renders mode switcher tabs and switches between single sprite and slicer mode', () => {
    const handleClose = vi.fn();
    const handleConfirmImage = vi.fn();
    const handleConfirmProject = vi.fn();

    render(
      <ImportModal
        isOpen={true}
        payload={mockImagePayload}
        onClose={handleClose}
        onConfirmImage={handleConfirmImage}
        onConfirmProject={handleConfirmProject}
      />
    );

    // Initial mode: Single Sprite
    expect(screen.getByText('Single Sprite / Layer')).toBeDefined();
    expect(screen.getByText('Sprite Sheet Slicer')).toBeDefined();

    // Click Sprite Sheet Slicer tab
    fireEvent.click(screen.getByText('Sprite Sheet Slicer'));

    // Slicer controls should now be visible
    expect(screen.getByText(/Cell Dimensions/)).toBeDefined();
    expect(screen.getByText('16×16')).toBeDefined();
    expect(screen.getByText('32×32')).toBeDefined();
    expect(screen.getByText('Append to Timeline')).toBeDefined();
    expect(screen.getByText('Replace Frames')).toBeDefined();
    expect(screen.getByText('Slice & Import Frames')).toBeDefined();
  });

  it('updates cell width and height when preset button is clicked', () => {
    const handleClose = vi.fn();
    const handleConfirmImage = vi.fn();
    const handleConfirmProject = vi.fn();

    render(
      <ImportModal
        isOpen={true}
        payload={mockImagePayload}
        onClose={handleClose}
        onConfirmImage={handleConfirmImage}
        onConfirmProject={handleConfirmProject}
      />
    );

    // Switch to Slicer mode
    fireEvent.click(screen.getByText('Sprite Sheet Slicer'));

    // Click 16x16 preset
    const preset16 = screen.getByText('16×16');
    fireEvent.click(preset16);

    // Summary should show calculated columns and rows for 64x32 image with 16x16 cells:
    // 4 cols x 2 rows = 8 total frames
    expect(screen.getByText(/4 cols × 2 rows = 8 total frames/)).toBeDefined();
  });

  it('preserves blank animation cells by default and can opt in to skipping them', () => {
    const handleClose = vi.fn();
    const handleConfirmImage = vi.fn();
    const handleConfirmProject = vi.fn();

    render(
      <ImportModal
        isOpen={true}
        payload={mockImagePayload}
        onClose={handleClose}
        onConfirmImage={handleConfirmImage}
        onConfirmProject={handleConfirmProject}
      />
    );

    // Switch to Slicer mode
    fireEvent.click(screen.getByText('Sprite Sheet Slicer'));

    // The mock canvas initially has all-zero (transparent) image data
    // In HappyDOM, image loading triggers the preview where all cells are empty
    const skipEmptyCheckbox = screen.getByLabelText('Skip Empty (Transparent) Cells — shortens animation') as HTMLInputElement;
    expect(skipEmptyCheckbox.checked).toBe(false);

    const sliceBtn = screen.getByText('Slice & Import Frames').closest('button');
    expect(sliceBtn).toBeDefined();
    expect(sliceBtn?.disabled).toBe(false);
    fireEvent.click(skipEmptyCheckbox);
    expect(skipEmptyCheckbox.checked).toBe(true);
  });
});
