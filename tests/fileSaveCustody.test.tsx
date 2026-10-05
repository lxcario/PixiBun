// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useStudioFileSystem } from '@/hooks/studio/useStudioFileSystem';
import { useStudioStore } from '@/stores/studioStore';
import { DesktopFileSystem } from '@/lib/storage/desktopFileSystem';
import { studioEvents } from '@/lib/events/studioEvents';

vi.mock('@/lib/project/serialize', () => ({ buildProjectFileAsync: vi.fn(async () => ({ name: 'File artwork' })) }));
beforeEach(() => { useStudioStore.getState().resetToNewProject(); useStudioStore.getState().setDirty(true); useStudioStore.getState().setSaveStatus('error'); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
it.each([false, true])('a successful project file operation (fallback=%s) does not acknowledge browser storage or clear unsaved artwork', async fallbackUsed => {
  vi.spyOn(DesktopFileSystem, 'saveProject').mockResolvedValue({ success: true, filename: 'file.pixibun', fallbackUsed });
  const hook = renderHook(useStudioFileSystem); await act(async () => { await hook.result.current.handleSaveDesktopProject(true); });
  expect(useStudioStore.getState().isDirty).toBe(true); expect(useStudioStore.getState().saveStatus).toBe('error');
});
it('native file-write failures give visible feedback while preserving browser save state', async () => {
  vi.spyOn(DesktopFileSystem, 'saveProject').mockRejectedValue(new Error('Disk unavailable')); vi.spyOn(console, 'error').mockImplementation(() => {});
  const toast = vi.fn(), unsubscribe = studioEvents.on('pixibun:toast', toast);
  try {
    const hook = renderHook(useStudioFileSystem); await act(async () => { await hook.result.current.handleSaveDesktopProject(true); });
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ type: 'error', message: expect.stringContaining('still open') }));
    expect(useStudioStore.getState().isDirty).toBe(true); expect(useStudioStore.getState().saveStatus).toBe('error');
  } finally { unsubscribe(); }
});
