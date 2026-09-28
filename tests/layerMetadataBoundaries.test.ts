// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useStudioStore } from '@/stores/studioStore';
import { MAX_METADATA_NAME_LENGTH } from '@/lib/project/metadataAdmission';
import { buildProjectFile } from '@/lib/project/serialize';
import { validateProjectFile } from '@/lib/project/schema';
import { makeCanvas } from './helpers/mockCanvas';
import { clearAllBuffers } from '@/lib/engine/bufferRegistry';

describe('layer metadata boundaries', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      return makeCanvas(this.width, this.height).getContext('2d');
    });
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,cG5n');
    clearAllBuffers();
    useStudioStore.getState().resetToNewProject();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    clearAllBuffers();
  });

  it('duplicates a maximum-length name without creating an invalid project', () => {
    const store = useStudioStore.getState();
    const originalId = store.frames[0].layers[0].id;
    store.renameLayer(originalId, 'A'.repeat(MAX_METADATA_NAME_LENGTH));
    store.duplicateLayer(originalId);
    const duplicate = useStudioStore.getState().frames[0].layers[0];
    expect(duplicate.name.length).toBe(MAX_METADATA_NAME_LENGTH);
    expect(duplicate.name).toMatch(/ \(Copy\)$/);
    expect(validateProjectFile(buildProjectFile()).ok).toBe(true);
  });

  it('rejects a merge into a locked destination', () => {
    const store = useStudioStore.getState();
    const lowerId = store.frames[0].layers[0].id;
    store.addLayer('Upper');
    const upperId = useStudioStore.getState().frames[0].layers[0].id;
    store.toggleLayerLock(lowerId);
    const revision = useStudioStore.getState().editRevision;
    store.mergeLayerDown(upperId);
    expect(useStudioStore.getState().frames[0].layers).toHaveLength(2);
    expect(useStudioStore.getState().editRevision).toBe(revision);
  });

  it('does not split a surrogate pair when truncating a copied layer name', () => {
    const store = useStudioStore.getState();
    const originalId = store.frames[0].layers[0].id;
    store.renameLayer(originalId, `${'A'.repeat(120)}😀tail`);
    store.duplicateLayer(originalId);
    const name = useStudioStore.getState().frames[0].layers[0].name;
    expect(name).toBe(`${'A'.repeat(120)} (Copy)`);
    expect(validateProjectFile(buildProjectFile()).ok).toBe(true);
  });

  it('ignores non-finite opacity values so the project remains valid', () => {
    const store = useStudioStore.getState();
    const layerId = store.frames[0].layers[0].id;
    const revision = store.editRevision;
    store.setLayerOpacity(layerId, NaN);
    store.setLayerOpacity(layerId, Infinity);
    expect(useStudioStore.getState().frames[0].layers[0].opacity).toBe(1);
    expect(useStudioStore.getState().editRevision).toBe(revision);
    expect(validateProjectFile(buildProjectFile()).ok).toBe(true);
  });
});
