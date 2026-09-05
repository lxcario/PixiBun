'use client';

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useStudioStore } from '@/stores/studioStore';
import {
  coordsToLightAngles,
  lightAnglesToCoords,
  computeArtworkCentroid,
  GizmoPoint,
} from '@/lib/canvas/lightGizmoMath';

interface PixelLightBulbGizmoProps {
  canvasWidth: number;
  canvasHeight: number;
  zoom: number;
  mainCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  onCommit: () => void;
  onCancel: () => void;
  onLightChange?: (
    azimuth: number,
    elevation: number,
    centerX?: number,
    centerY?: number,
    brightness?: number
  ) => void;
}

export const PixelLightBulbGizmo: React.FC<PixelLightBulbGizmoProps> = ({
  canvasWidth,
  canvasHeight,
  zoom,
  mainCanvasRef,
  onCommit,
  onCancel,
  onLightChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const tools = useStudioStore((s) => s.tools);
  const setLightAzimuth = useStudioStore((s) => s.setLightAzimuth);
  const setLightElevation = useStudioStore((s) => s.setLightElevation);
  const setLightBrightness = useStudioStore((s) => s.setLightBrightness);

  const [dragTarget, setDragTarget] = useState<'none' | 'bulb' | 'center'>('none');
  const [brightness, setBrightness] = useState<number>(() => tools.lightBrightness ?? 1.15);

  const rafIdRef = useRef<number | null>(null);
  const pendingChangeRef = useRef<{
    azimuth: number;
    elevation: number;
    centerX: number;
    centerY: number;
    brightness: number;
  } | null>(null);

  const scale = zoom / 100;
  const stageWidth = canvasWidth * scale;
  const stageHeight = canvasHeight * scale;

  // Subject anchor in canvas coordinates (where artwork is located)
  const [artworkAnchor, setArtworkAnchor] = useState<GizmoPoint>(() => ({
    x: Math.round(canvasWidth / 2),
    y: Math.round(canvasHeight / 2),
  }));

  // Middle light point in canvas coordinates (freely draggable focus)
  const [canvasCentroid, setCanvasCentroid] = useState<GizmoPoint>(() => ({
    x: Math.round(canvasWidth / 2),
    y: Math.round(canvasHeight / 2),
  }));

  // Initialize from artwork centroid on mount
  useEffect(() => {
    const mainCanvas = mainCanvasRef.current;
    if (!mainCanvas) return;
    const ctx = mainCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    try {
      const imgData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
      const centroid = computeArtworkCentroid(imgData.data, canvasWidth, canvasHeight);
      setArtworkAnchor(centroid);
      setCanvasCentroid(centroid);
    } catch {
      const def = {
        x: Math.round(canvasWidth / 2),
        y: Math.round(canvasHeight / 2),
      };
      setArtworkAnchor(def);
      setCanvasCentroid(def);
    }
  }, [canvasWidth, canvasHeight, mainCanvasRef]);

  // Subject anchor in stage coordinates
  const stageAnchor = useMemo<GizmoPoint>(() => ({
    x: artworkAnchor.x * scale,
    y: artworkAnchor.y * scale,
  }), [artworkAnchor, scale]);

  // Middle light point in stage coordinates
  const stageCentroid = useMemo<GizmoPoint>(() => ({
    x: canvasCentroid.x * scale,
    y: canvasCentroid.y * scale,
  }), [canvasCentroid, scale]);

  // Radius representing horizon grazing (0° elevation)
  const maxRadius = useMemo(() => {
    return Math.max(40, Math.min(stageWidth, stageHeight) * 0.44);
  }, [stageWidth, stageHeight]);

  // Current bulb coordinates on stage
  const bulbCoords = useMemo(() => {
    return lightAnglesToCoords(
      tools.lightAzimuth,
      tools.lightElevation,
      stageAnchor.x,
      stageAnchor.y,
      maxRadius
    );
  }, [tools.lightAzimuth, tools.lightElevation, stageAnchor, maxRadius]);

  // Throttled 60 FPS update loop during drag
  const flushLightChange = useCallback(() => {
    if (pendingChangeRef.current) {
      const { azimuth, elevation, centerX, centerY, brightness: b } = pendingChangeRef.current;
      setLightAzimuth(azimuth);
      setLightElevation(elevation);
      setLightBrightness(b);
      onLightChange?.(azimuth, elevation, centerX, centerY, b);
      pendingChangeRef.current = null;
    }
    rafIdRef.current = null;
  }, [setLightAzimuth, setLightElevation, setLightBrightness, onLightChange]);

  const scheduleLightChange = useCallback((
    azimuth: number,
    elevation: number,
    centerX: number,
    centerY: number,
    newBrightness: number
  ) => {
    pendingChangeRef.current = {
      azimuth,
      elevation,
      centerX,
      centerY,
      brightness: newBrightness,
    };
    if (rafIdRef.current === null) {
      rafIdRef.current = requestAnimationFrame(flushLightChange);
    }
  }, [flushLightChange]);

  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  const updateStrength = useCallback((val: number) => {
    const clamped = Math.max(0.3, Math.min(2.5, Math.round(val * 100) / 100));
    setBrightness(clamped);
    scheduleLightChange(tools.lightAzimuth, tools.lightElevation, canvasCentroid.x, canvasCentroid.y, clamped);
  }, [tools.lightAzimuth, tools.lightElevation, canvasCentroid, scheduleLightChange]);

  const adjustStrength = useCallback((delta: number) => {
    setBrightness((prev) => {
      const next = Math.max(0.3, Math.min(2.5, Math.round((prev + delta) * 100) / 100));
      scheduleLightChange(tools.lightAzimuth, tools.lightElevation, canvasCentroid.x, canvasCentroid.y, next);
      return next;
    });
  }, [tools.lightAzimuth, tools.lightElevation, canvasCentroid, scheduleLightChange]);

  // Global keyboard shortcuts: Enter to apply, Escape to cancel, [-]/[+] to adjust strength
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        onCommit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onCancel();
      } else if (e.key === '[' || e.key === '-') {
        e.preventDefault();
        e.stopPropagation();
        adjustStrength(-0.15);
      } else if (e.key === ']' || e.key === '+' || e.key === '=') {
        e.preventDefault();
        e.stopPropagation();
        adjustStrength(+0.15);
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [onCommit, onCancel, adjustStrength]);

  // Update angles from client pointer event
  const updateAnglesFromPointer = useCallback((clientX: number, clientY: number) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const px = Math.max(0, Math.min(stageWidth, clientX - rect.left));
    const py = Math.max(0, Math.min(stageHeight, clientY - rect.top));

    const angles = coordsToLightAngles(
      px,
      py,
      stageAnchor.x,
      stageAnchor.y,
      maxRadius
    );

    const newCanvasX = Math.round(px / scale);
    const newCanvasY = Math.round(py / scale);
    setCanvasCentroid({ x: newCanvasX, y: newCanvasY });

    scheduleLightChange(angles.azimuth, angles.elevation, newCanvasX, newCanvasY, brightness);
  }, [stageWidth, stageHeight, stageAnchor, maxRadius, scale, brightness, scheduleLightChange]);

  // Update center position from client pointer event
  const updateCenterFromPointer = useCallback((clientX: number, clientY: number) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;

    const clampedPx = Math.max(0, Math.min(stageWidth, px));
    const clampedPy = Math.max(0, Math.min(stageHeight, py));
    const newCanvasX = Math.round(clampedPx / scale);
    const newCanvasY = Math.round(clampedPy / scale);

    const angles = coordsToLightAngles(
      clampedPx,
      clampedPy,
      stageAnchor.x,
      stageAnchor.y,
      maxRadius
    );

    setCanvasCentroid({ x: newCanvasX, y: newCanvasY });
    scheduleLightChange(angles.azimuth, angles.elevation, newCanvasX, newCanvasY, brightness);
  }, [stageWidth, stageHeight, scale, stageAnchor, maxRadius, brightness, scheduleLightChange]);

  const handleBulbPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragTarget('bulb');
    updateAnglesFromPointer(e.clientX, e.clientY);
  };

  const handleCenterPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragTarget('center');
    updateCenterFromPointer(e.clientX, e.clientY);
  };

  const handleContainerPointerDown = (e: React.PointerEvent) => {
    // Ignore clicks on HUD buttons or inputs
    if ((e.target as HTMLElement).closest('button, input, [role="toolbar"]')) return;

    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    // If pointer is near center reticle (< 24px), drag center
    const distCenter = Math.hypot(px - stageCentroid.x, py - stageCentroid.y);
    if (distCenter <= 24) {
      e.preventDefault();
      e.stopPropagation();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      setDragTarget('center');
      updateCenterFromPointer(e.clientX, e.clientY);
      return;
    }

    // Otherwise, drag/aim light bulb towards pointer position
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragTarget('bulb');
    updateAnglesFromPointer(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (dragTarget === 'bulb') {
      e.preventDefault();
      e.stopPropagation();
      updateAnglesFromPointer(e.clientX, e.clientY);
    } else if (dragTarget === 'center') {
      e.preventDefault();
      e.stopPropagation();
      updateCenterFromPointer(e.clientX, e.clientY);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragTarget !== 'none') {
      e.preventDefault();
      e.stopPropagation();
      setDragTarget('none');
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Pointer capture may already have been released by browser
      }
      if (pendingChangeRef.current) {
        flushLightChange();
      }
    }
  };

  const handleResetCenter = () => {
    const mainCanvas = mainCanvasRef.current;
    if (!mainCanvas) return;
    const ctx = mainCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    try {
      const imgData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
      const centroid = computeArtworkCentroid(imgData.data, canvasWidth, canvasHeight);
      setArtworkAnchor(centroid);
      setCanvasCentroid(centroid);
      scheduleLightChange(tools.lightAzimuth, tools.lightElevation, centroid.x, centroid.y, brightness);
    } catch {
      const def = { x: Math.round(canvasWidth / 2), y: Math.round(canvasHeight / 2) };
      setArtworkAnchor(def);
      setCanvasCentroid(def);
      scheduleLightChange(tools.lightAzimuth, tools.lightElevation, def.x, def.y, brightness);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    // Allow adjusting strength with mouse wheel scroll over gizmo
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY < 0 ? 0.10 : -0.10;
    adjustStrength(delta);
  };

  return (
    <div
      ref={containerRef}
      data-testid="pixel-light-bulb-gizmo"
      className="absolute inset-0 z-30 pointer-events-auto select-none"
      style={{ width: `${stageWidth}px`, height: `${stageHeight}px` }}
      onPointerDown={handleContainerPointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
    >
      {/* Floating Viewport HUD Bar */}
      <div
        className="absolute -top-12 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-[#181124]/95 border-2 border-[#f0be7c] px-3 py-1.5 rounded-[3px] shadow-[0_8px_24px_rgba(0,0,0,0.85)] font-mono text-xs pointer-events-auto whitespace-nowrap"
        role="toolbar"
        aria-label="Live Light Bulb Controls"
      >
        <div className="flex items-center gap-1 text-[#f0be7c] font-bold">
          <span className="text-sm drop-shadow-[0_0_8px_#f0be7c]">💡</span>
          <span className="tracking-wide uppercase text-[10px]">Live Light Bulb</span>
        </div>

        {/* Angle Readout */}
        <div
          title="Light Azimuth & Elevation"
          className="flex items-center gap-1 px-1.5 py-0.5 bg-[#261838] rounded-[2px] border border-[#f0be7c]/40 text-[#dcabdf] font-bold text-[11px]"
        >
          <span>{tools.lightAzimuth}°</span>
          <span className="opacity-50">/</span>
          <span>{tools.lightElevation}°</span>
        </div>

        {/* Middle Light Center Readout */}
        <div
          title="Current Middle Light Point (Drag center reticle to move focus)"
          className="flex items-center gap-1 px-1.5 py-0.5 bg-[#261838] rounded-[2px] border border-[#f0be7c]/40 text-[#f0be7c] font-bold text-[10px]"
        >
          <span className="opacity-75">📍</span>
          <span>({Math.round(canvasCentroid.x)}, {Math.round(canvasCentroid.y)})</span>
        </div>

        {/* Recenter Button */}
        <button
          type="button"
          onClick={handleResetCenter}
          title="Reset middle light point to artwork centroid"
          className="px-1.5 py-0.5 bg-[#261838] text-[#dcabdf] border border-[#f0be7c]/30 rounded-[2px] hover:bg-[#382352] active:scale-95 transition-transform cursor-pointer flex items-center gap-1 text-[10px]"
        >
          <span>↺ Recenter</span>
        </button>

        <div className="w-px h-3.5 bg-[#f0be7c]/30 mx-0.5" />

        {/* Light Strength / Intensity Steppers & Slider */}
        <div
          title="Light Strength / Brightness (Click - / + or use mouse wheel)"
          className="flex items-center gap-1.5 px-2 py-0.5 bg-[#261838] rounded-[2px] border border-[#f0be7c]/40 text-[#f0be7c] font-bold text-[11px]"
        >
          <span className="text-xs">☀️</span>
          <span className="text-[10px] text-[#dcabdf] uppercase">Strength</span>
          <button
            type="button"
            data-testid="pixel-light-strength-dec"
            onClick={(e) => {
              e.stopPropagation();
              adjustStrength(-0.15);
            }}
            className="w-4 h-4 flex items-center justify-center bg-[#181124] text-[#f0be7c] rounded-[2px] hover:bg-[#382352] active:scale-95 cursor-pointer font-bold text-xs border border-[#f0be7c]/30"
            title="Decrease light strength (- / [)"
            aria-label="Decrease light strength"
          >
            -
          </button>
          <span
            data-testid="pixel-light-strength-val"
            className="min-w-[34px] text-center font-mono text-[11px] text-[#ffe082]"
          >
            {Math.round(brightness * 100)}%
          </span>
          <button
            type="button"
            data-testid="pixel-light-strength-inc"
            onClick={(e) => {
              e.stopPropagation();
              adjustStrength(+0.15);
            }}
            className="w-4 h-4 flex items-center justify-center bg-[#181124] text-[#f0be7c] rounded-[2px] hover:bg-[#382352] active:scale-95 cursor-pointer font-bold text-xs border border-[#f0be7c]/30"
            title="Increase light strength (+ / ])"
            aria-label="Increase light strength"
          >
            +
          </button>
          <input
            type="range"
            aria-label="Light Strength Slider"
            min={0.3}
            max={2.5}
            step={0.05}
            value={brightness}
            onChange={(e) => updateStrength(parseFloat(e.target.value))}
            title={`Strength: ${Math.round(brightness * 100)}%`}
            className="w-14 h-1.5 accent-[#f0be7c] bg-[#181124] rounded cursor-pointer ml-0.5"
          />
        </div>

        <div className="w-px h-3.5 bg-[#f0be7c]/30 mx-0.5" />

        <button
          type="button"
          onClick={onCommit}
          title="Commit and bake lighting into layer (Enter)"
          className="px-2.5 py-1 bg-[#f0be7c] text-[#140d1f] font-bold rounded-[2px] hover:bg-[#ffe082] active:scale-95 transition-transform cursor-pointer flex items-center gap-1 text-[11px] shadow-xs"
        >
          <span>✔ Apply</span>
          <span className="text-[9px] opacity-75 font-normal">(Enter)</span>
        </button>

        <button
          type="button"
          onClick={onCancel}
          title="Discard preview and restore layer (Esc)"
          className="px-2 py-1 bg-[#261838] text-[#dcabdf] border border-[#f0be7c]/40 font-bold rounded-[2px] hover:bg-[#382352] active:scale-95 transition-transform cursor-pointer flex items-center gap-1 text-[11px]"
        >
          <span>✖ Cancel</span>
          <span className="text-[9px] opacity-75 font-normal">(Esc)</span>
        </button>
      </div>

      {/* SVG Canvas for Rays and Guides */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        width={stageWidth}
        height={stageHeight}
      >
        <defs>
          <filter id="bulb-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Horizon Range Guide Ring */}
        <circle
          cx={stageAnchor.x}
          cy={stageAnchor.y}
          r={maxRadius}
          fill="none"
          stroke="#f0be7c"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          opacity="0.35"
        />

        {/* Zenith Overhead Ring */}
        <circle
          cx={stageAnchor.x}
          cy={stageAnchor.y}
          r={maxRadius * 0.33}
          fill="none"
          stroke="#f0be7c"
          strokeWidth="1"
          strokeDasharray="2 3"
          opacity="0.2"
        />

        {/* Ray from Artwork Subject Anchor to Light Bulb */}
        <line
          x1={stageAnchor.x}
          y1={stageAnchor.y}
          x2={bulbCoords.x}
          y2={bulbCoords.y}
          stroke="#f0be7c"
          strokeWidth="2"
          strokeDasharray="5 3"
          opacity="0.85"
        />
      </svg>

      {/* Interactive Draggable Middle Light Point Reticle */}
      <div
        role="slider"
        tabIndex={0}
        data-testid="pixel-light-center-handle"
        aria-label="Middle Light Point. Drag to reposition light focus on canvas."
        aria-valuenow={Math.round(canvasCentroid.x)}
        onPointerDown={handleCenterPointerDown}
        className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing pointer-events-auto touch-none group ${
          dragTarget === 'center' ? 'scale-125' : 'hover:scale-115'
        } transition-transform z-35`}
        style={{
          left: `${stageCentroid.x}px`,
          top: `${stageCentroid.y}px`,
        }}
      >
        {/* Retro 16-bit Pixel Art Center Reticle */}
        <div className="relative flex items-center justify-center w-7 h-7">
          {/* Pulsing focal aura */}
          <div
            className={`absolute inset-0 rounded-full border-2 border-[#f0be7c] ${
              dragTarget === 'center' ? 'opacity-90 scale-110 shadow-[0_0_12px_#f0be7c]' : 'opacity-40 animate-pulse'
            } pointer-events-none transition-all`}
            aria-hidden="true"
          />
          {/* Reticle Disk */}
          <div className="w-5 h-5 rounded-full bg-[#181124]/90 border-2 border-[#f0be7c] shadow-[0_0_8px_rgba(240,190,124,0.7)] flex items-center justify-center">
            {/* 4 Directional Crosshair Ticks */}
            <div className="absolute -top-1 w-0.5 h-1.5 bg-[#f0be7c]" />
            <div className="absolute -bottom-1 w-0.5 h-1.5 bg-[#f0be7c]" />
            <div className="absolute -left-1 h-0.5 w-1.5 bg-[#f0be7c]" />
            <div className="absolute -right-1 h-0.5 w-1.5 bg-[#f0be7c]" />
            {/* Center Core Bead */}
            <div className="w-2 h-2 rounded-full bg-[#f0be7c] flex items-center justify-center">
              <div className="w-0.5 h-0.5 rounded-full bg-white" />
            </div>
          </div>
        </div>

        {/* Center Coordinate Tooltip */}
        <div className="absolute left-1/2 -top-5 -translate-x-1/2 px-1.5 py-0.5 bg-[#181124] text-[#f0be7c] text-[9px] font-mono font-bold rounded-[2px] border border-[#f0be7c]/60 shadow-xs whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity">
          Light Center ({Math.round(canvasCentroid.x)}, {Math.round(canvasCentroid.y)})
        </div>
      </div>

      {/* Interactive Pixel Light Bulb Token */}
      <div
        role="slider"
        tabIndex={0}
        data-testid="pixel-light-bulb-handle"
        aria-label="Directional Light Bulb. Drag to rotate light around sprite."
        aria-valuenow={tools.lightAzimuth}
        aria-valuemin={0}
        aria-valuemax={360}
        onPointerDown={handleBulbPointerDown}
        className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing pointer-events-auto touch-none group ${
          dragTarget === 'bulb' ? 'scale-110' : 'hover:scale-105'
        } transition-transform z-40`}
        style={{
          left: `${bulbCoords.x}px`,
          top: `${bulbCoords.y}px`,
        }}
      >
        {/* Glowing Halo */}
        <div
          className="absolute -inset-4 rounded-full pointer-events-none transition-opacity duration-150 animate-pulse"
          style={{
            background: 'radial-gradient(circle, rgba(250,204,21,0.5) 0%, rgba(240,190,124,0.2) 50%, rgba(0,0,0,0) 75%)',
            opacity: dragTarget === 'bulb' ? 0.9 : 0.65,
          }}
          aria-hidden="true"
        />

        {/* Retro 16-bit Pixel Art Light Bulb SVG */}
        <svg
          width="32"
          height="36"
          viewBox="0 0 16 18"
          fill="none"
          className="relative drop-shadow-[0_4px_12px_rgba(250,204,21,0.7)]"
        >
          {/* Glass Dome Outline */}
          <rect x="5" y="1" width="6" height="1" fill="#181124" />
          <rect x="3" y="2" width="2" height="1" fill="#181124" />
          <rect x="11" y="2" width="2" height="1" fill="#181124" />
          <rect x="2" y="3" width="1" height="5" fill="#181124" />
          <rect x="13" y="3" width="1" height="5" fill="#181124" />
          <rect x="3" y="8" width="1" height="2" fill="#181124" />
          <rect x="12" y="8" width="1" height="2" fill="#181124" />
          <rect x="4" y="10" width="1" height="2" fill="#181124" />
          <rect x="11" y="10" width="1" height="2" fill="#181124" />

          {/* Glass Dome Fill (Golden Warmth) */}
          <rect x="5" y="2" width="6" height="1" fill="#fff9db" />
          <rect x="3" y="3" width="10" height="5" fill="#fef08a" />
          <rect x="4" y="8" width="8" height="2" fill="#fde047" />
          <rect x="5" y="10" width="6" height="2" fill="#facc15" />

          {/* Highlight Glint */}
          <rect x="4" y="3" width="2" height="3" fill="#ffffff" />
          <rect x="6" y="3" width="2" height="1" fill="#ffffff" />

          {/* Glowing Orange Filament */}
          <rect x="7" y="6" width="2" height="2" fill="#f97316" />
          <rect x="6" y="8" width="1" height="1" fill="#ea580c" />
          <rect x="9" y="8" width="1" height="1" fill="#ea580c" />

          {/* Screw Base Socket */}
          <rect x="5" y="12" width="6" height="1" fill="#181124" />
          <rect x="5" y="13" width="6" height="1" fill="#94a3b8" />
          <rect x="5" y="14" width="6" height="1" fill="#475569" />
          <rect x="6" y="15" width="4" height="1" fill="#94a3b8" />
          <rect x="6" y="16" width="4" height="1" fill="#181124" />
          <rect x="7" y="16" width="2" height="1" fill="#eab308" />
        </svg>

        {/* Angle Badge Tooltip */}
        <div className="absolute left-1/2 -bottom-5 -translate-x-1/2 px-1.5 py-0.5 bg-[#181124] text-[#f0be7c] text-[9px] font-mono font-bold rounded-[2px] border border-[#f0be7c]/60 shadow-xs whitespace-nowrap pointer-events-none">
          {tools.lightAzimuth}°
        </div>
      </div>
    </div>
  );
};
