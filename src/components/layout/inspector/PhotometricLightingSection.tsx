'use client';

import React, { useState } from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { TactileButton } from '@/components/ui/TactileButton';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { LightGizmoOverlay } from '@/components/studio/LightGizmoOverlay';
import { MaterialType } from '@/types/tools';
import { MATERIAL_PROFILES } from '@/lib/ai/math/photometricLighting';

interface MaterialChip {
  value: MaterialType;
  label: string;
  blurb: string;
  swatch: string; // CSS radial-gradient previewing the material's shine character
  wide?: boolean;
}

// Friendly material picker metadata. Physical coefficients (Kd/Ks) live in
// MATERIAL_PROFILES and are surfaced as hover tooltips instead of inline jargon.
// Each chip carries a shaded "swatch sphere" that previews the material's shine.
const MATERIAL_CHIPS: MaterialChip[] = [
  {
    value: 'matte',
    label: 'Matte Clay',
    blurb: 'Soft & chalky, no shine',
    swatch: 'radial-gradient(circle at 32% 28%, #f2e2c9 0%, #c9a678 45%, #7a5c39 100%)',
  },
  {
    value: 'gold',
    label: 'Gold / Brass',
    blurb: 'Warm metallic sparkle',
    swatch: 'radial-gradient(circle at 32% 28%, #fff6cf 0%, #f0be7c 40%, #a86a24 78%, #5e3a12 100%)',
  },
  {
    value: 'metal',
    label: 'Polished Metal',
    blurb: 'Sharp mirror glints',
    swatch: 'radial-gradient(circle at 32% 28%, #ffffff 0%, #d7dde6 35%, #8b98a8 70%, #454f5c 100%)',
  },
  {
    value: 'glass',
    label: 'Glossy Glass',
    blurb: 'Wet shine with rim glow',
    swatch: 'radial-gradient(circle at 32% 28%, #ffffff 0%, #cfe9ff 35%, #6aa7dd 70%, #2b5b8c 100%)',
  },
  {
    value: 'fabric',
    label: 'Velvet Fabric',
    blurb: 'Soft cloth, gentle rim',
    wide: true,
    swatch: 'radial-gradient(circle at 38% 32%, #e8b7c4 0%, #b25a7e 50%, #5e2144 100%)',
  },
];

