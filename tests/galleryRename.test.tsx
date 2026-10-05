// @vitest-environment happy-dom
import 'fake-indexeddb/auto';
import React from 'react';
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ProjectsGalleryModal } from '@/components/modals/ProjectsGalleryModal';
import { useStudioAutosave } from '@/hooks/studio/useStudioAutosave';
import { useStudioStore } from '@/stores/studioStore';
import { db, autoSaveWorkspaceDetailed, createBlankProjectFile, getStoredProjectVersion, renameProject } from '@/lib/storage/db';
import { buildAutosavePayloadAsync } from '@/lib/project/serialize';

vi.mock('@/lib/storage/db', async importOriginal => ({
  ...await importOriginal<typeof import('@/lib/storage/db')>(), getLatestStoredProjectId: vi.fn().mockResolvedValue(null),
}));
vi.mock('@/lib/project/serialize', () => ({ buildAutosavePayloadAsync: vi.fn(), generateCompositeThumbnail: vi.fn(), hydrateProject: vi.fn() }));
const motionComponents: Record<string, React.ComponentType<Record<string, unknown>>> = {};
vi.mock('motion/react', () => ({
  useReducedMotion: () => true,
  motion: new Proxy({}, { get: (_target, tag: string) => {
    if (!motionComponents[tag]) motionComponents[tag] = React.forwardRef((props: Record<string, unknown>, ref: React.Ref<HTMLElement>) => {
      const rest = Object.fromEntries(Object.entries(props).filter(([key]) => !['initial', 'animate', 'exit', 'transition', 'whileHover', 'whileTap', 'variants', 'layout'].includes(key)));
      return React.createElement(tag, { ...rest, ref });
    });
    return motionComponents[tag];
  } }),
}));

beforeEach(async () => {
  vi.clearAllMocks(); await db.delete(); await db.open();
  useStudioStore.getState().resetToNewProject('rename-active');
  vi.mocked(buildAutosavePayloadAsync).mockImplementation(async () => ({ project: createBlankProjectFile(useStudioStore.getState().projectName), layerBlobs: [], capturedRevisions: new Map(), dirtyLayerCount: 0, totalLayerCount: 1 }));
});
afterEach(async () => { cleanup(); await db.delete(); });
async function coordinator() {
  const hook = renderHook(useStudioAutosave);
  await waitFor(() => expect(hook.result.current.lifecycleState.phase).toBe('active'));
  await act(async () => { expect((await hook.result.current.runAutosave()).ok).toBe(true); });
  return hook;
}
async function gallery() {
  const hook = await coordinator(), close = vi.fn(), open = vi.fn();
  render(<ProjectsGalleryModal isOpen onClose={close} currentProjectId="rename-active" onOpenProject={open} onNewProject={vi.fn()} onRenameProject={hook.result.current.renameStoredProject} />);
  await screen.findByRole('button', { name: /Open project Untitled Sprite/ });
  fireEvent.click(screen.getByRole('button', { name: 'Rename artwork' }));
  return { hook, close, open, input: screen.getByRole('textbox', { name: 'Artwork title' }) };
}

