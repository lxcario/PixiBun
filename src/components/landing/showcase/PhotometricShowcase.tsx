'use client';

import React, { startTransition, useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useReducedMotion } from 'motion/react';
import { STARTER_TEMPLATES } from '@/lib/art/starterTemplates';
import { templateToCanvas } from './showcaseSprites';
import {
  executePhotometricPipeline,
  computeSeparableEDT,
  generateInflatedHeightmap,
  applyBilateralFilter,
  computeTangentNormalField,
  bakeNormalMapToCanvas,
} from '@/lib/ai/smartMathEngine';
import { MaterialType, PhotometricLightingParams } from '@/types/tools';
import { coordsToLightAngles, lightAnglesToCoords } from '@/lib/canvas/lightGizmoMath';
import { renderBoundedSpriteCastShadow, RaymarchedShadowParams } from '@/lib/ai/shadowRayMarcher';
import { createOffscreenCanvas } from './showcaseSprites';

export const PhotometricShowcase: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('hearth-ghost');
  const [material, setMaterial] = useState<MaterialType>('matte');
  const [displayMode, setDisplayMode] = useState<'cel' | 'normals' | 'base'>('cel');
  const [shadowMode, setShadowMode] = useState<'cast' | 'drop' | 'none'>('cast');
  const [celTones, setCelTones] = useState<boolean>(true);
  const [azimuth, setAzimuth] = useState<number>(135);
  const [elevation, setElevation] = useState<number>(45);
  const [autoOrbit, setAutoOrbit] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [baseVersion, setBaseVersion] = useState<number>(0);

  // Start with matching server/client markup, then honor the browser's motion preference.
  useEffect(() => {
    setAutoOrbit(shouldReduceMotion === false);
  }, [shouldReduceMotion]);

  const displayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const gizmoContainerRef = useRef<HTMLDivElement | null>(null);
  const baseCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cachedNormalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cachedSceneEDTRef = useRef<Float32Array | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Render unified lighting and 2.5D cast shadow to display canvas
  const renderLighting = useCallback(() => {
    void baseVersion;
    const displayCanvas = displayCanvasRef.current;
    const baseCanvas = baseCanvasRef.current;
    if (!displayCanvas || !baseCanvas) return;

    const ctx = displayCanvas.getContext('2d');
    if (!ctx) return;

    const width = baseCanvas.width;
    const height = baseCanvas.height;
    const stageW = 32;
    const stageH = 32;

    // Stage backing store is 32x32 for unified sprite + ground shadow projection
    if (displayCanvas.width !== stageW || displayCanvas.height !== stageH) {
      displayCanvas.width = stageW;
      displayCanvas.height = stageH;
    }

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, stageW, stageH);

    if (displayMode === 'base') {
      ctx.drawImage(baseCanvas, 8, 8);
      return;
    }

    const baseCtx = baseCanvas.getContext('2d', { willReadFrequently: true });
    if (!baseCtx) return;

    if (displayMode === 'normals') {
      // Use precomputed normal map
      if (cachedNormalCanvasRef.current) {
        ctx.drawImage(cachedNormalCanvasRef.current, 8, 8);
      }
      return;
    }

    // 1. Draw cozy atelier checkered drafting desk floor
    for (let y = 0; y < stageH; y += 4) {
      for (let x = 0; x < stageW; x += 4) {
        const isAlt = (Math.floor(x / 4) + Math.floor(y / 4)) % 2 === 0;
        ctx.fillStyle = isAlt ? 'rgba(54, 42, 72, 0.45)' : 'rgba(28, 21, 42, 0.65)';
        ctx.fillRect(x, y, 4, 4);
      }
    }

    // Floor boundary baseline
    ctx.fillStyle = 'rgba(220, 171, 223, 0.15)';
    ctx.fillRect(0, 25, stageW, 1);

    // 2. Compute 2.5D Bounded Cast or Drop Shadow synchronized to light bulb
    if (shadowMode !== 'none' && cachedSceneEDTRef.current) {
      const shadowParams: RaymarchedShadowParams = {
        lightAzimuth: azimuth,
        lightElevation: elevation,
        shadowOpacity: 0.68,
        shadowColor: '#12091c',
        ditherMode: '4x4',
        shadowStyle: shadowMode === 'drop' ? 'drop' : 'cast',
        isFloating: false,
        perspectiveForeshortening: 0.55,
        volumetricDepthBias: 0.25,
      };

      const shadowImgData = renderBoundedSpriteCastShadow(
        cachedSceneEDTRef.current,
        stageW,
        stageH,
        shadowParams
      );

      const tempCanvas = createOffscreenCanvas(stageW, stageH);
      const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
      if (tempCtx) {
        tempCtx.putImageData(shadowImgData, 0, 0);
        ctx.drawImage(tempCanvas, 0, 0);
      }
    }

    // 3. 2.5D Photometric Cel-Shading
    const params: PhotometricLightingParams = {
      lightAzimuth: azimuth,
      lightElevation: elevation,
      lightRadius: 32,
      lightColor: material === 'gold' ? '#FFE8B0' : '#FFFFFF',
      ambientIntensity: 0.48,
      lightBrightness: 1.15,
      material: material,
      cavityStrength: 1.0,
      ditherModulation: 0.25,
      bayerSize: '4x4',
      formType: 'character',
      celShading: celTones,
    };

    const shadedCanvas = executePhotometricPipeline(baseCtx, width, height, params);
    ctx.drawImage(shadedCanvas, 8, 6);
  }, [displayMode, shadowMode, material, celTones, azimuth, elevation, baseVersion]);

  // Precompute base canvas, tangent normal map, and scene EDT once when template changes
  useEffect(() => {
    const tmpl = STARTER_TEMPLATES.find((t) => t.id === selectedTemplateId) || STARTER_TEMPLATES[0];
    const bCanvas = templateToCanvas(tmpl);
    baseCanvasRef.current = bCanvas;

    const bCtx = bCanvas.getContext('2d', { willReadFrequently: true });
    if (bCtx) {
      const width = bCanvas.width;
      const height = bCanvas.height;
      const imgData = bCtx.getImageData(0, 0, width, height);
      const isOpaque = (x: number, y: number) => {
        if (x < 0 || x >= width || y < 0 || y >= height) return false;
        return imgData.data[(y * width + x) * 4 + 3] > 30;
      };
      const edt = computeSeparableEDT(isOpaque, width, height);
      const rawH = generateInflatedHeightmap(edt, width, height, 0.5);
      const smoothH = applyBilateralFilter(rawH, width, height, 1.5, 2.0);
      const normals = computeTangentNormalField(smoothH, width, height, 2.0);
      cachedNormalCanvasRef.current = bakeNormalMapToCanvas(normals, width, height);

      // Precompute 32x32 scene EDT for instant cast shadow raymarching (zero per-frame CPU stall)
      const stageW = 32;
      const stageH = 32;
      const sceneCanvas = createOffscreenCanvas(stageW, stageH);
      const sceneCtx = sceneCanvas.getContext('2d');
      if (sceneCtx) {
        sceneCtx.imageSmoothingEnabled = false;
        sceneCtx.drawImage(bCanvas, 8, 6);
        const sceneData = sceneCtx.getImageData(0, 0, stageW, stageH);
        const isSceneOpaque = (x: number, y: number) => {
          if (x < 0 || x >= stageW || y < 0 || y >= stageH) return false;
          return sceneData.data[(y * stageW + x) * 4 + 3] > 30;
        };
        cachedSceneEDTRef.current = computeSeparableEDT(isSceneOpaque, stageW, stageH);
      }
    }

    setBaseVersion((v) => v + 1);
  }, [selectedTemplateId]);

  // Re-render lighting whenever light parameters change
  useEffect(() => {
    renderLighting();
  }, [renderLighting]);

  // Smooth Auto-orbit animation loop
  useEffect(() => {
    if (!autoOrbit || isDragging) return;

    let lastTime = performance.now();
    const loop = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      // Decorative frames must not repeatedly interrupt a pending route transition.
      startTransition(() => {
        setAzimuth((prev) => (prev + dt * 45) % 360);
      });
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [autoOrbit, isDragging]);

  // Normalized gizmo coordinates helper (280x280 reference space)
  const updateAnglesFromPointer = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!gizmoContainerRef.current) return;

    const rect = gizmoContainerRef.current.getBoundingClientRect();
    const scale = 280 / rect.width;
    const hx = (e.clientX - rect.left) * scale;
    const hy = (e.clientY - rect.top) * scale;
    const { azimuth: az, elevation: el } = coordsToLightAngles(hx, hy, 140, 140, 105);
    setAzimuth(az);
    setElevation(Math.max(15, el));
  }, []);

  const handleGizmoPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging) return;
      updateAnglesFromPointer(e);
    },
    [isDragging, updateAnglesFromPointer]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setAutoOrbit(false);
    setIsDragging(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignored
    }
    updateAnglesFromPointer(e);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignored
    }
  };

  // Keyboard navigation for accessible light direction adjustment
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        setAutoOrbit(false);
        setAzimuth((prev) => (prev - 15 + 360) % 360);
        break;
      case 'ArrowRight':
        e.preventDefault();
        setAutoOrbit(false);
        setAzimuth((prev) => (prev + 15) % 360);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setAutoOrbit(false);
        setElevation((prev) => Math.min(85, prev + 10));
        break;
      case 'ArrowDown':
        e.preventDefault();
        setAutoOrbit(false);
        setElevation((prev) => Math.max(15, prev - 10));
        break;
      case 'Home':
        e.preventDefault();
        setAutoOrbit(false);
        setAzimuth(0);
        break;
      case 'End':
        e.preventDefault();
        setAutoOrbit(false);
        setAzimuth(180);
        break;
    }
  };

  // Convert light angles to 280x280 planar coordinate for gizmo bulb rendering
  const gizmoRadius = 105;
  const bulbCoords = lightAnglesToCoords(azimuth, elevation, 140, 140, gizmoRadius);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
      {/* Left interactive viewport (7 cols) */}
      <div className="lg:col-span-7 flex flex-col items-center">
        {/* Main Canvas & Draggable Light Bulb Stage */}
        <div className="relative w-[280px] h-[280px] sm:w-[320px] sm:h-[320px] bg-[var(--desk-surface)] border-2 border-[var(--desk-border)] rounded-[2px] shadow-lg flex items-center justify-center select-none overflow-hidden">
          {/* Subtle Ambient Vignette & Scanlines */}
          <div className="absolute inset-0 bg-radial from-transparent to-[var(--desk-border)]/20 pointer-events-none" />
          <div className="absolute inset-0 retro-scanlines pointer-events-none opacity-40" />

          {/* Spherical Compass Dial Grid */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none select-none text-[var(--desk-border-highlight)]" viewBox="0 0 280 280">
            <circle cx="140" cy="140" r="110" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
            <circle cx="140" cy="140" r="70" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2 4" opacity="0.4" />
            <line x1="140" y1="20" x2="140" y2="260" stroke="currentColor" strokeWidth="1" strokeDasharray="2 4" opacity="0.3" />
            <line x1="20" y1="140" x2="260" y2="140" stroke="currentColor" strokeWidth="1" strokeDasharray="2 4" opacity="0.3" />
            <text x="140" y="18" fill="var(--text-muted)" fontSize="9" fontFamily="monospace" textAnchor="middle">0° N</text>
            <text x="264" y="143" fill="var(--text-muted)" fontSize="9" fontFamily="monospace" textAnchor="start">90° E</text>
            <text x="140" y="275" fill="var(--text-muted)" fontSize="9" fontFamily="monospace" textAnchor="middle">180° S</text>
            <text x="16" y="143" fill="var(--text-muted)" fontSize="9" fontFamily="monospace" textAnchor="end">270° W</text>
          </svg>

          {/* Draggable Bulb Interaction Hint Chip */}
          <div className="absolute top-2 left-2 z-20 px-2 py-0.5 bg-[var(--desk-surface-raised)]/95 border border-[var(--desk-border)] rounded-[2px] text-[10px] font-mono text-[var(--accent-gold)] pointer-events-none shadow-xs flex items-center gap-1">
            <span>✦</span>
            <span>Drag bulb or use Arrow keys to orbit light</span>
          </div>

          {/* Crisp Scaled Pixel Sprite Canvas (16x16 stretched to 144x144) */}
          <div className="relative z-10 p-2 bg-[var(--desk-surface-raised)]/90 border border-[var(--desk-border)] rounded-[2px] shadow-md">
            <canvas
              ref={displayCanvasRef}
              className="w-36 h-36 pixelated select-none"
              style={{ imageRendering: 'pixelated' }}
              aria-label={`2.5D Photometrically shaded ${selectedTemplateId} sprite`}
            />
          </div>

          {/* Interactive Light Bulb Gizmo Overlay */}
          <div
            ref={gizmoContainerRef}
            tabIndex={0}
            role="slider"
            aria-label="Interactive 2.5D Light Direction Gizmo. Use arrow keys to adjust azimuth and elevation."
            aria-valuemin={0}
            aria-valuemax={360}
            aria-valuenow={Math.round(azimuth)}
            aria-valuetext={`Azimuth ${Math.round(azimuth)} degrees, Elevation ${Math.round(elevation)} degrees`}
            onKeyDown={handleKeyDown}
            onPointerDown={handlePointerDown}
            onPointerMove={handleGizmoPointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="absolute inset-0 z-20 cursor-grab active:cursor-grabbing touch-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)]"
            title="Drag the glowing bulb to change the light source direction (or use Arrow keys)!"
          >
            {/* Vector Light Beam from Bulb to Center Sprite */}
            <svg className="w-full h-full pointer-events-none" viewBox="0 0 280 280">
              <line
                x1={bulbCoords.x}
                y1={bulbCoords.y}
                x2="140"
                y2="140"
                stroke="rgba(240, 190, 124, 0.4)"
                strokeWidth="1.5"
                strokeDasharray="2 2"
              />
            </svg>

            {/* Draggable Pixel Light Bulb Icon */}
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center transition-transform hover:scale-110 active:scale-95 pointer-events-none"
              style={{ left: `${(bulbCoords.x / 280) * 100}%`, top: `${(bulbCoords.y / 280) * 100}%` }}
            >
              {/* Pulsing Light Aura */}
              <div className="absolute inset-0 rounded-full bg-[var(--accent-gold)]/25 animate-ping" />
              <div className="relative w-7 h-7 rounded-[2px] bg-[#241a33] border-2 border-[var(--accent-gold)] shadow-[0_0_12px_rgba(240,190,124,0.6)] flex items-center justify-center select-none">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" className="text-[var(--accent-gold)]" aria-hidden="true">
                  <path d="M6 1h4v2H6V1zM4 3h8v2H4V3zm-1 2h10v3H3V5zm2 3h6v2H5V8zm1 2h4v1H6v-1zm1 1h2v3H7v-3z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Angle Readout Banner */}
          <div className="absolute bottom-2 left-2 right-2 z-20 px-2.5 py-1 bg-[var(--desk-surface-raised)]/95 border border-[var(--desk-border)] rounded-[2px] flex items-center justify-between text-[11px] font-mono text-[var(--text-heading)]">
            <span className="flex items-center gap-1">
              <span className="text-[var(--accent-gold)]">✦</span>
              <span>Azimuth: {Math.round(azimuth)}°</span>
            </span>
            <span className="text-[var(--text-muted)]">Elev: {Math.round(elevation)}°</span>
            <button
              onClick={() => setAutoOrbit((prev) => !prev)}
              className="px-2 py-0.5 rounded-[1px] bg-[var(--desk-surface)] border border-[var(--desk-border)] text-[10px] hover:text-[var(--accent-gold)] transition-colors"
              title="Toggle automatic orbital rotation"
            >
              {autoOrbit ? '⏸ Orbit' : '▶ Auto-Orbit'}
            </button>
          </div>
        </div>

        {/* Tactile Control Toggles Below Stage */}
        <div className="w-full max-w-[320px] mt-4 flex flex-col gap-3">
          {/* Template & Mode Row */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="block text-[10px] font-mono text-[var(--text-muted)] mb-1 uppercase tracking-wider">
                Sprite Model
              </span>
              <div className="grid grid-cols-2 gap-1">
                {STARTER_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    onClick={() => setSelectedTemplateId(tmpl.id)}
                    className={`px-2 py-1 text-[11px] font-mono rounded-[2px] border transition-colors ${
                      selectedTemplateId === tmpl.id
                        ? 'bg-[var(--desk-surface-raised)] border-[var(--accent-gold)] text-[var(--accent-gold)] font-bold shadow-sm'
                        : 'bg-[var(--desk-surface)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[var(--text-heading)]'
                    }`}
                  >
                    {tmpl.name.split(' ')[1] || tmpl.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="block text-[10px] font-mono text-[var(--text-muted)] mb-1 uppercase tracking-wider">
                View Mode
              </span>
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => setDisplayMode('cel')}
                  className={`px-2 py-1 text-[11px] font-mono rounded-[2px] border text-left transition-colors ${
                    displayMode === 'cel'
                      ? 'bg-[var(--desk-surface-raised)] border-[var(--accent-gold)] text-[var(--accent-gold)] font-bold'
                      : 'bg-[var(--desk-surface)] border-[var(--desk-border)] text-[var(--text-body)]'
                  }`}
                >
                  ✦ OKLCH Cel Shaded
                </button>
                <button
                  onClick={() => setDisplayMode('normals')}
                  className={`px-2 py-1 text-[11px] font-mono rounded-[2px] border text-left transition-colors ${
                    displayMode === 'normals'
                      ? 'bg-[var(--desk-surface-raised)] border-[var(--accent-plum)] text-[var(--accent-plum)] font-bold'
                      : 'bg-[var(--desk-surface)] border-[var(--desk-border)] text-[var(--text-body)]'
                  }`}
                >
                  ✦ Normal Field (RGB)
                </button>
                <button
                  onClick={() => setCelTones((prev) => !prev)}
                  className={`px-2 py-1 text-[10px] font-mono rounded-[2px] border text-left transition-colors ${
                    celTones
                      ? 'bg-[var(--desk-surface-raised)] border-[var(--desk-border)] text-[var(--accent-gold)]'
                      : 'bg-[var(--desk-surface)] border-[var(--desk-border)] text-[var(--text-muted)]'
                  }`}
                >
                  ✦ Tone: {celTones ? 'Stepped Cel' : 'Smooth'}
                </button>
              </div>
            </div>
          </div>

          {/* Material Profile Buttons */}
          <div>
            <span className="block text-[10px] font-mono text-[var(--text-muted)] mb-1 uppercase tracking-wider">
              Surface Material Profile (Blinn-Phong)
            </span>
            <div className="grid grid-cols-4 gap-1.5">
              {(['matte', 'gold', 'glass', 'fabric'] as MaterialType[]).map((mat) => (
                <button
                  key={mat}
                  onClick={() => setMaterial(mat)}
                  className={`px-2 py-1 text-[11px] font-mono rounded-[2px] border capitalize transition-colors ${
                    material === mat
                      ? 'bg-[var(--desk-surface-raised)] border-[var(--accent-gold)] text-[var(--accent-gold)] font-bold'
                      : 'bg-[var(--desk-surface)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[var(--text-heading)]'
                  }`}
                >
                  {mat}
                </button>
              ))}
            </div>
          </div>

          {/* 2.5D Ground Shadow Mode Controls */}
          <div>
            <span className="block text-[10px] font-mono text-[var(--text-muted)] mb-1 uppercase tracking-wider">
              2.5D Ground Shadow
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {(['cast', 'drop', 'none'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setShadowMode(mode)}
                  className={`px-2 py-1 text-[11px] font-mono rounded-[2px] border uppercase transition-colors ${
                    shadowMode === mode
                      ? 'bg-[var(--desk-surface-raised)] border-[var(--accent-gold)] text-[var(--accent-gold)] font-bold'
                      : 'bg-[var(--desk-surface)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[var(--text-heading)]'
                  }`}
                >
                  {mode === 'cast' ? 'Cast Ray' : mode === 'drop' ? 'Drop AO' : 'None'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right Explanation & Engine Architecture (5 cols) */}
      <div className="lg:col-span-5 flex flex-col items-start text-left">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-[2px] bg-[var(--desk-surface)] border border-[var(--desk-border)] text-[11px] font-mono text-[var(--accent-gold)] mb-3">
          <span>01 / 2.5D LIGHTING &amp; SHADOWS</span>
        </div>

        <h3 className="font-display text-2xl sm:text-3xl text-[var(--text-heading)] leading-tight mb-3">
          2.5D Photometric Studio &amp; Bounded Cast Shadows
        </h3>

        <p className="text-xs sm:text-sm leading-relaxed text-[var(--text-body)] mb-4 font-sans">
          Move the little bulb and watch the sample's highlights and shadows change.
          The surface is estimated from the sprite's silhouette; compare the materials and shadow choices to find a look you like.
        </p>

        {/* Feature Points Card */}
        <div className="w-full bg-[var(--desk-surface)] border border-[var(--desk-border)] rounded-[2px] p-4 mb-5 space-y-3 font-mono text-xs">
          <div className="flex items-start gap-2">
            <span className="text-[var(--accent-gold)] mt-0.5">✦</span>
            <div>
              <strong className="text-[var(--text-heading)] block font-sans">Exact Euclidean Distance Field (EDT)</strong>
              <span className="text-[var(--text-muted)] text-[11px] leading-normal">
                Linear-time O(N) Felzenszwalb &amp; Huttenlocher transform inflates flat silhouettes into dome heightmaps.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <span className="text-[var(--accent-plum)] mt-0.5">✦</span>
            <div>
              <strong className="text-[var(--text-heading)] block font-sans">Sobel Tangent Normals &amp; Bilateral Smoothing</strong>
              <span className="text-[var(--text-muted)] text-[11px] leading-normal">
                Estimates surface directions from the height field and smooths them locally. Fine details need a look of their own.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <span className="text-[var(--accent-gold)] mt-0.5">✦</span>
            <div>
              <strong className="text-[var(--text-heading)] block font-sans">Stepped OKLCH Cel-Shading</strong>
              <span className="text-[var(--text-muted)] text-[11px] leading-normal">
                Uses perceptual color coordinates for warm highlights, cool shadows and stepped tones. The final colors depend on your settings.
              </span>
            </div>
          </div>
        </div>

        {/* CTA to studio */}
        <Link
          href="/studio"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[2px] pixel-primary-btn text-xs font-display font-bold tracking-wide focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0be7c]"
        >
          <span>TRY PHOTOMETRIC LIGHTING IN STUDIO</span>
          <span>→</span>
        </Link>
      </div>
    </div>
  );
};
