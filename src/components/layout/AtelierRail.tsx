'use client';

import { readImportFile, reportImportError } from '@/lib/project/importFile';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useStudioStore } from '@/stores/studioStore';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { PixiBunLogo } from '@/components/ui/PixiBunLogo';
import { AppearancePopover } from '@/components/ui/AppearancePopover';
import StudioTooltip from '@/components/ui/StudioTooltip';
import { TactileButton } from '@/components/ui/TactileButton';
import { OfflineIndicator } from '@/components/system/OfflineIndicator';
import type { ImportPayload } from '@/components/modals/ImportModal';
import { getNextZoomStep, getPrevZoomStep, calculateFitZoom } from '@/config/zoom';
import { CvdLensMode, cycleCvdLens } from '@/lib/color/cvdLens';
import { DitherMatrixType, WallpaperGroup } from '@/types/tools';
import { MAX_PROJECT_NAME_LENGTH } from '@/lib/project/metadataAdmission';

const CVD_LENS_BUTTON_LABELS: Record<CvdLensMode, string> = {
  none: 'OFF',
  protanopia: 'Pro',
  deuteranopia: 'Deu',
  tritanopia: 'Tri',
  monochromacy: 'Mono',
};

const CVD_LENS_TITLES: Record<CvdLensMode, string> = {
  none: 'Colorblindness Lens (P): OFF — cycles Protanopia / Deuteranopia / Tritanopia / Monochromacy',
  protanopia: 'Colorblindness Lens (P): Protanopia (red-weak) — cycles lens modes',
  deuteranopia: 'Colorblindness Lens (P): Deuteranopia (green-weak) — cycles lens modes',
  tritanopia: 'Colorblindness Lens (P): Tritanopia (blue-weak) — cycles lens modes',
  monochromacy: 'Colorblindness Lens (P): Monochromacy (luminance only) — cycles lens modes',
};

export interface AtelierRailProps {
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

export const AtelierRail: React.FC<AtelierRailProps> = ({
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
  const projectName = useStudioStore((s) => s.projectName);
  const setProjectName = useStudioStore((s) => s.setProjectName);
  const canvasWidth = useStudioStore((s) => s.canvasWidth);
  const canvasHeight = useStudioStore((s) => s.canvasHeight);
  const isDirty = useStudioStore((s) => s.isDirty);
  const saveStatus = useStudioStore((s) => s.saveStatus);
  const zoom = useStudioStore((s) => s.zoom);
  const setZoom = useStudioStore((s) => s.setZoom);
  const setPan = useStudioStore((s) => s.setPan);
  const tools = useStudioStore((s) => s.tools);
  const setBrushSize = useStudioStore((s) => s.setBrushSize);
  const setPixelPerfect = useStudioStore((s) => s.setPixelPerfect);
  const setDitherMatrix = useStudioStore((s) => s.setDitherMatrix);
  const setDitherDensity = useStudioStore((s) => s.setDitherDensity);
  const setBucketContiguous = useStudioStore((s) => s.setBucketContiguous);
  const setBucketTolerance = useStudioStore((s) => s.setBucketTolerance);
  const setFillTolerance = useStudioStore((s) => s.setFillTolerance);
  const setFillEnclosedSpecks = useStudioStore((s) => s.setFillEnclosedSpecks);
  const setEraseColorTolerance = useStudioStore((s) => s.setEraseColorTolerance);
  const setEraseColorContiguous = useStudioStore((s) => s.setEraseColorContiguous);
  const setEraseColorFamily = useStudioStore((s) => s.setEraseColorFamily);
  const setEraseColorAllFrames = useStudioStore((s) => s.setEraseColorAllFrames);
  const setShapeFilled = useStudioStore((s) => s.setShapeFilled);
  const setCurveTightness = useStudioStore((s) => s.setCurveTightness);
  const setIsoAngleSnap = useStudioStore((s) => s.setIsoAngleSnap);
  const toggleSymmetryH = useStudioStore((s) => s.toggleSymmetryH);
  const toggleSymmetryV = useStudioStore((s) => s.toggleSymmetryV);
  const setSymmetryGroup = useStudioStore((s) => s.setSymmetryGroup);
  const showGrid = useStudioStore((s) => s.showGrid);
  const toggleGrid = useStudioStore((s) => s.toggleGrid);
  const showIsoGuides = useStudioStore((s) => s.showIsoGuides);
  const toggleIsoGuides = useStudioStore((s) => s.toggleIsoGuides);
  const showTilePreview = useStudioStore((s) => s.showTilePreview);
  const toggleTilePreview = useStudioStore((s) => s.toggleTilePreview);
  const showFloatingPreview = useStudioStore((s) => s.showFloatingPreview);
  const toggleFloatingPreview = useStudioStore((s) => s.toggleFloatingPreview);
  const cvdLens = useStudioStore((s) => s.cvdLens);
  const squintMode = useStudioStore((s) => s.squintMode);
  const setCvdLens = useStudioStore((s) => s.setCvdLens);
  const toggleSquintMode = useStudioStore((s) => s.toggleSquintMode);
  const referenceOverlay = useStudioStore((s) => s.referenceOverlay);
  const cycleReferenceOverlay = useStudioStore((s) => s.cycleReferenceOverlay);
  const storeCanUndo = useStudioStore((s) => s.canUndo);
  const storeCanRedo = useStudioStore((s) => s.canRedo);

  const isUndoEnabled = propCanUndo !== undefined ? propCanUndo : storeCanUndo;
  const isRedoEnabled = propCanRedo !== undefined ? propCanRedo : storeCanRedo;

  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(projectName);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // View Options Popover state
  const [isViewMenuOpen, setIsViewMenuOpen] = useState(false);
  const viewMenuRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverCoords, setPopoverCoords] = useState<{ top: number; right: number } | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const updatePopoverCoords = useCallback(() => {
    if (viewMenuRef.current) {
      const rect = viewMenuRef.current.getBoundingClientRect();
      setPopoverCoords({
        top: rect.bottom + 4,
        right: Math.max(16, window.innerWidth - rect.right),
      });
    }
  }, []);

  const handleToggleViewMenu = () => {
    setIsViewMenuOpen((prev) => {
      const next = !prev;
      if (next) updatePopoverCoords();
      return next;
    });
  };

  useEffect(() => {
    if (!isViewMenuOpen) return;
    updatePopoverCoords();

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        viewMenuRef.current && !viewMenuRef.current.contains(target) &&
        popoverRef.current && !popoverRef.current.contains(target)
      ) {
        setIsViewMenuOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsViewMenuOpen(false);
    };

    window.addEventListener('resize', updatePopoverCoords);
    window.addEventListener('scroll', updatePopoverCoords, true);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('resize', updatePopoverCoords);
      window.removeEventListener('scroll', updatePopoverCoords, true);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isViewMenuOpen, updatePopoverCoords]);

