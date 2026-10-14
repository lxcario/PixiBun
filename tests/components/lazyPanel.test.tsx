// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { lazyPanel } from '@/components/system/lazyPanel';

vi.mock('@/lib/diagnostics/capture', () => ({ captureDiagnostic: vi.fn() }));

const chunkError = () => Object.assign(new Error('Failed to load chunk /_next/static/chunks/export.js'), { name: 'ChunkLoadError' });

describe('lazyPanel', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('keeps an inline panel failure local and loads the panel on retry', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const Panel = ({ name }: { name: string }) => <p>{name} ready</p>;
    const load = vi.fn<() => Promise<typeof Panel>>()
      .mockRejectedValueOnce(chunkError())
      .mockResolvedValue(Panel);
    const Lazy = lazyPanel(load, 'PixiTools', 'inline');
    render(<main><p>canvas</p><Lazy name="FX" /></main>);

    expect((await screen.findByTestId('panel-load-error')).textContent).toContain('PixiTools could not load.');
    expect(screen.getByText('canvas')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('FX ready')).toBeDefined();
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('offers Close in a dialog failure and hides it while the dialog is closed', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const onClose = vi.fn();
    const Lazy = lazyPanel<{ isOpen: boolean; onClose: () => void }>(() => Promise.reject(chunkError()), 'Export');
    const { rerender } = render(<Lazy isOpen onClose={onClose} />);

    expect(await screen.findByTestId('panel-load-error')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);

    rerender(<Lazy isOpen={false} onClose={onClose} />);
    expect(screen.queryByTestId('panel-load-error')).toBeNull();
  });
});
