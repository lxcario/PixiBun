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

describe('Adversarial Challenge — ProjectsGalleryModal Duplication Workflow', () => {
  const project1Id = 'proj-seed-1';
  const project1Name = 'Project Alpha';
  const project2Id = 'proj-seed-2';
  const project2Name = 'Project Beta';

  beforeEach(async () => {
    vi.clearAllMocks();
    await db.delete();
    await db.open();

    const now = Date.now();
    const blank1 = createBlankProjectFile(project1Name, 32, 32);
    const seed1: StoredProject = {
      id: project1Id,
      name: project1Name,
      width: 32,
      height: 32,
      fps: 12,
      createdAt: now + 1,
      updatedAt: now + 1,
      dataJson: JSON.stringify(blank1),
    };
    const blank2 = createBlankProjectFile(project2Name, 32, 32);
    const seed2: StoredProject = {
      id: project2Id,
      name: project2Name,
      width: 32,
      height: 32,
      fps: 12,
      createdAt: now,
      updatedAt: now,
      dataJson: JSON.stringify(blank2),
    };
    await db.projects.bulkPut([seed1, seed2]);
  });

  afterEach(async () => {
    cleanup();
    await db.delete();
  });

  // =========================================================================
  // 1. NON-STANDARD REJECTION OBJECTS
  // =========================================================================

  it('handles string rejection without uncaught exception and emits fallback error toast', async () => {
    vi.mocked(duplicateProject).mockRejectedValueOnce('Raw string error rejection');
    const toastSpy = vi.spyOn(studioEvents, 'emit');

    render(
      <ProjectsGalleryModal
        isOpen
        onClose={vi.fn()}
        currentProjectId={project1Id}
        onOpenProject={vi.fn()}
        onRenameProject={vi.fn().mockResolvedValue(true)}
        onNewProject={vi.fn().mockResolvedValue(true)}
      />
    );

    await screen.findByRole('button', { name: new RegExp(`Open project ${project1Name}`) });
    const cloneButtons = screen.getAllByRole('button', { name: 'Clone' });
    fireEvent.click(cloneButtons[0]);

    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith('pixibun:toast', {
        type: 'error',
        message: 'The project could not be duplicated. Your original drawing was left unchanged.',
      });
    });

    // Verify gallery state and cards remain intact
    expect(screen.getAllByRole('button', { name: /Open project/ })).toHaveLength(2);
  });

  it('handles null rejection without uncaught exception', async () => {
    vi.mocked(duplicateProject).mockRejectedValueOnce(null);
    const toastSpy = vi.spyOn(studioEvents, 'emit');

    render(
      <ProjectsGalleryModal
        isOpen
        onClose={vi.fn()}
        currentProjectId={project1Id}
        onOpenProject={vi.fn()}
        onRenameProject={vi.fn().mockResolvedValue(true)}
        onNewProject={vi.fn().mockResolvedValue(true)}
      />
    );

    await screen.findByRole('button', { name: new RegExp(`Open project ${project1Name}`) });
    const cloneButtons = screen.getAllByRole('button', { name: 'Clone' });
    fireEvent.click(cloneButtons[0]);

    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith('pixibun:toast', {
        type: 'error',
        message: 'The project could not be duplicated. Your original drawing was left unchanged.',
      });
    });
  });

  it('handles undefined rejection without uncaught exception', async () => {
    vi.mocked(duplicateProject).mockRejectedValueOnce(undefined);
    const toastSpy = vi.spyOn(studioEvents, 'emit');

    render(
      <ProjectsGalleryModal
        isOpen
        onClose={vi.fn()}
        currentProjectId={project1Id}
        onOpenProject={vi.fn()}
        onRenameProject={vi.fn().mockResolvedValue(true)}
        onNewProject={vi.fn().mockResolvedValue(true)}
      />
    );

    await screen.findByRole('button', { name: new RegExp(`Open project ${project1Name}`) });
    const cloneButtons = screen.getAllByRole('button', { name: 'Clone' });
    fireEvent.click(cloneButtons[0]);

    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith('pixibun:toast', {
        type: 'error',
        message: 'The project could not be duplicated. Your original drawing was left unchanged.',
      });
    });
  });

  it('handles custom Error class and surfaces its custom message', async () => {
    class CustomDatabaseQuotaExceededError extends Error {
      code = 'QUOTA_EXCEEDED';
      constructor(msg: string) {
        super(msg);
        this.name = 'CustomDatabaseQuotaExceededError';
      }
    }

    vi.mocked(duplicateProject).mockRejectedValueOnce(
      new CustomDatabaseQuotaExceededError('Dexie storage quota exceeded: 50MB limit reached')
    );
    const toastSpy = vi.spyOn(studioEvents, 'emit');

    render(
      <ProjectsGalleryModal
        isOpen
        onClose={vi.fn()}
        currentProjectId={project1Id}
        onOpenProject={vi.fn()}
        onRenameProject={vi.fn().mockResolvedValue(true)}
        onNewProject={vi.fn().mockResolvedValue(true)}
      />
    );

    await screen.findByRole('button', { name: new RegExp(`Open project ${project1Name}`) });
    const cloneButtons = screen.getAllByRole('button', { name: 'Clone' });
    fireEvent.click(cloneButtons[0]);

    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith('pixibun:toast', {
        type: 'error',
        message: 'Dexie storage quota exceeded: 50MB limit reached',
      });
    });
  });

  it('handles non-Error object rejection ({ code: 500, error: true }) with fallback message', async () => {
    vi.mocked(duplicateProject).mockRejectedValueOnce({ code: 500, detail: 'corrupt record' });
    const toastSpy = vi.spyOn(studioEvents, 'emit');

    render(
      <ProjectsGalleryModal
        isOpen
        onClose={vi.fn()}
        currentProjectId={project1Id}
        onOpenProject={vi.fn()}
        onRenameProject={vi.fn().mockResolvedValue(true)}
        onNewProject={vi.fn().mockResolvedValue(true)}
      />
    );

    await screen.findByRole('button', { name: new RegExp(`Open project ${project1Name}`) });
    const cloneButtons = screen.getAllByRole('button', { name: 'Clone' });
    fireEvent.click(cloneButtons[0]);

    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith('pixibun:toast', {
        type: 'error',
        message: 'The project could not be duplicated. Your original drawing was left unchanged.',
      });
    });
  });

  it('handles synchronous throw within duplicateProject without crashing the gallery', async () => {
    vi.mocked(duplicateProject).mockImplementationOnce(() => {
      throw new Error('Immediate synchronous failure inside storage layer');
    });
    const toastSpy = vi.spyOn(studioEvents, 'emit');

    render(
      <ProjectsGalleryModal
        isOpen
        onClose={vi.fn()}
        currentProjectId={project1Id}
        onOpenProject={vi.fn()}
        onRenameProject={vi.fn().mockResolvedValue(true)}
        onNewProject={vi.fn().mockResolvedValue(true)}
      />
    );

    await screen.findByRole('button', { name: new RegExp(`Open project ${project1Name}`) });
    const cloneButtons = screen.getAllByRole('button', { name: 'Clone' });
    fireEvent.click(cloneButtons[0]);

    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith('pixibun:toast', {
        type: 'error',
        message: 'Immediate synchronous failure inside storage layer',
      });
    });

    expect(screen.getAllByRole('button', { name: /Open project/ })).toHaveLength(2);
  });

  // =========================================================================
  // 2. COMPONENT UNMOUNTING DURING IN-FLIGHT DUPLICATION
  // =========================================================================

  it('safely handles component unmount while duplication promise is in flight and resolves to success', async () => {
    let resolveDuplication!: (value: StoredProject | null) => void;
    vi.mocked(duplicateProject).mockImplementationOnce(
      () => new Promise((resolve) => { resolveDuplication = resolve; })
    );

    const { unmount } = render(
      <ProjectsGalleryModal
        isOpen
        onClose={vi.fn()}
        currentProjectId={project1Id}
        onOpenProject={vi.fn()}
        onRenameProject={vi.fn().mockResolvedValue(true)}
        onNewProject={vi.fn().mockResolvedValue(true)}
      />
    );

    await screen.findByRole('button', { name: new RegExp(`Open project ${project1Name}`) });
    const cloneButtons = screen.getAllByRole('button', { name: 'Clone' });

    // Trigger duplication
    fireEvent.click(cloneButtons[0]);
    expect(duplicateProject).toHaveBeenCalledTimes(1);

    // Unmount modal while duplication is in flight
    unmount();

    // Now resolve the duplication
    const duplicatedProject: StoredProject = {
      id: 'proj-cloned-1',
      name: `${project1Name} (Copy)`,
      width: 32,
      height: 32,
      fps: 12,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      dataJson: '{}',
    };

    // Resolving should not throw or trigger uncaught exception
    await act(async () => {
      resolveDuplication(duplicatedProject);
    });
  });

  it('safely handles component unmount while duplication promise is in flight and rejects', async () => {
    let rejectDuplication!: (reason?: unknown) => void;
    vi.mocked(duplicateProject).mockImplementationOnce(
      () => new Promise((_, reject) => { rejectDuplication = reject; })
    );
    const toastSpy = vi.spyOn(studioEvents, 'emit');

    const { unmount } = render(
      <ProjectsGalleryModal
        isOpen
        onClose={vi.fn()}
        currentProjectId={project1Id}
        onOpenProject={vi.fn()}
        onRenameProject={vi.fn().mockResolvedValue(true)}
        onNewProject={vi.fn().mockResolvedValue(true)}
      />
    );

    await screen.findByRole('button', { name: new RegExp(`Open project ${project1Name}`) });
    const cloneButtons = screen.getAllByRole('button', { name: 'Clone' });

    fireEvent.click(cloneButtons[0]);
    expect(duplicateProject).toHaveBeenCalledTimes(1);

    // Unmount component
    unmount();

    // Reject duplication with custom error
    await act(async () => {
      rejectDuplication(new Error('Unmounted background failure'));
    });

    // Toast is still safely emitted to studioEvents
    expect(toastSpy).toHaveBeenCalledWith('pixibun:toast', {
      type: 'error',
      message: 'Unmounted background failure',
    });
  });

  it('safely handles component unmount while duplication returns null', async () => {
    let resolveDuplication!: (value: StoredProject | null) => void;
    vi.mocked(duplicateProject).mockImplementationOnce(
      () => new Promise((resolve) => { resolveDuplication = resolve; })
    );
    const toastSpy = vi.spyOn(studioEvents, 'emit');

    const { unmount } = render(
      <ProjectsGalleryModal
        isOpen
        onClose={vi.fn()}
        currentProjectId={project1Id}
        onOpenProject={vi.fn()}
        onRenameProject={vi.fn().mockResolvedValue(true)}
        onNewProject={vi.fn().mockResolvedValue(true)}
      />
    );

    await screen.findByRole('button', { name: new RegExp(`Open project ${project1Name}`) });
    const cloneButtons = screen.getAllByRole('button', { name: 'Clone' });

    fireEvent.click(cloneButtons[0]);
    unmount();

    await act(async () => {
      resolveDuplication(null);
    });

    expect(toastSpy).toHaveBeenCalledWith('pixibun:toast', {
      type: 'error',
      message: 'The project could not be duplicated. Your original drawing was left unchanged.',
    });
  });

  // =========================================================================
  // 3. CONCURRENT CLICKS / MULTI-CARD CLICKS / STATE RECOVERY
  // =========================================================================

  it('blocks clicking Clone on a different project while first duplication is in flight', async () => {
    let resolveDuplication!: (value: StoredProject | null) => void;
    vi.mocked(duplicateProject).mockImplementationOnce(
      () => new Promise((resolve) => { resolveDuplication = resolve; })
    );

    render(
      <ProjectsGalleryModal
        isOpen
        onClose={vi.fn()}
        currentProjectId={project1Id}
        onOpenProject={vi.fn()}
        onRenameProject={vi.fn().mockResolvedValue(true)}
        onNewProject={vi.fn().mockResolvedValue(true)}
      />
    );

    await screen.findByRole('button', { name: new RegExp(`Open project ${project1Name}`) });
    await screen.findByRole('button', { name: new RegExp(`Open project ${project2Name}`) });
    const cloneButtons = screen.getAllByRole('button', { name: 'Clone' });
    expect(cloneButtons).toHaveLength(2);

    // Click clone on project 1
    fireEvent.click(cloneButtons[0]);
    expect(duplicateProject).toHaveBeenCalledTimes(1);
    expect(duplicateProject).toHaveBeenCalledWith(project1Id);

    // Immediately click clone on project 2 while project 1 is in-flight
    fireEvent.click(cloneButtons[1]);

    // Should NOT have triggered duplicateProject for project 2
    expect(duplicateProject).toHaveBeenCalledTimes(1);

    // Resolve project 1
    await act(async () => {
      resolveDuplication(null);
    });
  });

  it('handles synchronous double click events in same batch', async () => {
    let resolveDuplication!: (value: StoredProject | null) => void;
    vi.mocked(duplicateProject).mockImplementation(
      () => new Promise((resolve) => { resolveDuplication = resolve; })
    );

    render(
      <ProjectsGalleryModal
        isOpen
        onClose={vi.fn()}
        currentProjectId={project1Id}
        onOpenProject={vi.fn()}
        onRenameProject={vi.fn().mockResolvedValue(true)}
        onNewProject={vi.fn().mockResolvedValue(true)}
      />
    );

    await screen.findByRole('button', { name: new RegExp(`Open project ${project1Name}`) });
    const cloneButtons = screen.getAllByRole('button', { name: 'Clone' });

    act(() => {
      cloneButtons[0].dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      cloneButtons[0].dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });

    // In a single synchronous execution tick before React re-render,
    // duplicateProject must be guarded and only called once.
    expect(duplicateProject).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveDuplication(null);
    });
  });

  it('allows duplication after previous failure (re-enables duplicating guard)', async () => {
    // 1st call rejects
    vi.mocked(duplicateProject)
      .mockRejectedValueOnce(new Error('Temporary DB lock'))
      .mockResolvedValueOnce({
        id: 'proj-copy-1',
        name: `${project1Name} (Copy)`,
        width: 32,
        height: 32,
        fps: 12,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        dataJson: '{}',
      });

    render(
      <ProjectsGalleryModal
        isOpen
        onClose={vi.fn()}
        currentProjectId={project1Id}
        onOpenProject={vi.fn()}
        onRenameProject={vi.fn().mockResolvedValue(true)}
        onNewProject={vi.fn().mockResolvedValue(true)}
      />
    );

    await screen.findByRole('button', { name: new RegExp(`Open project ${project1Name}`) });
    const cloneButtons = screen.getAllByRole('button', { name: 'Clone' });

    // First attempt fails
    fireEvent.click(cloneButtons[0]);
    await waitFor(() => {
      expect(duplicateProject).toHaveBeenCalledTimes(1);
    });

    // Second attempt succeeds
    fireEvent.click(cloneButtons[0]);
    await waitFor(() => {
      expect(duplicateProject).toHaveBeenCalledTimes(2);
    });
  });

  it('preserves selection state and original project intact after failed duplication', async () => {
    vi.mocked(duplicateProject).mockResolvedValueOnce(null);

    render(
      <ProjectsGalleryModal
        isOpen
        onClose={vi.fn()}
        currentProjectId={project1Id}
        onOpenProject={vi.fn()}
        onRenameProject={vi.fn().mockResolvedValue(true)}
        onNewProject={vi.fn().mockResolvedValue(true)}
      />
    );

    await screen.findByRole('button', { name: new RegExp(`Open project ${project1Name}`) });
    const cloneButtons = screen.getAllByRole('button', { name: 'Clone' });

    fireEvent.click(cloneButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Current')).toBeDefined();
    });

    // Check DB record for project 1 is identical
    const p1 = await db.projects.get(project1Id);
    expect(p1?.name).toBe(project1Name);
    expect(p1?.width).toBe(32);
    expect(p1?.height).toBe(32);

    // Total projects in DB remains 2
    expect(await db.projects.count()).toBe(2);
  });
});