  const activeViewModifiers = [
    showGrid,
    showIsoGuides,
    showTilePreview,
    showFloatingPreview,
    cvdLens !== 'none',
    squintMode,
    referenceOverlay !== 'none',
    tools.symmetryHorizontal,
    tools.symmetryVertical,
    tools.symmetryGroup && tools.symmetryGroup !== 'none',
  ].filter(Boolean).length;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    void readImportFile(file).then(payload => onOpenImport?.(payload)).catch(reportImportError);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isShapeTool =
    tools.activeTool === 'rectangle' ||
    tools.activeTool === 'ellipse' ||
    tools.activeTool === 'line' ||
    tools.activeTool === 'isometric-line';

  const hasToolParams =
    tools.activeTool === 'pen' ||
    tools.activeTool === 'curve' ||
    tools.activeTool === 'eraser' ||
    tools.activeTool === 'bucket' ||
    tools.activeTool === 'color-replace' ||
    tools.activeTool === 'erase-color' ||
    tools.activeTool === 'dither' ||
    isShapeTool;

  return (
    <header
      role="banner"
      className="h-11 sm:h-12 bg-[var(--desk-surface)] border-b border-[var(--desk-border)] flex items-center justify-between px-3 gap-2 select-none shrink-0 z-30 font-sans text-xs transition-colors duration-150 relative"
    >
      {/* ── 1. LEFT ZONE: Brand, Project Identity & History ── */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Atelier Logo Mark */}
        <a
          href="/"
          title="Return to PixiBun Home"
          className="flex items-center gap-1.5 pr-2.5 border-r border-[var(--desk-border)] hover:opacity-90 hover:scale-[1.02] transition-all"
        >
          <PixiBunLogo className="drop-shadow-sm" />
        </a>

        {/* Project Name (Click to edit) */}
        {isEditingName ? (
          <input
            type="text"
            maxLength={MAX_PROJECT_NAME_LENGTH}
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            onBlur={() => {
              setIsEditingName(false);
              if (tempName.trim()) setProjectName(tempName.trim());
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setIsEditingName(false);
                if (tempName.trim()) setProjectName(tempName.trim());
              } else if (e.key === 'Escape') {
                setIsEditingName(false);
                setTempName(projectName);
              }
            }}
            ref={(el) => el?.focus()}
            className="bg-[var(--surface-0)] text-[var(--text-heading)] px-2 py-0.5 rounded-[2px] border border-[var(--accent-gold)] outline-none text-xs font-mono font-medium max-w-[130px]"
          />
        ) : (
          <button
            onClick={() => {
              setTempName(projectName);
              setIsEditingName(true);
            }}
            className="font-medium text-xs text-[var(--text-heading)] hover:text-[var(--accent-gold)] transition-colors truncate max-w-[120px] cursor-pointer text-left leading-none"
            title="Click to rename project"
          >
            {projectName}
          </button>
        )}

        {/* Canvas Resolution Badge */}
        <button
          onClick={onOpenResize}
          title="Click to Resize / Resample Canvas"
          className="h-6 text-[10px] text-[var(--text-muted)] pixel-tactile-btn hover:text-[var(--text-heading)] px-1.5 flex items-center justify-center rounded-[2px] border border-[var(--desk-border)] cursor-pointer"
        >
          {canvasWidth}×{canvasHeight}
        </button>

        {/* Quiet Saved State Indicator */}
        <div className="h-6 flex items-center gap-1.5 text-[10px] text-[var(--text-body)] pl-0.5">
          <span
            className={`w-1.5 h-1.5 rounded-full transition-colors ${
              saveStatus === 'saving'
                ? 'bg-[var(--accent-gold)] animate-pulse'
                : saveStatus === 'error'
                ? 'bg-[var(--state-danger)]'
                : isDirty
                ? 'bg-[var(--text-muted)] opacity-60'
                : 'bg-[var(--state-success)]'
            }`}
          />
          <span className="text-[10px] text-[var(--text-muted)] font-medium">
            {saveStatus === 'saving'
              ? 'Saving…'
              : saveStatus === 'error'
              ? 'Error'
              : isDirty
              ? 'Unsaved changes'
              : 'Saved'}
          </span>
        </div>

        {/* Offline Indicator when disconnected */}
        <OfflineIndicator />

