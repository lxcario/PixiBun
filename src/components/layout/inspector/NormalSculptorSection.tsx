'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { PixelIcon } from '@/components/ui/PixelIcon';
import PanelSection from '@/components/ui/PanelSection';
import StudioSlider from '@/components/ui/StudioSlider';
import StudioToggle from '@/components/ui/StudioToggle';
import {
  computeDirectionalBevelNormal,
  encodeNormalRGB,
} from '@/lib/art/normalSculptor';

export const NormalSculptorSection: React.FC<{ taskView?: boolean }> = ({ taskView = false }) => {
  const tools = useStudioStore((s) => s.tools);
  const setActiveTool = useStudioStore((s) => s.setActiveTool);
  const setChiselAzimuth = useStudioStore((s) => s.setChiselAzimuth);
  const setChiselIncline = useStudioStore((s) => s.setChiselIncline);
  const setChiselWidth = useStudioStore((s) => s.setChiselWidth);
  const setChiselRidgeMode = useStudioStore((s) => s.setChiselRidgeMode);
  const setNormalBlendMode = useStudioStore((s) => s.setNormalBlendMode);
  const addLayer = useStudioStore((s) => s.addLayer);
  const toggleNormalMapPreview = useStudioStore((s) => s.toggleNormalMapPreview);
  const showNormalMapPreview = useStudioStore((s) => s.showNormalMapPreview);
  const canPaintSurface = useStudioStore((s) => {
    const layer = s.frames[s.activeFrameIndex]?.layers.find((item) => item.id === s.activeLayerId);
    return layer?.tag === 'normal' && !layer.locked;
  });

  const gizmoCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDraggingGizmoRef = useRef<boolean>(false);

  const isChiselActive = tools.activeTool === 'normal-chisel';

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
    <PanelSection
      title="Shape the surface"
      description="Paint raised edges that respond to lighting."
      icon="chisel"
      storageKey={taskView ? 'pixibun:panel:surface-task:v2' : 'pixibun:panel:normals'}
      defaultOpen={false}
    >
      <div className="flex flex-col gap-2.5">
        <p className="text-[10px] leading-4 text-[var(--text-muted)]">
          {canPaintSurface ? 'Paint slopes on the selected surface layer.' : 'Create or select an unlocked surface layer to paint slopes.'}
        </p>
        <button
          onClick={handleCreateNormalLayer}
          className="w-full min-h-8 flex items-center justify-center gap-1.5 pixel-tactile-btn text-[11px] text-[var(--text-heading)] cursor-pointer"
          title="Create a separate Normal layer for surface directions"
          data-testid="create-surface-layer"
        >
          <PixelIcon name="plus" size={12} /><span>Create surface layer</span>
        </button>
        <button
          onClick={toggleNormalMapPreview}
          aria-pressed={showNormalMapPreview}
          className={`w-full min-h-8 text-[11px] font-sans font-medium px-1.5 py-0.5 rounded-[2px] border transition-colors cursor-pointer ${
            showNormalMapPreview
              ? 'bg-[#7ce0be] text-[var(--desk-bg)] border-[#4da88c] font-semibold'
              : 'bg-[var(--surface-0)] text-[var(--text-muted)] border-[var(--desk-border)] hover:text-[var(--text-heading)]'
          }`}
          title="Toggle viewport normal map preview mode"
        >
          {showNormalMapPreview ? 'Hide surface directions' : 'Show surface directions'}
        </button>
        {/* Directional normal sculpting stays available for the lighting engine. */}
        <div>
          <button
            onClick={() => setActiveTool('normal-chisel')}
            disabled={!canPaintSurface}
            aria-label="Paint raised edges"
            aria-pressed={isChiselActive}
            className={`w-full min-h-8 flex items-center justify-center gap-1 py-1.5 px-2 text-[11px] font-sans font-medium rounded-[2px] border transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              isChiselActive
                ? 'bg-[var(--accent-gold)] text-[var(--desk-bg)] border-[#8c5120] shadow-[0_1px_0_#8c5120]'
                : 'bg-[var(--desk-surface-raised)] text-[var(--text-body)] border-[var(--desk-border)] hover:text-[var(--accent-gold)]'
            }`}
          >
            <PixelIcon name="chisel" size={13} />
            <span>Paint raised edges</span>
          </button>

        </div>

        {/* Normal Chisel Settings */}
        {isChiselActive && (
          <div className="flex flex-col gap-3 pt-1">
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
                  <span className="text-[var(--text-muted)]">Direction:</span>
                  <span className="font-bold text-[var(--accent-gold)]">{tools.chiselAzimuth}°</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-muted)]">Slope:</span>
                  <span className="font-bold text-[var(--accent-gold)]">{tools.chiselIncline}°</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-muted)]">RGB:</span>
                  <span
                    className="font-bold px-1 rounded-[1px] text-[var(--desk-bg)]"
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
                        ? 'bg-[var(--accent-gold)] text-[var(--desk-bg)] border-[#8c5120] font-bold'
                        : 'bg-[var(--desk-surface-raised)] border-[var(--desk-border)] hover:text-[var(--accent-gold)]'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Chisel Width Slider */}
            <StudioSlider
              label="Bevel Width"
              value={tools.chiselWidth}
              min={1}
              max={32}
              unit="px"
              onChange={(val) => setChiselWidth(val)}
            />

            {/* V-Groove Ridge Mode */}
            <StudioToggle
              label="Raised ridge"
              checked={tools.chiselRidgeMode}
              onChange={(val) => setChiselRidgeMode(val)}
            />

            {/* Blending Mode Selector */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-mono text-[var(--text-muted)]">Blend Mode</span>
              <div className="grid grid-cols-3 gap-1 text-[10px] font-mono">
                {(['rnm', 'udn', 'overwrite'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setNormalBlendMode(mode)}
                    className={`py-1 text-center rounded-[2px] border cursor-pointer transition-colors ${
                      tools.normalBlendMode === mode
                        ? 'bg-[var(--accent-plum)] text-[var(--desk-bg)] border-[#8e6093] font-bold shadow-xs'
                        : 'bg-[var(--desk-surface-raised)] text-[var(--text-body)] border-[var(--desk-border)] hover:text-[var(--accent-plum)]'
                    }`}
                    title={
                      mode === 'rnm'
                        ? 'Curved surface blend (RNM)'
                        : mode === 'udn'
                        ? 'Flat surface blend (UDN)'
                        : 'Replace surface angles directly'
                    }
                  >
                    {mode === 'overwrite' ? 'Replace' : mode === 'rnm' ? 'Curved' : 'Flat'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </PanelSection>
  );
};
