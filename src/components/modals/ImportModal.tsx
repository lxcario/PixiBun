'use client';

import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { TactileButton } from '@/components/ui/TactileButton';
import { ModalWrapper } from '@/components/ui/ModalWrapper';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { useStudioStore } from '@/stores/studioStore';
import { usePixelizeEngine } from '@/hooks/usePixelizeEngine';
import {
  computeGridDimensions,
  sliceSpriteSheet,
  extractPaletteFromFrames,
  isCellEmpty,
} from '@/lib/canvas/spritesheetSlicer';
import { suggestSpriteSheetGrid } from '@/lib/canvas/spriteSheetSuggestion';
import { analyzeSpriteSheetGrid } from '@/lib/canvas/spriteSheetAnalysis';
import { MAX_CANVAS_DIMENSION, MAX_CANVAS_FRAMES } from '@/config/canvasLimits';
import { studioEvents } from '@/lib/events/studioEvents';

import type { ImportPayload, ImageImportConfirmPayload } from '@/types/import';
export type { ImportPayload, ImageImportConfirmPayload };

interface ImportModalProps {
  isOpen: boolean;
  payload: ImportPayload | null;
  error?: string | null;
  onClose: () => void;
  onConfirmImage: (result: ImageImportConfirmPayload) => void;
  onConfirmProject: () => void;
}

