'use client';

import { readImportFile, reportImportError } from '@/lib/project/importFile';

import React, { useState, useRef, useEffect, useCallback, useId } from 'react';
import { createPortal } from 'react-dom';
import { useStudioStore } from '@/stores/studioStore';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { PixiBunLogo } from '@/components/ui/PixiBunLogo';
import { AppearancePopover } from '@/components/ui/AppearancePopover';
import { HeaderFileMenu } from './HeaderFileMenu';
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
  const isDirty = useStudioStore((s) => s.isDirty);
  const saveStatus = useStudioStore((s) => s.saveStatus);

  const isUndoEnabled = propCanUndo !== undefined ? propCanUndo : storeCanUndo;
  const isRedoEnabled = propCanRedo !== undefined ? propCanRedo : storeCanRedo;

  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(projectName);
  const [isBrushMenuOpen, setIsBrushMenuOpen] = useState(false);
  const [isZoomMenuOpen, setIsZoomMenuOpen] = useState(false);
  const [toolMenuFor, setToolMenuFor] = useState<string | null>(null);
  const toolOptionsId = useId();
  const isToolMenuOpen = toolMenuFor === tools.activeTool;
  const toolMenuRef = useRef<HTMLDivElement>(null);
  const brushMenuRef = useRef<HTMLDivElement>(null);
  const zoomMenuRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    if (!isBrushMenuOpen && !isZoomMenuOpen && !isToolMenuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!brushMenuRef.current?.contains(target)) setIsBrushMenuOpen(false);
      if (!zoomMenuRef.current?.contains(target)) setIsZoomMenuOpen(false);
      if (!toolMenuRef.current?.contains(target)) setToolMenuFor(null);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsBrushMenuOpen(false);
        setIsZoomMenuOpen(false);
        if (isToolMenuOpen) {
          setToolMenuFor(null);
          toolMenuRef.current?.querySelector<HTMLButtonElement>('[data-testid="tool-options-button"]')?.focus();
        }
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onEscape);
    };
  }, [isBrushMenuOpen, isZoomMenuOpen, isToolMenuOpen]);

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

  const hasExpandedToolParams = hasToolParams && tools.activeTool !== 'pen' && tools.activeTool !== 'eraser';
  const toolLabel = tools.activeTool === 'erase-color' ? 'Erase color' : tools.activeTool === 'color-replace' ? 'Replace color' : tools.activeTool.charAt(0).toUpperCase() + tools.activeTool.slice(1);

  return (
    <header
      role="banner"
      className="h-12 bg-[var(--desk-surface)] border-b border-[var(--desk-border)] flex items-center px-2 xl:px-3 gap-2 xl:gap-3 select-none shrink-0 z-30 font-sans text-xs transition-colors duration-150 relative"
    >
      {/* ── 1. LEFT ZONE: Brand, Project Identity & History ── */}
      <div role="group" aria-label="Project controls" className="flex min-w-0 items-center gap-1.5 xl:gap-2">
        {/* Atelier Logo Mark */}
        <a
          href="/"
          title="Return to PixiBun Home"
          aria-label="PixiBun Home"
          className="flex shrink-0 items-center pr-1.5 xl:pr-2.5 border-r border-[var(--desk-border)] hover:opacity-90 transition-opacity"
        >
          <PixiBunLogo size="sm" wordmarkClassName="hidden xl:flex" className="drop-shadow-sm" />
        </a>

        <HeaderFileMenu actions={[
          { label: 'Projects', icon: 'layers', testId: 'gallery-button', onSelect: () => onOpenGallery?.() },
          { label: 'New drawing', icon: 'plus', testId: 'new-drawing-button', onSelect: () => onNewDrawing?.() },
          { label: 'Import…', icon: 'import', testId: 'import-button', onSelect: () => fileInputRef.current?.click() },
          { label: 'Canvas size…', icon: 'rectangle', testId: 'resize-canvas-button', onSelect: () => onOpenResize?.() },
        ]} />

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
            className="h-7 min-w-6 w-20 xl:w-[120px] bg-[var(--surface-0)] text-[var(--text-heading)] px-2 rounded-[2px] border border-[var(--accent-gold)] outline-none text-xs font-mono font-medium"
          />
        ) : (
          <button
            onClick={() => {
              setTempName(projectName);
              setIsEditingName(true);
            }}
            className="h-7 min-w-6 max-w-20 xl:max-w-[120px] font-medium text-xs text-[var(--text-heading)] hover:text-[var(--accent-gold)] transition-colors truncate cursor-pointer text-left leading-none"
            aria-label={`Rename project ${projectName}`}
            title={`${projectName} · ${canvasWidth}×${canvasHeight}px · Click to rename`}
          >
            {projectName}
          </button>
        )}
        <span title="Canvas size · change it in File" className="hidden xl:inline shrink-0 text-[10px] font-mono text-[var(--text-muted)]">
          {canvasWidth}×{canvasHeight}
        </span>

        <TactileButton
          size="sm"
          variant="default"
          onClick={onSaveNow}
          title={
            saveStatus === 'saving'
              ? 'Saving locally… (Ctrl+S)'
              : saveStatus === 'error'
              ? 'Save issue · Click to retry (Ctrl+S)'
              : isDirty
              ? 'Unsaved changes · Click to save (Ctrl+S)'
              : 'All changes saved (Ctrl+S)'
          }
          aria-label={
            saveStatus === 'saving'
              ? 'Saving locally'
              : saveStatus === 'error'
              ? 'Save issue'
              : isDirty
              ? 'Save unsaved changes'
              : 'Save now'
          }
          data-testid="save-button"
          className="h-7 min-w-[64px] px-2.5 text-xs flex items-center gap-1.5"
        >
          <PixelIcon
            name={saveStatus === 'error' ? 'warning' : 'save'}
            size={12}
            className={
              saveStatus === 'error'
                ? 'text-[#eb5a66]'
                : saveStatus === 'saving'
                ? 'text-[var(--accent-gold)] animate-pulse'
                : isDirty
                ? 'text-[var(--accent-gold)]'
                : 'text-[var(--text-muted)]'
            }
          />
          <span>Save</span>
        </TactileButton>

        {/* Offline Indicator when disconnected */}
        <OfflineIndicator />

        {/* Undo / Redo Micro Actions */}
        <div className="h-7 flex items-center gap-1 border-l border-[var(--desk-border)] pl-1.5">
          <StudioTooltip content="Undo" shortcut="Ctrl+Z" position="bottom">
            <button
              onClick={onUndo}
              disabled={!isUndoEnabled}
              data-testid="undo-button"
              title="Undo (Ctrl+Z)"
              aria-label="Undo last action"
              className="w-7 h-7 rounded-[2px] flex items-center justify-center pixel-tactile-btn text-[var(--text-body)] hover:text-[var(--text-heading)] disabled:opacity-25 disabled:pointer-events-none cursor-pointer"
            >
              <PixelIcon name="undo" size={12} />
            </button>
          </StudioTooltip>

          <StudioTooltip content="Redo" shortcut="Ctrl+Y" position="bottom">
            <button
              onClick={onRedo}
              disabled={!isRedoEnabled}
              data-testid="redo-button"
              title="Redo (Ctrl+Y)"
              aria-label="Redo last action"
              className="w-7 h-7 rounded-[2px] flex items-center justify-center pixel-tactile-btn text-[var(--text-body)] hover:text-[var(--text-heading)] disabled:opacity-25 disabled:pointer-events-none cursor-pointer"
            >
              <PixelIcon name="redo" size={12} />
            </button>
          </StudioTooltip>
        </div>
      </div>

      {/* Larger tool forms open on request so the header stays one row. */}
      <div ref={toolMenuRef} role="group" aria-label="Drawing controls" className="relative flex shrink-0 items-center">
        {hasExpandedToolParams && <button type="button" data-testid="tool-options-button"
          aria-label={`${toolLabel} tool options`} aria-expanded={isToolMenuOpen} aria-controls={toolOptionsId}
          onClick={() => setToolMenuFor(isToolMenuOpen ? null : tools.activeTool)}
          className="h-7 px-2 flex items-center gap-1.5 bg-[var(--surface-0)] border border-[var(--desk-border)] rounded-[2px] text-[var(--text-heading)]">
          {toolLabel}<span aria-hidden="true" className="text-[8px]">▼</span>
        </button>}
        {hasToolParams ? (
          <div id={toolOptionsId} role={hasExpandedToolParams ? 'group' : undefined} data-testid="tool-options-rail" aria-label={hasExpandedToolParams ? `${toolLabel} settings` : 'Tool options rail'} className={`${hasExpandedToolParams ? `${isToolMenuOpen ? 'flex' : 'hidden'} absolute top-full left-0 mt-1 z-[100] w-[360px] max-w-[calc(100vw-16px)] p-3 shadow-xl` : 'flex h-7 px-2 xl:px-2.5'} bg-[var(--surface-0)] border border-[var(--desk-border)] rounded-[2px] flex-wrap items-center gap-2`}>
            {/* Tool indicator */}
            <span className={`text-[10px] font-sans font-medium text-[var(--text-heading)] shrink-0 ${hasExpandedToolParams ? 'w-full' : 'hidden xl:inline'}`}>
              {tools.activeTool.charAt(0).toUpperCase() + tools.activeTool.slice(1)}:
            </span>

            {/* Brush Size Slider & Quick Presets (Pen, Eraser, Curve, Shapes, Dither) */}
            {(tools.activeTool === 'pen' ||
              tools.activeTool === 'curve' ||
              tools.activeTool === 'eraser' ||
              tools.activeTool === 'dither' ||
              isShapeTool) && (
              <div ref={brushMenuRef} className="relative shrink-0">
                <button type="button" onClick={() => setIsBrushMenuOpen((open) => !open)}
                  aria-label={`Brush size ${tools.brushSize} pixels`} aria-expanded={isBrushMenuOpen}
                  className="h-6 px-2 flex items-center gap-1.5 rounded-[2px] text-xs text-[var(--text-heading)] hover:bg-[var(--surface-2)]">
                  <span>Size</span><span className="font-mono tabular-nums">{tools.brushSize} px</span><span aria-hidden="true">▾</span>
                </button>
                {isBrushMenuOpen && (
                  <div role="group" aria-label="Brush size controls"
                    className="absolute top-full left-0 mt-1 z-[100] w-56 bg-[var(--surface-2)] border border-[var(--desk-border-highlight)] rounded-[2px] p-3 shadow-lg space-y-3">
                    <label className="flex items-center gap-2 text-xs text-[var(--text-heading)]">
                      <span>Size</span>
                      <input type="range" min="1" max="32" value={tools.brushSize}
                        onChange={(event) => setBrushSize(Number(event.target.value))}
                        aria-label="Brush size" className="min-w-0 flex-1 accent-[var(--accent-gold)]" />
                      <input type="number" min="1" max="32" value={tools.brushSize}
                        onChange={(event) => setBrushSize(Number(event.target.value))}
                        aria-label="Brush size in pixels"
                        className="w-12 h-8 bg-[var(--surface-0)] border border-[var(--desk-border)] rounded-[2px] text-center font-mono" />
                    </label>
                    <div className="flex gap-1" aria-label="Common brush sizes">
                      {[1, 2, 3, 4, 8].map((size) => (
                        <button key={size} type="button" onClick={() => {
                          setBrushSize(size);
                          setIsBrushMenuOpen(false);
                          brushMenuRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
                        }}
                          aria-label={`${size} pixel brush preset`} aria-pressed={tools.brushSize === size}
                          className={`h-8 flex-1 rounded-[2px] text-xs font-mono ${tools.brushSize === size ? 'bg-[var(--accent-gold)] text-[var(--surface-0)]' : 'bg-[var(--surface-1)] text-[var(--text-body)]'}`}>
                          {size}
                        </button>
                      ))}
                    </div>
                    {(tools.activeTool === 'pen' || tools.activeTool === 'curve') && (
                      <label className="flex items-start gap-2 border-t border-[var(--desk-border)] pt-2 text-xs text-[var(--text-heading)] cursor-pointer">
                        <input type="checkbox" checked={tools.pixelPerfect}
                          onChange={(event) => setPixelPerfect(event.target.checked)}
                          aria-label="Clean corners" className="mt-0.5 accent-[var(--accent-gold)]" />
                        <span>Clean corners<span className="block text-[10px] text-[var(--text-muted)]">Removes doubled pixels at turns.</span></span>
                      </label>
                    )}
                  </div>
                )}
              </div>
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
                  className="w-12 h-6 accent-[var(--accent-gold)] cursor-pointer"
                />
              </div>
            )}

            {/* Bucket Contiguous vs Global */}
            {tools.activeTool === 'bucket' && (<>
              <button
                onClick={() => setBucketContiguous(!tools.bucketContiguous)}
                title={tools.bucketContiguous ? 'Contiguous Island Fill' : 'Global Color Replace'}
                className={`h-6 px-1.5 text-[9px] font-bold rounded-[1px] cursor-pointer shrink-0 flex items-center justify-center transition-all ${
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
                  className="w-20 h-6 accent-[var(--accent-gold)] cursor-pointer" />
                <span className="font-mono text-[var(--text-heading)] min-w-[22px] text-right tabular-nums">{tools.fillTolerance}</span>
              </label>
              {tools.bucketContiguous && <button type="button"
                onClick={() => setFillEnclosedSpecks(!tools.fillEnclosedSpecks)}
                aria-label="Fill enclosed specks"
                aria-pressed={tools.fillEnclosedSpecks}
                title="Also fill color islands of up to 8 pixels fully enclosed by the filled area. Can replace small intentional details."
                className={`h-6 px-1.5 text-[9px] font-bold rounded-[1px] cursor-pointer shrink-0 ${tools.fillEnclosedSpecks ? 'pixel-primary-btn' : 'pixel-tactile-btn border border-[var(--desk-border)] text-[var(--text-body)]'}`}>
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
                  className="w-24 h-6 accent-[var(--accent-gold)] cursor-pointer"
                />
                <span className="font-mono text-[var(--text-heading)] min-w-[22px] text-right tabular-nums">{tools.bucketTolerance}</span>
              </div>
            )}

            {tools.activeTool === 'erase-color' && (
              <div className="flex flex-wrap items-center gap-1.5 text-[10px]" title="Click a visible color to make matching pixels transparent. All frames edits the same layer position in each frame, skipping locked layers. Undo restores the artwork.">
                <span className="text-[var(--text-muted)]">Erase color · Tolerance:</span>
                <input type="range" min="0" max="255" step="1"
                  value={tools.eraseColorTolerance}
                  onChange={(event) => setEraseColorTolerance(Number(event.target.value))}
                  aria-label="Erase Color tolerance"
                  className="w-20 h-6 accent-[var(--accent-gold)] cursor-pointer" />
                <span className="font-mono text-[var(--text-heading)] min-w-[22px] text-right tabular-nums">{tools.eraseColorTolerance}</span>
                <button type="button" onClick={() => setEraseColorContiguous(!tools.eraseColorContiguous)}
                  aria-label="Erase Color matching mode"
                  className="h-6 px-1.5 pixel-tactile-btn text-[9px] font-bold cursor-pointer">
                  {tools.eraseColorContiguous ? 'Connected' : 'All matches'}
                </button>
                <button type="button" onClick={() => setEraseColorFamily(!tools.eraseColorFamily)}
                  aria-label="Erase Color family mode"
                  aria-pressed={tools.eraseColorFamily}
                  title="Remove shades of the clicked color, including dark edge spill. The tolerance slider widens the hue range. Enabling this also searches all matching pixels; neutral outlines are protected."
                  className="h-6 px-1.5 pixel-tactile-btn text-[9px] font-bold cursor-pointer">
                  {tools.eraseColorFamily ? 'Color family: On' : 'Color family: Off'}
                </button>
                <button
                  type="button"
                  onClick={() => setEraseColorAllFrames(!tools.eraseColorAllFrames)}
                  aria-label="Erase Color frame scope"
                  aria-pressed={tools.eraseColorAllFrames}
                  data-testid="erase-color-frame-scope"
                  title="Erase Color frame scope: Erase color across all animation frames or active frame only"
                  className={`h-6 px-1.5 text-[9px] font-bold rounded-[1px] cursor-pointer shrink-0 transition-all ${
                    tools.eraseColorAllFrames
                      ? 'pixel-primary-btn shadow-[0_1px_0_var(--btn-shadow)]'
                      : 'pixel-tactile-btn border border-[var(--desk-border)] text-[var(--text-body)] hover:text-[var(--text-heading)]'
                  }`}
                >
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
                  className="h-6 bg-[var(--surface-0)] text-[var(--accent-gold)] text-[9px] px-1.5 py-0 rounded-[1px] border border-[var(--desk-border)] outline-none cursor-pointer"
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
                  className="w-12 h-6 accent-[var(--accent-gold)] cursor-pointer"
                />
              </div>
            )}

            {/* Shape Fill Mode */}
            {(tools.activeTool === 'rectangle' || tools.activeTool === 'ellipse') && (
              <button
                onClick={() => setShapeFilled(!tools.shapeFilled)}
                aria-label={tools.shapeFilled ? 'Shape: Filled Solid' : 'Shape: Outline Stroke'}
                data-testid="shape-fill-toggle"
                className={`h-6 px-1.5 text-[9px] font-bold rounded-[1px] cursor-pointer shrink-0 flex items-center justify-center transition-all ${
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
                className={`h-6 px-1.5 text-[9px] font-bold rounded-[1px] cursor-pointer shrink-0 flex items-center justify-center transition-all ${
                  tools.isoAngleSnap
                    ? 'pixel-primary-btn shadow-[0_1px_0_var(--btn-shadow)]'
                    : 'pixel-tactile-btn border border-[var(--desk-border)] text-[var(--text-body)] hover:text-[var(--text-heading)]'
                }`}
              >
                2:1 Snap: {tools.isoAngleSnap ? 'ON' : 'FREE'}
              </button>
            )}
          </div>
        ) : null}
      </div>

      {/* Canvas controls stay on the same row as the project and active tool. */}
      <div className="ml-auto flex shrink-0 items-center gap-2 xl:gap-3">
        <div role="group" aria-label="Canvas controls" className="h-7 flex items-center bg-[var(--surface-0)] border border-[var(--desk-border)] rounded-[2px] p-px text-xs">
        <div role="group" aria-label="Mirror drawing" className="h-6 flex items-center gap-0.5 px-1">
          <span className="px-1 text-[10px] text-[var(--text-body)]">Mirror</span>
            <StudioTooltip position="bottom" content={`Horizontal symmetry (Shift+H) — ${tools.symmetryHorizontal ? 'Active' : 'Off'}`}>
              <button
                onClick={toggleSymmetryH}
                aria-label="Horizontal symmetry"
                aria-pressed={tools.symmetryHorizontal}
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

            <StudioTooltip position="bottom" content={`Vertical symmetry (Shift+V) — ${tools.symmetryVertical ? 'Active' : 'Off'}`}>
              <button
                onClick={toggleSymmetryV}
                aria-label="Vertical symmetry"
                aria-pressed={tools.symmetryVertical}
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

        <div aria-hidden="true" className="w-px h-3.5 bg-[var(--desk-border)] mx-0.5" />
        <div className="flex items-center">
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
            <div ref={zoomMenuRef} className="relative">
              <button type="button" onClick={() => setIsZoomMenuOpen((open) => !open)}
                aria-label={`Zoom ${zoom} percent. Choose zoom level`}
                aria-expanded={isZoomMenuOpen}
                className="h-6 px-1.5 min-w-[52px] text-center text-[var(--text-heading)] font-mono text-xs font-semibold tabular-nums hover:bg-[var(--surface-2)]">
                {zoom}%
              </button>
              {isZoomMenuOpen && (
                <div role="group" aria-label="Zoom levels"
                  className="absolute top-full right-0 mt-1 z-[100] w-28 bg-[var(--surface-2)] border border-[var(--desk-border-highlight)] rounded-[2px] p-1 shadow-lg">
                  {[100, 200, 400, 800, 1600].map((level) => (
                    <button key={level} type="button" onClick={() => { setZoom(level); setIsZoomMenuOpen(false); }}
                      className="block w-full text-left px-2 py-1.5 text-xs font-mono text-[var(--text-body)] hover:bg-[var(--surface-3)] hover:text-[var(--text-heading)]">
                      {level}%{level === 100 ? ' · Actual size' : ''}
                    </button>
                  ))}
                </div>
              )}
            </div>
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
        </div>

        <div aria-hidden="true" className="w-px h-3.5 bg-[var(--desk-border)] mx-0.5" />
        <div className="flex items-center">

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

        </div>

        <div role="group" aria-label="Studio settings and help" className="h-7 flex items-center text-xs border-l border-[var(--desk-border)] pl-2 xl:pl-3">
          <AppearancePopover label="Studio" actions={[
            { label: 'Co-Draw', icon: 'sparkles', ariaLabel: 'Co-Draw session', onSelect: onOpenCoDraw },
            { label: 'Help', icon: 'help', ariaLabel: 'Atelier Guide, Diagnostics and Shortcuts', testId: 'shortcuts-guide-button', onSelect: onOpenShortcuts },
          ]} />
        </div>

        {/* Export stays at the right edge. */}
        <div className="h-7 flex items-center gap-1 text-xs">
          <TactileButton
            size="sm"
            variant="primary"
            onClick={onOpenExport}
            title="Export PNG, GIF, or Spritesheet (E)"
            aria-label="Export drawing"
            data-testid="export-button"
            className="h-7 px-2.5 text-xs font-bold font-sans tracking-wide flex items-center gap-1.5"
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
