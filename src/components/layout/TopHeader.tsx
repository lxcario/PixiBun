'use client';

import React, { useState } from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { TactileButton } from '@/components/ui/TactileButton';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { BunMascot } from '@/components/ui/BunMascot';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { ImportPayload } from '@/components/modals/ImportModal';
import { OfflineIndicator } from '@/components/system/OfflineIndicator';

interface TopHeaderProps {
  onOpenExport?: () => void;
  onOpenImport?: (payload: ImportPayload) => void;
  onOpenShortcuts?: () => void;
  onOpenResize?: () => void;
  onNewDrawing?: () => void;
  onOpenGallery?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  onOpenExport,
  onOpenImport,
  onOpenShortcuts,
  onOpenResize,
  onNewDrawing,
  onOpenGallery,
  onUndo,
  onRedo,
  canUndo: propCanUndo,
  canRedo: propCanRedo,
}) => {
  const {
    projectName,
    setProjectName,
    canvasWidth,
    canvasHeight,
    zoom,
    setZoom,
    setPan,
    canUndo: storeCanUndo,
    canRedo: storeCanRedo,
  } = useStudioStore();

  const isUndoEnabled = propCanUndo !== undefined ? propCanUndo : storeCanUndo;
  const isRedoEnabled = propCanRedo !== undefined ? propCanRedo : storeCanRedo;

  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(projectName);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const filename = file.name;
    const isProject = filename.endsWith('.pixibun') || filename.endsWith('.json');

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (isProject) {
        try {
          const parsed = JSON.parse(result as string);
          onOpenImport?.({
            type: 'project',
            filename,
            projectJson: parsed,
          });
        } catch {
          // ignore malformed JSON
        }
      } else {
        const dataUrl = result as string;
        const img = new Image();
        img.onload = () => {
          onOpenImport?.({
            type: 'image',
            filename,
            dataUrl,
            imgWidth: img.width,
            imgHeight: img.height,
          });
        };
        img.src = dataUrl;
      }
    };

    if (isProject) {
      reader.readAsText(file);
    } else {
      reader.readAsDataURL(file);
    }

    e.target.value = '';
  };

  const handleZoomIn = () => setZoom(zoom * 1.5);
  const handleZoomOut = () => setZoom(zoom / 1.5);
  const handleResetZoom = () => {
    setZoom(1600);
    setPan(0, 0);
  };
  const handleFitToScreen = () => {
    // Calculate best fit zoom based on 600px stage viewport
    const fit = Math.min(
      Math.floor(52000 / canvasWidth),
      Math.floor(52000 / canvasHeight)
    );
    setZoom(Math.max(200, Math.min(3200, fit)));
    setPan(0, 0);
  };

  const handleNameSubmit = () => {
    if (tempName.trim()) {
      setProjectName(tempName.trim());
    }
    setIsEditingName(false);
  };

  return (
    <header className="h-14 bg-[var(--desk-surface)] border-b-2 border-[var(--desk-border)] px-4 flex items-center justify-between select-none z-20 text-[var(--text-heading)] shadow-sm transition-colors duration-300">
      {/* Left: Brand & Project Name */}
      <div className="flex items-center gap-3">
        <a
          href="/"
          title="Back to the front porch"
          className="flex items-center gap-2 bg-[var(--desk-surface-raised)] hover:bg-[var(--desk-surface)] text-[var(--accent-plum)] hover:text-[var(--accent-gold)] px-2.5 py-1 rounded-[2px] border-2 border-[var(--desk-border)] shadow-[0_2px_0_var(--btn-shadow)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0be7c]"
        >
          <BunMascot size={20} />
          <span className="font-display text-xs tracking-wider uppercase">
            PixiBun
          </span>
        </a>

        <div className="h-5 w-px bg-[var(--desk-border)]" />

        {isEditingName ? (
          <input
            type="text"
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            onBlur={handleNameSubmit}
            onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
            ref={(el) => el?.focus()}
            aria-label="Project name"
            className="bg-[var(--desk-surface-raised)] text-[var(--text-heading)] px-2.5 py-1 text-sm font-mono rounded-[2px] border-2 border-[var(--accent-gold)] outline-none"
          />
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditingName(true)}
              className="text-sm font-bold text-[var(--text-heading)] hover:text-[var(--accent-gold)] transition-colors cursor-pointer"
              title="Click to rename project"
            >
              {projectName}
            </button>

            <button
              onClick={onOpenResize}
              className="bg-[var(--desk-surface-raised)] hover:bg-[var(--desk-surface)] hover:border-[var(--accent-gold)] text-[var(--accent-gold)] font-bold px-2 py-0.5 rounded-[2px] border border-[var(--desk-border)] text-xs font-mono transition-colors cursor-pointer shadow-xs"
              title="Resize Canvas Bounds"
            >
              {canvasWidth}x{canvasHeight}
            </button>
          </div>
        )}

        {/* Autosave Status Pill */}
        <div className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded-[2px] bg-[var(--desk-surface-raised)] border border-[var(--desk-border)] text-[11px] font-mono text-[var(--text-body)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#f0be7c] animate-pulse" />
          <span>Saved</span>
        </div>

        {/* Offline Status Badge */}
        <OfflineIndicator />
      </div>

      {/* Center Utilities: Undo/Redo, Zoom, Viewport Toggles */}
      <div className="flex items-center gap-2">
        {/* Undo / Redo */}
        <div className="flex items-center gap-1 bg-[var(--desk-surface-raised)] p-1 rounded-[2px] border-2 border-[var(--desk-border)]">
          <TactileButton
            size="icon-sm"
            variant="default"
            disabled={!isUndoEnabled}
            onClick={onUndo}
            title="Undo (Ctrl+Z)"
            className="w-8 h-8 bg-[var(--desk-surface)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[#f0be7c]"
          >
            <PixelIcon name="undo" size={16} />
          </TactileButton>
          <TactileButton
            size="icon-sm"
            variant="default"
            disabled={!isRedoEnabled}
            onClick={onRedo}
            title="Redo (Ctrl+Y)"
            className="w-8 h-8 bg-[var(--desk-surface)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[#f0be7c]"
          >
            <PixelIcon name="redo" size={16} />
          </TactileButton>
        </div>

        <div className="h-5 w-px bg-[#3a2e4c]" />

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 bg-[var(--desk-surface-raised)] p-1 rounded-[2px] border-2 border-[var(--desk-border)]">
          <TactileButton
            size="icon-sm"
            variant="default"
            onClick={handleZoomOut}
            title="Zoom Out (-)"
            className="w-8 h-8 bg-[var(--desk-surface)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[#f0be7c]"
          >
            <PixelIcon name="zoom-out" size={16} />
          </TactileButton>
          <button
            onClick={handleResetZoom}
            className="px-2 text-xs font-mono font-bold text-[#f0be7c] hover:text-[#fff8db] min-w-[52px] text-center cursor-pointer"
            title="Reset Zoom (1600%)"
          >
            {zoom}%
          </button>
          <TactileButton
            size="icon-sm"
            variant="default"
            onClick={handleZoomIn}
            title="Zoom In (+)"
            className="w-8 h-8 bg-[var(--desk-surface)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[#f0be7c]"
          >
            <PixelIcon name="zoom-in" size={16} />
          </TactileButton>

          <TactileButton
            size="icon-sm"
            variant="default"
            onClick={handleFitToScreen}
            title="Fit to Screen"
            className="w-8 h-8 text-[10px] font-mono font-bold bg-[var(--desk-surface)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[#f0be7c]"
          >
            FIT
          </TactileButton>
        </div>
      </div>

      {/* Right Actions: Theme Toggle, Shortcuts, Import & Export */}
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pixibun,.json"
          onChange={handleFileChange}
          className="hidden"
        />

        <ThemeToggle />

        <TactileButton
          size="sm"
          variant="default"
          onClick={onOpenGallery}
          title="Open Projects & Artworks Gallery"
          aria-label="Projects Gallery"
          className="text-xs px-2.5 py-1.5 bg-[var(--desk-surface-raised)] border-2 border-[var(--desk-border)] text-[var(--text-body)] hover:text-[#f0be7c] flex items-center gap-1.5"
        >
          <PixelIcon name="layers" size={14} />
          <span>Projects</span>
        </TactileButton>

        <TactileButton
          size="sm"
          variant="default"
          onClick={onNewDrawing}
          title="Start a New Blank Drawing"
          className="text-xs px-2.5 py-1.5 bg-[var(--desk-surface-raised)] border-2 border-[var(--desk-border)] text-[var(--text-body)] hover:text-[#f0be7c] flex items-center gap-1.5"
        >
          <PixelIcon name="pen" size={14} />
          <span>New</span>
        </TactileButton>

        <TactileButton
          size="sm"
          variant="default"
          onClick={onOpenShortcuts}
          title="Atelier Guide, Diagnostics & Shortcuts (?)"
          aria-label="Atelier Guide, Diagnostics and Shortcuts"
          className="text-xs px-2.5 py-1.5 bg-[var(--desk-surface-raised)] border-2 border-[var(--desk-border)] text-[var(--text-body)] hover:text-[#f0be7c] flex items-center gap-1.5"
        >
          <PixelIcon name="help" size={14} />
          <span>Guide</span>
        </TactileButton>

        <TactileButton
          size="sm"
          variant="default"
          onClick={() => fileInputRef.current?.click()}
          title="Import and Convert Image to Pixel Art"
          className="text-xs px-2.5 py-1.5 bg-[var(--desk-surface-raised)] border-2 border-[var(--desk-border)] text-[var(--text-body)] hover:text-[#f0be7c] flex items-center gap-1.5"
        >
          <PixelIcon name="export" size={14} className="rotate-180" />
          <span>Import</span>
        </TactileButton>

        <TactileButton
          size="sm"
          variant="primary"
          onClick={onOpenExport}
          title="Export PNG, GIF, or Spritesheet"
          className="text-xs px-3 py-1.5 bg-[#f0be7c] hover:bg-[#fff8db] text-[#140d1f] border-2 border-[#8c5120] font-mono font-bold shadow-[0_2px_0_#8c5120] flex items-center gap-1.5"
        >
          <PixelIcon name="export" size={14} />
          <span>Export</span>
        </TactileButton>
      </div>
    </header>
  );
};