const PRESET_CELL_SIZES = [
  { label: '16×16', w: 16, h: 16 },
  { label: '24×24', w: 24, h: 24 },
  { label: '32×32', w: 32, h: 32 },
  { label: '48×48', w: 48, h: 48 },
  { label: '64×64', w: 64, h: 64 },
];

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  payload,
  error,
  onClose,
  onConfirmImage,
  onConfirmProject,
}) => {
  const { canvasWidth, canvasHeight, palettes, currentPaletteId } = useStudioStore();

  const activePalette = useMemo(() => {
    return palettes.find((p) => p.id === currentPaletteId)?.colors || [];
  }, [palettes, currentPaletteId]);

  const {
    imageTarget,
    setImageTarget,
    sizeMode,
    setSizeMode,
    processingMode,
    setProcessingMode,
    colorMode,
    setColorMode,
    ditherMode,
    setDitherMode,
    removeBackground,
    setRemoveBackground,
    addToPalette,
    setAddToPalette,
    previewResult,
    setPreviewResult,
    imgElementRef,
    runPixelization,
  } = usePixelizeEngine({
    canvasWidth,
    canvasHeight,
    activePalette,
  });

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const slicerCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Import mode: single sprite vs sprite sheet slicer
  const [importMode, setImportMode] = useState<'single' | 'slicer'>('single');

  // Sprite Sheet Slicer State
  const [slicerCellW, setSlicerCellW] = useState<number>(32);
  const [slicerCellH, setSlicerCellH] = useState<number>(32);
  const [slicerStartX, setSlicerStartX] = useState(0);
  const [slicerStartY, setSlicerStartY] = useState(0);
  const [slicerSpacingX, setSlicerSpacingX] = useState(0);
  const [slicerSpacingY, setSlicerSpacingY] = useState(0);
  const [slicerOrder, setSlicerOrder] = useState<'row-major' | 'column-major'>('row-major');
  const [slicerSkipEmpty, setSlicerSkipEmpty] = useState<boolean>(false);
  const [slicerTarget, setSlicerTarget] = useState<'sprite-sheet-append' | 'sprite-sheet-replace'>('sprite-sheet-append');
  const [slicerResizeCanvas, setSlicerResizeCanvas] = useState<boolean>(false);
  const [nonZeroFramesCount, setNonZeroFramesCount] = useState<number>(1);
  const [loadedImageRevision, setLoadedImageRevision] = useState(0);
  const [sheetSuggestion, setSheetSuggestion] = useState(false);
  const [sheetAnalysisNote, setSheetAnalysisNote] = useState('');
  const imageDataUrl = payload?.type === 'image' ? payload.dataUrl : undefined;
  const imageFilename = payload?.type === 'image' ? payload.filename : '';
  const imageWidth = payload?.type === 'image' ? payload.imgWidth : undefined;
  const imageHeight = payload?.type === 'image' ? payload.imgHeight : undefined;

  // Decode only when the file changes. Preview option changes must never reset the choice.
  useEffect(() => {
    if (!imageDataUrl) {
      imgElementRef.current = null;
      setPreviewResult(null);
      return;
    }

    let cancelled = false;
    imgElementRef.current = null;
    setPreviewResult(null);
    setSizeMode((imageWidth ?? 0) <= 512 && (imageHeight ?? 0) <= 512 ? 'match-image' : 'fit-canvas');
    const suggestion = suggestSpriteSheetGrid(imageWidth ?? 0, imageHeight ?? 0, canvasWidth, canvasHeight, imageFilename);
    setImportMode(suggestion ? 'slicer' : 'single');
    setSheetSuggestion(Boolean(suggestion));
    setSheetAnalysisNote(suggestion ? 'Pixel analysis has not verified these cut lines. The canvas-size guess may split sprites; check the preview and adjust the cell dimensions before importing.' : '');
    setSlicerSkipEmpty(false);
    setSlicerResizeCanvas(false);
    setSlicerStartX(0);
    setSlicerStartY(0);
    setSlicerSpacingX(0);
    setSlicerSpacingY(0);
    setSlicerOrder('row-major');
    if (suggestion) {
      setSlicerCellW(suggestion.width);
      setSlicerCellH(suggestion.height);
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (cancelled) return;
      imgElementRef.current = img;
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;
      if (width * height <= 4_194_304) {
        try {
          const analysisCanvas = document.createElement('canvas');
          analysisCanvas.width = width;
          analysisCanvas.height = height;
          const context = analysisCanvas.getContext('2d', { willReadFrequently: true });
          if (context) {
            context.drawImage(img, 0, 0);
            const detected = analyzeSpriteSheetGrid(context.getImageData(0, 0, width, height), canvasWidth, canvasHeight);
            if (detected) {
              setSlicerCellW(detected.width);
              setSlicerCellH(detected.height);
              setSlicerStartX(detected.startX);
              setSlicerStartY(detected.startY);
              setSlicerSpacingX(detected.spacingX);
              setSlicerSpacingY(detected.spacingY);
              setSheetSuggestion(true);
              setSheetAnalysisNote('Detected repeating artwork and measured the cut lines from image pixels. Review before importing.');
              setImportMode('slicer');
            }
          }
        } catch {
          // Decoding or reading pixels may fail; dimension-based review remains available.
        }
      }
      setLoadedImageRevision((value) => value + 1);
    };
    img.src = imageDataUrl;
    return () => { cancelled = true; img.onload = null; };
  }, [imageDataUrl, imageFilename, imageWidth, imageHeight, canvasWidth, canvasHeight, imgElementRef, setPreviewResult, setSizeMode]);

  useEffect(() => {
    if (loadedImageRevision > 0 && imgElementRef.current) {
      runPixelization();
    }
  }, [runPixelization, loadedImageRevision, imgElementRef]);

  // Render Single Sprite preview canvas
  useEffect(() => {
    if (!previewResult || !previewCanvasRef.current || importMode !== 'single') return;
    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = previewResult.width;
    canvas.height = previewResult.height;
    ctx.clearRect(0, 0, previewResult.width, previewResult.height);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(previewResult.canvas, 0, 0);
  }, [previewResult, importMode]);

  // Render Sprite Sheet Slicer cutline canvas preview
  const renderSlicerPreview = useCallback(() => {
    const canvas = slicerCanvasRef.current;
    const img = imgElementRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imgW = img.naturalWidth || img.width;
    const imgH = img.naturalHeight || img.height;

    canvas.width = imgW;
    canvas.height = imgH;

    ctx.clearRect(0, 0, imgW, imgH);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, imgW, imgH);

    const grid = computeGridDimensions(imgW, imgH, slicerCellW, slicerCellH, slicerStartX, slicerStartY, slicerSpacingX, slicerSpacingY);
    if (grid.totalCells > MAX_CANVAS_FRAMES) {
      setNonZeroFramesCount(0);
      return;
    }
    const fullImgData = slicerSkipEmpty ? ctx.getImageData(0, 0, imgW, imgH) : null;

    // Draw actual cell boundaries, including offsets and spacing.
    ctx.strokeStyle = '#f0be7c';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.columns; c++) {
        ctx.strokeRect(slicerStartX + c * (slicerCellW + slicerSpacingX) + 0.5,
          slicerStartY + r * (slicerCellH + slicerSpacingY) + 0.5, slicerCellW, slicerCellH);
      }
    }
    ctx.setLineDash([]);

    let frameNum = 1;
    ctx.font = 'bold 9px monospace';
    ctx.textBaseline = 'top';

    for (let primary = 0; primary < (slicerOrder === 'row-major' ? grid.rows : grid.columns); primary++) {
      for (let secondary = 0; secondary < (slicerOrder === 'row-major' ? grid.columns : grid.rows); secondary++) {
        const c = slicerOrder === 'row-major' ? secondary : primary;
        const r = slicerOrder === 'row-major' ? primary : secondary;
        const x = slicerStartX + c * (slicerCellW + slicerSpacingX);
        const y = slicerStartY + r * (slicerCellH + slicerSpacingY);
        if (x + slicerCellW > imgW || y + slicerCellH > imgH) continue;

        const empty = fullImgData ? isCellEmpty(fullImgData, x, y, slicerCellW, slicerCellH) : false;
        if (empty && slicerSkipEmpty) {
          // Dim empty cell
          ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
          ctx.fillRect(x, y, slicerCellW, slicerCellH);
          continue;
        }

        // Frame number badge
        const badgeText = `#${frameNum++}`;
        const textWidth = ctx.measureText(badgeText).width;
        ctx.fillStyle = 'rgba(20, 13, 31, 0.85)';
        ctx.fillRect(x + 1, y + 1, textWidth + 4, 11);
        ctx.fillStyle = '#f0be7c';
        ctx.fillText(badgeText, x + 3, y + 2);
      }
    }

    setNonZeroFramesCount(slicerSkipEmpty ? frameNum - 1 : grid.totalCells);
  }, [imgElementRef, slicerCellW, slicerCellH, slicerStartX, slicerStartY, slicerSpacingX, slicerSpacingY, slicerOrder, slicerSkipEmpty]);

  useEffect(() => {
    if (importMode === 'slicer') {
      renderSlicerPreview();
    }
  }, [importMode, renderSlicerPreview, loadedImageRevision]);

  if (!payload) return null;

  const srcW = payload.imgWidth || 32;
  const srcH = payload.imgHeight || 32;
  const isDifferentSize = srcW !== canvasWidth || srcH !== canvasHeight;
  const sourceExceedsCanvasLimit = srcW > MAX_CANVAS_DIMENSION || srcH > MAX_CANVAS_DIMENSION;
  const slicerGrid = computeGridDimensions(srcW, srcH, slicerCellW, slicerCellH, slicerStartX, slicerStartY, slicerSpacingX, slicerSpacingY);
  const slicerWouldClip = !slicerResizeCanvas && (slicerCellW > canvasWidth || slicerCellH > canvasHeight);
  const slicerInvalid = slicerGrid.totalCells === 0 || slicerGrid.totalCells > MAX_CANVAS_FRAMES ||
    (slicerSkipEmpty && nonZeroFramesCount === 0) || slicerWouldClip;

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      title={payload.type === 'project' ? 'Import Project (.pixibun)' : 'Import Image'}
      maxWidth={payload.type === 'image' ? 'w-[680px]' : 'w-[440px]'}
    >
      {/* 1. Project Import View */}
      {payload.type === 'project' && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 bg-[var(--desk-surface)] p-3 rounded-[2px] border-2 border-[var(--desk-border)] shadow-xs text-xs font-mono">
            <span className="font-bold text-[var(--text-heading)]">File: {payload.filename}</span>
            <span className="text-[var(--text-body)]">
              Frames: {String(Array.isArray((payload.projectJson as { frames?: unknown[] })?.frames) ? (payload.projectJson as { frames: unknown[] }).frames.length : '--')} | Size: {String((payload.projectJson as { width?: unknown })?.width ?? '--')}x{String((payload.projectJson as { height?: unknown })?.height ?? '--')}
            </span>
            <p className="text-[#a89ab8] text-[11px] leading-relaxed">
              Loading this project will replace the current canvas workspace with all saved frames, layers, and color palettes.
            </p>

            {error && (
              <p className="bg-[#3d1928] border border-[#6b283d] text-[#ff99aa] rounded-[2px] px-2 py-1.5 leading-relaxed font-bold">
                {error}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--desk-border)]">
            <TactileButton size="sm" variant="default" onClick={onClose}>
              Cancel
            </TactileButton>
            <TactileButton size="sm" variant="primary" onClick={onConfirmProject}>
              Confirm Import
            </TactileButton>
          </div>
        </div>
      )}

      {/* 2. Image Import View (with Tab Switcher between Single Sprite and Slicer) */}
      {payload.type === 'image' && (
        <div className="flex flex-col gap-3">
          {sheetSuggestion && importMode === 'slicer' && (
            <p className="text-[11px] text-[var(--text-body)] bg-[var(--desk-surface)] border border-[var(--desk-border)] p-2">
              Possible sprite sheet detected. {sheetAnalysisNote} Choose Single Sprite if this is one image.
            </p>
          )}
          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-2 border-b border-[var(--desk-border)] pb-2">
            <button
              type="button"
              onClick={() => setImportMode('single')}
              className={`px-3 py-1.5 rounded-[2px] text-xs font-mono font-bold cursor-pointer transition-colors ${
                importMode === 'single'
                  ? 'bg-[#f0be7c] text-[#140d1f] border border-[#8c5120]'
                  : 'bg-[var(--desk-surface)] text-[var(--text-body)] border border-[var(--desk-border)] hover:text-[#f0be7c]'
              }`}
            >
              Single Sprite / Layer
            </button>
            <button
              type="button"
              onClick={() => setImportMode('slicer')}
              className={`px-3 py-1.5 rounded-[2px] text-xs font-mono font-bold cursor-pointer transition-colors flex items-center gap-1.5 ${
                importMode === 'slicer'
                  ? 'bg-[#f0be7c] text-[#140d1f] border border-[#8c5120]'
                  : 'bg-[var(--desk-surface)] text-[var(--text-body)] border border-[var(--desk-border)] hover:text-[#f0be7c]'
              }`}
            >
              <PixelIcon name="grid" size={13} />
              <span>Sprite Sheet Slicer</span>
            </button>
          </div>

          {/* Mode A: Single Sprite Import */}
          {importMode === 'single' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                {/* Left Column: Image Settings */}
                <div className="flex flex-col gap-2.5 text-xs font-mono">
                  {/* File details banner */}
                  <div className="flex items-center justify-between bg-[var(--desk-surface)] p-2 rounded-[2px] border border-[var(--desk-border)]">
                    <span className="font-bold text-[var(--text-heading)] truncate max-w-[160px]">
                      {payload.filename}
                    </span>
                    <span className="text-[10px] text-[#f0be7c] font-bold">
                      {srcW} × {srcH} px
                    </span>
                  </div>

                  {/* Canvas Sizing Option */}
                    <div className="flex flex-col gap-1.5 bg-[var(--desk-surface)] p-2 rounded-[2px] border border-[var(--desk-border)]">
                      <span className="text-[10px] font-bold text-[#f0be7c] uppercase">Canvas Sizing</span>
                      <label htmlFor="size-mode-match-image" className="flex items-start gap-2 p-1.5 rounded-[2px] bg-[var(--desk-surface-raised)] border border-[var(--desk-border)] cursor-pointer hover:border-[#f0be7c] transition-colors">
                        <input
                          id="size-mode-match-image"
                          type="radio"
                          name="canvas-size-mode"
                          checked={sizeMode === 'match-image'}
                          onChange={() => setSizeMode('match-image')}
                          className="accent-[#f0be7c] mt-0.5"
                        />
                        <div className="flex flex-col">
                          <span className="font-bold text-[var(--text-heading)] text-[11px]">
                            {sourceExceedsCanvasLimit ? `Fit Within Canvas Limit (${MAX_CANVAS_DIMENSION} px)` : `Match Image Size (${srcW}×${srcH} px)`}
                          </span>
                          <span className="text-[9px] text-[#a89ab8]">
                            {sourceExceedsCanvasLimit ? 'The source exceeds the canvas limit and must be downscaled.' : 'Keeps exact 1:1 original pixels.'}
                          </span>
                        </div>
                      </label>

                      <label htmlFor="size-mode-fit-canvas" className="flex items-start gap-2 p-1.5 rounded-[2px] bg-[var(--desk-surface-raised)] border border-[var(--desk-border)] cursor-pointer hover:border-[#f0be7c] transition-colors">
                        <input
                          id="size-mode-fit-canvas"
                          type="radio"
                          name="canvas-size-mode"
                          checked={sizeMode === 'fit-canvas'}
                          onChange={() => setSizeMode('fit-canvas')}
                          className="accent-[#f0be7c] mt-0.5"
                        />
                        <div className="flex flex-col">
                          <span className="font-bold text-[var(--text-heading)] text-[11px]">
                            Fit into Current Canvas ({canvasWidth}×{canvasHeight} px)
                          </span>
                          <span className="text-[9px] text-[#a89ab8]">
                            Fits proportionally inside the current canvas dimensions.
                          </span>
                        </div>
                      </label>
                    </div>

                  {/* Pixel Art Stylize Toggle */}
                  <div className="flex flex-col gap-1.5 bg-[var(--desk-surface)] p-2 rounded-[2px] border border-[var(--desk-border)]">
                    <span className="text-[10px] font-bold text-[#dcabdf] uppercase">Color & Quality</span>
                    <div className="grid grid-cols-2 gap-1 text-[10px]">
                      <button
                        onClick={() => setProcessingMode('exact')}
                        className={`py-1.5 px-2 rounded-[2px] border font-bold text-center cursor-pointer transition-colors ${
                          processingMode === 'exact'
                            ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120]'
                            : 'bg-[var(--desk-surface-raised)] text-[var(--text-body)] border-[var(--desk-border)] hover:text-[#f0be7c]'
                        }`}
                      >
                        Exact 1:1 Pixels
                      </button>
                      <button
                        onClick={() => setProcessingMode('pixelize')}
                        className={`py-1.5 px-2 rounded-[2px] border font-bold text-center cursor-pointer transition-colors ${
                          processingMode === 'pixelize'
                            ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120]'
                            : 'bg-[var(--desk-surface-raised)] text-[var(--text-body)] border-[var(--desk-border)] hover:text-[#f0be7c]'
                        }`}
                      >
                        Retro Pixelize
                      </button>
                    </div>

                    {/* Sub-options only shown when user explicitly asks to retro pixelize a photo */}
                    {processingMode === 'pixelize' && (
                      <div className="flex flex-col gap-1.5 pt-1 border-t border-[var(--desk-border)] mt-1">
                        <div className="grid grid-cols-2 gap-1 text-[9px]">
                          <button
                            onClick={() => setColorMode('reduce-16')}
                            className={`p-1 rounded-[2px] border ${colorMode === 'reduce-16' ? 'bg-[#f0be7c] text-[#140d1f]' : 'bg-[var(--desk-surface-raised)]'}`}
                          >
                            16 Colors
                          </button>
                          <button
                            onClick={() => setColorMode('active-palette')}
                            className={`p-1 rounded-[2px] border ${colorMode === 'active-palette' ? 'bg-[#f0be7c] text-[#140d1f]' : 'bg-[var(--desk-surface-raised)]'}`}
                          >
                            Active Palette
                          </button>
                        </div>

                        <div className="flex items-center justify-between text-[9px] pt-0.5">
                          <span>Dither:</span>
                          <div className="flex gap-1">
                            <button
                              onClick={() => setDitherMode('none')}
                              className={`px-1.5 py-0.5 rounded-[1px] border ${ditherMode === 'none' ? 'bg-[#dcabdf] text-[#140d1f]' : 'bg-[var(--desk-surface-raised)]'}`}
                            >
                              Flat
                            </button>
                            <button
                              onClick={() => setDitherMode('atkinson')}
                              className={`px-1.5 py-0.5 rounded-[1px] border ${ditherMode === 'atkinson' ? 'bg-[#dcabdf] text-[#140d1f]' : 'bg-[var(--desk-surface-raised)]'}`}
                            >
                              Atkinson
                            </button>
                          </div>
                        </div>

                        <label className="flex items-center gap-1.5 cursor-pointer text-[9px] pt-1 text-[var(--text-body)]">
                          <input
                            type="checkbox"
                            checked={removeBackground}
                            onChange={(e) => setRemoveBackground(e.target.checked)}
                            className="accent-[#f0be7c]"
                          />
                          <span>Remove Background Color</span>
                        </label>
                      </div>
                    )}

                    <label className="flex items-center gap-1.5 cursor-pointer text-[9px] pt-1 text-[var(--text-body)]">
                      <input
                        type="checkbox"
                        checked={addToPalette}
                        onChange={(e) => setAddToPalette(e.target.checked)}
                        className="accent-[#f0be7c]"
                      />
                      <span>Add Colors to Swatches</span>
                    </label>
                  </div>

                  {/* Destination */}
                  <div className="flex flex-col gap-1.5 bg-[var(--desk-surface)] p-2 rounded-[2px] border border-[var(--desk-border)]">
                    <span className="text-[10px] font-bold text-[#f0be7c] uppercase">Destination</span>
                    <div className="grid grid-cols-3 gap-1 text-[10px]">
                      <button
                        onClick={() => setImageTarget('new-layer')}
                        className={`py-1 px-1 rounded-[2px] border font-bold text-center cursor-pointer ${
                          imageTarget === 'new-layer' ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120]' : 'bg-[var(--desk-surface-raised)] text-[var(--text-body)] border-[var(--desk-border)]'
                        }`}
                      >
                        New Layer
                      </button>
                      <button
                        onClick={() => setImageTarget('replace-layer')}
                        className={`py-1 px-1 rounded-[2px] border font-bold text-center cursor-pointer ${
                          imageTarget === 'replace-layer' ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120]' : 'bg-[var(--desk-surface-raised)] text-[var(--text-body)] border-[var(--desk-border)]'
                        }`}
                      >
                        Replace
                      </button>
                      <button
                        onClick={() => setImageTarget('new-frame')}
                        className={`py-1 px-1 rounded-[2px] border font-bold text-center cursor-pointer ${
                          imageTarget === 'new-frame' ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120]' : 'bg-[var(--desk-surface-raised)] text-[var(--text-body)] border-[var(--desk-border)]'
                        }`}
                      >
                        New Frame
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right Column: Live Clean Preview */}
                <div className="flex flex-col gap-2 bg-[var(--desk-surface)] p-3 rounded-[2px] border-2 border-[var(--desk-border)] shadow-xs items-center justify-between min-h-[280px]">
                  <div className="flex items-center justify-between w-full text-xs font-mono">
                    <span className="text-[10px] font-bold text-[#f0be7c] uppercase flex items-center gap-1">
                      <PixelIcon name="preview" size={12} />
                      <span>Canvas Preview</span>
                    </span>
                    <span className="text-[10px] text-[#dcabdf] font-bold font-mono">
                      {previewResult ? `${previewResult.width} × ${previewResult.height} px` : ''}
                    </span>
                  </div>

                  {/* Crisp pixelated canvas view */}
                  <div className="w-full flex-1 min-h-[200px] bg-[#120a1c] border-2 border-[var(--desk-border)] rounded-[2px] flex items-center justify-center p-2 overflow-hidden relative shadow-inner">
                    <canvas
                      ref={previewCanvasRef}
                      className="max-w-full max-h-[190px] aspect-square object-contain pixelated shadow-lg border border-[#3a2e4c]"
                      style={{ imageRendering: 'pixelated' }}
                    />
                  </div>

                  <span className="text-[9px] text-[var(--text-body)] text-center font-mono">
                    {sizeMode === 'match-image'
                      ? `Canvas will be set to ${previewResult?.width ?? srcW}×${previewResult?.height ?? srcH} px${sourceExceedsCanvasLimit ? ' after downscaling' : ' with exact pixels'}`
                      : `Fitted into current ${canvasWidth}×${canvasHeight} px canvas`}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--desk-border)]">
                <TactileButton size="sm" variant="default" onClick={onClose}>
                  Cancel
                </TactileButton>

                <TactileButton
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    if (previewResult) {
                      onConfirmImage({
                        canvas: previewResult.canvas,
                        target: imageTarget,
                        extractedPalette: previewResult.extractedPalette,
                        addToPalette,
                        filename: payload.filename,
                        resizeCanvasToMatch:
                          sizeMode === 'match-image' && isDifferentSize
                            ? { width: previewResult.width, height: previewResult.height }
                            : undefined,
                      });
                    }
                  }}
                  className="bg-[#f0be7c] text-[#140d1f] hover:bg-[#fcd699] hover:shadow-[0_2px_0_#8c5120] border-2 border-[#8c5120] font-display font-bold shadow-[0_2px_0_#8c5120] flex items-center gap-1.5 px-4"
                >
                  <PixelIcon name="pen" size={14} />
                  <span>Import Image</span>
                </TactileButton>
              </div>
            </>
          )}

          {/* Mode B: Sprite Sheet Slicer */}
          {importMode === 'slicer' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                {/* Left Column: Slicer Settings */}
                <div className="flex flex-col gap-2.5 text-xs font-mono">
                  {/* File & Dimensions info */}
                  <div className="flex items-center justify-between bg-[var(--desk-surface)] p-2 rounded-[2px] border border-[var(--desk-border)]">
                    <span className="font-bold text-[var(--text-heading)] truncate max-w-[160px]">
                      {payload.filename}
                    </span>
                    <span className="text-[10px] text-[#f0be7c] font-bold">
                      {srcW} × {srcH} px
                    </span>
                  </div>

                  {/* Cell Dimensions & Presets */}
                  <div className="flex flex-col gap-1.5 bg-[var(--desk-surface)] p-2 rounded-[2px] border border-[var(--desk-border)]">
                    <span className="text-[10px] font-bold text-[#f0be7c] uppercase">Cell Dimensions (Frame Size)</span>
                    <div className="flex flex-wrap gap-1">
                      {PRESET_CELL_SIZES.map((preset) => {
                        const isSelected = slicerCellW === preset.w && slicerCellH === preset.h;
                        return (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => {
                              setSlicerCellW(preset.w);
                              setSlicerCellH(preset.h);
                            }}
                            className={`px-2 py-1 rounded-[2px] border font-bold text-[10px] cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120]'
                                : 'bg-[var(--desk-surface-raised)] text-[var(--text-body)] border-[var(--desk-border)] hover:text-[#f0be7c]'
                            }`}
                          >
                            {preset.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Custom Width and Height Inputs */}
                    <div className="flex items-center gap-2 pt-1">
                      <div className="flex items-center gap-1 bg-[var(--desk-surface-raised)] px-2 py-1 rounded-[2px] border border-[var(--desk-border)] flex-1">
                        <span className="text-[10px] text-[var(--text-body)] font-bold">W:</span>
                        <input
                          type="number"
                          min="1"
                          max={srcW}
                          value={slicerCellW}
                          aria-label="Frame cell width in pixels"
                          onChange={(e) => setSlicerCellW(Math.max(1, parseInt(e.target.value, 10) || 1))}
                          className="w-full bg-transparent text-[#f0be7c] font-bold text-right outline-none text-xs"
                        />
                        <span className="text-[9px] text-[var(--text-body)]/60">px</span>
                      </div>

                      <div className="flex items-center gap-1 bg-[var(--desk-surface-raised)] px-2 py-1 rounded-[2px] border border-[var(--desk-border)] flex-1">
                        <span className="text-[10px] text-[var(--text-body)] font-bold">H:</span>
                        <input
                          type="number"
                          min="1"
                          max={srcH}
                          value={slicerCellH}
                          aria-label="Frame cell height in pixels"
                          onChange={(e) => setSlicerCellH(Math.max(1, parseInt(e.target.value, 10) || 1))}
                          className="w-full bg-transparent text-[#f0be7c] font-bold text-right outline-none text-xs"
                        />
                        <span className="text-[9px] text-[var(--text-body)]/60">px</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1 pt-1">
                      {([
                        ['Start X', slicerStartX, setSlicerStartX],
                        ['Start Y', slicerStartY, setSlicerStartY],
                        ['Gap X', slicerSpacingX, setSlicerSpacingX],
                        ['Gap Y', slicerSpacingY, setSlicerSpacingY],
                      ] as const).map(([label, value, setter]) => (
                        <label key={label} className="flex items-center gap-1 text-[9px] text-[var(--text-body)]">
                          {label}
                          <input type="number" min="0" max={label.endsWith('X') ? srcW : srcH}
                            aria-label={`${label} in pixels`} value={value}
                            onChange={(event) => setter(Math.min(label.endsWith('X') ? srcW : srcH,
                              Math.max(0, Number.parseInt(event.target.value, 10) || 0)))}
                            className="w-full min-w-0 bg-[var(--desk-surface-raised)] border border-[var(--desk-border)] text-[#f0be7c] px-1" />
                        </label>
                      ))}
                    </div>
                    <label className="flex items-center gap-2 text-[9px] text-[var(--text-body)]">
                      Frame order
                      <select aria-label="Sprite sheet frame order" value={slicerOrder}
                        onChange={(event) => setSlicerOrder(event.target.value as 'row-major' | 'column-major')}
                        className="bg-[var(--desk-surface-raised)] border border-[var(--desk-border)] text-[#f0be7c]">
                        <option value="row-major">Across rows</option>
                        <option value="column-major">Down columns</option>
                      </select>
                    </label>

                    <span className="text-[9px] text-[#a89ab8]">
                      {slicerGrid.columns} cols × {slicerGrid.rows} rows = {slicerGrid.totalCells} total frames
                    </span>
                    {slicerGrid.totalCells > MAX_CANVAS_FRAMES && (
                      <span className="text-[9px] text-[#ff99aa]">At most {MAX_CANVAS_FRAMES} cells can be imported. Increase the cell size.</span>
                    )}
                  </div>

                  {/* Filtering Options */}
                  <div className="flex flex-col gap-1.5 bg-[var(--desk-surface)] p-2 rounded-[2px] border border-[var(--desk-border)]">
                    <span className="text-[10px] font-bold text-[#dcabdf] uppercase">Frame Options</span>

                    <label className="flex items-center gap-2 cursor-pointer text-[10px] text-[var(--text-body)]">
                      <input
                        type="checkbox"
                        checked={slicerSkipEmpty}
                        onChange={(e) => setSlicerSkipEmpty(e.target.checked)}
                        className="accent-[#f0be7c]"
                      />
                      <span>Skip Empty (Transparent) Cells — shortens animation</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-[10px] text-[var(--text-body)]">
                      <input
                        type="checkbox"
                        checked={slicerResizeCanvas}
                        onChange={(e) => setSlicerResizeCanvas(e.target.checked)}
                        className="accent-[#f0be7c]"
                      />
                      <span>Resize entire project to cell size ({slicerCellW}×{slicerCellH} px)</span>
                    </label>
                    {slicerWouldClip && (
                      <div role="alert" className="p-1.5 rounded-[2px] bg-[#3d1928] border border-[#6b283d] text-[#ff99aa] text-[10px] font-bold leading-tight">
                        Each frame is {slicerCellW}×{slicerCellH}, but the canvas is {canvasWidth}×{canvasHeight}. Enable resize above to import without cropping artwork.
                      </div>
                    )}

                    <label className="flex items-center gap-2 cursor-pointer text-[10px] text-[var(--text-body)]">
                      <input
                        type="checkbox"
                        checked={addToPalette}
                        onChange={(e) => setAddToPalette(e.target.checked)}
                        className="accent-[#f0be7c]"
                      />
                      <span>Add Extracted Colors to Swatches</span>
                    </label>

                    {slicerSkipEmpty && nonZeroFramesCount === 0 && slicerGrid.totalCells <= MAX_CANVAS_FRAMES && (
                      <div
                        data-testid="slicer-empty-warning"
                        className="p-1.5 rounded-[2px] bg-[#3d1928] border border-[#6b283d] text-[#ff99aa] text-[10px] font-bold leading-tight"
                      >
                        No non-empty frames detected (all cells are transparent). Uncheck &quot;Skip Empty&quot; to import blank frames.
                      </div>
                    )}
                  </div>

                  {/* Timeline Destination */}
                  <div className="flex flex-col gap-1.5 bg-[var(--desk-surface)] p-2 rounded-[2px] border border-[var(--desk-border)]">
                    <span className="text-[10px] font-bold text-[#f0be7c] uppercase">Timeline Target</span>
                    <div className="grid grid-cols-2 gap-1 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setSlicerTarget('sprite-sheet-append')}
                        className={`py-1.5 px-2 rounded-[2px] border font-bold text-center cursor-pointer transition-colors ${
                          slicerTarget === 'sprite-sheet-append'
                            ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120]'
                            : 'bg-[var(--desk-surface-raised)] text-[var(--text-body)] border-[var(--desk-border)] hover:text-[#f0be7c]'
                        }`}
                      >
                        Append to Timeline
                      </button>
                      <button
                        type="button"
                        onClick={() => setSlicerTarget('sprite-sheet-replace')}
                        className={`py-1.5 px-2 rounded-[2px] border font-bold text-center cursor-pointer transition-colors ${
                          slicerTarget === 'sprite-sheet-replace'
                            ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120]'
                            : 'bg-[var(--desk-surface-raised)] text-[var(--text-body)] border-[var(--desk-border)] hover:text-[#f0be7c]'
                        }`}
                      >
                        Replace Frames
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right Column: Slicer Cutline Preview */}
                <div className="flex flex-col gap-2 bg-[var(--desk-surface)] p-3 rounded-[2px] border-2 border-[var(--desk-border)] shadow-xs items-center justify-between min-h-[280px]">
                  <div className="flex items-center justify-between w-full text-xs font-mono">
                    <span className="text-[10px] font-bold text-[#f0be7c] uppercase flex items-center gap-1">
                      <PixelIcon name="grid" size={12} />
                      <span>Cutline Grid Preview</span>
                    </span>
                    <span className="text-[10px] text-[#dcabdf] font-bold font-mono">
                      {srcW} × {srcH} px
                    </span>
                  </div>

                  {/* Cutline Preview Canvas */}
                  <div className="w-full flex-1 min-h-[200px] bg-[#120a1c] border-2 border-[var(--desk-border)] rounded-[2px] flex items-center justify-center p-2 overflow-auto relative shadow-inner">
                    <canvas
                      ref={slicerCanvasRef}
                      className="max-w-full max-h-[220px] object-contain pixelated shadow-lg border border-[#3a2e4c]"
                      style={{ imageRendering: 'pixelated' }}
                    />
                  </div>

                  <span className="text-[9px] text-[var(--text-body)] text-center font-mono">
                    Dashed amber lines indicate frame cut boundaries.
                  </span>
                </div>
              </div>

              {/* Slicer Action Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--desk-border)]">
                <TactileButton size="sm" variant="default" onClick={onClose}>
                  Cancel
                </TactileButton>

                <TactileButton
                  size="sm"
                  variant="primary"
                  disabled={slicerInvalid}
                  onClick={() => {
                    const img = imgElementRef.current;
                    if (!img) return;

                    const sourceCanvas = document.createElement('canvas');
                    sourceCanvas.width = img.naturalWidth || img.width;
                    sourceCanvas.height = img.naturalHeight || img.height;
                    const sCtx = sourceCanvas.getContext('2d');
                    if (sCtx) {
                      sCtx.drawImage(img, 0, 0);
                    }

                    let sliceRes;
                    try {
                      sliceRes = sliceSpriteSheet(sourceCanvas, {
                        cellWidth: slicerCellW,
                        cellHeight: slicerCellH,
                        startX: slicerStartX,
                        startY: slicerStartY,
                        spacingX: slicerSpacingX,
                        spacingY: slicerSpacingY,
                        order: slicerOrder,
                        skipEmpty: slicerSkipEmpty,
                      });
                    } catch (error) {
                      studioEvents.emit('pixibun:toast', { type: 'error', message: error instanceof Error ? error.message : 'Sprite sheet could not be sliced.' });
                      return;
                    }

                    if (sliceRes.frames.length === 0) return;

                    const extractedColors = addToPalette
                      ? extractPaletteFromFrames(sliceRes.frames)
                      : [];

                    onConfirmImage({
                      canvas: sliceRes.frames[0],
                      target: slicerTarget,
                      extractedPalette: extractedColors,
                      addToPalette,
                      filename: payload.filename,
                      resizeCanvasToMatch: slicerResizeCanvas
                        ? { width: slicerCellW, height: slicerCellH }
                        : undefined,
                      slicedFrames: sliceRes.frames,
                    });

                  }}
                  className={`bg-[#f0be7c] text-[#140d1f] hover:bg-[#fcd699] hover:shadow-[0_2px_0_#8c5120] border-2 border-[#8c5120] font-display font-bold shadow-[0_2px_0_#8c5120] flex items-center gap-1.5 px-4 ${
                    slicerInvalid
                      ? 'opacity-50 cursor-not-allowed'
                      : 'cursor-pointer'
                  }`}
                  title={
                    slicerInvalid
                      ? 'Choose a valid grid with at least one frame'
                      : 'Slice & Import Frames'
                  }
                >
                  <PixelIcon name="layers" size={14} />
                  <span>Slice & Import Frames</span>
                </TactileButton>
              </div>
            </>
          )}
        </div>
      )}
    </ModalWrapper>
  );
};
