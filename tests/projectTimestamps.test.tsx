// @vitest-environment happy-dom
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useStudioStore } from '@/stores/studioStore';
import { buildAutosavePayloadAsync, buildProjectFile, buildProjectFileAsync, hydrateProject } from '@/lib/project/serialize';
import { clearAllBuffers } from '@/lib/engine/bufferRegistry';
import { db, autoSaveWorkspaceDetailed, createBlankProjectFile, duplicateProject } from '@/lib/storage/db';
import { inspectAndAdmitStoredProject } from '@/lib/recovery/projectAdmission';
import { makeCanvas } from './helpers/mockCanvas';

beforeEach(async () => {
  await db.projects.clear(); await db.layerBlobs.clear();
  clearAllBuffers(); useStudioStore.getState().resetToNewProject();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => makeCanvas(32, 32).getContext('2d'));
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,cGl4ZWxz');
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(callback => callback(new Blob(['pixels'], { type: 'image/png' })));
});
afterEach(() => { clearAllBuffers(); vi.restoreAllMocks(); });

it.each([0, 946684800000])('preserves imported creation date %s in every serialization path while updating save time', async createdAt => {
  const file = { ...createBlankProjectFile('Old artwork'), createdAt, updatedAt: createdAt };
  await hydrateProject(file);
  expect(useStudioStore.getState().projectCreatedAt).toBe(createdAt);
  useStudioStore.getState().setProjectName('Edited artwork');
  for (const saved of [buildProjectFile(), await buildProjectFileAsync(), (await buildAutosavePayloadAsync()).project]) {
    expect(saved.createdAt).toBe(createdAt); expect(saved.updatedAt).toBeGreaterThan(createdAt);
    expect(saved.name).toBe('Edited artwork');
  }
});
it('starts new documents with a fresh date without carrying the previous artwork date', () => {
  useStudioStore.getState().loadProjectState({ createdAt: 1 });
  const before = Date.now(); useStudioStore.getState().resetToNewProject();
  expect(useStudioStore.getState().projectCreatedAt).toBeGreaterThanOrEqual(before);
});
it.each([0, 1000])('reconciles a legacy saved document against its surviving row creation date %s and keeps it on the next save', async createdAt => {
  const file = { ...createBlankProjectFile('Legacy artwork'), createdAt: 2000, updatedAt: 3000 };
  await db.projects.put({ id: 'legacy', name: file.name, width: file.width, height: file.height, fps: file.fps, createdAt, updatedAt: 3000, dataJson: JSON.stringify(file) });
  const admitted = await inspectAndAdmitStoredProject('legacy');
  expect(admitted.status).toBe('admitted'); if (admitted.status !== 'admitted') throw new Error('Admission failed');
  expect(admitted.project.createdAt).toBe(createdAt);
  await hydrateProject(admitted.project, 'legacy');
  expect(useStudioStore.getState().projectCreatedAt).toBe(createdAt);
  expect((await autoSaveWorkspaceDetailed('legacy', { ...file, createdAt: 9000 })).ok).toBe(true);
  const row = (await db.projects.get('legacy'))!;
  expect(row.createdAt).toBe(createdAt); expect(JSON.parse(row.dataJson).createdAt).toBe(createdAt);
});
it('gives gallery duplicates a fresh date and leaves the original date untouched', async () => {
  const file = { ...createBlankProjectFile('Original'), createdAt: 1000 };
  expect((await autoSaveWorkspaceDetailed('original', file)).ok).toBe(true);
  const before = Date.now(), duplicate = await duplicateProject('original'); expect(duplicate).toBeTruthy();
  const copy = (await db.projects.get(duplicate!.id))!;
  expect(copy.createdAt).toBeGreaterThanOrEqual(before); expect(JSON.parse(copy.dataJson).createdAt).toBe(copy.createdAt);
  expect((await db.projects.get('original'))!.createdAt).toBe(1000);
});
