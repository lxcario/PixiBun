// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { ExportModal } from '@/components/modals/ExportModal';
import { useStudioStore } from '@/stores/studioStore';
import { studioEvents } from '@/lib/events/studioEvents';
import { makeCanvas, type MockCtx } from '../helpers/mockCanvas';
import * as compositor from '@/lib/render/compositor';
import * as webm from '@/lib/export/webmEncoder';
import * as mp4 from '@/lib/export/mp4Encoder';

vi.mock('@/lib/project/serialize', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/project/serialize')>();
  return {
    ...actual,
    buildProjectFileAsync: vi.fn().mockResolvedValue({
      format: 'PIXIBUN_PROJECT',
      version: 1,
      name: 'Test Project',
      width: 8,
      height: 8,
      fps: 8,
      frames: [],
    }),
  };
});

const motionComponentCache: Record<string, React.ComponentType<Record<string, unknown>>> = {};
vi.mock('motion/react', () => {
  return {
    useReducedMotion: () => true,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: new Proxy(
      {},
      {
        get: (_target, prop: string) => {
          if (!motionComponentCache[prop]) {
            motionComponentCache[prop] = React.forwardRef((props: Record<string, unknown>, ref: React.Ref<unknown>) => {
              const {
                initial: _initial,
                animate: _animate,
                exit: _exit,
                transition: _transition,
                variants: _variants,
                whileHover: _whileHover,
                whileTap: _whileTap,
                onAnimationComplete: _onAnimationComplete,
                viewport: _viewport,
                whileInView: _whileInView,
                layoutId: _layoutId,
                ...rest
              } = props;
              return React.createElement(prop, { ...rest, ref });
            });
          }
          return motionComponentCache[prop];
        },
      }
    ),
  };
});

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
      clips: [],
      loopMode: 'repeat',
    });
  });

  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it.each([
    ['webm', 'reverse', [2, 1, 0], [110, 230, 70]],
    ['mp4', 'reverse', [2, 1, 0], [110, 230, 70]],
    ['webm', 'ping-pong', [0, 1, 2, 1], [70, 230, 110, 230]],
    ['mp4', 'ping-pong', [0, 1, 2, 1], [70, 230, 110, 230]],
  ] as const)('sends %s the %s pose sequence, its own holds and the chosen video cycles', async (format, direction, order, holds) => {
    const sourceFrames = [70, 230, 110].map((durationMs, i) => ({ ...useStudioStore.getState().frames[0], id: `video-${i}`, durationMs }));
    useStudioStore.setState({ frames: sourceFrames, clips: [{ id: 'direction', name: 'Direction', startFrame: 0, endFrame: 2, loopMode: direction }] });
    const canvases = sourceFrames.map(() => makeCanvas(8, 8));
    vi.spyOn(compositor, 'compositeFrame').mockImplementation((frames, index) => canvases[sourceFrames.findIndex(f => f.id === frames[index].id)]);
    vi.spyOn(webm, 'isWebmExportSupported').mockReturnValue(true);
    vi.spyOn(mp4, 'probeMp4ExportSupport').mockResolvedValue(true);
    const encoder = format === 'webm' ? vi.spyOn(webm, 'exportAnimationToWebmAsync') : vi.spyOn(mp4, 'exportAnimationToMp4Async');
    encoder.mockResolvedValue(new Blob(['video']));
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:video');
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<ExportModal isOpen onClose={vi.fn()} initialType={format} />);
    await act(async () => { await Promise.resolve(); });
    fireEvent.change(screen.getByRole('combobox', { name: 'Export frame scope' }), { target: { value: 'direction' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: `Download ${format.toUpperCase()}` })); });
    expect(encoder).toHaveBeenCalledOnce();
    expect(encoder.mock.calls[0][0]).toEqual(order.map(i => canvases[i]));
    expect(encoder.mock.calls[0][1]).toEqual(expect.objectContaining({ durationsMs: [...holds], loopCount: 2 }));
  });

  it('shows a user-facing error when PNG encoding fails', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(() => {
      throw new Error('Canvas encoding unavailable');
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const toast = vi.fn();
    const unsubscribe = studioEvents.on('pixibun:toast', toast);
    const handleClose = vi.fn();
    try {
      render(<ExportModal isOpen={true} onClose={handleClose} />);
      fireEvent.click(screen.getByRole('button', { name: /Download PNG/i }));
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({
        type: 'error',
        message: expect.stringMatching(/Canvas encoding unavailable/),
      }));
      expect(handleClose).not.toHaveBeenCalled();
    } finally {
      unsubscribe();
    }
  });

  it('defers URL.revokeObjectURL by 1000ms on project JSON export to prevent download abortion', async () => {
    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-project-url');
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const handleClose = vi.fn();
    render(<ExportModal isOpen={true} onClose={handleClose} />);

    // Switch to the portable project backup tab.
    const projectTab = screen.getByRole('button', { name: 'Project Backup' });
    fireEvent.click(projectTab);

    // Click download button
    const downloadBtn = screen.getByRole('button', { name: /Download project backup/i });
    fireEvent.click(downloadBtn);
    await act(async () => {
      await Promise.resolve();
    });

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
