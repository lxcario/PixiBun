'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { PixelIcon } from '@/components/ui/PixelIcon';
import {
  computeDirectionalBevelNormal,
  encodeNormalRGB,
} from '@/lib/art/normalSculptor';

export const NormalSculptorSection: React.FC = () => {
  const {
    tools,
    setActiveTool,
    setChiselAzimuth,
    setChiselIncline,
    setChiselWidth,
    setChiselRidgeMode,
    setRivetRadius,
    setRivetFlatten,
    setRivetInvert,
    setNormalBlendMode,
    addLayer,
    toggleNormalMapPreview,
    showNormalMapPreview,
  } = useStudioStore();

  const gizmoCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDraggingGizmoRef = useRef<boolean>(false);

  const isChiselActive = tools.activeTool === 'normal-chisel';
  const isRivetActive = tools.activeTool === 'rivet-stamp';

  // Current directional normal vector
  const bevelNormal = computeDirectionalBevelNormal(
    tools.chiselAzimuth,
    tools.chiselIncline,
    true
  );
  const bevelRGB = encodeNormalRGB(bevelNormal[0], bevelNormal[1], bevelNormal[2], true);

  // Render 3D Normal Sphere Gizmo
  const renderGizmo = useCallback(() => {
    const canvas = gizmoCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = width / 2 - 4;

    ctx.clearRect(0, 0, width, height);

    // Draw background circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#140d1f';
    ctx.fill();
    ctx.strokeStyle = '#352248';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Render 3D Normal Sphere shading
    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = (x - centerX) / radius;
        const dy = (y - centerY) / radius;
        const distSq = dx * dx + dy * dy;
        if (distSq > 1.0) continue;

        const dz = Math.sqrt(Math.max(0, 1.0 - distSq));
        // Normal sphere vector
        const nx = dx;
        const ny = -dy; // OpenGL up
        const nz = dz;

        // Normal map RGB color
        const r = Math.round((nx + 1) * 127.5);
        const g = Math.round((ny + 1) * 127.5);
        const b = Math.round((nz + 1) * 127.5);

        const pIdx = (y * width + x) * 4;
        data[pIdx] = r;
        data[pIdx + 1] = g;
        data[pIdx + 2] = b;
        data[pIdx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);

    // Draw compass grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - radius);
    ctx.lineTo(centerX, centerY + radius);
    ctx.moveTo(centerX - radius, centerY);
    ctx.lineTo(centerX + radius, centerY);
    ctx.stroke();

    // Draw vector indicator handle
    const alphaRad = (tools.chiselAzimuth * Math.PI) / 180;
    const phiRad = (tools.chiselIncline * Math.PI) / 180;
    const sinPhi = Math.sin(phiRad);

    const handleX = centerX + Math.sin(alphaRad) * sinPhi * radius;
    const handleY = centerY - Math.cos(alphaRad) * sinPhi * radius;

    // Vector line from center to handle
    ctx.strokeStyle = '#f0be7c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(handleX, handleY);
    ctx.stroke();

    // Handle pin
    ctx.fillStyle = '#f0be7c';
    ctx.beginPath();
    ctx.arc(handleX, handleY, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#140d1f';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }, [tools.chiselAzimuth, tools.chiselIncline]);

  useEffect(() => {
    renderGizmo();
  }, [renderGizmo]);

  // Handle dragging the 3D Sphere Gizmo
  const handleGizmoPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = gizmoCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = canvas.width / 2 - 4;

    const dx = (x - centerX) / radius;
    const dy = (y - centerY) / radius;

    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(1.0, dist);

    // Calculate Azimuth (0° North/Up, 90° East/Right)
    let azDeg = (Math.atan2(dx, -dy) * 180) / Math.PI;
    if (azDeg < 0) azDeg += 360;

    // Calculate Incline from flat plane (0° flat, 90° steep vertical cliff)
    const incDeg = Math.round(Math.asin(clampedDist) * (180 / Math.PI));

    setChiselAzimuth(Math.round(azDeg));
    setChiselIncline(Math.max(15, Math.min(75, incDeg)));
  };

  const handleCreateNormalLayer = () => {
    addLayer('Normal Facets', 'normal');
  };

  return (
    <div className="flex flex-col gap-2.5 p-2 bg-[var(--desk-surface)] rounded-[2px] border-2 border-[var(--desk-border)] shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between pb-1 border-b border-[var(--desk-border)]">
        <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-[#f0be7c]">
          <PixelIcon name="chisel" size={14} />
          <span>2.5D Normal Sculptor</span>
        </div>
        <button
          onClick={toggleNormalMapPreview}
          className={`text-[9px] font-mono px-1.5 py-0.5 rounded-[2px] border transition-colors cursor-pointer ${
            showNormalMapPreview
              ? 'bg-[#7ce0be] text-[#140d1f] border-[#4da88c] font-bold'
              : 'bg-[var(--desk-surface-raised)] text-[var(--text-body)] border-[var(--desk-border)] hover:text-[#7ce0be]'
          }`}
          title="Toggle viewport normal map preview mode"
        >
          {showNormalMapPreview ? 'Preview: ON' : 'Preview: OFF'}
        </button>
      </div>

      {/* Tool Selector Buttons */}
      <div className="grid grid-cols-2 gap-1.5">
        <button
          onClick={() => setActiveTool('normal-chisel')}
          className={`flex items-center justify-center gap-1 py-1.5 px-2 text-[11px] font-mono font-bold rounded-[2px] border transition-all cursor-pointer ${
            isChiselActive
              ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120] shadow-[0_1px_0_#8c5120]'
              : 'bg-[var(--desk-surface-raised)] text-[var(--text-body)] border-[var(--desk-border)] hover:text-[#f0be7c]'
          }`}
        >
          <PixelIcon name="chisel" size={13} />
          <span>Normal Chisel</span>
        </button>

        <button
          onClick={() => setActiveTool('rivet-stamp')}
          className={`flex items-center justify-center gap-1 py-1.5 px-2 text-[11px] font-mono font-bold rounded-[2px] border transition-all cursor-pointer ${
            isRivetActive
              ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120] shadow-[0_1px_0_#8c5120]'
              : 'bg-[var(--desk-surface-raised)] text-[var(--text-body)] border-[var(--desk-border)] hover:text-[#f0be7c]'
          }`}
        >
          <PixelIcon name="rivet" size={13} />
          <span>Rivet Stamp</span>
        </button>
      </div>

      {/* Normal Chisel Settings */}
      {isChiselActive && (
        <div className="flex flex-col gap-2 pt-1">
          {/* 3D Sphere Gizmo & Readout */}
          <div className="flex items-center gap-3 bg-[var(--desk-surface-raised)] p-2 rounded-[2px] border border-[var(--desk-border)]">
            <canvas
              ref={gizmoCanvasRef}
              width={80}
              height={80}
              onPointerDown={(e) => {
                isDraggingGizmoRef.current = true;
                handleGizmoPointer(e);
              }}
              onPointerMove={(e) => {
                if (isDraggingGizmoRef.current) handleGizmoPointer(e);
              }}
              onPointerUp={() => {
                isDraggingGizmoRef.current = false;
              }}
              className="w-20 h-20 rounded-full cursor-crosshair shadow-inner"
              title="Drag on 3D sphere to adjust chisel slope angle & direction"
            />

            <div className="flex-1 flex flex-col gap-1 text-[10px] font-mono">
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)]">Azimuth:</span>
                <span className="font-bold text-[#f0be7c]">{tools.chiselAzimuth}°</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)]">Incline:</span>
                <span className="font-bold text-[#f0be7c]">{tools.chiselIncline}°</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)]">RGB:</span>
                <span
                  className="font-bold px-1 rounded-[1px] text-[#140d1f]"
                  style={{ backgroundColor: `rgb(${bevelRGB.join(',')})` }}
                >
                  {bevelRGB.join(', ')}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Compass Azimuth Presets */}
          <div className="flex items-center justify-between text-[9px] font-mono text-[var(--text-muted)] px-0.5">
            <span>PRESETS:</span>
            <div className="flex gap-1">
              {[
                { label: 'NW', az: 315 },
                { label: 'N', az: 0 },
                { label: 'NE', az: 45 },
                { label: 'E', az: 90 },
                { label: 'SE', az: 135 },
                { label: 'S', az: 180 },
                { label: 'W', az: 270 },
              ].map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => setChiselAzimuth(preset.az)}
                  className={`px-1 py-0.5 rounded-[1px] border cursor-pointer ${
                    tools.chiselAzimuth === preset.az
                      ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120] font-bold'
                      : 'bg-[var(--desk-surface-raised)] border-[var(--desk-border)] hover:text-[#f0be7c]'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Chisel Width Slider */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-[var(--text-muted)]">Chisel Width</span>
              <span className="font-bold text-[var(--text-heading)]">{tools.chiselWidth}px</span>
            </div>
            <input
              type="range"
              min={1}
              max={32}
              value={tools.chiselWidth}
              onChange={(e) => setChiselWidth(parseInt(e.target.value, 10))}
              className="w-full accent-[#f0be7c] cursor-pointer h-1.5"
            />
          </div>

          {/* V-Groove Ridge Mode */}
          <label className="flex items-center justify-between text-[10px] font-mono cursor-pointer py-1 px-1 bg-[var(--desk-surface-raised)] rounded-[2px] border border-[var(--desk-border)]">
            <span className="text-[var(--text-body)]">Dual-Flank V-Groove</span>
            <input
              type="checkbox"
              checked={tools.chiselRidgeMode}
              onChange={(e) => setChiselRidgeMode(e.target.checked)}
              className="accent-[#f0be7c] cursor-pointer"
            />
          </label>

          {/* Blending Mode Selector */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-mono text-[var(--text-muted)]">Normal Composition</span>
            <div className="grid grid-cols-3 gap-1 text-[10px] font-mono">
              {(['rnm', 'udn', 'overwrite'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setNormalBlendMode(mode)}
                  className={`py-1 text-center rounded-[2px] border cursor-pointer transition-colors ${
                    tools.normalBlendMode === mode
                      ? 'bg-[#dcabdf] text-[#140d1f] border-[#8e6093] font-bold shadow-xs'
                      : 'bg-[var(--desk-surface-raised)] text-[var(--text-body)] border-[var(--desk-border)] hover:text-[#dcabdf]'
                  }`}
                  title={
                    mode === 'rnm'
                      ? 'Reoriented Normal Mapping (Barré-Brisebois & Hill 2012)'
                      : mode === 'udn'
                      ? 'Unreal Engine UDN Blend'
                      : 'Direct Overwrite'
                  }
                >
                  {mode.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Rivet Stamp Settings */}
      {isRivetActive && (
        <div className="flex flex-col gap-2 pt-1">
          {/* Rivet Radius Slider */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-[var(--text-muted)]">Rivet Radius</span>
              <span className="font-bold text-[var(--text-heading)]">{tools.rivetRadius}px</span>
            </div>
            <input
              type="range"
              min={1}
              max={32}
              value={tools.rivetRadius}
              onChange={(e) => setRivetRadius(parseInt(e.target.value, 10))}
              className="w-full accent-[#f0be7c] cursor-pointer h-1.5"
            />
          </div>

          {/* Flattening Factor Slider */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-[var(--text-muted)]">Flatten Factor (h)</span>
              <span className="font-bold text-[var(--text-heading)]">
                {Math.round(tools.rivetFlatten * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              value={Math.round(tools.rivetFlatten * 100)}
              onChange={(e) => setRivetFlatten(parseInt(e.target.value, 10) / 100)}
              className="w-full accent-[#f0be7c] cursor-pointer h-1.5"
            />
          </div>

          {/* Invert Toggle */}
          <label className="flex items-center justify-between text-[10px] font-mono cursor-pointer py-1 px-1 bg-[var(--desk-surface-raised)] rounded-[2px] border border-[var(--desk-border)]">
            <span className="text-[var(--text-body)]">Invert to Dimple / Screw</span>
            <input
              type="checkbox"
              checked={tools.rivetInvert}
              onChange={(e) => setRivetInvert(e.target.checked)}
              className="accent-[#f0be7c] cursor-pointer"
            />
          </label>

          {/* Rivet Presets */}
          <div className="grid grid-cols-2 gap-1 text-[10px] font-mono">
            {[
              { label: 'Hemisphere Dome', r: 8, flat: 1.0, inv: false },
              { label: 'Shallow Stud', r: 6, flat: 0.35, inv: false },
              { label: 'Countersunk Screw', r: 5, flat: 0.7, inv: true },
              { label: 'Dimple Crevice', r: 4, flat: 0.25, inv: true },
            ].map((preset) => (
              <button
                key={preset.label}
                onClick={() => {
                  setRivetRadius(preset.r);
                  setRivetFlatten(preset.flat);
                  setRivetInvert(preset.inv);
                }}
                className="py-1 px-1.5 text-center rounded-[2px] border border-[var(--desk-border)] bg-[var(--desk-surface-raised)] hover:bg-[#2e2040] hover:text-[#f0be7c] text-[var(--text-body)] transition-colors cursor-pointer"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick Action: New Normal Map Layer */}
      <button
        onClick={handleCreateNormalLayer}
        className="w-full mt-1 bg-[var(--desk-surface-raised)] hover:bg-[#2e2040] text-[#f0be7c] font-bold text-[10px] font-mono py-1.5 rounded-[2px] border border-[var(--desk-border)] transition-colors cursor-pointer text-center flex items-center justify-center gap-1.5"
        title="Create a new layer tagged for tangent normal maps"
      >
        <PixelIcon name="plus" size={12} />
        <span>+ Add Dedicated Normal Layer</span>
      </button>
    </div>
  );
};
