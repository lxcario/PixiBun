'use client';

import React, { useState } from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { TactileButton } from '@/components/ui/TactileButton';
import { PixelIcon } from '@/components/ui/PixelIcon';
import PanelSection from '@/components/ui/PanelSection';
import StudioSlider from '@/components/ui/StudioSlider';
import StudioToggle from '@/components/ui/StudioToggle';
import { OpticalPresetType, CelToneCount, AnisoFlowPreset } from '@/types/tools';
import { studioEvents } from '@/lib/events/studioEvents';

export const VolumetricOpticsSection: React.FC = () => {
  const {
    tools,
    setOpticalPreset,
    setTranslucencyDepth,
    setFresnelPower,
    setAnisoAngle,
    setAnisoFlow,
    setOpticalCelTones,
    palettes,
    currentPaletteId,
    showNormalMapPreview,
    toggleNormalMapPreview,
  } = useStudioStore();

  const [opticsExpanded, setOpticsExpanded] = useState(false);
  const [snapToPalette, setSnapToPalette] = useState(false);
  const currentPalette = palettes.find((p) => p.id === currentPaletteId) || palettes[0];

  const handleRenderVolumetricOptics = () => {
    if (showNormalMapPreview) toggleNormalMapPreview();
    studioEvents.emit('pixibun:volumetric-optics', {
      preset: tools.opticalPreset,
      translucencyDepth: tools.translucencyDepth,
      fresnelPower: tools.fresnelPower,
      anisoAngle: tools.anisoAngle,
      anisoFlow: tools.anisoFlow,
      celTones: tools.opticalCelTones,
      lightAzimuth: tools.lightAzimuth,
      lightElevation: tools.lightElevation,
      lightColor: '#FFFFFF',
      paletteColors: snapToPalette ? currentPalette.colors : [],
      ditherModulation: tools.ditherModulation,
    });
  };

  return (
    <PanelSection
      title="Glow & Translucent Materials"
      ariaLabel="Glow & Translucent Materials (Volumetric Optics & SSS)"
      storageKey="pixibun:panel:optics"
      defaultOpen={false}
      actions={<span className="text-[9px] font-sans text-[var(--text-body)]">Materials</span>}
    >
      <div className="flex flex-col gap-2.5">
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
                    ? 'bg-[var(--accent-gold)] text-[var(--desk-bg)] border-[#8c5120] shadow-[0_1px_0_#8c5120]'
                    : 'bg-[var(--desk-surface-raised)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[var(--accent-gold)]'
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
            <span className="text-[9px] text-[var(--accent-plum)] font-bold">
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
                    ? 'bg-[var(--accent-gold)] text-[var(--desk-bg)] border-[#8c5120] shadow-[0_1px_0_#8c5120]'
                    : 'bg-[var(--desk-surface-raised)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[var(--accent-gold)]'
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
          className="w-full flex items-center justify-between bg-[var(--desk-surface-raised)] p-1.5 rounded-[2px] border border-[var(--desk-border)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
        >
          <span className="text-[10px] font-mono font-bold text-[var(--text-body)] uppercase">
            {opticsExpanded ? '▼ Glow & Rim Highlights' : '▶ Glow & Rim Highlights'}
          </span>
        </button>

        {/* Advanced Optics Sliders */}
        {opticsExpanded && (
          <div className="bg-[var(--desk-surface-raised)] p-2 rounded-[2px] border border-[var(--desk-border)] flex flex-col gap-3">
            {/* Subsurface Translucency Depth */}
            <StudioSlider
              label="Translucency"
              value={Math.round(tools.translucencyDepth * 100)}
              min={0}
              max={100}
              step={5}
              unit="%"
              onChange={(val) => setTranslucencyDepth(val / 100)}
            />

            {/* Dielectric Fresnel Power */}
            <StudioSlider
              label="Rim Glow"
              value={tools.fresnelPower}
              min={0}
              max={5}
              step={0.25}
              unit="x"
              onChange={(val) => setFresnelPower(val)}
            />

            {/* Anisotropic Fiber Angle */}
            <StudioSlider
              label="Streak Angle"
              value={tools.anisoAngle}
              min={0}
              max={180}
              unit="°"
              onChange={(val) => setAnisoAngle(val)}
            />

            {/* Anisotropic Flow Presets */}
            <div className="flex items-center justify-between text-xs font-mono pt-1 border-t border-[var(--desk-border)]">
              <span className="text-[9px] text-[var(--text-body)]">Direction:</span>
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
                        ? 'bg-[var(--accent-gold)] text-[var(--desk-bg)] border-[#8c5120]'
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

        {/* Snap to Palette Option */}
        <StudioToggle
          label={`Snap to active palette (${currentPalette.name.slice(0, 18)})`}
          checked={snapToPalette}
          onChange={(val) => setSnapToPalette(val)}
        />

        {/* Execute Volumetric Optics Action */}
        <TactileButton
          size="sm"
          variant="primary"
          onClick={handleRenderVolumetricOptics}
          title="Apply material glow, highlights, and rim lighting to your sprite"
          aria-label="Render Volumetric Optics - Apply Material Shading"
          className="text-xs py-2 font-bold justify-center flex items-center gap-1.5"
        >
          <PixelIcon name="lamp" size={14} />
          <span>Apply Material Shading</span>
        </TactileButton>
      </div>
    </PanelSection>
  );
};
