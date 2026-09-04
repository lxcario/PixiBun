'use client';

import React, { useRef, useState, useCallback } from 'react';
import { useStudioStore } from '@/stores/studioStore';
import {
  coordsToLightAngles,
  lightAnglesToCoords,
} from '@/lib/canvas/lightGizmoMath';
import { PixelIcon } from '@/components/ui/PixelIcon';

interface LightGizmoProps {
  size?: number; // Gizmo diameter in px (default: 130)
  className?: string;
  showLabels?: boolean;
}

/**
 * Direct-Manipulation Light Gizmo (Shneiderman 1983).
 * Provides an interactive 2.5D dome controller mapping pointer drag coordinates
 * to light azimuth (0°-360°) and elevation (0°-90°).
 */
export const LightGizmoOverlay: React.FC<LightGizmoProps> = ({
  size = 130,
  className = '',
  showLabels = true,
}) => {
  const lightAzimuth = useStudioStore((s) => s.tools.lightAzimuth);
  const lightElevation = useStudioStore((s) => s.tools.lightElevation);
  const setLightAzimuth = useStudioStore((s) => s.setLightAzimuth);
  const setLightElevation = useStudioStore((s) => s.setLightElevation);

  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const radius = size / 2;
  const padding = 12;
  const maxRadius = radius - padding;
  const cx = radius;
  const cy = radius;

  // Handle position in planar dome
  const handle = lightAnglesToCoords(lightAzimuth, lightElevation, cx, cy, maxRadius);

  const updateAnglesFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const hx = clientX - rect.left;
      const hy = clientY - rect.top;

      const { azimuth, elevation } = coordsToLightAngles(hx, hy, cx, cy, maxRadius);
      setLightAzimuth(azimuth);
      setLightElevation(elevation);
    },
    [cx, cy, maxRadius, setLightAzimuth, setLightElevation]
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsDragging(true);
    updateAnglesFromPointer(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    updateAnglesFromPointer(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Safe fallback if pointer capture was already released
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    let deltaAz = 0;
    let deltaEl = 0;
    if (e.key === 'ArrowLeft') deltaAz = -5;
    else if (e.key === 'ArrowRight') deltaAz = 5;
    else if (e.key === 'ArrowUp') deltaEl = 5;
    else if (e.key === 'ArrowDown') deltaEl = -5;
    else return;

    e.preventDefault();
    setLightAzimuth(((lightAzimuth + deltaAz) % 360 + 360) % 360);
    setLightElevation(Math.max(0, Math.min(90, lightElevation + deltaEl)));
  };

  return (
    <div
      className={`flex flex-col items-center gap-1.5 select-none ${className}`}
      aria-label="Direct manipulation light gizmo"
    >
      <div
        ref={containerRef}
        tabIndex={0}
        role="slider"
        aria-label="Light direction and elevation controller"
        aria-valuenow={lightAzimuth}
        aria-valuemin={0}
        aria-valuemax={360}
        aria-valuetext={`Azimuth ${lightAzimuth} degrees, Elevation ${lightElevation} degrees`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onKeyDown={handleKeyDown}
        className="relative cursor-crosshair touch-none outline-none focus-visible:ring-2 focus-visible:ring-[#f0be7c] rounded-full"
        style={{ width: size, height: size }}
      >
        <svg
          width={size}
          height={size}
          className="overflow-visible pointer-events-none"
        >
          {/* Outer Horizon Ring (0° Elevation) */}
          <circle
            cx={cx}
            cy={cy}
            r={maxRadius}
            className="fill-[#1b1226] stroke-[#3a2e4c]"
            strokeWidth="1.5"
          />

          {/* 30° Elevation Guide Ring */}
          <circle
            cx={cx}
            cy={cy}
            r={maxRadius * (2 / 3)}
            className="fill-none stroke-[#3a2e4c]/50"
            strokeWidth="1"
            strokeDasharray="2,2"
          />

          {/* 60° Elevation Guide Ring */}
          <circle
            cx={cx}
            cy={cy}
            r={maxRadius * (1 / 3)}
            className="fill-none stroke-[#3a2e4c]/50"
            strokeWidth="1"
            strokeDasharray="2,2"
          />

          {/* Center Zenith Point (90° Elevation) */}
          <circle
            cx={cx}
            cy={cy}
            r={2}
            className="fill-[#f0be7c]/40"
          />

          {/* Compass Direction Ticks */}
          <line x1={cx} y1={cy - maxRadius} x2={cx} y2={cy - maxRadius + 4} stroke="#f0be7c" strokeWidth="1.5" />
          <line x1={cx + maxRadius - 4} y1={cy} x2={cx + maxRadius} y2={cy} stroke="#dcabdf" strokeWidth="1.5" />
          <line x1={cx} y1={cy + maxRadius - 4} x2={cx} y2={cy + maxRadius} stroke="#dcabdf" strokeWidth="1.5" />
          <line x1={cx - maxRadius} y1={cy} x2={cx - maxRadius + 4} y2={cy} stroke="#dcabdf" strokeWidth="1.5" />

          {/* Radial Light Ray Vector to Handle */}
          <line
            x1={cx}
            y1={cy}
            x2={handle.x}
            y2={handle.y}
            stroke="#f0be7c"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Draggable Sun Handle */}
          <circle
            cx={handle.x}
            cy={handle.y}
            r={8}
            className="fill-[#f0be7c] stroke-[#140d1f] shadow-md transition-transform"
            strokeWidth="2"
          />
          <circle
            cx={handle.x}
            cy={handle.y}
            r={3}
            className="fill-[#140d1f]"
          />
        </svg>

        {/* Floating Sun Badge inside handle */}
        <div
          className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-1/2"
          style={{ left: handle.x, top: handle.y }}
        >
          <div className="w-2 h-2 rounded-full animate-ping bg-[#f0be7c]/50" />
        </div>
      </div>

      {showLabels && (
        <div className="flex items-center justify-between w-full px-2 text-[10px] font-mono text-[#f0be7c] font-bold">
          <span className="flex items-center gap-1">
            <PixelIcon name="sun" size={10} />
            <span>Az: {lightAzimuth}°</span>
          </span>
          <span className="text-[#dcabdf]">El: {lightElevation}°</span>
        </div>
      )}
    </div>
  );
};
