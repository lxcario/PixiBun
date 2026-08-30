'use client';

import { useState, useCallback, useRef } from 'react';
import {
  processImageToPixelArt,
  PixelizeOptions,
  PixelizeResult,
} from '@/lib/ai/pixelizeEngine';

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
  const imgElementRef = useRef<HTMLImageElement | null>(null);

  const runPixelization = useCallback((loadedImg?: HTMLImageElement) => {
    const img = loadedImg || imgElementRef.current;
    if (!img) return;

    const targetW = sizeMode === 'match-image' ? img.width : canvasWidth;
    const targetH = sizeMode === 'match-image' ? img.height : canvasHeight;

    if (processingMode === 'exact') {
      const exactCanvas = document.createElement('canvas');
      exactCanvas.width = targetW;
      exactCanvas.height = targetH;
      const ctx = exactCanvas.getContext('2d', { willReadFrequently: true })!;
      ctx.imageSmoothingEnabled = false;

      if (sizeMode === 'match-image') {
        ctx.drawImage(img, 0, 0);
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

      setPreviewResult({
        canvas: exactCanvas,
        dataUrl: exactCanvas.toDataURL('image/png'),
        extractedPalette: [],
        width: targetW,
        height: targetH,
      });
      return;
    }

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
    };

    const result = processImageToPixelArt(img, options);
    setPreviewResult(result);
  }, [
    activePalette,
    canvasHeight,
    canvasWidth,
    colorMode,
    ditherMode,
    processingMode,
    removeBackground,
    sizeMode,
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
    imgElementRef,
    runPixelization,
  };
}
