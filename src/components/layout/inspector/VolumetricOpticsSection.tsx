'use client';

import React, { useState } from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { TactileButton } from '@/components/ui/TactileButton';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { OpticalPresetType, CelToneCount, AnisoFlowPreset } from '@/types/tools';

export const VolumetricOpticsSection: React.FC = () => {
  const {
    tools,
    setOpticalPreset,
    setTranslucencyDepth,
    setFresnelPower,
    setAnisoAngle,
    setAnisoFlow,
    setOpticalCelTones,
    primaryColor,
    palettes,
    currentPaletteId,
    showNormalMapPreview,
    toggleNormalMapPreview,
  } = useStudioStore();

  const [opticsExpanded, setOpticsExpanded] = useState(false);
  const currentPalette = palettes.find((p) => p.id === currentPaletteId) || palettes[0];

  const handleRenderVolumetricOptics = () => {
    if (showNormalMapPreview) toggleNormalMapPreview();
    window.dispatchEvent(
      new CustomEvent('pixibun:volumetric-optics', {
        detail: {
          preset: tools.opticalPreset,
          translucencyDepth: tools.translucencyDepth,
          fresnelPower: tools.fresnelPower,
          anisoAngle: tools.anisoAngle,
          anisoFlow: tools.anisoFlow,
          celTones: tools.opticalCelTones,
          lightAzimuth: tools.lightAzimuth,
          lightElevation: tools.lightElevation,
          lightColor: primaryColor || '#FFFFFF',
          paletteColors: currentPalette.colors,
          ditherModulation: tools.ditherModulation,
        },
      })
    );
  };

  const handle47Blob = () => {
    if (showNormalMapPreview) toggleNormalMapPreview();
    window.dispatchEvent(new CustomEvent('pixibun:apply-47-blob'));
  };

  const handleGroundShadow = () => {
    if (showNormalMapPreview) toggleNormalMapPreview();
    window.dispatchEvent(new CustomEvent('pixibun:ground-shadow'));
  };

  return (
    <div className="bg-[var(--desk-surface)] p-2.5 rounded-[2px] border-2 border-[var(--desk-border)] flex flex-col gap-2.5 shadow-xs">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono font-bold text-[#f0be7c] uppercase tracking-wider flex items-center gap-1">
          <PixelIcon name="sparkles" size={12} />
          <span>Volumetric Optics & SSS</span>
        </span>
        <span className="text-[9px] font-mono text-[#dcabdf] font-bold">2D Physics</span>
      </div>

      {/* Optical Preset Selector */}
      <div className="flex flex-col gap-1 text-xs font-mono">
        <span className="text-[10px] text-[var(--text-body)] font-bold">Material Preset:</span>
        <div className="grid grid-cols-3 gap-1">
          {[
            { id: 'gemstone', label: 'Gem' },
            { id: 'slime', label: 'Slime' },
            { id: 'hair', label: 'Hair' },
            { id: 'foliage', label: 'Leaf' },
            { id: 'metal_aniso', label: 'Metal' },
          ].map((preset) => (
            <button
              key={preset.id}
              onClick={() => setOpticalPreset(preset.id as OpticalPresetType)}
              className={`py-1 text-[9px] font-mono font-bold rounded-[1px] border transition-colors cursor-pointer ${
                tools.opticalPreset === preset.id
                  ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120] shadow-[0_1px_0_#8c5120]'
                  : 'bg-[var(--desk-surface-raised)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[#f0be7c]'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cel Tones / Shading Mode Selector */}
      <div className="flex flex-col gap-1 text-xs font-mono">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-[var(--text-body)] font-bold">Cel Tones:</span>
          <span className="text-[9px] text-[#dcabdf] font-bold">
            {tools.opticalCelTones === 'smooth' ? 'Smooth VFX' : `${tools.opticalCelTones} Tones`}
          </span>
        </div>
        <div className="grid grid-cols-4 gap-1">
          {[
            { id: 2, label: '2 Tones' },
            { id: 3, label: '3 Tones' },
            { id: 4, label: '4 Tones' },
            { id: 'smooth', label: 'Smooth' },
          ].map((option) => (
            <button
              key={String(option.id)}
              onClick={() => setOpticalCelTones(option.id as CelToneCount)}
              className={`py-1 text-[9px] font-mono font-bold rounded-[1px] border transition-colors cursor-pointer ${
                tools.opticalCelTones === option.id
                  ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120] shadow-[0_1px_0_#8c5120]'
                  : 'bg-[var(--desk-surface-raised)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[#f0be7c]'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Advanced Optics Parameters Toggle */}
      <button
        onClick={() => setOpticsExpanded(!opticsExpanded)}
        className="w-full flex items-center justify-between bg-[var(--desk-surface-raised)] p-1.5 rounded-[2px] border border-[var(--desk-border)] hover:bg-[#2e2040] transition-colors cursor-pointer"
      >
        <span className="text-[10px] font-mono font-bold text-[var(--text-body)] uppercase">
          {opticsExpanded ? '▼ Subsurface & Anisotropy' : '▶ Subsurface & Anisotropy'}
        </span>
      </button>

      {/* Advanced Optics Sliders */}
      {opticsExpanded && (
        <div className="bg-[var(--desk-surface-raised)] p-2 rounded-[2px] border border-[var(--desk-border)] flex flex-col gap-1.5">
          {/* Subsurface Translucency Depth */}
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[10px] text-[var(--text-body)] font-bold">Translucency:</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={tools.translucencyDepth}
              aria-label="Subsurface scattering translucency depth"
              onChange={(e) => setTranslucencyDepth(parseFloat(e.target.value))}
              className="w-28 accent-[#f0be7c] cursor-pointer"
            />
            <span className="text-[#f0be7c] font-bold text-[10px] min-w-[28px] text-right">
              {Math.round(tools.translucencyDepth * 100)}%
            </span>
          </div>

          {/* Dielectric Fresnel Power */}
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[10px] text-[var(--text-body)] font-bold">Fresnel Rim:</span>
            <input
              type="range"
              min="0"
              max="5"
              step="0.25"
              value={tools.fresnelPower}
              aria-label="Dielectric Fresnel grazing angle reflectance power"
              onChange={(e) => setFresnelPower(parseFloat(e.target.value))}
              className="w-28 accent-[#dcabdf] cursor-pointer"
            />
            <span className="text-[#dcabdf] font-bold text-[10px] min-w-[28px] text-right">
              {tools.fresnelPower.toFixed(1)}x
            </span>
          </div>

          {/* Anisotropic Fiber Angle */}
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[10px] text-[var(--text-body)] font-bold">Aniso Flow:</span>
            <input
              type="range"
              min="0"
              max="180"
              value={tools.anisoAngle}
              aria-label="Kajiya-Kay anisotropic fiber tangent angle"
              onChange={(e) => setAnisoAngle(parseInt(e.target.value, 10))}
              className="w-28 accent-[#f0be7c] cursor-pointer"
            />
            <span className="text-[#f0be7c] font-bold text-[10px] min-w-[28px] text-right">
              {tools.anisoAngle}°
            </span>
          </div>

          {/* Anisotropic Flow Presets */}
          <div className="flex items-center justify-between text-xs font-mono pt-1 border-t border-[var(--desk-border)]">
            <span className="text-[9px] text-[var(--text-body)]">Preset:</span>
            <div className="flex gap-1">
              {[
                { id: 'radial', label: 'Radial' },
                { id: 'horizontal', label: 'Horiz' },
                { id: 'vertical', label: 'Vert' },
                { id: 'swirl', label: 'Swirl' },
              ].map((flow) => (
                <button
                  key={flow.id}
                  onClick={() => setAnisoFlow(flow.id as AnisoFlowPreset)}
                  className={`px-1.5 py-0.5 text-[8px] font-mono font-bold rounded-[1px] border transition-colors cursor-pointer ${
                    tools.anisoFlow === flow.id
                      ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120]'
                      : 'bg-[var(--desk-surface)] border-[var(--desk-border)] text-[var(--text-body)]'
                  }`}
                >
                  {flow.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Execute Volumetric Optics Action */}
      <TactileButton
        size="sm"
        variant="primary"
        onClick={handleRenderVolumetricOptics}
        title="Compute Beer-Lambert transmission, dielectric Fresnel and Kajiya-Kay highlights"
        className="text-xs py-2 font-bold justify-center"
      >
        <PixelIcon name="sparkles" size={14} />
        <span>Render Volumetric Optics</span>
      </TactileButton>

      {/* Additional Utility Buttons */}
      <div className="grid grid-cols-2 gap-1.5 mt-0.5">
        <TactileButton
          size="sm"
          variant="default"
          onClick={handle47Blob}
          title="Calculate 47-tile bitmask connectivity and generate autotile edge contours"
          className="text-[10px] py-1.5 font-bold bg-[var(--desk-surface-raised)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[#f0be7c] flex items-center justify-center gap-1"
        >
          <PixelIcon name="grid-iso" size={12} />
          <span>47-Blob Autotile Edges</span>
        </TactileButton>

        <TactileButton
          size="sm"
          variant="default"
          onClick={handleGroundShadow}
          title="Calculate bounding base and cast elliptical ground shadow"
          className="text-[10px] py-1.5 font-bold bg-[var(--desk-surface-raised)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[#f0be7c] flex items-center justify-center gap-1"
        >
          <PixelIcon name="sparkles" size={12} />
          <span>Ground Drop Shadow</span>
        </TactileButton>
      </div>
    </div>
  );
};
