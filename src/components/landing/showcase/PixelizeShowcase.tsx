'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ShowcaseNote } from './ShowcaseNote';
import { useQuests } from './quests';
import { ArtFrame, Dot, Picker, ToolWindow } from './ToolKit';
import { createScenicCanvas, createInteriorCanvas } from './showcaseSprites';
import { processImageToPixelArt, type PixelizeOptions } from '@/lib/ai/pixelizeEngine';

export const PixelizeShowcase: React.FC = () => {
  const [sceneType, setSceneType] = useState<'mountain' | 'hearth'>('mountain');
  const { complete } = useQuests();
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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
      <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 items-center gap-4">
        <ToolWindow name="pixelize.pixi" status={`${resolution}×${resolution}`} className="max-w-[460px] min-w-0">
          <div className="flex items-center justify-center gap-2 pt-3">
            <ArtFrame tag="before" caption={sceneType === 'mountain' ? 'Sunset Alpine' : 'Lamplit Desk'}>
              <canvas ref={sourceDisplayCanvasRef} className="block w-[clamp(48px,6vw,96px)] h-auto aspect-square" aria-label="Original source artwork" />
            </ArtFrame>
            <span aria-hidden="true" className="flex flex-col items-center gap-1 text-[var(--accent-gold)] font-mono text-lg">
              <span className="animate-pulse">✦</span>
              <span>→</span>
            </span>
            <ArtFrame tag="after" glow caption={colorMode === 'true-color' ? 'all colours' : `${colorMode === 'reduce-8' ? 8 : 16} colours`}>
              <canvas
                ref={displayCanvasRef}
                className="block w-[clamp(48px,6vw,96px)] h-auto aspect-square"
                style={{ imageRendering: 'pixelated' }}
                aria-label="Converted pixel art output"
              />
            </ArtFrame>
          </div>

          {paletteColors.length > 0 && (
            <div className="mt-5 pt-3 border-t-2 border-dashed border-[var(--desk-border)]">
              <div className="flex justify-between font-mono text-[11px] text-[var(--text-muted)] mb-2">
                <span>colours it kept</span>
                <span className="text-[var(--accent-gold)]">{paletteColors.length}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {paletteColors.map((hex, i) => (
                  <span
                    key={i}
                    className="w-5 h-5 rounded-[2px] border-2 border-[var(--ink)] shadow-[inset_-2px_-2px_0_rgba(0,0,0,0.25),inset_2px_2px_0_rgba(255,255,255,0.18)] transition-transform hover:-translate-y-0.5"
                    style={{ backgroundColor: hex }}
                    title={hex}
                  />
                ))}
              </div>
            </div>
          )}
        </ToolWindow>

        <div className="w-full max-w-[460px] min-w-0 grid gap-3">
          <Picker
            label="picture"
            value={sceneType}
            onChange={(value) => {
              complete(0);
              setSceneType(value);
            }}
            options={[
              { value: 'mountain', label: 'Mountain Sunset', icon: <Dot color="var(--accent-gold)" /> },
              { value: 'hearth', label: 'Lamplit Hearth', icon: <Dot color="var(--primary-bg)" /> },
            ]}
          />
          <Picker
            label="pixel size"
            hint={resolution === 16 ? 'extra chunky' : resolution === 24 ? 'just right' : 'fine'}
            value={resolution}
            onChange={setResolution}
            options={[
              { value: 16, label: '16 px' },
              { value: 24, label: '24 px' },
              { value: 32, label: '32 px' },
            ]}
          />
          <div className="grid grid-cols-1 gap-2">
            <Picker
              label="outlines"
              value={samplingMode}
              onChange={(value) => {
                if (value === 'nearest') complete(2);
                setSamplingMode(value);
              }}
              options={[
                { value: 'salient-box', label: 'Keep edges' },
                { value: 'nearest', label: 'Simple' },
              ]}
            />
            <Picker
              label="texture"
              value={ditherMode}
              onChange={setDitherMode}
              options={[
                { value: 'atkinson', label: 'Soft' },
                { value: 'bayer-4x4', label: 'Checker' },
                { value: 'none', label: 'Flat' },
              ]}
            />
          </div>
          <Picker
            label="colours"
            value={colorMode}
            onChange={(value) => {
              if (value === 'reduce-8') complete(1);
              setColorMode(value);
            }}
            options={[
              { value: 'reduce-8', label: '8 colours' },
              { value: 'reduce-16', label: '16 colours' },
              { value: 'true-color', label: 'All colours' },
            ]}
          />
        </div>
      </div>

      <ShowcaseNote
        kicker="photo to pixels"
        title="Turn a picture into pixel art."
        body="Bring in a photo or painting and choose how chunky it gets, how many colours it keeps, and whether edges stay crisp."
        tips={['Swap between the two little pictures.', 'Try 16 colours, then 8.', 'Switch outlines to Simple and watch edges crumble.']}
        cta="PIXELIZE AN IMAGE"
      />
    </div>
  );
};