        {/* Undo / Redo Micro Actions */}
        <div className="h-6 flex items-center gap-1 border-l border-[var(--desk-border)] pl-1.5">
          <StudioTooltip content="Undo" shortcut="Ctrl+Z">
            <button
              onClick={onUndo}
              disabled={!isUndoEnabled}
              data-testid="undo-button"
              title="Undo (Ctrl+Z)"
              aria-label="Undo last action"
              className="w-6 h-6 rounded-[2px] flex items-center justify-center pixel-tactile-btn text-[var(--text-body)] hover:text-[var(--text-heading)] disabled:opacity-25 disabled:pointer-events-none cursor-pointer"
            >
              <PixelIcon name="undo" size={12} />
            </button>
          </StudioTooltip>

          <StudioTooltip content="Redo" shortcut="Ctrl+Y">
            <button
              onClick={onRedo}
              disabled={!isRedoEnabled}
              data-testid="redo-button"
              title="Redo (Ctrl+Y)"
              aria-label="Redo last action"
              className="w-6 h-6 rounded-[2px] flex items-center justify-center pixel-tactile-btn text-[var(--text-body)] hover:text-[var(--text-heading)] disabled:opacity-25 disabled:pointer-events-none cursor-pointer"
            >
              <PixelIcon name="redo" size={12} />
            </button>
          </StudioTooltip>
        </div>
      </div>

