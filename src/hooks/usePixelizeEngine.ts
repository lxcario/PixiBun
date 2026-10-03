'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { MAX_CANVAS_DIMENSION } from '@/config/canvasLimits';
import {
  processImageToPixelArt,
  type PixelizeOptions,
  type PixelizeResult,
} from '@/lib/ai/pixelizeEngine';
import { reserveMemory } from '@/lib/safety/memoryBudget';
import { importPreviewSize, reserveImportCanvas } from '@/lib/project/importRaster';
import { importErrorMessage } from '@/lib/project/importFile';

export interface UsePixelizeEngineOptions {
  canvasWidth: number;
  canvasHeight: number;
  activePalette: string[];
}

export function usePixelizeEngine({
  canvasWidth,
  canvasHeight,
  activePalette,
}: UsePixelizeEngineOptions) {
  const [imageTarget, setImageTarget] = useState<'new-layer' | 'new-frame' | 'replace-layer'>('new-layer');
  const [sizeMode, setSizeMode] = useState<'match-image' | 'fit-canvas'>('match-image');
  const [processingMode, setProcessingMode] = useState<'exact' | 'pixelize'>('exact');
  const [colorMode, setColorMode] = useState<'true-color' | 'active-palette' | 'reduce-16' | 'reduce-8' | 'reduce-32'>('reduce-16');
  const [ditherMode, setDitherMode] = useState<'none' | 'bayer-4x4' | 'atkinson' | 'floyd-steinberg'>('none');
  const [removeBackground, setRemoveBackground] = useState<boolean>(false);
  const [addToPalette, setAddToPalette] = useState<boolean>(false);

  const [previewResult, setPreviewResult] = useState<PixelizeResult | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const ownedPreview = useRef<{ canvas: HTMLCanvasElement; release: () => void } | null>(null);
  const imgElementRef = useRef<HTMLImageElement | null>(null);
  const disposePreview = useCallback(() => {
    if (ownedPreview.current) {
      ownedPreview.current.canvas.width = 0;
      ownedPreview.current.canvas.height = 0;
      ownedPreview.current.release();
      ownedPreview.current = null;
    }
  }, []);
  const clearPreview = useCallback(() => { disposePreview(); setPreviewResult(null); setPreviewError(null); }, [disposePreview]);
  useEffect(() => disposePreview, [disposePreview]);

  const runPixelization = useCallback((loadedImg?: HTMLImageElement) => {
    const img = loadedImg || imgElementRef.current;
    if (!img) return;
    clearPreview();

    const scale = Math.min(1, MAX_CANVAS_DIMENSION / img.width, MAX_CANVAS_DIMENSION / img.height);
    const targetW = sizeMode === 'match-image' ? Math.max(1, Math.round(img.width * scale)) : canvasWidth;
    const targetH = sizeMode === 'match-image' ? Math.max(1, Math.round(img.height * scale)) : canvasHeight;

    const sourceSize = importPreviewSize(img.naturalWidth || img.width, img.naturalHeight || img.height, MAX_CANVAS_DIMENSION);
    let releaseWork: (() => void) | undefined;
    let scratch: ReturnType<typeof reserveImportCanvas> | undefined;
    let result: PixelizeResult | undefined;
    let exactCanvas: HTMLCanvasElement | undefined;
    try {
      releaseWork = reserveMemory(processingMode === 'exact' ? targetW * targetH * 8
        : sourceSize.width * sourceSize.height * 16 + targetW * targetH * 160, 'Preparing image preview');
      if (processingMode === 'exact') {
        exactCanvas = document.createElement('canvas');
        exactCanvas.width = targetW;
        exactCanvas.height = targetH;
        const ctx = exactCanvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) throw new Error('The image preview could not be rendered.');
        ctx.imageSmoothingEnabled = false;

        if (sizeMode === 'match-image') {
          ctx.drawImage(img, 0, 0, targetW, targetH);
        } else {
          const aspect = img.width / img.height;
          const canvasAspect = targetW / targetH;
          let dw = targetW;
          let dh = targetH;
          let dx = 0;
          let dy = 0;
          if (aspect > canvasAspect) {
            dh = Math.round(targetW / aspect);
            dy = Math.floor((targetH - dh) / 2);
          } else {
            dw = Math.round(targetH * aspect);
            dx = Math.floor((targetW - dw) / 2);
          }
          ctx.drawImage(img, dx, dy, dw, dh);
        }

        result = {
          canvas: exactCanvas,
          dataUrl: '',
          extractedPalette: [],
          width: targetW,
          height: targetH,
        };
      } else {

        const options: PixelizeOptions = {
          targetWidth: targetW,
          targetHeight: targetH,
          fitMode: sizeMode === 'match-image' ? 'pixel-art' : 'contain',
          samplingMode: 'salient-box',
          colorMode,
          activePalette,
          ditherMode,
          cleanAlpha: true,
          removeBackground,
          bgTolerance: 0.15,
          encodePreview: false,
        };
        scratch = reserveImportCanvas(sourceSize.width, sourceSize.height, 'Preparing image sampling surface');
        const context = scratch.canvas.getContext('2d');
        if (!context) throw new Error('The image preview could not be rendered.');
        context.imageSmoothingEnabled = false;
        context.drawImage(img, 0, 0, sourceSize.width, sourceSize.height);
        result = processImageToPixelArt(scratch.canvas, options);
      }
      scratch?.release(); scratch = undefined;
      releaseWork(); releaseWork = undefined;
      const release = reserveMemory(result.width * result.height * 4, 'Retaining image preview');
      ownedPreview.current = { canvas: result.canvas, release };
      setPreviewResult(result);
    } catch (error) {
      if (result) { result.canvas.width = 0; result.canvas.height = 0; }
      else if (exactCanvas) { exactCanvas.width = 0; exactCanvas.height = 0; }
      setPreviewError(importErrorMessage(error));
      console.error('Image preview failed:', error);
    } finally { scratch?.release(); releaseWork?.(); }
  }, [
    activePalette,
    canvasHeight,
    canvasWidth,
    colorMode,
    ditherMode,
    processingMode,
    removeBackground,
    sizeMode,
    clearPreview,
  ]);

  return {
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
    clearPreview,
    previewError,
    imgElementRef,
    runPixelization,
  };
}
