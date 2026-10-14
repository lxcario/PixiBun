'use client';

import React, { startTransition, useState, useEffect, useRef, useCallback } from 'react';
import { ShowcaseNote } from './ShowcaseNote';
import { Dot, Picker, ToolWindow } from './ToolKit';
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
      <div className="lg:col-span-7 flex flex-col items-center gap-5">
        <ToolWindow name="lamp-test.pixi" status={`☀ ${Math.round(azimuth)}°`} className="max-w-[460px]">
          {/* The little photo booth: drag the bulb around the sitter */}
          <div
            className="relative mx-auto w-[260px] h-[260px] sm:w-[300px] sm:h-[300px] rounded-[2px] border-2 border-[#0b0714] overflow-hidden select-none"
            style={{
              background:
                'radial-gradient(circle at 50% 46%, #3a2560 0%, #241640 45%, #160d2a 100%)',
            }}
          >
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 280 280" aria-hidden="true">
              <circle cx="140" cy="140" r="105" fill="none" stroke="#5d4486" strokeWidth="2" strokeDasharray="2 6" />
              <text x="140" y="22" fill="#8d76ad" fontSize="10" fontFamily="monospace" textAnchor="middle">N</text>
              <text x="266" y="144" fill="#8d76ad" fontSize="10" fontFamily="monospace" textAnchor="end">E</text>
              <text x="140" y="270" fill="#8d76ad" fontSize="10" fontFamily="monospace" textAnchor="middle">S</text>
              <text x="14" y="144" fill="#8d76ad" fontSize="10" fontFamily="monospace" textAnchor="start">W</text>
            </svg>

            <span className="absolute top-2 left-2 z-20 px-2 py-0.5 rounded-[2px] border-2 border-[#0b0714] bg-[#ffd285] font-mono text-[10px] font-bold text-[#2a1945] pointer-events-none">
              drag the bulb ✦
            </span>

            <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
              <div className="p-1.5 rounded-[2px] border-2 border-[#0b0714] bg-[#140b21] shadow-[0_4px_0_#0b0714]">
                <canvas
                  ref={displayCanvasRef}
                  className="w-32 h-32 sm:w-36 sm:h-36 select-none"
                  style={{ imageRendering: 'pixelated' }}
                  aria-label={`2.5D Photometrically shaded ${selectedTemplateId} sprite`}
                />
              </div>
            </div>

            <div
              ref={gizmoContainerRef}
              tabIndex={0}
              role="slider"
              aria-label="Lamp direction. Use arrow keys to move the light around and up or down."
              aria-valuemin={0}
              aria-valuemax={360}
              aria-valuenow={Math.round(azimuth)}
              aria-valuetext={`Azimuth ${Math.round(azimuth)} degrees, Elevation ${Math.round(elevation)} degrees`}
              onKeyDown={handleKeyDown}
              onPointerDown={handlePointerDown}
              onPointerMove={handleGizmoPointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className="absolute inset-0 z-20 cursor-grab active:cursor-grabbing touch-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#ffd285]"
              title="Drag the glowing bulb to change the light source direction (or use Arrow keys)!"
            >
              <svg className="w-full h-full pointer-events-none" viewBox="0 0 280 280" aria-hidden="true">
                <defs>
                  <radialGradient id="bulb-beam" cx="0.5" cy="0.5" r="0.5">
                    <stop offset="0" stopColor="#ffd285" stopOpacity="0.5" />
                    <stop offset="1" stopColor="#ffd285" stopOpacity="0" />
                  </radialGradient>
                </defs>
                <circle cx={bulbCoords.x} cy={bulbCoords.y} r="46" fill="url(#bulb-beam)" />
                <line x1={bulbCoords.x} y1={bulbCoords.y} x2="140" y2="140" stroke="#ffd285" strokeOpacity="0.45" strokeWidth="2" strokeDasharray="3 4" />
              </svg>
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                style={{ left: `${(bulbCoords.x / 280) * 100}%`, top: `${(bulbCoords.y / 280) * 100}%` }}
              >
                <div className="relative w-9 h-9 grid place-items-center rounded-full bg-[#ffd285] border-2 border-[#0b0714] shadow-[0_0_18px_rgba(255,210,133,0.85)] transition-transform hover:scale-110">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="#2a1945" aria-hidden="true">
                    <path d="M6 1h4v2H6V1zM4 3h8v2H4V3zm-1 2h10v3H3V5zm2 3h6v2H5V8zm1 2h4v1H6v-1zm1 1h2v3H7v-3z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 font-mono text-[11px] text-[#cdbfdf]">
            <span>
              light from <span className="text-[#ffd285]">{Math.round(azimuth)}°</span>, up{' '}
              <span className="text-[#ffd285]">{Math.round(elevation)}°</span>
            </span>
            <button
              type="button"
              onClick={() => setAutoOrbit((prev) => !prev)}
              className="px-2.5 py-1 rounded-[2px] border-2 border-[#0b0714] bg-[#2f1d52] font-bold text-[#fff3e0] shadow-[0_2px_0_#0b0714] hover:text-[#ffd285] active:translate-y-px active:shadow-none transition-colors"
              title="Toggle automatic orbital rotation"
            >
              {autoOrbit ? '⏸ Orbit' : '▶ Auto-Orbit'}
            </button>
          </div>
        </ToolWindow>

        <div className="w-full max-w-[460px] grid gap-3">
          <Picker
            label="who is posing"
            value={selectedTemplateId}
            onChange={setSelectedTemplateId}
            options={STARTER_TEMPLATES.map((tmpl) => ({ value: tmpl.id, label: tmpl.name.split(' ')[1] || tmpl.name }))}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Picker
              label="look"
              value={displayMode === 'normals' ? 'normals' : 'cel'}
              onChange={setDisplayMode}
              options={[
                { value: 'cel', label: 'Painted' },
                { value: 'normals', label: 'Shape map' },
              ]}
            />
            <Picker
              label="tones"
              value={celTones ? 'stepped' : 'smooth'}
              onChange={(v) => setCelTones(v === 'stepped')}
              options={[
                { value: 'stepped', label: 'Stepped' },
                { value: 'smooth', label: 'Smooth' },
              ]}
            />
          </div>
          <Picker
            label="made of"
            value={material}
            onChange={setMaterial}
            options={[
              { value: 'matte', label: 'Matte', icon: <Dot color="#cdbfdf" /> },
              { value: 'gold', label: 'Gold', icon: <Dot color="#f0be7c" /> },
              { value: 'glass', label: 'Glass', icon: <Dot color="#a8d8f0" /> },
              { value: 'fabric', label: 'Fabric', icon: <Dot color="#e08ca6" /> },
            ]}
          />
          <Picker
            label="shadow"
            value={shadowMode}
            onChange={setShadowMode}
            options={[
              { value: 'cast', label: 'Long shadow' },
              { value: 'drop', label: 'Soft shadow' },
              { value: 'none', label: 'No shadow' },
            ]}
          />
        </div>
      </div>

      <ShowcaseNote
        kicker="light & shadow"
        title="Move the lamp, watch it change."
        body="PixiBun guesses the shape of your sprite from its outline, so a little light can wrap around it and drop a soft shadow on the floor."
        tips={['Drag the glowing bulb around the sitter.', 'Swap matte for gold or glass.', 'Peek at the shape map to see the shape it found.']}
        cta="TRY LIGHTING IN THE STUDIO"
      />
    </div>
  );
};
