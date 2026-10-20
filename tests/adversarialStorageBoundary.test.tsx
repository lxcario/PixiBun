// @vitest-environment happy-dom
import 'fake-indexeddb/auto';
import { Blob as NodeBlob } from 'node:buffer';
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProjectsGalleryModal } from '@/components/modals/ProjectsGalleryModal';
import {
  db,
  createBlankProjectFile,
  duplicateProject,
  getLayerBlobsForProject,
  saveLayerBlobs,
  type StoredProject,
} from '@/lib/storage/db';
import { studioEvents } from '@/lib/events/studioEvents';
import * as memoryBudgetModule from '@/lib/safety/memoryBudget';

const motionComponents: Record<string, React.ComponentType<Record<string, unknown>>> = {};
vi.mock('motion/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('motion/react')>()),
  useReducedMotion: () => true,
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: new Proxy({}, {
    get: (_target, tag: string) => {
      if (!motionComponents[tag]) {
        motionComponents[tag] = React.forwardRef((props: Record<string, unknown>, ref: React.Ref<HTMLElement>) => {
          const rest = Object.fromEntries(
            Object.entries(props).filter(([key]) => !['initial', 'animate', 'exit', 'transition', 'whileHover', 'whileTap', 'variants', 'layout'].includes(key))
          );
          return React.createElement(tag, { ...rest, ref });
        });
      }
      return motionComponents[tag];
    },
  }),
}));