      {/* ── 2. CENTER ZONE: Contextual Active-Tool Parameters ── */}
      <div className="flex-1 flex items-center justify-center min-w-0 px-2 overflow-hidden h-full">
        {hasToolParams ? (
          <div className="h-7 px-2.5 bg-[var(--surface-0)] border border-[var(--desk-border)] rounded-[2px] flex items-center gap-2 max-w-full overflow-x-auto scrollbar-none">
            {/* Tool indicator */}
            <span className="text-[10px] font-sans font-medium text-[var(--text-heading)] hidden md:inline shrink-0">
              {tools.activeTool.charAt(0).toUpperCase() + tools.activeTool.slice(1)}:
            </span>

            {/* Brush Size Slider & Quick Presets (Pen, Eraser, Curve, Shapes, Dither) */}
            {(tools.activeTool === 'pen' ||
              tools.activeTool === 'curve' ||
              tools.activeTool === 'eraser' ||
              tools.activeTool === 'dither' ||
              isShapeTool) && (
              <div className="flex items-center gap-1 shrink-0">
                <input
                  type="range"
                  min="1"
                  max="16"
                  value={tools.brushSize}
                  onChange={(e) => setBrushSize(parseInt(e.target.value, 10))}
                  aria-label="Brush size"
                  className="w-14 h-1 accent-[var(--accent-gold)] cursor-pointer"
                />
                <span className="text-[10px] font-mono font-medium text-[var(--text-heading)] min-w-[20px] text-right tabular-nums">
                  {tools.brushSize}px
                </span>

                {/* Quick 1..4 presets as a unified segmented control */}
                <div className="inline-flex items-center bg-[var(--surface-1)] border border-[var(--desk-border)] rounded-[2px] p-0.5 ml-1">
                  {[1, 2, 3, 4].map((size) => (
                    <button
                      key={`preset-${size}`}
                      onClick={() => setBrushSize(size)}
                      title={`Brush size ${size}px`}
                      aria-label={`${size}px brush preset`}
                      className={`w-5 h-4 text-[9px] font-mono rounded-[1px] cursor-pointer flex items-center justify-center transition-colors active:translate-y-[1px] ${
                        tools.brushSize === size
                          ? 'bg-[var(--surface-3)] text-[var(--accent-gold)] font-bold shadow-xs'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-heading)] hover:bg-[var(--surface-2)]'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Pixel-Perfect Smoothing Toggle (Pen & Curve) */}
            {(tools.activeTool === 'pen' || tools.activeTool === 'curve') && (
              <button
                onClick={() => setPixelPerfect(!tools.pixelPerfect)}
                title="Pixel-Perfect Smoothing: Eliminates L-corner double pixels"
                className={`h-5 px-1.5 text-[9px] font-sans font-medium rounded-[1px] cursor-pointer shrink-0 flex items-center justify-center transition-all ${
                  tools.pixelPerfect
                    ? 'pixel-primary-btn font-bold shadow-[0_1px_0_var(--btn-shadow)]'
                    : 'pixel-tactile-btn border border-[var(--desk-border)] text-[var(--text-muted)] hover:text-[var(--text-heading)]'
                }`}
              >
                PP: {tools.pixelPerfect ? 'On' : 'Off'}
              </button>
            )}

            {/* Curve Tightness */}
            {tools.activeTool === 'curve' && (
              <div className="flex items-center gap-1 shrink-0 text-[10px]">
                <span className="text-[var(--text-muted)]">Tight:</span>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={tools.curveTightness}
                  onChange={(e) => setCurveTightness(parseFloat(e.target.value))}
                  aria-label="Curve tightness"
                  className="w-12 h-1 accent-[var(--accent-gold)] cursor-pointer"
                />
              </div>
            )}

            {/* Bucket Contiguous vs Global */}
            {tools.activeTool === 'bucket' && (<>
              <button
                onClick={() => setBucketContiguous(!tools.bucketContiguous)}
                title={tools.bucketContiguous ? 'Contiguous Island Fill' : 'Global Color Replace'}
                className={`h-5 px-1.5 text-[9px] font-bold rounded-[1px] cursor-pointer shrink-0 flex items-center justify-center transition-all ${
                  !tools.bucketContiguous
                    ? 'pixel-primary-btn shadow-[0_1px_0_var(--btn-shadow)]'
                    : 'pixel-tactile-btn border border-[var(--desk-border)] text-[var(--text-body)] hover:text-[var(--text-heading)]'
                }`}
              >
                {tools.bucketContiguous ? 'Contiguous' : 'Global Replace'}
              </button>
              <label className="flex items-center gap-1 shrink-0 text-[10px]" title="Include nearby shades when filling imported or shaded artwork. Lower this if the fill crosses an outline.">
                <span className="text-[var(--text-muted)]">Tolerance:</span>
                <input type="range" min="0" max="255" step="1"
                  value={tools.fillTolerance}
                  onChange={(event) => setFillTolerance(Number(event.target.value))}
                  aria-label="Bucket fill tolerance"
                  className="w-20 h-1 accent-[var(--accent-gold)] cursor-pointer" />
                <span className="font-mono text-[var(--text-heading)] min-w-[22px] text-right tabular-nums">{tools.fillTolerance}</span>
              </label>
              {tools.bucketContiguous && <button type="button"
                onClick={() => setFillEnclosedSpecks(!tools.fillEnclosedSpecks)}
                aria-label="Fill enclosed specks"
                aria-pressed={tools.fillEnclosedSpecks}
                title="Also fill color islands of up to 8 pixels fully enclosed by the filled area. Can replace small intentional details."
                className={`h-5 px-1.5 text-[9px] font-bold rounded-[1px] cursor-pointer shrink-0 ${tools.fillEnclosedSpecks ? 'pixel-primary-btn' : 'pixel-tactile-btn border border-[var(--desk-border)] text-[var(--text-body)]'}`}>
                Enclosed specks: {tools.fillEnclosedSpecks ? 'On' : 'Off'}
              </button>}
            </>)}

            {tools.activeTool === 'color-replace' && (
              <div className="flex items-center gap-1.5 shrink-0 text-[10px]" title="Replaces matching colors on the active layer. Increase tolerance to include similar shades; transparent pixels and other layers are preserved.">
                <span className="text-[var(--text-muted)]">Active layer · Tolerance:</span>
                <input
                  type="range"
                  min="0"
                  max="255"
                  step="1"
                  value={tools.bucketTolerance}
                  onChange={(e) => setBucketTolerance(Number(e.target.value))}
                  aria-label="Color Replace tolerance"
                  className="w-24 h-1 accent-[var(--accent-gold)] cursor-pointer"
                />
                <span className="font-mono text-[var(--text-heading)] min-w-[22px] text-right tabular-nums">{tools.bucketTolerance}</span>
              </div>
            )}

            {tools.activeTool === 'erase-color' && (
              <div className="flex items-center gap-1.5 shrink-0 text-[10px]" title="Click a visible color to make matching pixels transparent. All frames edits the same layer position in each frame, skipping locked layers. Undo restores the artwork.">
                <span className="text-[var(--text-muted)]">Erase color · Tolerance:</span>
                <input type="range" min="0" max="255" step="1"
                  value={tools.eraseColorTolerance}
                  onChange={(event) => setEraseColorTolerance(Number(event.target.value))}
                  aria-label="Erase Color tolerance"
                  className="w-20 h-1 accent-[var(--accent-gold)] cursor-pointer" />
                <span className="font-mono text-[var(--text-heading)] min-w-[22px] text-right tabular-nums">{tools.eraseColorTolerance}</span>
                <button type="button" onClick={() => setEraseColorContiguous(!tools.eraseColorContiguous)}
                  aria-label="Erase Color matching mode"
                  className="h-5 px-1.5 pixel-tactile-btn text-[9px] font-bold cursor-pointer">
                  {tools.eraseColorContiguous ? 'Connected' : 'All matches'}
                </button>
                <button type="button" onClick={() => setEraseColorFamily(!tools.eraseColorFamily)}
                  aria-label="Erase Color family mode"
                  aria-pressed={tools.eraseColorFamily}
                  title="Remove shades of the clicked color, including dark edge spill. The tolerance slider widens the hue range. Enabling this also searches all matching pixels; neutral outlines are protected."
                  className="h-5 px-1.5 pixel-tactile-btn text-[9px] font-bold cursor-pointer">
                  {tools.eraseColorFamily ? 'Color family: On' : 'Color family: Off'}
                </button>
                <button type="button" onClick={() => setEraseColorAllFrames(!tools.eraseColorAllFrames)}
                  aria-label="Erase Color frame scope"
                  className="h-5 px-1.5 pixel-tactile-btn text-[9px] font-bold cursor-pointer">
                  {tools.eraseColorAllFrames ? 'All frames' : 'This frame'}
                </button>
              </div>
            )}

            {/* Dither Matrix & Density */}
            {tools.activeTool === 'dither' && (
              <div className="flex items-center gap-1.5 shrink-0">
                <select
                  value={tools.ditherMatrix}
                  aria-label="Dither matrix algorithm"
                  onChange={(e) => setDitherMatrix(e.target.value as DitherMatrixType)}
                  className="h-5 bg-[var(--surface-0)] text-[var(--accent-gold)] text-[9px] px-1.5 py-0 rounded-[1px] border border-[var(--desk-border)] outline-none cursor-pointer"
                >
                  <option value="2x2">Bayer 2x2</option>
                  <option value="4x4">Bayer 4x4</option>
                  <option value="8x8">Bayer 8x8</option>
                  <option value="blue-noise">Blue Noise</option>
                  <option value="atkinson">Atkinson</option>
                </select>
                <input
                  type="range"
                  min="0.1"
                  max="0.9"
                  step="0.05"
                  value={tools.ditherDensity}
                  onChange={(e) => setDitherDensity(parseFloat(e.target.value))}
                  aria-label="Dither density"
                  className="w-12 h-1 accent-[var(--accent-gold)] cursor-pointer"
                />
              </div>
            )}

            {/* Shape Fill Mode */}
            {(tools.activeTool === 'rectangle' || tools.activeTool === 'ellipse') && (
              <button
                onClick={() => setShapeFilled(!tools.shapeFilled)}
                aria-label={tools.shapeFilled ? 'Shape: Filled Solid' : 'Shape: Outline Stroke'}
                data-testid="shape-fill-toggle"
                className={`h-5 px-1.5 text-[9px] font-bold rounded-[1px] cursor-pointer shrink-0 flex items-center justify-center transition-all ${
                  tools.shapeFilled
                    ? 'pixel-primary-btn shadow-[0_1px_0_var(--btn-shadow)]'
                    : 'pixel-tactile-btn border border-[var(--desk-border)] text-[var(--text-body)] hover:text-[var(--text-heading)]'
                }`}
              >
                {tools.shapeFilled ? 'Filled' : 'Outline'}
              </button>
            )}

            {/* Isometric 2:1 Snap */}
            {tools.activeTool === 'isometric-line' && (
              <button
                onClick={() => setIsoAngleSnap(!tools.isoAngleSnap)}
                className={`h-5 px-1.5 text-[9px] font-bold rounded-[1px] cursor-pointer shrink-0 flex items-center justify-center transition-all ${
                  tools.isoAngleSnap
                    ? 'pixel-primary-btn shadow-[0_1px_0_var(--btn-shadow)]'
                    : 'pixel-tactile-btn border border-[var(--desk-border)] text-[var(--text-body)] hover:text-[var(--text-heading)]'
                }`}
              >
                2:1 Snap: {tools.isoAngleSnap ? 'ON' : 'FREE'}
              </button>
            )}
          </div>
        ) : (
          <div className="h-full" />
        )}
      </div>

      {/* ── 3. RIGHT ZONE: 3 Coherent Semantic Instrument Groups ── */}
      <div className="flex items-center gap-2 shrink-0">
        {/* GROUP A — CANVAS: Zoom, Fit, Horizontal & Vertical Symmetry, View */}
        <div className="h-7 flex items-center bg-[var(--surface-0)] border border-[var(--desk-border)] rounded-[2px] p-0.5 text-xs">
          {/* Zoom Instrument (Connected Cluster) */}
          <div className="flex items-center">
            <button
              onClick={() => setZoom(getPrevZoomStep(zoom))}
              className="w-6 h-6 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-heading)] hover:bg-[var(--surface-2)] active:translate-y-[1px] rounded-[1px] cursor-pointer font-mono text-xs transition-colors"
              title="Zoom Out (-)"
              aria-label="Zoom Out"
            >
              −
            </button>
            <span className="px-1.5 min-w-[46px] text-center text-[var(--text-heading)] font-mono text-xs font-semibold select-none tabular-nums">
              {zoom}%
            </span>
            <button
              onClick={() => setZoom(getNextZoomStep(zoom))}
              className="w-6 h-6 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-heading)] hover:bg-[var(--surface-2)] active:translate-y-[1px] rounded-[1px] cursor-pointer font-mono text-xs transition-colors"
              title="Zoom In (+)"
              aria-label="Zoom In"
            >
              +
            </button>
          </div>

          <div className="w-px h-3.5 bg-[var(--desk-border)] mx-0.5" />

          {/* Fit Action (clean text within zoom cluster, NO button-like frame) */}
          <button
            onClick={() => {
              const targetZoom = calculateFitZoom(canvasWidth, canvasHeight);
              setZoom(targetZoom);
              setPan(0, 0);
            }}
            aria-label="Fit Canvas to Viewport (Ctrl+0)"
            data-testid="fit-canvas-button"
            className="h-6 px-1.5 flex items-center justify-center text-xs font-sans font-medium text-[var(--text-body)] hover:text-[var(--text-heading)] hover:bg-[var(--surface-2)] active:translate-y-[1px] rounded-[1px] cursor-pointer transition-colors"
            title="Fit Canvas to Viewport (Ctrl+0)"
          >
            Fit
          </button>

          <div className="w-px h-3.5 bg-[var(--desk-border)] mx-0.5" />

          {/* Symmetry Mirror Controls (Pixel-native icons, tactile state, no radio dots) */}
          <div className="flex items-center gap-0.5">
            <StudioTooltip content={`Horizontal symmetry (Shift+H) — ${tools.symmetryHorizontal ? 'Active' : 'Off'}`}>
              <button
                onClick={toggleSymmetryH}
                aria-label="Horizontal symmetry"
                data-testid="toggle-symmetry-h"
                className={`w-6 h-6 rounded-[2px] cursor-pointer flex items-center justify-center transition-all active:translate-y-[1px] ${
                  tools.symmetryHorizontal
                    ? 'bg-[var(--surface-3)] text-[var(--accent-gold)] border border-[var(--accent-gold)]/60 shadow-xs font-bold'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-heading)] hover:bg-[var(--surface-2)] border border-transparent hover:border-[var(--desk-border)]/50'
                }`}
              >
                <PixelIcon name="symmetry-h" size={13} />
              </button>
            </StudioTooltip>

            <StudioTooltip content={`Vertical symmetry (Shift+V) — ${tools.symmetryVertical ? 'Active' : 'Off'}`}>
              <button
                onClick={toggleSymmetryV}
                aria-label="Vertical symmetry"
                data-testid="toggle-symmetry-v"
                className={`w-6 h-6 rounded-[2px] cursor-pointer flex items-center justify-center transition-all active:translate-y-[1px] ${
                  tools.symmetryVertical
                    ? 'bg-[var(--surface-3)] text-[var(--accent-gold)] border border-[var(--accent-gold)]/60 shadow-xs font-bold'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-heading)] hover:bg-[var(--surface-2)] border border-transparent hover:border-[var(--desk-border)]/50'
                }`}
              >
                <PixelIcon name="symmetry-v" size={13} />
              </button>
            </StudioTooltip>
          </div>

          <div className="w-px h-3.5 bg-[var(--desk-border)] mx-0.5" />

          {/* View Menu Trigger (Recognizable trigger, subtle active count, natural casing) */}
          <div className="relative" ref={viewMenuRef}>
            <button
              onClick={handleToggleViewMenu}
              title="Canvas view options (Grids, guides, previews, lenses, symmetry)"
              aria-label="View options menu"
              aria-expanded={isViewMenuOpen}
              className={`h-6 px-2 min-w-[66px] text-xs font-sans font-medium rounded-[1px] cursor-pointer flex items-center justify-between gap-1.5 transition-colors ${
                isViewMenuOpen
                  ? 'bg-[var(--surface-2)] text-[var(--accent-gold)]'
                  : 'text-[var(--text-body)] hover:text-[var(--text-heading)] hover:bg-[var(--surface-2)] active:translate-y-[1px]'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <PixelIcon
                  name="eye"
                  size={12}
                  className={isViewMenuOpen ? 'text-[var(--accent-wisteria)]' : 'text-[var(--text-muted)]'}
                />
                <span>View</span>
                {activeViewModifiers > 0 && (
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-[var(--accent-wisteria)] shrink-0"
                    title={`${activeViewModifiers} active view options`}
                  />
                )}
              </span>
              <span className="text-[8px] text-[var(--text-muted)] ml-0.5">▼</span>
            </button>
          </div>
        </div>

        {/* GROUP B — WORKSPACE: Theme, Projects, Co-Draw, Guide */}
        <div className="h-7 hidden md:flex items-center gap-1 text-xs">
          <AppearancePopover />

          <TactileButton
            size="sm"
            variant="default"
            onClick={onOpenGallery}
            title="Open Projects Gallery"
            aria-label="Projects Gallery"
            data-testid="gallery-button"
            className="h-6 px-2 text-xs flex items-center gap-1.5"
          >
            <PixelIcon name="layers" size={12} />
            <span>Projects</span>
          </TactileButton>

          <TactileButton
            size="sm"
            variant="default"
            onClick={onOpenCoDraw}
            title="P2P Co-Draw Multi-User Studio"
            aria-label="Co-Draw session"
            className="h-6 px-2 text-xs flex items-center gap-1.5"
          >
            <PixelIcon name="sparkles" size={12} />
            <span>Co-Draw</span>
          </TactileButton>

          <TactileButton
            size="sm"
            variant="default"
            onClick={onOpenShortcuts}
            title="Atelier Guide, Diagnostics & Shortcuts (?)"
            aria-label="Atelier Guide, Diagnostics and Shortcuts"
            data-testid="shortcuts-guide-button"
            className="h-6 px-2 text-xs flex items-center gap-1.5"
          >
            <PixelIcon name="help" size={12} />
            <span>Guide</span>
          </TactileButton>
        </div>

        {/* GROUP C — FILE ACTIONS: New (tertiary), Save (secondary), Export (primary hero) */}
        <div className="h-7 flex items-center gap-1 text-xs">
          <TactileButton
            size="sm"
            variant="default"
            onClick={onNewDrawing}
            title="Start a New Blank Drawing"
            aria-label="Start a New Blank Drawing"
            data-testid="new-drawing-button"
            className="h-6 px-2 text-xs flex items-center gap-1.5"
          >
            <PixelIcon name="plus" size={12} />
            <span>New</span>
          </TactileButton>

          <TactileButton
            size="sm"
            variant="default"
            onClick={onSaveNow}
            title="Save now to local storage"
            aria-label="Save now"
            className="h-6 px-2 text-xs flex items-center gap-1.5 font-medium"
          >
            <PixelIcon name="save" size={12} />
            <span>Save</span>
          </TactileButton>

          <TactileButton
            size="sm"
            variant="primary"
            onClick={onOpenExport}
            title="Export PNG, GIF, or Spritesheet (E)"
            aria-label="Export drawing"
            data-testid="export-button"
            className="h-6 px-2.5 text-xs font-bold font-sans tracking-wide flex items-center gap-1.5"
          >
            <PixelIcon name="export" size={12} className="text-[#16141a]" />
            <span>Export</span>
          </TactileButton>
        </div>
      </div>

      {/* Hidden file input for project import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pixibun,.json,image/png,image/jpeg,image/webp"
        className="hidden"
        aria-hidden="true"
      />

      {/* ── View Options Popover Menu Hoisted via Portal (z-index: 9999) ── */}
      {isViewMenuOpen && isMounted && popoverCoords && createPortal(
        <div
          ref={popoverRef}
          role="region"
          aria-label="View options menu"
          style={{
            position: 'fixed',
            top: `${popoverCoords.top}px`,
            right: `${popoverCoords.right}px`,
            zIndex: 9999,
          }}
          className="w-64 bg-[var(--surface-2)] border border-[var(--desk-border-highlight)] rounded-[2px] shadow-[0_8px_24px_rgba(0,0,0,0.7)] p-2.5 flex flex-col gap-2 text-xs font-sans select-none animate-in fade-in duration-100"
        >
          <div className="flex items-center justify-between pb-1 border-b border-[var(--desk-border)]">
            <span className="text-[10px] font-bold tracking-wider text-[var(--text-heading)]">
              View Options
            </span>
            <span className="text-[9px] text-[var(--text-muted)]">ESC to close</span>
          </div>

          {/* 1. Canvas Grids & Rulers */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-sans font-medium text-[var(--text-muted)]">Grids & Guides</span>
            <div className="grid grid-cols-2 gap-1">
              <button
                onClick={toggleGrid}
                className={`pixel-tactile-btn px-2 py-1 text-[10px] font-medium rounded-[2px] border flex items-center justify-between cursor-pointer transition-colors ${
                  showGrid
                    ? 'bg-[var(--surface-3)] text-[var(--text-heading)] border-[var(--desk-border-highlight)] shadow-inner font-semibold'
                    : 'bg-[var(--surface-0)] text-[var(--text-muted)] border-[var(--desk-border)] hover:text-[var(--text-heading)] hover:border-[var(--desk-border-highlight)]'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-[1px] ${showGrid ? 'bg-[var(--accent-wisteria)]' : 'bg-transparent border border-[var(--desk-border)]'}`} />
                  <PixelIcon name="grid-iso" size={11} />
                  <span>Pixel Grid</span>
                </span>
                <span className="text-[8px] font-mono opacity-70">Ctrl+'</span>
              </button>

              <button
                onClick={toggleIsoGuides}
                className={`pixel-tactile-btn px-2 py-1 text-[10px] font-medium rounded-[2px] border flex items-center justify-between cursor-pointer transition-colors ${
                  showIsoGuides
                    ? 'bg-[var(--surface-3)] text-[var(--text-heading)] border-[var(--desk-border-highlight)] shadow-inner font-semibold'
                    : 'bg-[var(--surface-0)] text-[var(--text-muted)] border-[var(--desk-border)] hover:text-[var(--text-heading)] hover:border-[var(--desk-border-highlight)]'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-[1px] ${showIsoGuides ? 'bg-[var(--accent-wisteria)]' : 'bg-transparent border border-[var(--desk-border)]'}`} />
                  <PixelIcon name="grid-iso" size={11} />
                  <span>2:1 Iso Grid</span>
                </span>
              </button>
            </div>

            {/* Composition Reference Overlays */}
            <button
              onClick={cycleReferenceOverlay}
              className={`pixel-tactile-btn w-full px-2 py-1 text-[10px] font-medium rounded-[2px] border flex items-center justify-between cursor-pointer mt-0.5 transition-colors ${
                referenceOverlay !== 'none'
                  ? 'bg-[var(--surface-3)] text-[var(--text-heading)] border-[var(--desk-border-highlight)] shadow-inner font-semibold'
                  : 'bg-[var(--surface-0)] text-[var(--text-muted)] border-[var(--desk-border)] hover:text-[var(--text-heading)] hover:border-[var(--desk-border-highlight)]'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-[1px] ${referenceOverlay !== 'none' ? 'bg-[var(--accent-wisteria)]' : 'bg-transparent border border-[var(--desk-border)]'}`} />
                <PixelIcon name="grid" size={11} />
                <span>Composition Overlay</span>
              </span>
              <span className="text-[9px] text-[var(--text-heading)] font-medium">
                {referenceOverlay === 'none' ? 'Off' : referenceOverlay === 'thirds' ? 'Thirds' : referenceOverlay === 'golden' ? 'Golden' : 'Center'}
              </span>
            </button>
          </div>

          <div className="h-px bg-[var(--desk-border)]" />

          {/* 2. Preview Displays */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-sans font-medium text-[var(--text-muted)]">Previews</span>
            <div className="grid grid-cols-2 gap-1">
              <button
                onClick={toggleTilePreview}
                className={`pixel-tactile-btn px-2 py-1 text-[10px] font-medium rounded-[2px] border flex items-center justify-between cursor-pointer transition-colors ${
                  showTilePreview
                    ? 'bg-[var(--surface-3)] text-[var(--text-heading)] border-[var(--desk-border-highlight)] shadow-inner font-semibold'
                    : 'bg-[var(--surface-0)] text-[var(--text-muted)] border-[var(--desk-border)] hover:text-[var(--text-heading)] hover:border-[var(--desk-border-highlight)]'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-[1px] ${showTilePreview ? 'bg-[var(--accent-wisteria)]' : 'bg-transparent border border-[var(--desk-border)]'}`} />
                  <PixelIcon name="grid-iso" size={11} />
                  <span>3x3 Tiling</span>
                </span>
              </button>

              <button
                onClick={toggleFloatingPreview}
                aria-label="Toggle Live PiP Preview Window"
                className={`pixel-tactile-btn px-2 py-1 text-[10px] font-medium rounded-[2px] border flex items-center justify-between cursor-pointer transition-colors ${
                  showFloatingPreview
                    ? 'bg-[var(--surface-3)] text-[var(--text-heading)] border-[var(--desk-border-highlight)] shadow-inner font-semibold'
                    : 'bg-[var(--surface-0)] text-[var(--text-muted)] border-[var(--desk-border)] hover:text-[var(--text-heading)] hover:border-[var(--desk-border-highlight)]'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-[1px] ${showFloatingPreview ? 'bg-[var(--accent-wisteria)]' : 'bg-transparent border border-[var(--desk-border)]'}`} />
                  <PixelIcon name="preview" size={11} />
                  <span>Live PiP</span>
                </span>
              </button>
            </div>
          </div>

          <div className="h-px bg-[var(--desk-border)]" />

          {/* 3. Perceptual Lenses */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-sans font-medium text-[var(--text-muted)]">Perceptual Lenses</span>
            <div className="grid grid-cols-2 gap-1">
              <button
                onClick={() => setCvdLens(cycleCvdLens(cvdLens))}
                title={CVD_LENS_TITLES[cvdLens]}
                className={`pixel-tactile-btn px-2 py-1 text-[10px] font-medium rounded-[2px] border flex items-center justify-between cursor-pointer transition-colors ${
                  cvdLens !== 'none'
                    ? 'bg-[var(--surface-3)] text-[var(--text-heading)] border-[var(--desk-border-highlight)] shadow-inner font-semibold'
                    : 'bg-[var(--surface-0)] text-[var(--text-muted)] border-[var(--desk-border)] hover:text-[var(--text-heading)] hover:border-[var(--desk-border-highlight)]'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-[1px] ${cvdLens !== 'none' ? 'bg-[var(--accent-wisteria)]' : 'bg-transparent border border-[var(--desk-border)]'}`} />
                  <PixelIcon name="eyedropper" size={11} />
                  <span>CVD: {CVD_LENS_BUTTON_LABELS[cvdLens]}</span>
                </span>
                <span className="text-[8px] font-mono opacity-70">P</span>
              </button>

              <button
                onClick={toggleSquintMode}
                title="Silhouette / Squint Mode (S)"
                className={`pixel-tactile-btn px-2 py-1 text-[10px] font-medium rounded-[2px] border flex items-center justify-between cursor-pointer transition-colors ${
                  squintMode
                    ? 'bg-[var(--surface-3)] text-[var(--text-heading)] border-[var(--desk-border-highlight)] shadow-inner font-semibold'
                    : 'bg-[var(--surface-0)] text-[var(--text-muted)] border-[var(--desk-border)] hover:text-[var(--text-heading)] hover:border-[var(--desk-border-highlight)]'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-[1px] ${squintMode ? 'bg-[var(--accent-wisteria)]' : 'bg-transparent border border-[var(--desk-border)]'}`} />
                  <PixelIcon name="select-box" size={11} />
                  <span>Silhouette</span>
                </span>
                <span className="text-[8px] font-mono opacity-70">S</span>
              </button>
            </div>
          </div>

          <div className="h-px bg-[var(--desk-border)]" />

          {/* 4. Symmetry & Mirroring */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-sans font-medium text-[var(--text-muted)]">Symmetry & Mirroring</span>
            <div className="grid grid-cols-2 gap-1">
              <button
                onClick={toggleSymmetryH}
                className={`pixel-tactile-btn px-2 py-1 text-[10px] font-medium rounded-[2px] border flex items-center justify-between cursor-pointer transition-colors ${
                  tools.symmetryHorizontal
                    ? 'bg-[var(--surface-3)] text-[var(--text-heading)] border-[var(--desk-border-highlight)] shadow-inner font-semibold'
                    : 'bg-[var(--surface-0)] text-[var(--text-muted)] border-[var(--desk-border)] hover:text-[var(--text-heading)] hover:border-[var(--desk-border-highlight)]'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-[1px] ${tools.symmetryHorizontal ? 'bg-[var(--accent-gold)]' : 'bg-transparent border border-[var(--desk-border)]'}`} />
                  <PixelIcon name="symmetry-h" size={11} />
                  <span>Mirror H</span>
                </span>
                <span className="text-[8px] font-mono opacity-70">Shift+H</span>
              </button>

              <button
                onClick={toggleSymmetryV}
                className={`pixel-tactile-btn px-2 py-1 text-[10px] font-medium rounded-[2px] border flex items-center justify-between cursor-pointer transition-colors ${
                  tools.symmetryVertical
                    ? 'bg-[var(--surface-3)] text-[var(--text-heading)] border-[var(--desk-border-highlight)] shadow-inner font-semibold'
                    : 'bg-[var(--surface-0)] text-[var(--text-muted)] border-[var(--desk-border)] hover:text-[var(--text-heading)] hover:border-[var(--desk-border-highlight)]'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-[1px] ${tools.symmetryVertical ? 'bg-[var(--accent-gold)]' : 'bg-transparent border border-[var(--desk-border)]'}`} />
                  <PixelIcon name="symmetry-v" size={11} />
                  <span>Mirror V</span>
                </span>
                <span className="text-[8px] font-mono opacity-70">Shift+V</span>
              </button>
            </div>

            {/* Crystallographic Wallpaper Group Symmetry Brush */}
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-[9px] text-[var(--text-muted)] uppercase font-bold shrink-0">Group:</span>
              <select
                value={tools.symmetryGroup || 'none'}
                aria-label="Wallpaper group symmetry brush mode"
                onChange={(e) => setSymmetryGroup(e.target.value as WallpaperGroup)}
                className="w-full bg-[var(--surface-0)] text-[var(--text-heading)] font-medium text-[10px] px-1.5 py-0.5 rounded-[2px] border border-[var(--desk-border)] outline-none cursor-pointer hover:border-[var(--desk-border-highlight)]"
                title="Crystallographic Wallpaper Group Symmetry Brush (Schattschneider 1978): p2, pm, p4, p4m, p6m"
              >
                <option value="none">None (Standard)</option>
                <option value="p2">p2 (180° Rotational)</option>
                <option value="pm">pm (Mirror Reflection)</option>
                <option value="p4">p4 (4-Fold 90° Rotational)</option>
                <option value="p4m">p4m (8-Way Dihedral D4)</option>
                <option value="p6m">p6m (12-Way Hexagonal D6)</option>
              </select>
            </div>
          </div>
        </div>,
        document.body
      )}
    </header>
  );
};
