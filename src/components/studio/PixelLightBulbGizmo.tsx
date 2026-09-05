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
  onLightChange?: (azimuth: number, elevation: number) => void;
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

  const [isDragging, setIsDragging] = useState(false);
  const rafIdRef = useRef<number | null>(null);
  const pendingAnglesRef = useRef<{ azimuth: number; elevation: number } | null>(null);

  const scale = zoom / 100;
  const stageWidth = canvasWidth * scale;
  const stageHeight = canvasHeight * scale;

  // Calculate sprite centroid in canvas pixels once or when canvas content changes
  const [canvasCentroid, setCanvasCentroid] = useState<GizmoPoint>(() => ({
    x: Math.round(canvasWidth / 2),
    y: Math.round(canvasHeight / 2),
  }));

  useEffect(() => {
    const mainCanvas = mainCanvasRef.current;
    if (!mainCanvas) return;
    const ctx = mainCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    try {
      const imgData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
      const centroid = computeArtworkCentroid(imgData.data, canvasWidth, canvasHeight);
      setCanvasCentroid(centroid);
    } catch {
      setCanvasCentroid({
        x: Math.round(canvasWidth / 2),
        y: Math.round(canvasHeight / 2),
      });
    }
  }, [canvasWidth, canvasHeight, mainCanvasRef]);

  // Centroid in stage coordinates
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
      stageCentroid.x,
      stageCentroid.y,
      maxRadius
    );
  }, [tools.lightAzimuth, tools.lightElevation, stageCentroid, maxRadius]);

  // Global keyboard shortcuts: Enter to apply, Escape to cancel
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
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [onCommit, onCancel]);

  // Throttled 60 FPS update loop during drag
  const flushLightChange = useCallback(() => {
    if (pendingAnglesRef.current) {
      const { azimuth, elevation } = pendingAnglesRef.current;
      setLightAzimuth(azimuth);
      setLightElevation(elevation);
      onLightChange?.(azimuth, elevation);
      pendingAnglesRef.current = null;
    }
    rafIdRef.current = null;
  }, [setLightAzimuth, setLightElevation, onLightChange]);

  const scheduleLightChange = useCallback((azimuth: number, elevation: number) => {
    pendingAnglesRef.current = { azimuth, elevation };
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

  // Update angles from client pointer event
  const updateAnglesFromPointer = useCallback((clientX: number, clientY: number) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;

    const angles = coordsToLightAngles(
      px,
      py,
      stageCentroid.x,
      stageCentroid.y,
      maxRadius
    );

    scheduleLightChange(angles.azimuth, angles.elevation);
  }, [stageCentroid, maxRadius, scheduleLightChange]);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setIsDragging(true);
    updateAnglesFromPointer(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    e.stopPropagation();
    updateAnglesFromPointer(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Pointer capture may already have been released by browser
      }
      // Ensure latest pending angle is applied
      if (pendingAnglesRef.current) {
        flushLightChange();
      }
    }
  };

  return (
    <div
      ref={containerRef}
      data-testid="pixel-light-bulb-gizmo"
      className="absolute inset-0 z-30 pointer-events-auto select-none"
      style={{ width: `${stageWidth}px`, height: `${stageHeight}px` }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Floating Viewport HUD Bar */}
      <div
        className="absolute -top-12 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 bg-[#181124]/95 border-2 border-[#f0be7c] px-3 py-1.5 rounded-[3px] shadow-[0_8px_24px_rgba(0,0,0,0.85)] font-mono text-xs pointer-events-auto"
        role="toolbar"
        aria-label="Live Light Bulb Controls"
      >
        <div className="flex items-center gap-1.5 text-[#f0be7c] font-bold">
          <span className="text-sm drop-shadow-[0_0_8px_#f0be7c]">💡</span>
          <span className="tracking-wide uppercase text-[10px]">Live Light Bulb</span>
        </div>

        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-[#261838] rounded-[2px] border border-[#f0be7c]/40 text-[#dcabdf] font-bold text-[11px]">
          <span>{tools.lightAzimuth}°</span>
          <span className="opacity-50">/</span>
          <span>{tools.lightElevation}°</span>
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
          cx={stageCentroid.x}
          cy={stageCentroid.y}
          r={maxRadius}
          fill="none"
          stroke="#f0be7c"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          opacity="0.35"
        />

        {/* Zenith Overhead Ring */}
        <circle
          cx={stageCentroid.x}
          cy={stageCentroid.y}
          r={maxRadius * 0.33}
          fill="none"
          stroke="#f0be7c"
          strokeWidth="1"
          strokeDasharray="2 3"
          opacity="0.2"
        />

        {/* Ray from Sprite Centroid to Light Bulb */}
        <line
          x1={stageCentroid.x}
          y1={stageCentroid.y}
          x2={bulbCoords.x}
          y2={bulbCoords.y}
          stroke="#f0be7c"
          strokeWidth="2"
          strokeDasharray="5 3"
          opacity="0.85"
        />

        {/* Anchor at Sprite Centroid */}
        <circle
          cx={stageCentroid.x}
          cy={stageCentroid.y}
          r="4.5"
          fill="#f0be7c"
          stroke="#181124"
          strokeWidth="1.5"
        />
        <circle
          cx={stageCentroid.x}
          cy={stageCentroid.y}
          r="1.5"
          fill="#ffffff"
        />
      </svg>

      {/* Interactive Pixel Light Bulb Token */}
      <div
        role="slider"
        tabIndex={0}
        aria-label="Directional Light Bulb. Drag to rotate light around sprite."
        aria-valuenow={tools.lightAzimuth}
        aria-valuemin={0}
        aria-valuemax={360}
        onPointerDown={handlePointerDown}
        className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing pointer-events-auto touch-none group ${
          isDragging ? 'scale-110' : 'hover:scale-105'
        } transition-transform`}
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
            opacity: isDragging ? 0.9 : 0.65,
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