export const PhotometricLightingSection: React.FC = () => {
  const {
    canvasWidth,
    canvasHeight,
    tools,
    setLightAzimuth,
    setLightElevation,
    setLightBrightness,
    setMaterialPreset,
    setCavityStrength,
    setDitherModulation,
    primaryColor,
    showNormalMapPreview,
    toggleNormalMapPreview,
  } = useStudioStore();

  const [advancedLightingExpanded, setAdvancedLightingExpanded] = useState(false);
  // 'auto' = analyze the artwork and infer lighting (legacy smart shading);
  // 'manual' = full artist control over direction, material and exposure.
  const [mode, setMode] = useState<'auto' | 'manual'>('auto');

  const handleAutoRenderPhotometric = () => {
    if (showNormalMapPreview) toggleNormalMapPreview();
    window.dispatchEvent(new CustomEvent('pixibun:photometric-auto'));
  };

  const handleRenderPhotometricLighting = () => {
    if (showNormalMapPreview) toggleNormalMapPreview();
    window.dispatchEvent(
      new CustomEvent('pixibun:photometric-lighting', {
        detail: {
          lightAzimuth: tools.lightAzimuth,
          lightElevation: tools.lightElevation,
          lightRadius: tools.lightRadius,
          lightBrightness: tools.lightBrightness,
          lightColor: primaryColor || '#FFFFFF',
          ambientIntensity: 0.35,
          material: tools.materialPreset,
          cavityStrength: tools.cavityStrength,
          ditherModulation: tools.ditherModulation,
          bayerSize: '4x4',
          paletteColors: [],
        },
      })
    );
  };

  const handleBakeNormalMap = () => {
    if (showNormalMapPreview) toggleNormalMapPreview();
    window.dispatchEvent(new CustomEvent('pixibun:bake-normal-map'));
  };

  const handleSpecularHighlight = () => {
    if (showNormalMapPreview) toggleNormalMapPreview();
    window.dispatchEvent(
      new CustomEvent('pixibun:highlight', {
        detail: {
          lightAzimuth: tools.lightAzimuth,
          lightElevation: tools.lightElevation,
          highlightColor: primaryColor || '#FFFFFF',
        },
      })
    );
  };

  const handleSelOut = () => {
    if (showNormalMapPreview) toggleNormalMapPreview();
    window.dispatchEvent(
      new CustomEvent('pixibun:sel-out', {
        detail: {
          lightAzimuth: tools.lightAzimuth,
          lightElevation: tools.lightElevation,
        },
      })
    );
  };

  return (
    <div className="bg-[var(--desk-surface)] p-2.5 rounded-[2px] border-2 border-[var(--desk-border)] flex flex-col gap-2.5 shadow-xs">
      <div className="flex items-center justify-between">
        <button
          type="button"
          className="text-[10px] font-mono font-bold text-[#f0be7c] uppercase tracking-wider flex items-center gap-1 cursor-pointer select-none bg-transparent border-none p-0 focus:outline-none"
        >
          <PixelIcon name="sun" size={12} />
          <span>2.5D Photometric Studio</span>
        </button>
        <span className="text-[10px] font-mono text-[#f0be7c] font-bold">
          {tools.lightAzimuth}° / {tools.lightElevation}°
        </span>
      </div>

      {canvasWidth === 64 && (canvasHeight === 64 || canvasHeight === 32) && (
        <div className="flex items-center gap-1.5 px-2 py-1 bg-[#26140b] text-[#f0be7c] text-[10px] font-mono font-bold rounded-[2px] border border-[#8c5120]">
          <PixelIcon name="layers" size={10} />
          <span>Minecraft 3D Skin Shading Active ({canvasWidth}x{canvasHeight})</span>
        </div>
      )}

      {/* Mode Switch: Auto analysis vs Manual artist control */}
      <div
        className="grid grid-cols-2 gap-1 p-1 bg-[var(--desk-surface-raised)] rounded-[2px] border border-[var(--desk-border)]"
        role="group"
        aria-label="Photometric lighting mode"
      >
        <button
          type="button"
          onClick={() => setMode('auto')}
          aria-pressed={mode === 'auto'}
          className={`flex items-center justify-center gap-1 py-1.5 rounded-[2px] text-[10px] font-mono font-bold uppercase tracking-wide transition-colors cursor-pointer ${
            mode === 'auto'
              ? 'bg-[#f0be7c] text-[#140d1f]'
              : 'text-[var(--text-body)] hover:text-[#f0be7c]'
          }`}
        >
          <PixelIcon name="sun" size={12} />
          <span>Auto</span>
        </button>
        <button
          type="button"
          onClick={() => setMode('manual')}
          aria-pressed={mode === 'manual'}
          className={`flex items-center justify-center gap-1 py-1.5 rounded-[2px] text-[10px] font-mono font-bold uppercase tracking-wide transition-colors cursor-pointer ${
            mode === 'manual'
              ? 'bg-[#f0be7c] text-[#140d1f]'
              : 'text-[var(--text-body)] hover:text-[#f0be7c]'
          }`}
        >
          <PixelIcon name="pen" size={12} />
          <span>Manual</span>
        </button>
      </div>

      {mode === 'auto' && (
        <div className="bg-[var(--desk-surface-raised)] p-2 rounded-[2px] border border-[var(--desk-border)] flex flex-col gap-1.5">
          <span className="text-[10px] font-mono font-bold text-[var(--text-body)] uppercase">
            Smart Art Analysis
          </span>
          <p className="text-[9px] font-mono text-[var(--text-body)] opacity-80 leading-relaxed">
            Analyzes the canvas art and sets light direction, height, material and
            exposure automatically. The gizmo and material chips sync with the result.
          </p>
          <TactileButton
            size="sm"
            variant="primary"
            onClick={handleAutoRenderPhotometric}
            title="Analyze the canvas art and render photometric lighting with inferred settings"
            className="text-xs py-2 font-bold justify-center"
          >
            <PixelIcon name="sun" size={14} />
            <span>Analyze &amp; Render</span>
          </TactileButton>
        </div>
      )}

      {mode === 'manual' && (
        <>
      {/* 1) Light Direction — single source of truth: drag the sun, or fine-tune below */}
      <div className="bg-[var(--desk-surface-raised)] p-1.5 rounded-[2px] border border-[var(--desk-border)] flex flex-col gap-1.5">
        <span className="text-[10px] font-mono font-bold text-[var(--text-body)] uppercase">
          Light Direction
        </span>
        <LightGizmoOverlay
          size={104}
          showLabels={false}
          className="self-center my-0.5"
        />
        <span className="text-[9px] font-mono text-[var(--text-body)] opacity-70 text-center">
          Drag the sun around the dome — center = overhead light
        </span>

        {/* Fine-tune sliders, always visible and synced with the gizmo */}
        <div className="flex flex-col gap-1 pt-0.5">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[10px] text-[var(--text-body)] font-bold">Direction:</span>
            <input
              type="range"
              min="0"
              max="360"
              value={tools.lightAzimuth}
              aria-label="Light direction around the sprite (azimuth)"
              onChange={(e) => setLightAzimuth(parseInt(e.target.value, 10))}
              className="w-24 accent-[#f0be7c] cursor-pointer"
            />
            <div className="flex items-center gap-1 min-w-[42px] justify-end">
              <svg
                className="w-3 h-3 text-[#f0be7c] transition-transform duration-75"
                viewBox="0 0 24 24"
                fill="currentColor"
                style={{ transform: `rotate(${tools.lightAzimuth}deg)` }}
                aria-hidden="true"
              >
                <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
              </svg>
              <span className="text-[#f0be7c] font-bold text-[10px] text-right">
                {tools.lightAzimuth}°
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[10px] text-[var(--text-body)] font-bold">Height:</span>
            <input
              type="range"
              min="0"
              max="90"
              value={tools.lightElevation}
              aria-label="Light height above the sprite (elevation)"
              onChange={(e) => setLightElevation(parseInt(e.target.value, 10))}
              className="w-24 accent-[#f0be7c] cursor-pointer"
            />
            <span className="text-[#dcabdf] font-bold text-[10px] min-w-[42px] text-right">
              {tools.lightElevation}°
            </span>
          </div>
        </div>
      </div>

      {/* 2) Material — visual chips instead of a jargon dropdown */}
      <div className="bg-[var(--desk-surface-raised)] p-1.5 rounded-[2px] border border-[var(--desk-border)] flex flex-col gap-1.5">
        <span className="text-[10px] font-mono font-bold text-[var(--text-body)] uppercase">
          Material
        </span>
        <div className="grid grid-cols-2 gap-1" role="group" aria-label="Material shading preset">
          {MATERIAL_CHIPS.map((chip) => {
            const selected = tools.materialPreset === chip.value;
            const profile = MATERIAL_PROFILES[chip.value];
            return (
              <button
                key={chip.value}
                type="button"
                onClick={() => setMaterialPreset(chip.value)}
                aria-pressed={selected}
                title={`${chip.label} — Kd ${profile.kd}, Ks ${profile.ks}, Shininess ${profile.shininess}`}
                className={`flex items-center gap-1.5 px-1.5 py-1 rounded-[2px] border text-left transition-colors cursor-pointer ${
                  chip.wide ? 'col-span-2' : 'col-span-1'
                } ${
                  selected
                    ? 'border-[#f0be7c] bg-[#f0be7c]/10 text-[#f0be7c]'
                    : 'border-[var(--desk-border)] bg-[#181124] text-[var(--text-body)] hover:border-[#f0be7c]/50'
                }`}
              >
                <span
                  className="w-5 h-5 rounded-full shrink-0 shadow-xs ring-1 ring-black/30"
                  style={{ background: chip.swatch }}
                  aria-hidden="true"
                />
                <span className="flex flex-col min-w-0">
                  <span className="text-[10px] font-mono font-bold leading-tight truncate">
                    {chip.label}
                  </span>
                  <span
                    className={`text-[8px] font-mono leading-tight truncate ${
                      selected ? 'text-[#f0be7c]/80' : 'text-[var(--text-body)] opacity-70'
                    }`}
                  >
                    {chip.blurb}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3) Advanced Shading — exposure & surface response only */}
      <button
        onClick={() => setAdvancedLightingExpanded(!advancedLightingExpanded)}
        className="w-full flex items-center justify-between bg-[var(--desk-surface-raised)] p-1.5 rounded-[2px] border border-[var(--desk-border)] hover:bg-[#2e2040] transition-colors cursor-pointer mt-1"
        aria-expanded={advancedLightingExpanded}
      >
        <span className="text-[10px] font-mono font-bold text-[var(--text-body)] uppercase">
          {advancedLightingExpanded ? '▼ Advanced Shading' : '▶ Advanced Shading'}
        </span>
        <span className="text-[9px] font-mono text-[#dcabdf]">
          {Math.round(tools.lightBrightness * 100)}% · AO {Math.round(tools.cavityStrength * 100)}%
        </span>
      </button>

      {advancedLightingExpanded && (
        <div className="bg-[var(--desk-surface-raised)] p-2 rounded-[2px] border border-[var(--desk-border)] flex flex-col gap-1.5">
          {/* Brightness / Exposure */}
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[10px] text-[var(--text-body)] font-bold">Brightness:</span>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.05"
              value={tools.lightBrightness}
              aria-label="Light brightness and exposure"
              onChange={(e) => setLightBrightness(parseFloat(e.target.value))}
              className="w-32 accent-[#f0be7c] cursor-pointer"
            />
            <span className="text-[#dcabdf] font-bold text-[10px] min-w-[28px] text-right">
              {Math.round(tools.lightBrightness * 100)}%
            </span>
          </div>

          {/* Cavity AO Strength */}
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[10px] text-[var(--text-body)] font-bold">Cavity AO:</span>
            <input
              type="range"
              min="0"
              max="2.0"
              step="0.05"
              value={tools.cavityStrength}
              aria-label="Surface cavity map and ambient occlusion intensity"
              onChange={(e) => setCavityStrength(parseFloat(e.target.value))}
              className="w-32 accent-[#f0be7c] cursor-pointer"
            />
            <span className="text-[#dcabdf] font-bold text-[10px] min-w-[28px] text-right">
              {Math.round(tools.cavityStrength * 100)}%
            </span>
          </div>

          {/* Bayer Dither Modulation */}
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[10px] text-[var(--text-body)] font-bold">Dither Mod:</span>
            <input
              type="range"
              min="0"
              max="1.0"
              step="0.05"
              value={tools.ditherModulation}
              aria-label="Bayer ordered dithering modulation strength"
              onChange={(e) => setDitherModulation(parseFloat(e.target.value))}
              className="w-32 accent-[#f0be7c] cursor-pointer"
            />
            <span className="text-[#dcabdf] font-bold text-[10px] min-w-[28px] text-right">
              {Math.round(tools.ditherModulation * 100)}%
            </span>
          </div>
        </div>
      )}
        </>
      )}

      {/* Main Lighting Action Buttons */}
      <div className="flex flex-col gap-1.5 mt-1">
        {mode === 'manual' && (
          <TactileButton
            size="sm"
            variant="primary"
            onClick={handleRenderPhotometricLighting}
            title="Compute 2.5D analytical normal field and render photometric lighting (updates the existing photometric layer in place)"
            className="text-xs py-2 font-bold justify-center"
          >
            <PixelIcon name="sun" size={14} />
            <span>Render Photometric</span>
          </TactileButton>
        )}

        <div className="grid grid-cols-2 gap-1.5">
          <TactileButton
            size="sm"
            variant="default"
            onClick={handleBakeNormalMap}
            title="Bake 2.5D surface normal vectors into standard RGB normal map layer"
            className="text-[10px] py-1.5 font-bold bg-[var(--desk-surface-raised)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[#f0be7c] flex items-center justify-center gap-1"
          >
            <PixelIcon name="export" size={12} />
            <span>Bake Normal Map</span>
          </TactileButton>

          <TactileButton
            size="sm"
            variant={showNormalMapPreview ? 'primary' : 'default'}
            onClick={toggleNormalMapPreview}
            title="Toggle live viewport inspection of 2.5D surface normal vector field"
            className="text-[10px] py-1.5 font-bold flex items-center justify-center gap-1"
          >
            <PixelIcon name={showNormalMapPreview ? 'eye-off' : 'eye'} size={12} />
            <span>{showNormalMapPreview ? 'Hide Normals' : 'View Normals'}</span>
          </TactileButton>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <TactileButton
            size="sm"
            variant="default"
            onClick={handleSpecularHighlight}
            title="Cast Blinn-Phong specular glints on the lit surface (never on the outline)"
            className="text-[10px] py-1.5 font-bold bg-[var(--desk-surface-raised)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[#f0be7c] flex items-center justify-center gap-1"
          >
            <PixelIcon name="sparkles" size={12} />
            <span>Specular Glint</span>
          </TactileButton>

          <TactileButton
            size="sm"
            variant="default"
            onClick={handleSelOut}
            title="Selective outlining based on light angle alignment"
            className="text-[10px] py-1.5 font-bold bg-[var(--desk-surface-raised)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[#f0be7c] flex items-center justify-center gap-1"
          >
            <PixelIcon name="pen" size={12} />
            <span>Sel-Out</span>
          </TactileButton>
        </div>
      </div>
    </div>
  );
};
