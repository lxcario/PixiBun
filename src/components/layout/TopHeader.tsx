'use client';

import React, { useState } from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { TactileButton } from '@/components/ui/TactileButton';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { BunMascot } from '@/components/ui/BunMascot';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

interface TopHeaderProps {
  onOpenExport?: () => void;
  onOpenShortcuts?: () => void;
  onOpenResize?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  onOpenExport,
  onOpenShortcuts,
  onOpenResize,
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
            autoFocus
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

      {/* Right Actions: Theme Toggle, Shortcuts & Export */}
      <div className="flex items-center gap-2">
        <ThemeToggle />

        <TactileButton
          size="sm"
          variant="default"
          onClick={onOpenShortcuts}
          title="Keyboard Shortcuts (?)"
          className="text-xs px-2.5 py-1.5 bg-[var(--desk-surface-raised)] border-2 border-[var(--desk-border)] text-[var(--text-body)] hover:text-[#f0be7c] flex items-center gap-1.5"
        >
          <PixelIcon name="help" size={14} />
          <span>Shortcuts</span>
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
