'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { useThemeStore } from '@/stores/themeStore';
import { PixelIcon, PixelIconName } from '@/components/ui/PixelIcon';
import { CANONICAL_TOOLS } from '@/config/shortcuts';
import { cycleCvdLens } from '@/lib/color/cvdLens';

interface CommandItem {
  id: string;
  title: string;
  category: 'Tools' | 'View & Guides' | 'Animation' | 'Project & Studio';
  icon: PixelIconName;
  shortcut?: string;
  action: () => void;
}

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenExport?: () => void;
  onOpenImport?: () => void;
  onOpenResize?: () => void;
  onOpenGallery?: () => void;
  onOpenCoDraw?: () => void;
  onOpenShortcuts?: () => void;
  onNewDrawing?: () => void;
  onSaveNow?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  onOpenExport,
  onOpenImport,
  onOpenResize,
  onOpenGallery,
  onOpenCoDraw,
  onOpenShortcuts,
  onNewDrawing,
  onSaveNow,
  onUndo,
  onRedo,
}) => {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const {
    setActiveTool,
    toggleGrid,
    toggleIsoGuides,
    toggleTilePreview,
    toggleFloatingPreview,
    toggleSquintMode,
    setCvdLens,
    cvdLens,
    setZoom,
    setPan,
    canvasWidth,
    canvasHeight,
    isPlaying,
    setIsPlaying,
    activeFrameIndex,
    setActiveFrame,
    frames,
    loopMode,
    setLoopMode,
    onionSkin,
    setOnionSkin,
    toggleSymmetryH,
    toggleSymmetryV,
    swapColors,
  } = useStudioStore();

  const commands: CommandItem[] = useMemo(() => {
    const list: CommandItem[] = [];

    // 1. Tool Commands
    CANONICAL_TOOLS.forEach((tool) => {
      list.push({
        id: `tool-${tool.id}`,
        title: `${tool.label} Tool`,
        category: 'Tools',
        icon: tool.icon,
        shortcut: tool.shortcut,
        action: () => setActiveTool(tool.id),
      });
    });

    list.push({
      id: 'tool-swap-colors',
      title: 'Swap Primary & Secondary Colors',
      category: 'Tools',
      icon: 'palette',
      shortcut: 'X',
      action: swapColors,
    });

    // 2. View & Guides
    list.push({
      id: 'view-grid',
      title: 'Toggle Pixel Grid',
      category: 'View & Guides',
      icon: 'grid',
      shortcut: "Ctrl+'",
      action: toggleGrid,
    });

    list.push({
      id: 'view-iso-guides',
      title: 'Toggle Isometric Guides',
      category: 'View & Guides',
      icon: 'grid-iso',
      action: toggleIsoGuides,
    });

    list.push({
      id: 'view-tile-preview',
      title: 'Toggle 3x3 Seamless Tile Matrix',
      category: 'View & Guides',
      icon: 'wrap',
      action: toggleTilePreview,
    });

    list.push({
      id: 'view-pip-preview',
      title: 'Toggle Picture-in-Picture Floating Preview',
      category: 'View & Guides',
      icon: 'preview',
      action: toggleFloatingPreview,
    });

    list.push({
      id: 'view-squint-mode',
      title: 'Toggle Silhouette Squint Mode (Value Check)',
      category: 'View & Guides',
      icon: 'eye',
      shortcut: 'S',
      action: toggleSquintMode,
    });

    list.push({
      id: 'view-cvd-lens',
      title: 'Cycle Colorblindness Simulation Lens',
      category: 'View & Guides',
      icon: 'eye-off',
      shortcut: 'P',
      action: () => setCvdLens(cycleCvdLens(cvdLens)),
    });

    list.push({
      id: 'view-fit-screen',
      title: 'Fit Canvas to Viewport',
      category: 'View & Guides',
      icon: 'zoom-in',
      shortcut: 'Ctrl+0',
      action: () => {
        const availableW = window.innerWidth - 380;
        const availableH = window.innerHeight - 240;
        const scaleX = (availableW * 0.85) / canvasWidth;
        const scaleY = (availableH * 0.85) / canvasHeight;
        const targetZoom = Math.max(100, Math.min(6400, Math.floor(Math.min(scaleX, scaleY) * 100)));
        setZoom(targetZoom);
        setPan(0, 0);
      },
    });

    list.push({
      id: 'view-zoom-100',
      title: 'Zoom to 100% Actual Pixel Scale',
      category: 'View & Guides',
      icon: 'zoom-in',
      shortcut: 'Ctrl+1',
      action: () => {
        setZoom(100);
        setPan(0, 0);
      },
    });

    list.push({
      id: 'view-symmetry-h',
      title: 'Toggle Horizontal Symmetry Mirror',
      category: 'View & Guides',
      icon: 'symmetry',
      action: toggleSymmetryH,
    });

    list.push({
      id: 'view-symmetry-v',
      title: 'Toggle Vertical Symmetry Mirror',
      category: 'View & Guides',
      icon: 'symmetry',
      action: toggleSymmetryV,
    });

    // 3. Animation Commands
    list.push({
      id: 'anim-play-pause',
      title: isPlaying ? 'Pause Animation Playback' : 'Play Animation',
      category: 'Animation',
      icon: isPlaying ? 'pause' : 'play',
      shortcut: 'Space',
      action: () => setIsPlaying(!isPlaying),
    });

    list.push({
      id: 'anim-step-next',
      title: 'Step Forward 1 Frame',
      category: 'Animation',
      icon: 'step-forward',
      shortcut: '.',
      action: () => {
        if (activeFrameIndex < frames.length - 1) setActiveFrame(activeFrameIndex + 1);
        else setActiveFrame(0);
      },
    });

    list.push({
      id: 'anim-step-prev',
      title: 'Step Backward 1 Frame',
      category: 'Animation',
      icon: 'step-backward',
      shortcut: ',',
      action: () => {
        if (activeFrameIndex > 0) setActiveFrame(activeFrameIndex - 1);
        else setActiveFrame(frames.length - 1);
      },
    });

    list.push({
      id: 'anim-onion-skin',
      title: onionSkin.enabled ? 'Disable Onion Skin Lightbox' : 'Enable Onion Skin Lightbox',
      category: 'Animation',
      icon: 'onion',
      shortcut: 'O',
      action: () => setOnionSkin({ enabled: !onionSkin.enabled }),
    });

    list.push({
      id: 'anim-loop-mode',
      title: `Cycle Loop Mode (Current: ${loopMode})`,
      category: 'Animation',
      icon: 'loop',
      action: () => {
        const nextMode = loopMode === 'repeat' ? 'ping-pong' : loopMode === 'ping-pong' ? 'once' : 'repeat';
        setLoopMode(nextMode);
      },
    });

    // 4. Project & Studio
    if (onSaveNow) {
      list.push({
        id: 'proj-save',
        title: 'Save Project Now',
        category: 'Project & Studio',
        icon: 'save',
        shortcut: 'Ctrl+S',
        action: onSaveNow,
      });
    }

    if (onUndo) {
      list.push({
        id: 'proj-undo',
        title: 'Undo Previous Action',
        category: 'Project & Studio',
        icon: 'undo',
        shortcut: 'Ctrl+Z',
        action: onUndo,
      });
    }

    if (onRedo) {
      list.push({
        id: 'proj-redo',
        title: 'Redo Action',
        category: 'Project & Studio',
        icon: 'redo',
        shortcut: 'Ctrl+Y',
        action: onRedo,
      });
    }

    if (onOpenExport) {
      list.push({
        id: 'proj-export',
        title: 'Export Artwork (PNG, GIF, MP4, Spritesheet, Shaders)',
        category: 'Project & Studio',
        icon: 'export',
        action: onOpenExport,
      });
    }

    if (onOpenImport) {
      list.push({
        id: 'proj-import',
        title: 'Import Image or Project File',
        category: 'Project & Studio',
        icon: 'import',
        action: onOpenImport,
      });
    }

    if (onOpenResize) {
      list.push({
        id: 'proj-resize',
        title: `Resize Canvas Dimensions (Current: ${canvasWidth}x${canvasHeight})`,
        category: 'Project & Studio',
        icon: 'rectangle',
        action: onOpenResize,
      });
    }

    if (onOpenGallery) {
      list.push({
        id: 'proj-gallery',
        title: 'Browse Projects & Artworks Gallery',
        category: 'Project & Studio',
        icon: 'layers',
        action: onOpenGallery,
      });
    }

    if (onOpenCoDraw) {
      list.push({
        id: 'proj-codraw',
        title: 'Start Peer-to-Peer Co-Draw Collaboration',
        category: 'Project & Studio',
        icon: 'select-wand',
        action: onOpenCoDraw,
      });
    }

    if (onNewDrawing) {
      list.push({
        id: 'proj-new',
        title: 'Create New Blank Drawing',
        category: 'Project & Studio',
        icon: 'pen',
        action: onNewDrawing,
      });
    }

    if (onOpenShortcuts) {
      list.push({
        id: 'proj-shortcuts',
        title: 'Open Atelier Guide & Keyboard Shortcuts',
        category: 'Project & Studio',
        icon: 'help',
        shortcut: '?',
        action: onOpenShortcuts,
      });
    }

    list.push({
      id: 'proj-theme-atelier',
      title: 'Studio Theme: Switch to Atelier (Quiet Crafted Workbench)',
      category: 'Project & Studio',
      icon: 'palette',
      action: () => useThemeStore.getState().setStudioTheme('atelier'),
    });

    list.push({
      id: 'proj-theme-cozy',
      title: 'Studio Theme: Switch to Cozy Classic (Warm Original PixiBun)',
      category: 'Project & Studio',
      icon: 'palette',
      action: () => useThemeStore.getState().setStudioTheme('cozy-classic'),
    });

    list.push({
      id: 'proj-scheme-toggle',
      title: 'Color Scheme: Toggle Dark / Light',
      category: 'Project & Studio',
      icon: 'palette',
      action: () => useThemeStore.getState().toggleColorScheme(),
    });

    return list;
  }, [
    setActiveTool,
    swapColors,
    toggleGrid,
    toggleIsoGuides,
    toggleTilePreview,
    toggleFloatingPreview,
    toggleSquintMode,
    setCvdLens,
    cvdLens,
    canvasWidth,
    canvasHeight,
    setZoom,
    setPan,
    toggleSymmetryH,
    toggleSymmetryV,
    isPlaying,
    setIsPlaying,
    activeFrameIndex,
    frames.length,
    setActiveFrame,
    onionSkin,
    setOnionSkin,
    loopMode,
    setLoopMode,
    onSaveNow,
    onUndo,
    onRedo,
    onOpenExport,
    onOpenImport,
    onOpenResize,
    onOpenGallery,
    onOpenCoDraw,
    onNewDrawing,
    onOpenShortcuts,
  ]);

  const filteredCommands = useMemo(() => {
    if (!search.trim()) return commands;
    const query = search.toLowerCase().trim();
    return commands.filter(
      (cmd) =>
        cmd.title.toLowerCase().includes(query) ||
        cmd.category.toLowerCase().includes(query) ||
        (cmd.shortcut && cmd.shortcut.toLowerCase().includes(query))
    );
  }, [commands, search]);

  // Reset index on search change
  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Keyboard navigation inside palette
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filteredCommands.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredCommands.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = filteredCommands[selectedIndex];
      if (selected) {
        selected.action();
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const activeEl = listRef.current.children[selectedIndex] as HTMLElement | undefined;
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-100"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-lg bg-[var(--surface-1)] border-2 border-[var(--desk-border)] rounded-[var(--radius-md)] shadow-[0_16px_32px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-label="Command Palette"
        tabIndex={-1}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-2.5 px-3.5 py-3 border-b border-[var(--desk-border)] bg-[var(--surface-2)]">
          <PixelIcon name="sparkles" size={16} className="text-[var(--accent-gold)]" />
          <input
            ref={inputRef}
            onKeyDown={handleKeyDown}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Type a command, tool, or shortcut (e.g. 'Pen', 'Grid', 'Export')..."
            aria-label="Search studio commands"
            className="flex-1 bg-transparent text-[var(--text-heading)] placeholder:text-[var(--text-muted)] text-xs font-mono outline-none"
          />
          <kbd className="bg-[var(--surface-1)] text-[var(--text-muted)] font-mono text-[10px] px-1.5 py-0.5 rounded-[var(--radius-sm)] border border-[var(--desk-border)]">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          role="listbox"
          className="max-h-72 overflow-y-auto p-1.5 flex flex-col gap-0.5"
        >
          {filteredCommands.length === 0 ? (
            <div className="py-8 text-center text-[var(--text-muted)] font-mono text-xs">
              No matching commands found.
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={cmd.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    cmd.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-[var(--radius-sm)] text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--surface-2)] text-[var(--accent-gold)] border-l-2 border-[var(--accent-gold)] font-bold'
                      : 'text-[var(--text-heading)] hover:bg-[var(--surface-2)] border-l-2 border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <PixelIcon name={cmd.icon} size={15} className="shrink-0" />
                    <span className="text-xs font-sans truncate">{cmd.title}</span>
                    <span className="text-[9px] font-mono uppercase text-[var(--text-muted)] tracking-wider px-1.5 py-0.5 bg-[var(--surface-0)] rounded-[2px] shrink-0">
                      {cmd.category}
                    </span>
                  </div>
                  {cmd.shortcut && (
                    <kbd className="bg-[var(--surface-0)] text-[var(--accent-gold)] font-mono text-[10px] px-1.5 py-0.5 rounded-[var(--radius-sm)] border border-[var(--desk-border)] shrink-0 ml-2">
                      {cmd.shortcut}
                    </kbd>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer Hint */}
        <div className="px-3.5 py-2 border-t border-[var(--desk-border)] bg-[var(--surface-0)] flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)]">
          <div className="flex items-center gap-3">
            <span>↑↓ to navigate</span>
            <span>↵ to execute</span>
          </div>
          <span>PixiBun Atelier Command Hub</span>
        </div>
      </div>
    </div>
  );
};
