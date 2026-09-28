// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act, waitFor } from '@testing-library/react';
import { StudioLayout } from '@/components/layout/StudioLayout';
import { useStudioStore } from '@/stores/studioStore';
import * as db from '@/lib/storage/db';

vi.mock('@/lib/storage/db', async (importOriginal) => {
  const actual = await importOriginal<typeof db>();
  return {
    ...actual,
    autoSaveWorkspaceDetailed: vi.fn(),
    loadLatestSavedWorkspace: vi.fn().mockResolvedValue(null),
  };
});

vi.mock('@/lib/project/serialize', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/project/serialize')>();
  return {
    ...actual,
    buildAutosavePayloadAsync: vi.fn().mockResolvedValue({
      project: {
        id: 'test-proj',
        name: 'Test Project',
        width: 16,
        height: 16,
        fps: 8,
        createdAt: 1000,
        updatedAt: 1000,
        frames: [],
        clips: [],
        palettes: [],
        currentPaletteId: 'default',
        customRamps: [],
        onionSkin: { enabled: false, prevFrames: 1, nextFrames: 1, prevColor: '#000', nextColor: '#fff', opacity: 0.5 },
      },
      layerBlobs: [],
    }),
  };
});

describe('Autosave status propagation', () => {
  beforeEach(() => {
    useStudioStore.setState({ saveStatus: 'idle' });
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    vi.clearAllMocks();
  });

  it('sets saveStatus to error when autoSaveWorkspaceDetailed returns failure', async () => {
    vi.mocked(db.autoSaveWorkspaceDetailed).mockResolvedValue({ ok: false, reason: 'error', error: 'Storage failed' });

    render(<StudioLayout />);

    // Since runAutosave is internal, we can trigger it by simulating pagehide
    // which triggers the best-effort flush in StudioLayout's useEffect.
    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });

    await waitFor(() => {
      expect(useStudioStore.getState().saveStatus).toBe('error');
    });
  });

  it('triggers autosave flush on visibilitychange when document becomes hidden', async () => {
    vi.mocked(db.autoSaveWorkspaceDetailed).mockResolvedValue({ ok: true, status: 'saved' });

    render(<StudioLayout />);

    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await waitFor(() => {
      expect(db.autoSaveWorkspaceDetailed).toHaveBeenCalled();
    });
  });

  it('does not silently drop saves when multiple flush triggers fire in quick succession', async () => {
    vi.mocked(db.autoSaveWorkspaceDetailed).mockResolvedValue({ ok: true, status: 'saved' });

    render(<StudioLayout />);

    // Wait for any mount-triggered saves to settle
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // Clear and count from this point
    vi.mocked(db.autoSaveWorkspaceDetailed).mockClear();
    vi.mocked(db.autoSaveWorkspaceDetailed).mockResolvedValue({ ok: true, status: 'saved' });

    // Fire 3 rapid pagehide events — the pending coalescing loop should
    // ensure that at least the final state is captured even if saves overlap.
    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });
    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });
    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });

    await waitFor(() => {
      // With instant-resolving mocks, the do-while pending loop should
      // have run autoSaveWorkspaceDetailed at least twice (initial + coalesced pending).
      expect(vi.mocked(db.autoSaveWorkspaceDetailed).mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });
});
