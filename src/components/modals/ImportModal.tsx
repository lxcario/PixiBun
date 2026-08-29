'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { TactileButton } from '@/components/ui/TactileButton';
import { ModalWrapper } from '@/components/ui/ModalWrapper';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { useStudioStore } from '@/stores/studioStore';
import {
  processImageToPixelArt,
  PixelizeOptions,
  PixelizeResult,
} from '@/lib/ai/pixelizeEngine';

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

  const [imageTarget, setImageTarget] = useState<'new-layer' | 'new-frame' | 'replace-layer'>('new-layer');
  const [fitMode, setFitMode] = useState<'contain' | 'cover' | 'stretch' | 'pixel-art'>('contain');
  const [samplingMode, setSamplingMode] = useState<'salient-box' | 'nearest'>('salient-box');
  const [colorMode, setColorMode] = useState<'true-color' | 'active-palette' | 'reduce-8' | 'reduce-16' | 'reduce-32'>('reduce-16');
  const [ditherMode, setDitherMode] = useState<'none' | 'bayer-4x4' | 'atkinson' | 'floyd-steinberg'>('none');
  const [ditherStrength, setDitherStrength] = useState<number>(0.75);
  const [cleanAlpha, setCleanAlpha] = useState<boolean>(true);
  const [removeBackground, setRemoveBackground] = useState<boolean>(false);
  const [addToPalette, setAddToPalette] = useState<boolean>(true);

  const [previewResult, setPreviewResult] = useState<PixelizeResult | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgElementRef = useRef<HTMLImageElement | null>(null);

  // Re-run pixelization when options change
  const runPixelization = useCallback((loadedImg?: HTMLImageElement) => {
    const img = loadedImg || imgElementRef.current;
    if (!img) return;

    const options: PixelizeOptions = {
      targetWidth: canvasWidth,
      targetHeight: canvasHeight,
      fitMode,
      samplingMode,
      colorMode,
      activePalette,
      ditherMode,
      ditherStrength,
      cleanAlpha,
      removeBackground,
      bgTolerance: 0.15,
    };

    const result = processImageToPixelArt(img, options);
    setPreviewResult(result);
  }, [
    activePalette,
    canvasHeight,
    canvasWidth,
    cleanAlpha,
    colorMode,
    ditherMode,
    ditherStrength,
    fitMode,
    removeBackground,
    samplingMode,
  ]);

  // Load Image Element once when payload changes
  useEffect(() => {
    if (!payload?.dataUrl || payload.type !== 'image') {
      imgElementRef.current = null;
      setPreviewResult(null);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = payload.dataUrl;
    img.onload = () => {
      imgElementRef.current = img;
      runPixelization(img);
    };
  }, [payload, runPixelization]);

  useEffect(() => {
    if (imgElementRef.current) {
      runPixelization();
    }
  }, [runPixelization]);

  // Render to live preview canvas
  useEffect(() => {
    if (!previewResult || !previewCanvasRef.current) return;
    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(previewResult.canvas, 0, 0);
  }, [previewResult, canvasWidth, canvasHeight]);

  if (!payload) return null;

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      title={payload.type === 'project' ? 'Import Project (.pixibun)' : 'Intelligent Image-to-Pixel-Art Studio'}
      maxWidth={payload.type === 'image' ? 'w-[720px]' : 'w-[460px]'}
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

      {/* 2. Image-to-Pixel-Art Synthesis Studio View */}
      {payload.type === 'image' && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Left Column: Pixelation, Color & Dither Parameters */}
            <div className="flex flex-col gap-2.5 max-h-[460px] overflow-y-auto pr-1">
              {/* File Info */}
              <div className="flex items-center gap-2 bg-[var(--desk-surface)] p-2 rounded-[2px] border border-[var(--desk-border)] text-xs font-mono">
                <PixelIcon name="export" size={14} />
                <span className="font-bold text-[var(--text-heading)] truncate flex-1">{payload.filename}</span>
                <span className="text-[10px] text-[#f0be7c]">{payload.imgWidth}×{payload.imgHeight}px</span>
              </div>

              {/* Fit & Scaling Mode */}
              <div className="flex flex-col gap-1.5 bg-[var(--desk-surface)] p-2 rounded-[2px] border border-[var(--desk-border)]">
                <span className="text-[10px] font-mono font-bold text-[#f0be7c] uppercase">1. Fit & Sampling</span>
                <div className="grid grid-cols-2 gap-1 text-[10px] font-mono">
                  {(['contain', 'cover', 'stretch', 'pixel-art'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setFitMode(mode)}
                      className={`py-1 px-1.5 rounded-[2px] border font-bold text-center cursor-pointer transition-colors ${
                        fitMode === mode
                          ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120]'
                          : 'bg-[var(--desk-surface-raised)] text-[var(--text-body)] border-[var(--desk-border)] hover:text-[#f0be7c]'
                      }`}
                    >
                      {mode === 'contain' ? 'Fit (Contain)' : mode === 'cover' ? 'Fill (Cover)' : mode === 'stretch' ? 'Stretch' : '1:1 Pixel Art'}
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono pt-1">
                  <span className="text-[var(--text-body)]">Filter:</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setSamplingMode('salient-box')}
                      className={`px-2 py-0.5 rounded-[2px] border font-bold cursor-pointer ${
                        samplingMode === 'salient-box'
                          ? 'bg-[#dcabdf] text-[#140d1f] border-[#5d3868]'
                          : 'bg-[var(--desk-surface-raised)] text-[var(--text-body)] border-[var(--desk-border)]'
                      }`}
                    >
                      Smart Box (Smooth)
                    </button>
                    <button
                      onClick={() => setSamplingMode('nearest')}
                      className={`px-2 py-0.5 rounded-[2px] border font-bold cursor-pointer ${
                        samplingMode === 'nearest'
                          ? 'bg-[#dcabdf] text-[#140d1f] border-[#5d3868]'
                          : 'bg-[var(--desk-surface-raised)] text-[var(--text-body)] border-[var(--desk-border)]'
                      }`}
                    >
                      Nearest (Crisp)
                    </button>
                  </div>
                </div>
              </div>

              {/* Color Quantization Mode */}
              <div className="flex flex-col gap-1.5 bg-[var(--desk-surface)] p-2 rounded-[2px] border border-[var(--desk-border)]">
                <span className="text-[10px] font-mono font-bold text-[#dcabdf] uppercase">2. Color & Palette</span>
                <div className="grid grid-cols-2 gap-1 text-[10px] font-mono">
                  <button
                    onClick={() => setColorMode('reduce-16')}
                    className={`py-1 px-1.5 rounded-[2px] border font-bold cursor-pointer ${
                      colorMode === 'reduce-16' ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120]' : 'bg-[var(--desk-surface-raised)] text-[var(--text-body)] border-[var(--desk-border)]'
                    }`}
                  >
                    16 Retro Colors
                  </button>
                  <button
                    onClick={() => setColorMode('reduce-8')}
                    className={`py-1 px-1.5 rounded-[2px] border font-bold cursor-pointer ${
                      colorMode === 'reduce-8' ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120]' : 'bg-[var(--desk-surface-raised)] text-[var(--text-body)] border-[var(--desk-border)]'
                    }`}
                  >
                    8 Arcade Colors
                  </button>
                  <button
                    onClick={() => setColorMode('reduce-32')}
                    className={`py-1 px-1.5 rounded-[2px] border font-bold cursor-pointer ${
                      colorMode === 'reduce-32' ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120]' : 'bg-[var(--desk-surface-raised)] text-[var(--text-body)] border-[var(--desk-border)]'
                    }`}
                  >
                    32 16-Bit Colors
                  </button>
                  <button
                    onClick={() => setColorMode('active-palette')}
                    className={`py-1 px-1.5 rounded-[2px] border font-bold cursor-pointer ${
                      colorMode === 'active-palette' ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120]' : 'bg-[var(--desk-surface-raised)] text-[var(--text-body)] border-[var(--desk-border)]'
                    }`}
                  >
                    Active Palette ({activePalette.length})
                  </button>
                  <button
                    onClick={() => setColorMode('true-color')}
                    className={`col-span-2 py-1 px-1.5 rounded-[2px] border font-bold cursor-pointer ${
                      colorMode === 'true-color' ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120]' : 'bg-[var(--desk-surface-raised)] text-[var(--text-body)] border-[var(--desk-border)]'
                    }`}
                  >
                    True Colors (Full 32-bit)
                  </button>
                </div>
              </div>

              {/* Dithering Options */}
              <div className="flex flex-col gap-1.5 bg-[var(--desk-surface)] p-2 rounded-[2px] border border-[var(--desk-border)]">
                <span className="text-[10px] font-mono font-bold text-[#f0be7c] uppercase">3. Dithering Technique</span>
                <div className="grid grid-cols-2 gap-1 text-[10px] font-mono">
                  {(['none', 'bayer-4x4', 'atkinson', 'floyd-steinberg'] as const).map((dm) => (
                    <button
                      key={dm}
                      onClick={() => setDitherMode(dm)}
                      className={`py-1 px-1.5 rounded-[2px] border font-bold cursor-pointer ${
                        ditherMode === dm
                          ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120]'
                          : 'bg-[var(--desk-surface-raised)] text-[var(--text-body)] border-[var(--desk-border)] hover:text-[#f0be7c]'
                      }`}
                    >
                      {dm === 'none' ? 'None (Flat Cel)' : dm === 'bayer-4x4' ? 'Bayer 4x4' : dm === 'atkinson' ? 'Atkinson 75%' : 'Floyd-Steinberg'}
                    </button>
                  ))}
                </div>

                {ditherMode !== 'none' && (
                  <div className="flex items-center justify-between text-[10px] font-mono pt-1">
                    <span className="text-[var(--text-body)]">Intensity:</span>
                    <input
                      type="range"
                      min="0.2"
                      max="1.0"
                      step="0.05"
                      value={ditherStrength}
                      onChange={(e) => setDitherStrength(parseFloat(e.target.value))}
                      className="w-24 accent-[#f0be7c] cursor-pointer"
                    />
                    <span className="text-[#f0be7c] font-bold">{Math.round(ditherStrength * 100)}%</span>
                  </div>
                )}
              </div>

              {/* Alpha & Background Removal */}
              <div className="flex flex-col gap-1.5 bg-[var(--desk-surface)] p-2 rounded-[2px] border border-[var(--desk-border)] text-xs font-mono">
                <span className="text-[10px] font-bold text-[#dcabdf] uppercase">4. Transparency & Edges</span>
                <label className="flex items-center gap-2 cursor-pointer text-[10px]">
                  <input
                    type="checkbox"
                    checked={cleanAlpha}
                    onChange={(e) => setCleanAlpha(e.target.checked)}
                    className="accent-[#f0be7c]"
                  />
                  <span>Crisp 1-bit Alpha (No semi-transparent halos)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-[10px]">
                  <input
                    type="checkbox"
                    checked={removeBackground}
                    onChange={(e) => setRemoveBackground(e.target.checked)}
                    className="accent-[#f0be7c]"
                  />
                  <span>Remove Solid Background Color</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-[10px]">
                  <input
                    type="checkbox"
                    checked={addToPalette}
                    onChange={(e) => setAddToPalette(e.target.checked)}
                    className="accent-[#f0be7c]"
                  />
                  <span>Add Extracted Palette into Project Swatches</span>
                </label>
              </div>

              {/* Destination */}
              <div className="flex flex-col gap-1 bg-[var(--desk-surface)] p-2 rounded-[2px] border border-[var(--desk-border)] text-xs font-mono">
                <span className="text-[10px] font-bold text-[#f0be7c] uppercase">5. Destination</span>
                <div className="grid grid-cols-3 gap-1 text-[10px]">
                  <button
                    onClick={() => setImageTarget('new-layer')}
                    className={`py-1 px-1 rounded-[2px] border font-bold cursor-pointer text-center ${
                      imageTarget === 'new-layer' ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120]' : 'bg-[var(--desk-surface-raised)] text-[var(--text-body)] border-[var(--desk-border)]'
                    }`}
                  >
                    New Layer
                  </button>
                  <button
                    onClick={() => setImageTarget('replace-layer')}
                    className={`py-1 px-1 rounded-[2px] border font-bold cursor-pointer text-center ${
                      imageTarget === 'replace-layer' ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120]' : 'bg-[var(--desk-surface-raised)] text-[var(--text-body)] border-[var(--desk-border)]'
                    }`}
                  >
                    Active Layer
                  </button>
                  <button
                    onClick={() => setImageTarget('new-frame')}
                    className={`py-1 px-1 rounded-[2px] border font-bold cursor-pointer text-center ${
                      imageTarget === 'new-frame' ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120]' : 'bg-[var(--desk-surface-raised)] text-[var(--text-body)] border-[var(--desk-border)]'
                    }`}
                  >
                    New Frame
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Live Real-Time Pixel Art Preview */}
            <div className="flex flex-col gap-2 bg-[var(--desk-surface)] p-3 rounded-[2px] border-2 border-[var(--desk-border)] shadow-xs items-center justify-between">
              <div className="flex items-center justify-between w-full text-xs font-mono">
                <span className="text-[10px] font-bold text-[#f0be7c] uppercase tracking-wider flex items-center gap-1">
                  <PixelIcon name="preview" size={12} />
                  <span>Pixel Art Output Preview</span>
                </span>
                <span className="text-[10px] text-[#dcabdf] font-bold font-mono">
                  {canvasWidth} × {canvasHeight} px
                </span>
              </div>

              {/* Large Pixelated Preview Canvas */}
              <div className="w-full flex-1 min-h-[260px] bg-[#120a1c] border-2 border-[var(--desk-border)] rounded-[2px] flex items-center justify-center p-3 overflow-hidden relative shadow-inner">
                <canvas
                  ref={previewCanvasRef}
                  className="max-w-full max-h-[240px] aspect-square object-contain pixelated shadow-lg border border-[#3a2e4c]"
                  style={{ imageRendering: 'pixelated' }}
                />
              </div>

              {/* Extracted Swatches preview */}
              {previewResult && previewResult.extractedPalette.length > 0 && (
                <div className="w-full flex flex-col gap-1 text-[10px] font-mono">
                  <span className="text-[var(--text-body)] font-bold">
                    Quantized Palette ({previewResult.extractedPalette.length} colors):
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {previewResult.extractedPalette.map((c, i) => (
                      <div
                        key={i}
                        className="w-4 h-4 rounded-[1px] border border-[#1a1126] shadow-xs"
                        style={{ backgroundColor: c }}
                        title={c}
                      />
                    ))}
                  </div>
                </div>
              )}
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
                  });
                }
                onClose();
              }}
              className="bg-[#f0be7c] text-[#140d1f] hover:bg-[#fff8db] border-2 border-[#8c5120] font-display font-bold shadow-[0_2px_0_#8c5120] flex items-center gap-1.5"
            >
              <PixelIcon name="pen" size={14} />
              <span>Import & Draw to Canvas</span>
            </TactileButton>
          </div>
        </div>
      )}
    </ModalWrapper>
  );
};
