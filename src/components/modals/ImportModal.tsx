'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import { TactileButton } from '@/components/ui/TactileButton';
import { ModalWrapper } from '@/components/ui/ModalWrapper';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { useStudioStore } from '@/stores/studioStore';
import { usePixelizeEngine } from '@/hooks/usePixelizeEngine';

export interface ImportPayload {
  type: 'image' | 'project';
  filename: string;
  dataUrl?: string;
  /** Raw parsed JSON, validated before anything touches studio state. */
  projectJson?: unknown;
  imgWidth?: number;
  imgHeight?: number;
}

export interface ImageImportConfirmPayload {
  canvas: HTMLCanvasElement;
  target: 'new-layer' | 'new-frame' | 'replace-layer';
  extractedPalette: string[];
  addToPalette: boolean;
  filename: string;
  resizeCanvasToMatch?: { width: number; height: number };
}

interface ImportModalProps {
  isOpen: boolean;
  payload: ImportPayload | null;
  error?: string | null;
  onClose: () => void;
  onConfirmImage: (result: ImageImportConfirmPayload) => void;
  onConfirmProject: () => void;
}

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
    imgElementRef,
    runPixelization,
  } = usePixelizeEngine({
    canvasWidth,
    canvasHeight,
    activePalette,
  });

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Load Image Element once when payload changes
  useEffect(() => {
    if (!payload?.dataUrl || payload.type !== 'image') {
      imgElementRef.current = null;
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = payload.dataUrl;
    img.onload = () => {
      imgElementRef.current = img;
      // Default to match-image if image dimensions are reasonable sprite size
      setSizeMode(img.width <= 512 && img.height <= 512 ? 'match-image' : 'fit-canvas');
      runPixelization(img);
    };
  }, [payload, runPixelization, setSizeMode, imgElementRef]);

  useEffect(() => {
    if (imgElementRef.current) {
      runPixelization();
    }
  }, [runPixelization, imgElementRef]);

  // Render to live preview canvas
  useEffect(() => {
    if (!previewResult || !previewCanvasRef.current) return;
    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = previewResult.width;
    canvas.height = previewResult.height;
    ctx.clearRect(0, 0, previewResult.width, previewResult.height);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(previewResult.canvas, 0, 0);
  }, [previewResult]);

  if (!payload) return null;

  const srcW = payload.imgWidth || 32;
  const srcH = payload.imgHeight || 32;
  const isDifferentSize = srcW !== canvasWidth || srcH !== canvasHeight;

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      title={payload.type === 'project' ? 'Import Project (.pixibun)' : 'Import Image'}
      maxWidth={payload.type === 'image' ? 'w-[620px]' : 'w-[440px]'}
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

      {/* 2. Streamlined Image Import View */}
      {payload.type === 'image' && (
        <div className="flex flex-col gap-3">
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
              {isDifferentSize && (
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
                        Match Image Size ({srcW}×{srcH} px)
                      </span>
                      <span className="text-[9px] text-[#a89ab8]">
                        Keeps 100% exact 1:1 original pixels (Recommended for skins, sprites, textures)
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
                        Scales image down to current canvas dimensions
                      </span>
                    </div>
                  </label>
                </div>
              )}

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
                  ? `Canvas will be set to ${srcW}×${srcH} px with exact pixels`
                  : `Scaled to current ${canvasWidth}×${canvasHeight} px canvas`}
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
                        ? { width: srcW, height: srcH }
                        : undefined,
                  });
                }
                onClose();
              }}
              className="bg-[#f0be7c] text-[#140d1f] hover:bg-[#fcd699] hover:shadow-[0_2px_0_#8c5120] border-2 border-[#8c5120] font-display font-bold shadow-[0_2px_0_#8c5120] flex items-center gap-1.5 px-4"
            >
              <PixelIcon name="pen" size={14} />
              <span>Import Image</span>
            </TactileButton>
          </div>
        </div>
      )}
    </ModalWrapper>
  );
};
