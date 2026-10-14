'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ModalWrapper } from '@/components/ui/ModalWrapper';
import { TactileButton } from '@/components/ui/TactileButton';
import { PixelIcon } from '@/components/ui/PixelIcon';
import {
  listAllProjects,
  duplicateProject,
  getStoredProjectVersion,
  deleteProject,
  type StoredProject,
} from '@/lib/storage/db';
import { MAX_PROJECT_NAME_LENGTH, projectNameError } from '@/lib/project/metadataAdmission';
import { studioEvents } from '@/lib/events/studioEvents';

interface ProjectsGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProjectId: string;
  onOpenProject: (projectId: string) => Promise<void>;
  onRenameProject: (projectId: string, name: string, expectedVersion: string) => Promise<boolean>;
  onNewProject: (skipCurrentSave?: boolean) => Promise<boolean>;
  onOpenImport?: () => void;
}

export const ProjectsGalleryModal: React.FC<ProjectsGalleryModalProps> = ({
  isOpen,
  onClose,
  currentProjectId,
  onOpenProject,
  onRenameProject,
  onNewProject,
  onOpenImport,
}) => {
  const [projects, setProjects] = useState<StoredProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [storageError, setStorageError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setStorageError(null);
    try {
      const all = await listAllProjects();
      setProjects(all);
    } catch (err) {
      console.error('Failed to list projects:', err);
      setStorageError('Browser storage is unavailable. Your saved projects could not be loaded.');
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      void fetchProjects();
      setEditingId(null);
      setDeleteConfirmId(null);
    }
  }, [isOpen, fetchProjects]);

  const handleStartRename = (project: StoredProject) => {
    setEditingId(project.id);
    setEditingName(project.name);
    setRenameError(null);
  };

  const handleSaveRename = async (id: string) => {
    const trimmed = editingName.trim();
    const error = projectNameError(trimmed);
    if (error) {
      studioEvents.emit('pixibun:toast', { type: 'error', message: error });
      return;
    }

    if (renaming) return;
    const project = projects.find(candidate => candidate.id === id);
    if (!project) return;
    setRenaming(true);
    setRenameError(null);
    try {
      const renamed = await onRenameProject(id, trimmed, getStoredProjectVersion(project));
      if (!renamed) {
        setRenameError('The title could not be saved. Your drawing is still open; check save warnings or refresh the gallery before trying again.');
        return;
      }
      setEditingId(null);
      await fetchProjects();
    } catch (error) {
      setRenameError(error instanceof Error ? error.message : 'The title could not be saved. Try again or export a backup.');
    } finally {
      setRenaming(false);
    }
  };

  const handleDuplicate = async (project: StoredProject, e: React.MouseEvent) => {
    e.stopPropagation();
    await duplicateProject(project.id);
    void fetchProjects();
  };

  const handleDelete = async (id: string) => {
    const deleted = await deleteProject(id);
    if (!deleted) {
      setStorageError('The project could not be deleted. Your workspace was left unchanged.');
      return;
    }
    setDeleteConfirmId(null);

    // If user deletes active project, reset to a clean new project
    if (id === currentProjectId) {
      await onNewProject(true);
      onClose();
      return;
    }

    void fetchProjects();
  };

  const handleSelectProject = async (project: StoredProject) => {
    if (project.id === currentProjectId) {
      onClose();
      return;
    }
    try {
      await onOpenProject(project.id);
      onClose();
    } catch (err) {
      setStorageError(err instanceof Error ? err.message : 'The project could not be opened.');
    }
  };

  const formatTime = (timestamp: number) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Recently';
    }
  };

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      title="Projects & Gallery"
      maxWidth="max-w-4xl"
    >
      <div className="flex flex-col gap-5 p-1">
        {/* Gallery Header Controls */}
        <div className="flex items-center justify-between gap-3 flex-wrap border-b border-[var(--desk-border)]/50 pb-4">
          <div className="flex items-center gap-2">
            <TactileButton
              variant="primary"
              size="sm"
              onClick={async () => {
                if (await onNewProject()) onClose();
              }}
              className="gap-2"
            >
              <PixelIcon name="plus" size={14} />
              <span>New Drawing</span>
            </TactileButton>

            {onOpenImport && (
              <TactileButton
                variant="default"
                size="sm"
                onClick={() => {
                  onClose();
                  onOpenImport();
                }}
                className="gap-2"
              >
                <PixelIcon name="import" size={14} />
                <span>Import File</span>
              </TactileButton>
            )}
          </div>

          {/* Search Filter */}
          <div className="flex items-center gap-2 bg-[var(--desk-surface)] border border-[var(--desk-border)] rounded-[2px] px-2.5 py-1 text-xs">
            <span className="text-[var(--text-muted)] font-mono">Filter:</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search drawings..."
              className="bg-transparent border-none outline-none text-[var(--text-heading)] font-mono text-xs w-36 placeholder:text-[var(--text-muted)]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search filter"
                className="text-[var(--text-muted)] hover:text-[var(--accent-gold)] text-xs font-bold"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Projects Grid */}
        {loading ? (
          <div className="py-16 text-center text-sm font-mono text-[var(--text-muted)]">
            Loading saved artworks from IndexedDB...
          </div>
        ) : storageError ? (
          <div role="alert" className="py-12 px-4 text-center text-xs font-mono text-[var(--danger-fg)] bg-[var(--danger-bg)]/80 border border-[var(--danger-border)]/50 rounded-[3px] flex flex-col items-center gap-2">
            <PixelIcon name="warning" size={16} className="text-[var(--danger-fg)]" />
            <p>{storageError}</p>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="py-16 text-center text-sm font-mono text-[var(--text-muted)] border border-dashed border-[var(--desk-border)] rounded-[3px]">
            {searchQuery ? 'No artworks matching search filter.' : 'No saved artworks yet.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto pr-1">
            {filteredProjects.map((project) => {
              const isActive = project.id === currentProjectId;

              return (
                <div
                  key={project.id}
                  onClick={() => handleSelectProject(project)}
                  onKeyDown={(e) => {
                    if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      void handleSelectProject(project);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`Open project ${project.name}`}
                  className={`group relative flex flex-col p-3 rounded-[3px] border-2 transition-all cursor-pointer select-none text-left bg-[var(--desk-surface)] ${
                    isActive
                      ? 'border-[var(--accent-gold)] shadow-[0_0_12px_rgba(240,190,124,0.15)] ring-1 ring-[var(--accent-gold)]'
                      : 'border-[var(--desk-border)] hover:border-[#a86ec6] hover:bg-[var(--desk-surface-raised)]'
                  }`}
                >
                  {/* Active Indicator Badge */}
                  {isActive && (
                    <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-[2px] bg-[var(--primary-bg)] text-[var(--primary-fg)] text-[9px] font-mono font-bold tracking-wider uppercase shadow-sm">
                      Current
                    </div>
                  )}

                  {/* Thumbnail Box */}
                  <div className="w-full aspect-square bg-[var(--surface-0)] border border-[var(--desk-border)] rounded-[2px] overflow-hidden flex items-center justify-center p-2 mb-3 relative bg-[radial-gradient(#281b3d_1px,transparent_1px)] [background-size:8px_8px]">
                    {project.thumbnailDataUrl ? (
                      <img
                        src={project.thumbnailDataUrl}
                        alt={project.name}
                        className="max-w-full max-h-full object-contain pixelated shadow-sm"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-[var(--text-muted)] gap-1">
                        <PixelIcon name="layers" size={24} />
                        <span className="text-[10px] font-mono">{project.width}×{project.height}</span>
                      </div>
                    )}
                  </div>

                  {/* Title & Rename Input */}
                  <div className="mb-2">
                    {editingId === project.id ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          void handleSaveRename(project.id);
                        }}
                        className="flex items-center gap-1"
                      >
                        <input
                          type="text"
                          maxLength={MAX_PROJECT_NAME_LENGTH}
                          value={editingName}
                          disabled={renaming}
                          aria-label="Artwork title"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDownCapture={(e) => {
                            if (e.key === 'Escape') {
                              e.preventDefault(); e.stopPropagation();
                              if (!renaming) { setEditingId(null); setRenameError(null); }
                            }
                          }}
                          onKeyDown={(e) => e.stopPropagation()}
                          ref={(input) => input?.focus()}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="w-full px-1.5 py-0.5 bg-[var(--surface-0)] border border-[var(--accent-gold)] rounded-[2px] text-xs font-mono text-[var(--text-heading)] outline-none"
                        />
                        <button
                          type="submit"
                          onClick={(e) => e.stopPropagation()}
                          className="px-1.5 py-0.5 text-xs text-[#7fae6b] font-bold"
                          title="Save title"
                          aria-label="Save title"
                          disabled={renaming}
                        >
                          ✓
                        </button>
                      </form>
                    ) : (
                      <div className="flex items-center justify-between gap-1 group/title">
                        <span
                          className="font-bold text-xs font-display text-[var(--text-heading)] truncate"
                          title={project.name}
                        >
                          {project.name}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartRename(project);
                          }}
                          className="opacity-0 group-hover/title:opacity-100 group-focus-within/title:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] text-[var(--text-muted)] hover:text-[var(--accent-gold)] p-0.5"
                          title="Rename artwork"
                          aria-label="Rename artwork"
                        >
                          <PixelIcon name="pen" size={12} />
                        </button>
                      </div>
                    )}
                    {editingId === project.id && renameError && <p role="alert" className="text-xs text-[var(--text-body)] mt-1">{renameError}</p>}
                  </div>

                  {/* Metadata Chips */}
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-[var(--text-muted)] mb-3">
                    <span className="px-1.5 py-0.5 bg-[var(--surface-0)]/50 border border-[var(--desk-border)] rounded-[2px]">
                      {project.width}×{project.height}
                    </span>
                    <span className="px-1.5 py-0.5 bg-[var(--surface-0)]/50 border border-[var(--desk-border)] rounded-[2px]">
                      {project.fps} FPS
                    </span>
                    <span className="truncate ml-auto" title={new Date(project.updatedAt).toLocaleString()}>
                      {formatTime(project.updatedAt)}
                    </span>
                  </div>

                  {/* Actions Row */}
                  <div className="flex items-center justify-between border-t border-[var(--desk-border)] pt-2 mt-auto">
                    <button
                      type="button"
                      onClick={(e) => handleDuplicate(project, e)}
                      className="inline-flex items-center gap-1 text-[11px] font-mono text-[var(--text-muted)] hover:text-[var(--accent-wisteria)] transition-colors"
                      title="Duplicate drawing"
                    >
                      <PixelIcon name="copy" size={12} />
                      <span>Clone</span>
                    </button>

                    {deleteConfirmId === project.id ? (
                      <div className="flex items-center gap-1.5 animate-fadeIn">
                        <span className="text-[10px] text-[#f77622] font-mono font-bold">Delete?</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(project.id);
                          }}
                          className="px-1 py-0.5 rounded-[2px] bg-[#a22633] text-white text-[10px] font-mono font-bold hover:bg-[var(--state-danger)]"
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(null);
                          }}
                          className="px-1 py-0.5 rounded-[2px] bg-[var(--desk-border)] text-[var(--text-body)] text-[10px] font-mono"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmId(project.id);
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-mono text-[var(--text-muted)] hover:text-[var(--danger-fg)] transition-colors"
                        title="Delete drawing"
                      >
                        <PixelIcon name="trash" size={12} />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer Summary */}
        <div className="flex items-center justify-between text-xs font-mono text-[var(--text-muted)] pt-3 border-t border-[var(--desk-border)]/50">
          <span>{projects.length} {projects.length === 1 ? 'project' : 'projects'} saved in browser IndexedDB</span>
          <TactileButton variant="ghost" size="sm" onClick={onClose}>
            Close
          </TactileButton>
        </div>
      </div>
    </ModalWrapper>
  );
};
