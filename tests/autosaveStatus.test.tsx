// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, act, waitFor } from '@testing-library/react';
import { StudioLayout } from '@/components/layout/StudioLayout';
import { useStudioStore } from '@/stores/studioStore';
import * as db from '@/lib/storage/db';

vi.mock('@/lib/storage/db', async (importOriginal) => {
  const actual = await importOriginal<typeof db>();
  return {
    ...actual,
    autoSaveWorkspace: vi.fn(),
    loadLatestSavedWorkspace: vi.fn().mockResolvedValue(null),
  };
});

describe('Autosave status propagation', () => {
  beforeEach(() => {
    useStudioStore.setState({ saveStatus: 'idle' });
    vi.clearAllMocks();
  });

  it('sets saveStatus to error when autoSaveWorkspace returns false', async () => {
    vi.mocked(db.autoSaveWorkspace).mockResolvedValue(false);

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
});