describe('Adversarial Storage Boundary & State Isolation Challenge', () => {
  const originProjectId = 'proj-origin-stress-1';
  const originProjectName = 'Origin Masterpiece';

  const makeSeedBlobs = (): Array<{ layerId: string; frameIndex: number; blob: Blob }> => [
    { layerId: 'layer-alpha', frameIndex: 0, blob: new NodeBlob([new Uint8Array([137, 80, 78, 71, 1, 2, 3, 4])], { type: 'image/png' }) as unknown as Blob },
    { layerId: 'layer-alpha', frameIndex: 1, blob: new NodeBlob([new Uint8Array([137, 80, 78, 71, 5, 6, 7, 8])], { type: 'image/png' }) as unknown as Blob },
    { layerId: 'layer-beta', frameIndex: 0, blob: new NodeBlob([new Uint8Array([137, 80, 78, 71, 9, 10, 11, 12])], { type: 'image/png' }) as unknown as Blob },
    { layerId: 'layer-beta', frameIndex: 1, blob: new NodeBlob([new Uint8Array([137, 80, 78, 71, 13, 14, 15, 16])], { type: 'image/png' }) as unknown as Blob },
  ];

  beforeEach(async () => {
    vi.stubGlobal('Blob', NodeBlob);
    vi.clearAllMocks();
    await db.delete();
    await db.open();

    const now = 1700000000000;
    const blank = createBlankProjectFile(originProjectName, 48, 48, 12);
    const originRecord: StoredProject = {
      id: originProjectId,
      name: originProjectName,
      width: 48,
      height: 48,
      fps: 12,
      createdAt: now,
      updatedAt: now,
      thumbnailDataUrl: 'data:image/png;base64,originThumbnailSample123',
      dataJson: JSON.stringify(blank),
    };
    await db.projects.put(originRecord);
    await saveLayerBlobs(originProjectId, makeSeedBlobs());
  });

  afterEach(async () => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    await db.delete();
  });

  // Helper to extract raw byte arrays from layer blobs for byte-by-byte comparison
  async function readProjectBlobBytes(projectId: string): Promise<Map<string, Uint8Array>> {
    const records = await getLayerBlobsForProject(projectId);
    const map = new Map<string, Uint8Array>();
    for (const r of records) {
      const buf = await r.blob.arrayBuffer();
      map.set(`${r.layerId}::${r.frameIndex}`, new Uint8Array(buf));
    }
    return map;
  }

  it('rolls back completely when QuotaExceededError is thrown during layerBlobs.bulkAdd', async () => {
    const initialProject = structuredClone(await db.projects.get(originProjectId));
    const initialBlobs = await db.layerBlobs.where('projectId').equals(originProjectId).toArray();
    const initialByteMap = await readProjectBlobBytes(originProjectId);
    expect(initialBlobs).toHaveLength(4);

    // Spy on bulkAdd to simulate QuotaExceededError during the write
    const quotaError = new DOMException('The quota has been exceeded.', 'QuotaExceededError');
    const bulkAddSpy = vi.spyOn(db.layerBlobs, 'bulkAdd').mockRejectedValueOnce(quotaError);

    const duplicateResult = await duplicateProject(originProjectId);

    // Must return null
    expect(duplicateResult).toBeNull();
    expect(bulkAddSpy).toHaveBeenCalled();

    // Verify Dexie transaction rolled back the project put: no duplicate project exists
    const allProjects = await db.projects.toArray();
    expect(allProjects).toHaveLength(1);
    expect(allProjects[0].id).toBe(originProjectId);

    // Verify original project record is 100% unaltered
    const afterProject = await db.projects.get(originProjectId);
    expect(afterProject).toEqual(initialProject);

    // Verify no orphaned layer blobs exist
    const allBlobs = await db.layerBlobs.toArray();
    expect(allBlobs).toHaveLength(4);
    for (const b of allBlobs) {
      expect(b.projectId).toBe(originProjectId);
    }

    // Verify byte-level integrity of original blobs
    const afterByteMap = await readProjectBlobBytes(originProjectId);
    expect(afterByteMap.size).toBe(initialByteMap.size);
    for (const [key, initialBytes] of initialByteMap.entries()) {
      const afterBytes = afterByteMap.get(key);
      expect(afterBytes).toBeDefined();
      expect(Array.from(afterBytes!)).toEqual(Array.from(initialBytes));
    }
  });

  it('rolls back completely when QuotaExceededError is thrown during projects.put', async () => {
    const initialProject = structuredClone(await db.projects.get(originProjectId));
    const initialBlobs = await db.layerBlobs.where('projectId').equals(originProjectId).toArray();

    const quotaError = new DOMException('Storage quota exceeded on metadata write.', 'QuotaExceededError');
    vi.spyOn(db.projects, 'put').mockRejectedValueOnce(quotaError);

    const duplicateResult = await duplicateProject(originProjectId);

    expect(duplicateResult).toBeNull();

    // Database state strictly preserved
    expect(await db.projects.toArray()).toHaveLength(1);
    expect(await db.layerBlobs.toArray()).toHaveLength(4);
    expect(await db.projects.get(originProjectId)).toEqual(initialProject);
    const currentBlobs = await db.layerBlobs.where('projectId').equals(originProjectId).toArray();
    expect(currentBlobs).toHaveLength(initialBlobs.length);
  });

  it('handles mid-transaction AbortError cleanly with atomic rollback', async () => {
    const initialProject = structuredClone(await db.projects.get(originProjectId));
    const abortError = new DOMException('Transaction aborted.', 'AbortError');
    vi.spyOn(db.layerBlobs, 'bulkAdd').mockRejectedValueOnce(abortError);

    const duplicateResult = await duplicateProject(originProjectId);

    expect(duplicateResult).toBeNull();
    expect(await db.projects.toArray()).toHaveLength(1);
    expect(await db.layerBlobs.toArray()).toHaveLength(4);
    expect(await db.projects.get(originProjectId)).toEqual(initialProject);
  });

  it('handles memory budget exhaustion (reserveMemory failure) without altering state', async () => {
    const initialProject = structuredClone(await db.projects.get(originProjectId));
    vi.spyOn(memoryBudgetModule, 'reserveMemory').mockImplementationOnce(() => {
      throw new RangeError('Requested storage bytes exceed available memory budget');
    });

    const duplicateResult = await duplicateProject(originProjectId);

    expect(duplicateResult).toBeNull();
    expect(await db.projects.toArray()).toHaveLength(1);
    expect(await db.layerBlobs.toArray()).toHaveLength(4);
    expect(await db.projects.get(originProjectId)).toEqual(initialProject);
  });

  it('safely rejects invalid project names (empty / whitespace) without DB alteration', async () => {
    const initialProject = structuredClone(await db.projects.get(originProjectId));

    // Passing empty or whitespace-only name
    const resultEmpty = await duplicateProject(originProjectId, '   ');
    expect(resultEmpty).toBeNull();

    const allProjects = await db.projects.toArray();
    expect(allProjects).toHaveLength(1);
    expect(await db.projects.get(originProjectId)).toEqual(initialProject);
  });

  it('safely handles non-existent project id without crashing or mutating DB', async () => {
    const result = await duplicateProject('non-existent-id-999');
    expect(result).toBeNull();
    expect(await db.projects.toArray()).toHaveLength(1);
  });

  it('guarantees complete state isolation on successful duplication', async () => {
    const initialProject = structuredClone(await db.projects.get(originProjectId));
    const initialByteMap = await readProjectBlobBytes(originProjectId);

    const duplicateResult = await duplicateProject(originProjectId);
    expect(duplicateResult).not.toBeNull();
    expect(duplicateResult?.id).not.toBe(originProjectId);
    expect(duplicateResult?.name).toBe(`Copy of ${originProjectName}`);

    // Verify original project record is unchanged in DB
    const afterProject = await db.projects.get(originProjectId);
    expect(afterProject).toEqual(initialProject);

    // Verify original project's blobs are untouched byte-by-byte
    const afterByteMap = await readProjectBlobBytes(originProjectId);
    expect(afterByteMap.size).toBe(initialByteMap.size);
    for (const [key, initialBytes] of initialByteMap.entries()) {
      const afterBytes = afterByteMap.get(key);
      expect(Array.from(afterBytes!)).toEqual(Array.from(initialBytes));
    }

    // Verify cloned project's blobs match the original contents
    const clonedByteMap = await readProjectBlobBytes(duplicateResult!.id);
    expect(clonedByteMap.size).toBe(initialByteMap.size);
    for (const [key, initialBytes] of initialByteMap.entries()) {
      const clonedBytes = clonedByteMap.get(key);
      expect(clonedBytes).toBeDefined();
      expect(Array.from(clonedBytes!)).toEqual(Array.from(initialBytes));
    }
  });

  it('prevents phantom cards in ProjectsGalleryModal when QuotaExceededError aborts duplication', async () => {
    const toastSpy = vi.spyOn(studioEvents, 'emit');

    // Simulate QuotaExceededError in the Dexie layerBlobs table
    const quotaError = new DOMException('The quota has been exceeded.', 'QuotaExceededError');
    vi.spyOn(db.layerBlobs, 'bulkAdd').mockRejectedValueOnce(quotaError);

    render(
      <ProjectsGalleryModal
        isOpen
        onClose={vi.fn()}
        currentProjectId={originProjectId}
        onOpenProject={vi.fn()}
        onRenameProject={vi.fn().mockResolvedValue(true)}
        onNewProject={vi.fn().mockResolvedValue(true)}
      />
    );

    // Initial render: 1 project card
    await screen.findByRole('button', { name: new RegExp(`Open project ${originProjectName}`) });
    expect(screen.getAllByRole('button', { name: /Open project/ })).toHaveLength(1);

    const cloneButton = screen.getByRole('button', { name: 'Clone' });
    await act(async () => {
      fireEvent.click(cloneButton);
    });

    // Toast emitted with exact failure message
    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith('pixibun:toast', {
        type: 'error',
        message: 'The project could not be duplicated. Your original drawing was left unchanged.',
      });
    });

    // Verification: EXACTLY 1 card remains in gallery DOM — NO PHANTOM CARDS
    const cards = screen.getAllByRole('button', { name: /Open project/ });
    expect(cards).toHaveLength(1);
    expect(screen.getByText('Origin Masterpiece')).toBeDefined();
    expect(screen.queryByText(/Copy of Origin Masterpiece/)).toBeNull();

    // Verify selection indicator badge ("Current") remains intact
    expect(screen.getByText('Current')).toBeDefined();

    // Verify footer project counter remains accurate
    expect(screen.getByText(/1 project saved in browser IndexedDB/)).toBeDefined();

    // Verify that subsequent clone attempt is NOT blocked by a stuck duplicating flag
    // (restore bulkAdd so subsequent attempt succeeds)
    vi.restoreAllMocks();
    const secondCloneBtn = screen.getByRole('button', { name: 'Clone' });
    await act(async () => {
      fireEvent.click(secondCloneBtn);
    });

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /Open project/ })).toHaveLength(2);
    });
  });

  it('preserves selection and active project state when duplicating a non-active project fails', async () => {
    // Add a secondary non-active project
    const secondaryId = 'proj-secondary-2';
    const secondaryName = 'Secondary Sketch';
    const now = Date.now();
    await db.projects.put({
      id: secondaryId,
      name: secondaryName,
      width: 16,
      height: 16,
      fps: 8,
      createdAt: now,
      updatedAt: now,
      dataJson: JSON.stringify(createBlankProjectFile(secondaryName, 16, 16, 8)),
    });

    const toastSpy = vi.spyOn(studioEvents, 'emit');
    // Fail duplication on bulkAdd
    vi.spyOn(db.layerBlobs, 'bulkAdd').mockRejectedValueOnce(new DOMException('QuotaExceededError', 'QuotaExceededError'));

    render(
      <ProjectsGalleryModal
        isOpen
        onClose={vi.fn()}
        currentProjectId={originProjectId} // Active project is originProjectId
        onOpenProject={vi.fn()}
        onRenameProject={vi.fn().mockResolvedValue(true)}
        onNewProject={vi.fn().mockResolvedValue(true)}
      />
    );

    await screen.findByRole('button', { name: new RegExp(`Open project ${secondaryName}`) });
    expect(screen.getAllByRole('button', { name: /Open project/ })).toHaveLength(2);

    // Find the clone button for the secondary project
    const cloneButtons = screen.getAllByRole('button', { name: 'Clone' });
    expect(cloneButtons).toHaveLength(2);

    // Click clone on the secondary project
    await act(async () => {
      fireEvent.click(cloneButtons[1]);
    });

    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith('pixibun:toast', {
        type: 'error',
        message: 'The project could not be duplicated. Your original drawing was left unchanged.',
      });
    });

    // Cards count must remain 2 (no phantom cards)
    const cards = screen.getAllByRole('button', { name: /Open project/ });
    expect(cards).toHaveLength(2);

    // Active project must remain originProjectId
    const activeCard = screen.getByRole('button', { name: new RegExp(`Open project ${originProjectName}`) });
    expect(activeCard.textContent).toContain('Current');
  });

  it('rejects duplicate clicks during in-flight slow duplication, ensuring single transaction', async () => {
    let resolveDuplication!: (val: StoredProject | null) => void;
    const slowDuplication = new Promise<StoredProject | null>((res) => {
      resolveDuplication = res;
    });

    // Mock duplicateProject to hang
    const dbModule = await import('@/lib/storage/db');
    const duplicateSpy = vi.spyOn(dbModule, 'duplicateProject').mockImplementationOnce(() => slowDuplication);

    render(
      <ProjectsGalleryModal
        isOpen
        onClose={vi.fn()}
        currentProjectId={originProjectId}
        onOpenProject={vi.fn()}
        onRenameProject={vi.fn().mockResolvedValue(true)}
        onNewProject={vi.fn().mockResolvedValue(true)}
      />
    );

    await screen.findByRole('button', { name: new RegExp(`Open project ${originProjectName}`) });
    const cloneBtn = screen.getByRole('button', { name: 'Clone' });

    // Rapid spam: click 5 times
    fireEvent.click(cloneBtn);
    fireEvent.click(cloneBtn);
    fireEvent.click(cloneBtn);
    fireEvent.click(cloneBtn);
    fireEvent.click(cloneBtn);

    // Only invoked once
    expect(duplicateSpy).toHaveBeenCalledTimes(1);

    // Resolve as null (failure)
    await act(async () => {
      resolveDuplication(null);
    });

    // Cards remain 1
    expect(screen.getAllByRole('button', { name: /Open project/ })).toHaveLength(1);
  });
});
