'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { createScenicCanvas, createInteriorCanvas } from './showcaseSprites';
import { processImageToPixelArt, PixelizeOptions } from '@/lib/ai/pixelizeEngine';

export const PixelizeShowcase: React.FC = () => {
  const [sceneType, setSceneType] = useState<'mountain' | 'hearth'>('mountain');
  const [resolution, setResolution] = useState<16 | 24 | 32>(24);
  const [samplingMode, setSamplingMode] = useState<'salient-box' | 'nearest'>('salient-box');
  const [colorMode, setColorMode] = useState<'reduce-8' | 'reduce-16' | 'true-color'>('reduce-16');
  const [ditherMode, setDitherMode] = useState<'atkinson' | 'bayer-4x4' | 'none'>('atkinson');
  const [paletteColors, setPaletteColors] = useState<string[]>([]);

  const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const sourceDisplayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const renderPixelize = useCallback(() => {
    const src = sourceCanvasRef.current;
    const displayCanvas = displayCanvasRef.current;
    if (!src || !displayCanvas) return;

    const options: PixelizeOptions = {
      targetWidth: resolution,
      targetHeight: resolution,
      fitMode: 'contain',
      samplingMode: samplingMode,
      colorMode: colorMode,
      ditherMode: ditherMode,
      ditherStrength: 0.75,
      cleanAlpha: false,
    };

    const result = processImageToPixelArt(src, options);

    displayCanvas.width = resolution;
    displayCanvas.height = resolution;
    const ctx = displayCanvas.getContext('2d');
    if (ctx) {
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, resolution, resolution);
      ctx.drawImage(result.canvas, 0, 0);
    }

    setPaletteColors(result.extractedPalette.slice(0, 16));
  }, [resolution, samplingMode, colorMode, ditherMode]);

  // Initialize and paint high-res source canvas and trigger synthesis
  useEffect(() => {
    const src = sceneType === 'mountain' ? createScenicCanvas() : createInteriorCanvas();
    sourceCanvasRef.current = src;

    const sDisplay = sourceDisplayCanvasRef.current;
    if (sDisplay) {
      sDisplay.width = 64;
      sDisplay.height = 64;
      const sCtx = sDisplay.getContext('2d');
      if (sCtx) {
        sCtx.imageSmoothingEnabled = false;
        sCtx.clearRect(0, 0, 64, 64);
        sCtx.drawImage(src, 0, 0);
      }
    }

    renderPixelize();
  }, [sceneType, renderPixelize]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
      {/* Left interactive viewport (7 cols) */}
      <div className="lg:col-span-7 flex flex-col items-center">
        {/* Stage Area: High-Res Source vs Synthesized Pixel Art */}
        <div className="w-full max-w-[420px] bg-[var(--desk-surface)] border-2 border-[var(--desk-border)] rounded-[2px] p-4 shadow-lg select-none">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--desk-border)] mb-4 text-xs font-mono">
            <span className="text-[var(--accent-gold)] font-bold">SYNTHESIS PIPELINE</span>
            <span className="text-[var(--text-muted)]">Grid: {resolution}×{resolution}</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Left: Original Stylized Artwork */}
            <div className="flex flex-col items-center p-3 bg-[var(--desk-surface-raised)] border border-[var(--desk-border)] rounded-[2px]">
              <div className="w-full text-center text-[10px] font-mono text-[var(--text-muted)] mb-2 uppercase">
                Original Vector / Art (64×64)
              </div>
              <div className="w-28 h-28 bg-[#1e1730] border border-[var(--desk-border)] rounded-[1px] flex items-center justify-center overflow-hidden p-1 shadow-inner">
                <canvas
                  ref={sourceDisplayCanvasRef}
                  className="w-24 h-24 select-none"
                  aria-label="Original source artwork"
                />
              </div>
              <span className="mt-2 text-[10px] font-mono text-[var(--text-muted)]">
                {sceneType === 'mountain' ? 'Mountain Sunset' : 'Lamplit Hearth'}
              </span>
            </div>

            {/* Right: Synthesized Pixel Art */}
            <div className="flex flex-col items-center p-3 bg-[var(--desk-surface-raised)] border-2 border-[var(--accent-gold)]/70 rounded-[2px]">
              <div className="w-full text-center text-[10px] font-mono font-bold text-[var(--accent-gold)] mb-2 uppercase flex items-center justify-center gap-1">
                <span>✦ QUANTIZED PIXELS</span>
              </div>
              <div className="w-28 h-28 bg-[#1e1730] border border-[var(--desk-border)] rounded-[1px] flex items-center justify-center overflow-hidden p-1 shadow-inner">
                <canvas
                  ref={displayCanvasRef}
                  className="w-24 h-24 pixelated select-none"
                  style={{ imageRendering: 'pixelated' }}
                  aria-label="Synthesized pixel art output"
                />
              </div>
              <span className="mt-2 text-[10px] font-mono text-[var(--accent-gold)]">
                {colorMode === 'reduce-8' ? '8 Colors' : colorMode === 'reduce-16' ? '16 Colors' : 'Truecolor'}
              </span>
            </div>
          </div>

          {/* Extracted Palette Swatches Ribbon */}
          {paletteColors.length > 0 && (
            <div className="mt-3 pt-3 border-t border-[var(--desk-border)]">
              <div className="text-[10px] font-mono text-[var(--text-muted)] mb-1.5 flex justify-between">
                <span>EXTRACTED OKLAB PALETTE</span>
                <span>{paletteColors.length} SWATCHES</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {paletteColors.map((hex, i) => (
                  <span
                    key={i}
                    className="w-4 h-4 rounded-[1px] border border-black/40 shadow-xs"
                    style={{ backgroundColor: hex }}
                    title={hex}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Interactive Controls Below Stage */}
        <div className="w-full max-w-[420px] mt-4 space-y-2.5">
          {/* Source Artwork Preset Selector */}
          <div>
            <div className="flex justify-between text-[10px] font-mono text-[var(--text-muted)] mb-1 uppercase">
              <span>Source Artwork Scene</span>
              <span className="text-[var(--accent-gold)]">{sceneType === 'mountain' ? 'Sunset Alpine' : 'Hearth Atelier'}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setSceneType('mountain')}
                className={`py-1 text-xs font-mono rounded-[2px] border transition-colors ${
                  sceneType === 'mountain'
                    ? 'bg-[var(--desk-surface-raised)] border-[var(--accent-gold)] text-[var(--accent-gold)] font-bold'
                    : 'bg-[var(--desk-surface)] border-[var(--desk-border)] text-[var(--text-body)]'
                }`}
              >
                ✦ Mountain Sunset
              </button>
              <button
                onClick={() => setSceneType('hearth')}
                className={`py-1 text-xs font-mono rounded-[2px] border transition-colors ${
                  sceneType === 'hearth'
                    ? 'bg-[var(--desk-surface-raised)] border-[var(--accent-plum)] text-[var(--accent-plum)] font-bold'
                    : 'bg-[var(--desk-surface)] border-[var(--desk-border)] text-[var(--text-body)]'
                }`}
              >
                ✦ Lamplit Hearth
              </button>
            </div>
          </div>

          {/* Resolution Selector */}
          <div>
            <div className="flex justify-between text-[10px] font-mono text-[var(--text-muted)] mb-1 uppercase">
              <span>Target Grid Resolution</span>
              <span className="text-[var(--accent-gold)]">{resolution}×{resolution} px</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {([16, 24, 32] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setResolution(r)}
                  className={`py-1 text-xs font-mono rounded-[2px] border transition-colors ${
                    resolution === r
                      ? 'bg-[var(--desk-surface-raised)] border-[var(--accent-gold)] text-[var(--accent-gold)] font-bold'
                      : 'bg-[var(--desk-surface)] border-[var(--desk-border)] text-[var(--text-body)]'
                  }`}
                >
                  {r}×{r}
                </button>
              ))}
            </div>
          </div>

          {/* Edge Salience & Color Mode Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            {/* Edge Salience */}
            <div>
              <span className="block text-[10px] font-mono text-[var(--text-muted)] mb-1 uppercase">
                Edge Salience
              </span>
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => setSamplingMode('salient-box')}
                  className={`py-1 px-2 text-[11px] rounded-[2px] border text-left transition-colors ${
                    samplingMode === 'salient-box'
                      ? 'bg-[var(--desk-surface-raised)] border-[var(--accent-gold)] text-[var(--accent-gold)] font-bold'
                      : 'bg-[var(--desk-surface)] border-[var(--desk-border)] text-[var(--text-body)]'
                  }`}
                >
                  ✦ Sobel Salience
                </button>
                <button
                  onClick={() => setSamplingMode('nearest')}
                  className={`py-1 px-2 text-[11px] rounded-[2px] border text-left transition-colors ${
                    samplingMode === 'nearest'
                      ? 'bg-[var(--desk-surface-raised)] border-[var(--accent-gold)] text-[var(--accent-gold)] font-bold'
                      : 'bg-[var(--desk-surface)] border-[var(--desk-border)] text-[var(--text-body)]'
                  }`}
                >
                  Naive Nearest
                </button>
              </div>
            </div>

            {/* Dither Mode */}
            <div>
              <span className="block text-[10px] font-mono text-[var(--text-muted)] mb-1 uppercase">
                Dither Diffusion
              </span>
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => setDitherMode('atkinson')}
                  className={`py-1 px-2 text-[11px] rounded-[2px] border text-left transition-colors ${
                    ditherMode === 'atkinson'
                      ? 'bg-[var(--desk-surface-raised)] border-[var(--accent-gold)] text-[var(--accent-gold)] font-bold'
                      : 'bg-[var(--desk-surface)] border-[var(--desk-border)] text-[var(--text-body)]'
                  }`}
                >
                  ✦ Atkinson 75%
                </button>
                <button
                  onClick={() => setDitherMode('bayer-4x4')}
                  className={`py-1 px-2 text-[11px] rounded-[2px] border text-left transition-colors ${
                    ditherMode === 'bayer-4x4'
                      ? 'bg-[var(--desk-surface-raised)] border-[var(--accent-gold)] text-[var(--accent-gold)] font-bold'
                      : 'bg-[var(--desk-surface)] border-[var(--desk-border)] text-[var(--text-body)]'
                  }`}
                >
                  ✦ Bayer 4×4 Matrix
                </button>
              </div>
            </div>
          </div>

          {/* Color Mode Switcher */}
          <div>
            <span className="block text-[10px] font-mono text-[var(--text-muted)] mb-1 uppercase">
              OKLab Color Quantization
            </span>
            <div className="grid grid-cols-3 gap-1.5 text-xs font-mono">
              {[
                { id: 'reduce-8', label: '8 Colors' },
                { id: 'reduce-16', label: '16 Colors' },
                { id: 'true-color', label: 'Truecolor' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setColorMode(m.id as 'reduce-8' | 'reduce-16' | 'true-color')}
                  className={`py-1 text-center rounded-[2px] border transition-colors ${
                    colorMode === m.id
                      ? 'bg-[var(--desk-surface-raised)] border-[var(--accent-gold)] text-[var(--accent-gold)] font-bold'
                      : 'bg-[var(--desk-surface)] border-[var(--desk-border)] text-[var(--text-body)]'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right Explanation & Engine Architecture (5 cols) */}
      <div className="lg:col-span-5 flex flex-col items-start text-left">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-[2px] bg-[var(--desk-surface)] border border-[var(--desk-border)] text-[11px] font-mono text-[var(--accent-gold)] mb-3">
          <span>05 / SALIENT DOWNSAMPLING</span>
        </div>

        <h3 className="font-display text-2xl sm:text-3xl text-[var(--text-heading)] leading-tight mb-3">
          Intelligent Image-to-Pixel Art Synthesis
        </h3>

        <p className="text-xs sm:text-sm leading-relaxed text-[var(--text-body)] mb-4 font-sans">
          Converting high-res art into clean pixel art usually fails: thin outlines vanish, shadows turn into dark mud, and colors smear.
          PixiBun applies optical gamma corrections, Sobel gradient edge preservation, and OKLab perceptual clustering.
        </p>

        {/* Feature Points Card */}
        <div className="w-full bg-[var(--desk-surface)] border border-[var(--desk-border)] rounded-[2px] p-4 mb-5 space-y-3 font-mono text-xs">
          <div className="flex items-start gap-2">
            <span className="text-[var(--accent-gold)] mt-0.5">✦</span>
            <div>
              <strong className="text-[var(--text-heading)] block font-sans">Linear Optical Gamma Downsampling</strong>
              <span className="text-[var(--text-muted)] text-[11px] leading-normal">
                Transforms sRGB to linear radiative flux before downscaling, preventing dark border halos and preserving luminosity.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <span className="text-[var(--accent-plum)] mt-0.5">✦</span>
            <div>
              <strong className="text-[var(--text-heading)] block font-sans">Sobel Gradient Salience Weighting</strong>
              <span className="text-[var(--text-muted)] text-[11px] leading-normal">
                Calculates local gradient magnitude so high-contrast contour lines and eyes remain crisp 1-pixel strokes.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <span className="text-[var(--accent-gold)] mt-0.5">✦</span>
            <div>
              <strong className="text-[var(--text-heading)] block font-sans">OKLab Perceptual Clustering</strong>
              <span className="text-[var(--text-muted)] text-[11px] leading-normal">
                Clusters colors in human perceptual color space (Ottosson 2020), preventing color skewing in saturated reds and cyans.
              </span>
            </div>
          </div>
        </div>

        {/* CTA to studio */}
        <Link
          href="/studio"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[2px] pixel-primary-btn text-xs font-display font-bold tracking-wide focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0be7c]"
        >
          <span>IMPORT &amp; PIXELIZE IN STUDIO</span>
          <span>→</span>
        </Link>
      </div>
    </div>
  );
};
