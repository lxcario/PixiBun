// @vitest-environment happy-dom
import 'fake-indexeddb/auto';
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProjectsGalleryModal } from '@/components/modals/ProjectsGalleryModal';
import {
  db,
  createBlankProjectFile,
  duplicateProject,
  type StoredProject,
} from '@/lib/storage/db';
import { studioEvents } from '@/lib/events/studioEvents';

vi.mock('@/lib/storage/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/storage/db')>();
  return {
    ...actual,
    getLatestStoredProjectId: vi.fn().mockResolvedValue(null),
    duplicateProject: vi.fn((...args: Parameters<typeof actual.duplicateProject>) => actual.duplicateProject(...args)),
  };
});

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

describe('ProjectsGalleryModal — Duplication Failure Handling (Task A)', () => {
  const testProjectId = 'proj-seed-1';
  const testProjectName = 'Masterpiece';

  beforeEach(async () => {
    vi.clearAllMocks();
    await db.delete();
    await db.open();

    const now = Date.now();
    const blank = createBlankProjectFile(testProjectName, 32, 32);
    const seedRecord: StoredProject = {
      id: testProjectId,
      name: testProjectName,
      width: 32,
      height: 32,
      fps: 12,
      createdAt: now,
      updatedAt: now,
      dataJson: JSON.stringify(blank),
    };
    await db.projects.put(seedRecord);
  });

  afterEach(async () => {
    cleanup();
    await db.delete();
  });

  it('surfaces an error toast when duplicateProject returns null without creating phantom cards', async () => {
    vi.mocked(duplicateProject).mockResolvedValueOnce(null);
    const toastSpy = vi.spyOn(studioEvents, 'emit');

    render(
      <ProjectsGalleryModal
        isOpen
        onClose={vi.fn()}
        currentProjectId={testProjectId}
        onOpenProject={vi.fn()}
        onRenameProject={vi.fn().mockResolvedValue(true)}
        onNewProject={vi.fn().mockResolvedValue(true)}
      />
    );

    // Wait for project card to appear
    await screen.findByRole('button', { name: new RegExp(`Open project ${testProjectName}`) });

    const cloneButton = screen.getByRole('button', { name: 'Clone' });
    fireEvent.click(cloneButton);

    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith('pixibun:toast', {
        type: 'error',
        message: 'The project could not be duplicated. Your original drawing was left unchanged.',
      });
    });

    // Verify only the original project card exists (no phantom card added)
    const cards = screen.getAllByRole('button', { name: /Open project/ });
    expect(cards).toHaveLength(1);

    // Verify source project in db is unchanged
    const sourceInDb = await db.projects.get(testProjectId);
    expect(sourceInDb).not.toBeNull();
    expect(sourceInDb?.name).toBe(testProjectName);
  });

  it('catches promise rejection from duplicateProject and surfaces error toast', async () => {
    const errorMsg = 'Disk quota exceeded during transaction';
    vi.mocked(duplicateProject).mockRejectedValueOnce(new Error(errorMsg));
    const toastSpy = vi.spyOn(studioEvents, 'emit');

    render(
      <ProjectsGalleryModal
        isOpen
        onClose={vi.fn()}
        currentProjectId={testProjectId}
        onOpenProject={vi.fn()}
        onRenameProject={vi.fn().mockResolvedValue(true)}
        onNewProject={vi.fn().mockResolvedValue(true)}
      />
    );

    await screen.findByRole('button', { name: new RegExp(`Open project ${testProjectName}`) });

    const cloneButton = screen.getByRole('button', { name: 'Clone' });
    fireEvent.click(cloneButton);

    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith('pixibun:toast', {
        type: 'error',
        message: errorMsg,
      });
    });

    // Verify gallery state and cards remain valid
    const cards = screen.getAllByRole('button', { name: /Open project/ });
    expect(cards).toHaveLength(1);
    expect(screen.getByText('Current')).toBeDefined();
  });

  it('successfully duplicates a project and adds the cloned card to the gallery', async () => {
    const toastSpy = vi.spyOn(studioEvents, 'emit');

    render(
      <ProjectsGalleryModal
        isOpen
        onClose={vi.fn()}
        currentProjectId={testProjectId}
        onOpenProject={vi.fn()}
        onRenameProject={vi.fn().mockResolvedValue(true)}
        onNewProject={vi.fn().mockResolvedValue(true)}
      />
    );

    await screen.findByRole('button', { name: new RegExp(`Open project ${testProjectName}`) });

    const cloneButton = screen.getByRole('button', { name: 'Clone' });
    await act(async () => {
      fireEvent.click(cloneButton);
    });

    await waitFor(() => {
      const cards = screen.getAllByRole('button', { name: /Open project/ });
      expect(cards).toHaveLength(2);
    });

    // Verify no error toast was emitted
    expect(toastSpy).not.toHaveBeenCalledWith('pixibun:toast', expect.objectContaining({ type: 'error' }));

    // Both projects exist in DB
    const all = await db.projects.toArray();
    expect(all).toHaveLength(2);
  });

  it('guards against rapid duplicate clicks while duplication is in flight', async () => {
    let resolveDuplication!: (value: StoredProject | null) => void;
    vi.mocked(duplicateProject).mockImplementationOnce(
      () => new Promise((resolve) => { resolveDuplication = resolve; })
    );

    render(
      <ProjectsGalleryModal
        isOpen
        onClose={vi.fn()}
        currentProjectId={testProjectId}
        onOpenProject={vi.fn()}
        onRenameProject={vi.fn().mockResolvedValue(true)}
        onNewProject={vi.fn().mockResolvedValue(true)}
      />
    );

    await screen.findByRole('button', { name: new RegExp(`Open project ${testProjectName}`) });
    const cloneButton = screen.getByRole('button', { name: 'Clone' });

    // Click twice rapidly
    fireEvent.click(cloneButton);
    fireEvent.click(cloneButton);

    // duplicateProject should only have been called once
    expect(duplicateProject).toHaveBeenCalledTimes(1);

    // Resolve in-flight promise
    await act(async () => {
      resolveDuplication(null);
    });
  });

  it('guards against synchronous double-clicks in the same event tick without intervening act()', async () => {
    let resolveDuplication!: (value: StoredProject | null) => void;
    vi.mocked(duplicateProject).mockImplementation(
      () => new Promise((resolve) => { resolveDuplication = resolve; })
    );

    render(
      <ProjectsGalleryModal
        isOpen
        onClose={vi.fn()}
        currentProjectId={testProjectId}
        onOpenProject={vi.fn()}
        onRenameProject={vi.fn().mockResolvedValue(true)}
        onNewProject={vi.fn().mockResolvedValue(true)}
      />
    );

    await screen.findByRole('button', { name: new RegExp(`Open project ${testProjectName}`) });
    const cloneButton = screen.getByRole('button', { name: 'Clone' });

    // Dispatch two click events synchronously in the same act() batch
    act(() => {
      cloneButton.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      cloneButton.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });

    // Synchronous ref guard must prevent concurrent calls in the same tick
    expect(duplicateProject).toHaveBeenCalledTimes(1);

    // Button should be disabled with aria-disabled
    expect((cloneButton as HTMLButtonElement).disabled).toBe(true);
    expect(cloneButton.getAttribute('aria-disabled')).toBe('true');

    // Resolve in-flight promise
    await act(async () => {
      resolveDuplication(null);
    });

    // Button should be re-enabled after promise completion
    expect((cloneButton as HTMLButtonElement).disabled).toBe(false);
  });
});