it('mouse submission saves through the coordinator without opening the card, and the next save accepts its version', async () => {
  const view = await gallery(); fireEvent.click(view.input); fireEvent.change(view.input, { target: { value: 'New title' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save title' }));
  await waitFor(() => expect(screen.queryByRole('textbox', { name: 'Artwork title' })).toBeNull());
  expect(view.close).not.toHaveBeenCalled(); expect(view.open).not.toHaveBeenCalled();
  expect((await db.projects.get('rename-active'))?.name).toBe('New title');
  act(() => useStudioStore.getState().setDirty(true));
  await act(async () => { expect((await view.hook.result.current.runAutosave()).ok).toBe(true); });
  expect(view.hook.result.current.saveConflict).toBe(false);
});

it('contains Space and Enter inside the form, allows keyboard submission, and Escape cancels only rename', async () => {
  const view = await gallery();
  fireEvent.keyDown(view.input, { key: ' ' }); fireEvent.keyDown(view.input, { key: 'Enter' });
  expect(view.close).not.toHaveBeenCalled(); expect(view.open).not.toHaveBeenCalled();
  fireEvent.change(view.input, { target: { value: 'Space in title' } }); fireEvent.submit(view.input.closest('form')!);
  await waitFor(() => expect(screen.queryByRole('textbox', { name: 'Artwork title' })).toBeNull());
  expect((await db.projects.get('rename-active'))?.name).toBe('Space in title');
  fireEvent.click(screen.getByRole('button', { name: 'Rename artwork' }));
  fireEvent.keyDown(screen.getByRole('textbox', { name: 'Artwork title' }), { key: 'Escape' });
  expect(screen.queryByRole('textbox', { name: 'Artwork title' })).toBeNull(); expect(view.close).not.toHaveBeenCalled();
});

it('retains real external conflict protection after active rename', async () => {
  const hook = await coordinator(), original = (await db.projects.get('rename-active'))!;
  expect(await renameProject('rename-active', 'Other tab', getStoredProjectVersion(original))).toBe(true);
  await act(async () => { expect(await hook.result.current.renameStoredProject('rename-active', 'My title', getStoredProjectVersion(original))).toBe(false); });
  expect((await db.projects.get('rename-active'))?.name).toBe('Other tab');
  expect(useStudioStore.getState().projectName).toBe('My title'); expect(useStudioStore.getState().isDirty).toBe(true);
  expect(hook.result.current.saveConflict).toBe(true);
});

it('checks inactive rename against the gallery snapshot inside its transaction', async () => {
  const hook = await coordinator();
  expect((await autoSaveWorkspaceDetailed('inactive', createBlankProjectFile('Inactive'), undefined, [], undefined, null)).ok).toBe(true);
  const original = (await db.projects.get('inactive'))!;
  expect(await hook.result.current.renameStoredProject('inactive', 'Renamed inactive', getStoredProjectVersion(original))).toBe(true);
  expect((await db.projects.get('inactive'))?.name).toBe('Renamed inactive');
  expect(await hook.result.current.renameStoredProject('inactive', 'Stale title', getStoredProjectVersion(original))).toBe(false);
  expect((await db.projects.get('inactive'))?.name).toBe('Renamed inactive');
  expect(useStudioStore.getState().projectName).toBe('Untitled Sprite');
});

it('gives a conflict copy a fresh creation date while preserving the original document', async () => {
  const hook = await coordinator(), original = (await db.projects.get('rename-active'))!;
  act(() => { useStudioStore.setState({ projectCreatedAt: 1000 }); });
  expect(await renameProject('rename-active', 'Other tab', getStoredProjectVersion(original))).toBe(true);
  await act(async () => { await hook.result.current.renameStoredProject('rename-active', 'My title', getStoredProjectVersion(original)); });
  const before = Date.now(); await act(async () => { await hook.result.current.saveConflictCopy(); });
  const state = useStudioStore.getState(); expect(state.currentProjectId).not.toBe('rename-active');
  expect(state.projectCreatedAt).toBeGreaterThanOrEqual(before);
  expect((await db.projects.get('rename-active'))!.createdAt).toBe(original.createdAt);
});

it('queues rename behind an in-flight serialization without acknowledging an unowned version', async () => {
  const hook = await coordinator();
  let release!: (value: Awaited<ReturnType<typeof buildAutosavePayloadAsync>>) => void;
  const oldPayload = { project: createBlankProjectFile('Untitled Sprite'), layerBlobs: [], capturedRevisions: new Map(), dirtyLayerCount: 0, totalLayerCount: 1 };
  vi.mocked(buildAutosavePayloadAsync).mockReturnValueOnce(new Promise(resolve => { release = resolve; }));
  let saving!: ReturnType<typeof hook.result.current.runAutosave>, renaming!: Promise<boolean>;
  act(() => { saving = hook.result.current.runAutosave(); });
  act(() => { renaming = hook.result.current.renameStoredProject('rename-active', 'Queued name', 'ignored-gallery-version'); });
  await act(async () => { release(oldPayload); expect((await saving).ok).toBe(true); expect(await renaming).toBe(true); });
  expect((await db.projects.get('rename-active'))?.name).toBe('Queued name'); expect(hook.result.current.saveConflict).toBe(false);
});
