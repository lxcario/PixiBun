// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { ExportModal } from '@/components/modals/ExportModal';
import { useStudioStore } from '@/stores/studioStore';
import { makeCanvas, type MockCtx } from '../helpers/mockCanvas';

describe('ExportModal URL.revokeObjectURL deferred cleanup', () => {
  let originalGetContext: typeof HTMLCanvasElement.prototype.getContext;

  beforeEach(() => {
    vi.useFakeTimers();

    const contextMap = new WeakMap<HTMLCanvasElement, MockCtx>();
    originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, contextId: string) {
      if (contextId === '2d') {
        let ctx = contextMap.get(this);
        if (!ctx) {
          const mc = makeCanvas(this.width || 32, this.height || 32);
          ctx = mc.getContext('2d') as MockCtx;
          contextMap.set(this, ctx);
        }
        return ctx;
      }
      return null;
    } as unknown as typeof HTMLCanvasElement.prototype.getContext;

    useStudioStore.setState({
      projectName: 'Test Project',
      canvasWidth: 8,
      canvasHeight: 8,
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
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('defers URL.revokeObjectURL by 1000ms on project JSON export to prevent download abortion', () => {
    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-project-url');
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const handleClose = vi.fn();
    render(<ExportModal isOpen={true} onClose={handleClose} />);

    // Switch to Project JSON (.pixibun) tab
    const projectTab = screen.getByRole('button', { name: '.pixibun' });
    fireEvent.click(projectTab);

    // Click download button
    const downloadBtn = screen.getByRole('button', { name: /Download PROJECT/i });
    fireEvent.click(downloadBtn);

    // Object URL should have been created and clicked
    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();

    // Revocation must NOT have happened synchronously
    expect(revokeObjectURLSpy).not.toHaveBeenCalled();

    // Fast forward past 1000ms
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Revocation must occur after the 1000ms delay
    expect(revokeObjectURLSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-project-url');
    expect(handleClose).toHaveBeenCalled();
  });

  it('defers URL.revokeObjectURL by 1000ms on Vector SVG export', () => {
    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-svg-url');
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const handleClose = vi.fn();
    render(<ExportModal isOpen={true} onClose={handleClose} />);

    // Switch to Vector SVG tab
    const svgTab = screen.getByRole('button', { name: 'Vector SVG' });
    fireEvent.click(svgTab);

    // Click download button
    const downloadBtn = screen.getByRole('button', { name: /Download SVG/i });
    fireEvent.click(downloadBtn);

    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();

    // Not revoked synchronously
    expect(revokeObjectURLSpy).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(revokeObjectURLSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-svg-url');
    expect(handleClose).toHaveBeenCalled();
  });
});
