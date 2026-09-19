'use client';

import { readImportFile, reportImportError } from '@/lib/project/importFile';

import React, { useState } from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { TactileButton } from '@/components/ui/TactileButton';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { BunMascot } from '@/components/ui/BunMascot';
import { AppearancePopover } from '@/components/ui/AppearancePopover';
import type { ImportPayload } from '@/components/modals/ImportModal';
import { OfflineIndicator } from '@/components/system/OfflineIndicator';
import { AutosaveIndicator } from '@/components/ui/AutosaveIndicator';
import { StudioRadioWidget } from '@/components/audio/StudioRadioWidget';
import { getNextZoomStep, getPrevZoomStep } from '@/config/zoom';
import StudioTooltip from '@/components/ui/StudioTooltip';

interface TopHeaderProps {
  onOpenExport?: () => void;
  onOpenImport?: (payload: ImportPayload) => void;
  onOpenShortcuts?: () => void;
  onOpenResize?: () => void;
  onNewDrawing?: () => void;
  onSaveNow?: () => void;
  onOpenGallery?: () => void;
  onOpenCoDraw?: () => void;
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
  onSaveNow,
  onOpenGallery,
  onOpenCoDraw,
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
    isDirty,
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

    void readImportFile(file).then(payload => onOpenImport?.(payload)).catch(reportImportError);
    e.target.value = '';
  };

  const handleZoomIn = () => setZoom(getNextZoomStep(zoom));
  const handleZoomOut = () => setZoom(getPrevZoomStep(zoom));
  const handleResetZoom = () => {
    handleFitToScreen();
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
    <header className="h-14 bg-[var(--desk-surface)] border-b-2 border-[var(--desk-border)] px-4 flex items-center justify-between select-none z-20 text-[var(--text-heading)] shadow-sm transition-colors duration-300 overflow-x-auto scrollbar-none min-w-0">
      {/* Left: Brand & Project Name */}
      <div className="flex items-center gap-3 shrink-0">
        <a
          href="/"
          title="Back to the front porch"
          className="flex items-center gap-2 bg-[var(--desk-surface-raised)] hover:bg-[var(--desk-surface)] text-[var(--accent-plum)] hover:text-[var(--accent-gold)] px-2.5 py-1 rounded-[2px] border-2 border-[var(--desk-border)] shadow-[0_2px_0_var(--btn-shadow)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)]"
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
              className="text-sm font-bold text-[var(--text-heading)] hover:text-[var(--accent-gold)] transition-colors cursor-pointer flex items-center gap-1.5"
              title="Click to rename project"
            >
              <span>{projectName}</span>
              {isDirty && (
                <span
                  className="w-2 h-2 rounded-full bg-[var(--accent-gold)] shrink-0 animate-pulse"
                  title="Unsaved changes"
                  aria-label="Unsaved changes"
                />
              )}
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
        <AutosaveIndicator />

        {/* Offline Status Badge */}
        <OfflineIndicator />
      </div>

      {/* Center Utilities: Undo/Redo, Zoom, Viewport Toggles */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Undo / Redo */}
        <div className="flex items-center gap-1 bg-[var(--desk-surface-raised)] p-1 rounded-[2px] border-2 border-[var(--desk-border)]">
          <StudioTooltip content="Undo" shortcut="Ctrl+Z" position="bottom">
            <TactileButton
              size="icon-sm"
              variant="default"
              disabled={!isUndoEnabled}
              onClick={onUndo}
              title="Undo (Ctrl+Z)"
              aria-label="Undo"
              data-testid="undo-button"
              className="w-8 h-8 bg-[var(--desk-surface)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[var(--accent-gold)]"
            >
              <PixelIcon name="undo" size={16} />
            </TactileButton>
          </StudioTooltip>
          <StudioTooltip content="Redo" shortcut="Ctrl+Y" position="bottom">
            <TactileButton
              size="icon-sm"
              variant="default"
              disabled={!isRedoEnabled}
              onClick={onRedo}
              title="Redo (Ctrl+Y)"
              aria-label="Redo"
              data-testid="redo-button"
              className="w-8 h-8 bg-[var(--desk-surface)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[var(--accent-gold)]"
            >
              <PixelIcon name="redo" size={16} />
            </TactileButton>
          </StudioTooltip>
        </div>

        <div className="h-5 w-px bg-[var(--desk-border)]" />

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 bg-[var(--desk-surface-raised)] p-1 rounded-[2px] border-2 border-[var(--desk-border)]">
          <StudioTooltip content="Zoom Out" shortcut="-" position="bottom">
            <TactileButton
              size="icon-sm"
              variant="default"
              onClick={handleZoomOut}
              title="Zoom Out (-)"
              className="w-8 h-8 bg-[var(--desk-surface)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[var(--accent-gold)]"
            >
              <PixelIcon name="zoom-out" size={16} />
            </TactileButton>
          </StudioTooltip>
          <StudioTooltip content="Fit to Screen" shortcut="Ctrl+0" position="bottom">
            <button
              onClick={handleResetZoom}
              className="px-2 text-xs font-mono font-bold text-[var(--accent-gold)] hover:text-[#fff8db] min-w-[52px] text-center cursor-pointer"
              title="Fit to Screen (Ctrl+0)"
            >
              {zoom}%
            </button>
          </StudioTooltip>
          <StudioTooltip content="Zoom In" shortcut="+" position="bottom">
            <TactileButton
              size="icon-sm"
              variant="default"
              onClick={handleZoomIn}
              title="Zoom In (+)"
              className="w-8 h-8 bg-[var(--desk-surface)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[var(--accent-gold)]"
            >
              <PixelIcon name="zoom-in" size={16} />
            </TactileButton>
          </StudioTooltip>

          <StudioTooltip content="Fit Canvas in Viewport" position="bottom">
            <TactileButton
              size="icon-sm"
              variant="default"
              onClick={handleFitToScreen}
              title="Fit to Screen"
              className="w-8 h-8 text-[10px] font-mono font-bold bg-[var(--desk-surface)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[var(--accent-gold)]"
            >
              FIT
            </TactileButton>
          </StudioTooltip>
        </div>
      </div>

      {/* Right Actions: Theme Toggle, Shortcuts, Import & Export */}
      <div className="flex items-center gap-2 shrink-0">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pixibun,.json"
          onChange={handleFileChange}
          className="hidden"
        />

        <StudioRadioWidget />

        <AppearancePopover className="w-7 h-7 rounded-[2px] border-2 border-[var(--desk-border)] bg-[var(--desk-surface-raised)] hover:text-[var(--accent-gold)] shrink-0" />

        <StudioTooltip content="Projects & Artworks Gallery" position="bottom">
          <TactileButton
            size="sm"
            variant="default"
            onClick={onOpenGallery}
            title="Open Projects & Artworks Gallery"
            aria-label="Projects Gallery"
            className="text-xs px-2.5 py-1.5 bg-[var(--desk-surface-raised)] border-2 border-[var(--desk-border)] text-[var(--text-body)] hover:text-[var(--accent-gold)] flex items-center gap-1.5"
          >
            <PixelIcon name="layers" size={14} />
            <span>Projects</span>
          </TactileButton>
        </StudioTooltip>

        <StudioTooltip content="Peer-to-Peer Co-Draw Collaboration" position="bottom">
          <TactileButton
            size="sm"
            variant="default"
            onClick={onOpenCoDraw}
            title="Peer-to-Peer Co-Draw Collaboration"
            aria-label="Co-Draw P2P Collaboration"
            className="text-xs px-2.5 py-1.5 bg-[var(--desk-surface-raised)] border-2 border-[var(--desk-border)] text-[var(--text-body)] hover:text-[var(--accent-gold)] flex items-center gap-1.5"
          >
            <PixelIcon name="select-wand" size={14} />
            <span>Co-Draw</span>
          </TactileButton>
        </StudioTooltip>

        <StudioTooltip content="Start a New Blank Drawing" position="bottom">
          <TactileButton
            size="sm"
            variant="default"
            onClick={onNewDrawing}
            title="Start a New Blank Drawing"
            aria-label="New Drawing"
            data-testid="new-drawing-button"
            className="text-xs px-2.5 py-1.5 bg-[var(--desk-surface-raised)] border-2 border-[var(--desk-border)] text-[var(--text-body)] hover:text-[var(--accent-gold)] flex items-center gap-1.5"
          >
            <PixelIcon name="pen" size={14} />
            <span>New</span>
          </TactileButton>
        </StudioTooltip>

        {onSaveNow && (
          <StudioTooltip content="Save Project Now" shortcut="Ctrl+S" position="bottom">
            <TactileButton
              size="sm"
              variant="default"
              onClick={onSaveNow}
              title="Save Now (Ctrl+S)"
              aria-label="Save Project Now"
              data-testid="save-now-button"
              className="text-xs px-2.5 py-1.5 bg-[var(--desk-surface-raised)] border-2 border-[var(--desk-border)] text-[var(--text-body)] hover:text-[var(--accent-gold)] flex items-center gap-1.5 font-bold"
            >
              <PixelIcon name="save" size={14} />
              <span>Save</span>
            </TactileButton>
          </StudioTooltip>
        )}

        <StudioTooltip content="Atelier Guide, Diagnostics & Shortcuts" shortcut="?" position="bottom">
          <TactileButton
            size="sm"
            variant="default"
            onClick={onOpenShortcuts}
            title="Atelier Guide, Diagnostics & Shortcuts (?)"
            aria-label="Atelier Guide, Diagnostics and Shortcuts"
            data-testid="shortcuts-guide-button"
            className="text-xs px-2.5 py-1.5 bg-[var(--desk-surface-raised)] border-2 border-[var(--desk-border)] text-[var(--text-body)] hover:text-[var(--accent-gold)] flex items-center gap-1.5"
          >
            <PixelIcon name="help" size={14} />
            <span>Guide</span>
          </TactileButton>
        </StudioTooltip>

        <StudioTooltip content="Import and Convert Image to Pixel Art" position="bottom">
          <TactileButton
            size="sm"
            variant="default"
            onClick={() => fileInputRef.current?.click()}
            title="Import and Convert Image to Pixel Art"
            className="text-xs px-2.5 py-1.5 bg-[var(--desk-surface-raised)] border-2 border-[var(--desk-border)] text-[var(--text-body)] hover:text-[var(--accent-gold)] flex items-center gap-1.5"
          >
            <PixelIcon name="export" size={14} className="rotate-180" />
            <span>Import</span>
          </TactileButton>
        </StudioTooltip>

        <StudioTooltip content="Export PNG, GIF, or Spritesheet" position="bottom">
          <TactileButton
            size="sm"
            variant="primary"
            onClick={onOpenExport}
            title="Export PNG, GIF, or Spritesheet"
            aria-label="Export Studio Assets"
            data-testid="export-button"
            className="text-xs px-3 py-1.5 bg-[var(--accent-gold)] hover:bg-[#fcd699] hover:shadow-[0_2px_0_#8c5120] text-[var(--desk-bg)] border-2 border-[#8c5120] font-mono font-bold shadow-[0_2px_0_#8c5120] flex items-center gap-1.5"
          >
            <PixelIcon name="export" size={14} />
            <span>Export</span>
          </TactileButton>
        </StudioTooltip>
      </div>
    </header>
  );
};
