import { afterEach, describe, expect, it, vi } from 'vitest';
import { useStudioStore } from '@/stores/studioStore';
import { getStudioResume, registerStudioRouteSession, setStudioResume, type StudioResume } from '@/lib/project/studioRouteSession';
import { saveAfterStudioCrash } from '@/lib/project/studioCrashSave';

const projectId = 'proj_crash_save';
const resume = (): StudioResume => ({
  projectId, storageVersions: new Map(), lifecycle: { phase: 'active', projectId }, conflictProjectId: null,
});

describe('saveAfterStudioCrash', () => {
  afterEach(() => {
    setStudioResume(null);
    registerStudioRouteSession({ projectId: 'proj_other', resume, checkpoint: async () => resume() });
  });

  it('saves unsaved strokes and publishes the resume ticket before the save finishes', async () => {
    useStudioStore.setState({ currentProjectId: projectId, isDirty: true });
    let finish!: () => void;
    const checkpoint = vi.fn(() => new Promise<StudioResume>(resolve => { finish = () => resolve(resume()); }));
    registerStudioRouteSession({ projectId, resume, checkpoint });

    const saving = saveAfterStudioCrash();
    // Resume during the save must wait for it rather than rehydrate older pixels.
    expect(getStudioResume(projectId)?.checkpoint).toBeInstanceOf(Promise);
    finish();
    expect(await saving).toEqual({ saved: true });
    expect(checkpoint).toHaveBeenCalledTimes(1);
    expect(getStudioResume(projectId)?.checkpoint).toBeUndefined();
  });

  it('reports a failed save instead of claiming the artwork is safe', async () => {
    useStudioStore.setState({ currentProjectId: projectId, isDirty: true });
    registerStudioRouteSession({ projectId, resume, checkpoint: async () => { throw new Error('Quota exceeded'); } });

    expect(await saveAfterStudioCrash()).toEqual({ saved: false, error: 'Quota exceeded' });
    expect(getStudioResume(projectId)?.error).toBe('Quota exceeded');
  });

  it('reports unsaved work when no Studio session can save it', async () => {
    useStudioStore.setState({ currentProjectId: 'proj_unregistered', isDirty: true });
    expect(await saveAfterStudioCrash()).toMatchObject({ saved: false });
    useStudioStore.setState({ isDirty: false });
    expect(await saveAfterStudioCrash()).toEqual({ saved: true });
  });

  it('does not write again when nothing changed since the last save', async () => {
    useStudioStore.setState({ currentProjectId: projectId, isDirty: false });
    const checkpoint = vi.fn(async () => resume());
    registerStudioRouteSession({ projectId, resume, checkpoint });
    expect(await saveAfterStudioCrash()).toEqual({ saved: true });
    expect(checkpoint).not.toHaveBeenCalled();
    expect(getStudioResume(projectId)?.projectId).toBe(projectId);
  });
});
