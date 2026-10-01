'use client';

import React, { useEffect, useState } from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { TactileButton } from '@/components/ui/TactileButton';
import { PixelIcon } from '@/components/ui/PixelIcon';
import PanelSection from '@/components/ui/PanelSection';
import StudioSlider from '@/components/ui/StudioSlider';
import { LightGizmoOverlay } from '@/components/studio/LightGizmoOverlay';
import { MaterialType } from '@/types/tools';
import { MATERIAL_PROFILES } from '@/lib/ai/math/photometricLighting';
import { studioEvents } from '@/lib/events/studioEvents';

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

export const PhotometricLightingSection: React.FC<{ taskView?: boolean }> = ({ taskView = false }) => {
  const canvasWidth = useStudioStore((s) => s.canvasWidth);
  const canvasHeight = useStudioStore((s) => s.canvasHeight);
  const tools = useStudioStore((s) => s.tools);
  const setLightAzimuth = useStudioStore((s) => s.setLightAzimuth);
  const setLightElevation = useStudioStore((s) => s.setLightElevation);
  const setLightBrightness = useStudioStore((s) => s.setLightBrightness);
  const setSourceShadingRemoval = useStudioStore((s) => s.setSourceShadingRemoval);
  const setMaterialPreset = useStudioStore((s) => s.setMaterialPreset);
  const setFormType = useStudioStore((s) => s.setFormType);
  const setMinecraftSkinMode = useStudioStore((s) => s.setMinecraftSkinMode);
  const setCavityStrength = useStudioStore((s) => s.setCavityStrength);
  const setDitherModulation = useStudioStore((s) => s.setDitherModulation);
  const setShadingBands = useStudioStore((s) => s.setShadingBands);
  const showNormalMapPreview = useStudioStore((s) => s.showNormalMapPreview);
  const toggleNormalMapPreview = useStudioStore((s) => s.toggleNormalMapPreview);

  const [advancedLightingExpanded, setAdvancedLightingExpanded] = useState(false);
  const [analysisSummary, setAnalysisSummary] = useState<{
    formType: 'character' | 'orb' | 'prop';
    material: string;
    sourceLightAzimuth: number;
    sourceLightElevation: number;
    cueStrength: number;
    cavityStrength: number;
    rationale: string;
  } | null>(null);
  // 'auto' = analyze the artwork and infer lighting (legacy smart shading);
  // 'manual' = full artist control over direction, material and exposure.
  const [mode, setMode] = useState<'auto' | 'manual'>('auto');

  useEffect(() => studioEvents.on('pixibun:photometric-analysis', setAnalysisSummary), []);

  const handleAutoRenderPhotometric = () => {
    if (showNormalMapPreview) toggleNormalMapPreview();
    studioEvents.emit('pixibun:photometric-gizmo-start', { auto: true });
  };

  const handleStartLightGizmo = () => {
    if (showNormalMapPreview) toggleNormalMapPreview();
    studioEvents.emit('pixibun:photometric-gizmo-start', { auto: false });
  };

  const handleRenderPhotometricLighting = () => {
    if (showNormalMapPreview) toggleNormalMapPreview();
    studioEvents.emit('pixibun:photometric-lighting', {
      lightAzimuth: tools.lightAzimuth,
      lightElevation: tools.lightElevation,
      lightRadius: tools.lightRadius,
      lightBrightness: tools.lightBrightness,
      sourceShadingRemoval: tools.sourceShadingRemoval,
      lightColor: '#FFFFFF',
      ambientIntensity: 0.35,
      material: tools.materialPreset,
      cavityStrength: tools.cavityStrength,
      ditherModulation: tools.ditherModulation,
      bayerSize: '4x4',
      paletteColors: [],
    });
  };

  const handleBakeNormalMap = () => {
    if (showNormalMapPreview) toggleNormalMapPreview();
    studioEvents.emit('pixibun:bake-normal-map');
  };

  const handleSpecularHighlight = () => {
    if (showNormalMapPreview) toggleNormalMapPreview();
    if (showNormalMapPreview) toggleNormalMapPreview();
    studioEvents.emit('pixibun:highlight', {
      lightAzimuth: tools.lightAzimuth,
      lightElevation: tools.lightElevation,
      highlightColor: '#FFFFFF',
    });
  };

  const handleSelOut = () => {
    if (showNormalMapPreview) toggleNormalMapPreview();
    studioEvents.emit('pixibun:sel-out', {
      lightAzimuth: tools.lightAzimuth,
      lightElevation: tools.lightElevation,
    });
  };

  return (
    <PanelSection
      title="Light your sprite"
      description="Move a light to preview highlights and shading."
      icon="lamp"
      storageKey={taskView ? 'pixibun:panel:lighting-task:v2' : 'pixibun:panel:lighting'}
      defaultOpen={true}
    >
      <div className="flex flex-col gap-2.5">
        {canvasWidth === 64 && (canvasHeight === 64 || canvasHeight === 32) && (
          <div className="flex flex-col gap-1.5 p-2 bg-[var(--desk-surface-raised)] rounded-[2px] border border-[var(--desk-border)]">
            <div className="flex items-center justify-between text-[10px] font-sans">
              <span className="flex items-center gap-1 font-medium text-[var(--text-heading)]">
                <PixelIcon name="layers" size={11} className="text-[var(--accent-gold)]" />
                <span>Skin 3D Shading ({canvasWidth}x{canvasHeight})</span>
              </span>
              <div className="flex items-center gap-0.5 bg-[var(--surface-0)] p-0.5 rounded-[2px] border border-[var(--desk-border)]">
                {(['auto', 'enabled', 'disabled'] as const).map((m) => {
                  const active = (tools.minecraftSkinMode ?? 'auto') === m;
                  const label = m === 'auto' ? 'Auto' : m === 'enabled' ? 'On' : 'Off';
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMinecraftSkinMode(m)}
                      className={`px-1.5 py-0.5 text-[9px] font-sans font-medium uppercase rounded-[1px] transition-colors cursor-pointer ${
                        active
                          ? 'bg-[var(--surface-3)] text-[var(--text-heading)] font-semibold shadow-xs'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-body)]'
                      }`}
                      title={
                        m === 'auto'
                          ? 'Auto-detect: Only applies if canvas is a disjoint Minecraft UV atlas'
                          : m === 'enabled'
                          ? 'Force Minecraft 3D cuboid shading'
                          : 'Disable: Always use standard 2.5D character lighting'
                      }
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="text-[9px] font-sans text-[var(--text-muted)] leading-tight">
              {(tools.minecraftSkinMode ?? 'auto') === 'disabled' ? (
                <span className="text-[#a8e092]">✦ Standard character sprite lighting active</span>
              ) : (tools.minecraftSkinMode ?? 'auto') === 'enabled' ? (
                <span className="text-[var(--accent-gold)]">✦ Minecraft 3D block shading enabled</span>
              ) : (
                <span>✦ Automatic: Character sprites use curved lighting; Minecraft UV atlases use 3D block shading.</span>
              )}
            </div>
          </div>
        )}

        {/* Compact Segmented Mode Switcher: Auto analysis vs Manual artist control */}
        <div
          className="inline-flex w-full bg-[var(--surface-0)] border border-[var(--desk-border)] rounded-[2px] p-0.5"
          role="group"
          aria-label="Lighting setup"
        >
          <button
            type="button"
            onClick={() => setMode('auto')}
            aria-pressed={mode === 'auto'}
            className={`flex-1 min-h-8 py-1 text-[11px] font-sans font-medium text-center rounded-[1px] transition-colors cursor-pointer flex items-center justify-center gap-1 ${
              mode === 'auto'
                ? 'bg-[var(--surface-3)] text-[var(--text-heading)] font-semibold shadow-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text-heading)]'
            }`}
          >
            <PixelIcon name="sun" size={11} />
            <span>Auto setup</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('manual')}
            aria-pressed={mode === 'manual'}
            className={`flex-1 min-h-8 py-1 text-[11px] font-sans font-medium text-center rounded-[1px] transition-colors cursor-pointer flex items-center justify-center gap-1 ${
              mode === 'manual'
                ? 'bg-[var(--surface-3)] text-[var(--text-heading)] font-semibold shadow-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text-heading)]'
            }`}
          >
            <PixelIcon name="pen" size={11} />
            <span>Manual setup</span>
          </button>
        </div>
        <p className="text-[10px] leading-4 text-[var(--text-muted)]">
          {mode === 'auto'
            ? 'Auto chooses settings from your sprite.'
            : 'Choose the light direction and surface yourself.'}
        </p>

        {/* Shading Tones Mode: 1 Single | 2 Dual | 3 Trio */}
        <details className="group bg-[var(--surface-0)] rounded-[2px] border border-[var(--desk-border)]">
          <summary className="min-h-7 px-2 flex items-center justify-between gap-2 text-[10px] font-sans text-[var(--text-heading)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)]">
            <span className="flex items-center gap-1 font-medium"><span aria-hidden="true" className="inline-block text-[9px] group-open:rotate-90">▸</span>Shading style</span>
            <span className="text-[var(--accent-gold)] font-mono text-[9px]">
              {tools.shadingBands} shadow {tools.shadingBands === 1 ? 'tone' : 'tones'}
            </span>
          </summary>
          <div className="p-1.5 pt-0">
            <div className="grid grid-cols-3 gap-0.5" role="group" aria-label="Shading tones count">
              {([
                { count: 1 as const, label: '1 tone', title: 'One shadow shade' },
                { count: 2 as const, label: '2 tones', title: 'Two shadow shades' },
                { count: 3 as const, label: '3 tones', title: 'Three shadow shades' },
              ] as const).map(({ count, label, title }) => (
                <button
                  key={count}
                  type="button"
                  data-testid={`photometric-shade-${count}`}
                  onClick={() => setShadingBands(count)}
                  aria-pressed={tools.shadingBands === count}
                  title={title}
                  className={`min-h-6 py-1 text-[9px] font-sans font-medium text-center rounded-[1px] cursor-pointer transition-colors ${
                    tools.shadingBands === count
                      ? 'border border-[var(--accent-gold)] bg-[var(--surface-3)] text-[var(--accent-gold)] font-semibold shadow-xs'
                      : 'border border-[var(--desk-border)] text-[var(--text-muted)] hover:text-[var(--text-heading)] hover:bg-[var(--surface-1)]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </details>

        {mode === 'auto' && (
          <div className="flex flex-col gap-1">
            <TactileButton
              size="sm"
              variant="primary"
              onClick={handleAutoRenderPhotometric}
              title="Places an interactive light bulb on the canvas to preview shading live. Drag to adjust angle in real time, Enter to apply."
              aria-label="Preview lighting"
              data-testid="analyze-light-bulb"
              className="h-9 text-xs font-medium justify-center flex items-center gap-1.5"
            >
              <PixelIcon name="lamp" size={13} />
              <span>Preview lighting</span>
            </TactileButton>
            <span className="text-[9px] text-[var(--text-muted)] text-center">
              Drag the light on your artwork. Enter applies · Esc cancels.
            </span>
            {analysisSummary && (
              <details className="mt-1.5 rounded-[2px] border border-[var(--desk-border)] bg-[var(--surface-0)]">
                <summary className="min-h-8 px-2 flex items-center text-[11px] text-[var(--text-body)] cursor-pointer">Detected lighting settings</summary>
              <div className="p-2 flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2 text-[9px] font-mono">
                  <span className="text-[var(--text-heading)] uppercase">Detected {analysisSummary.formType}</span>
                  <span className="text-[var(--accent-gold)]">{analysisSummary.material}</span>
                </div>
                <div className="grid grid-cols-2 gap-x-2 text-[8px] font-mono text-[var(--text-muted)]">
                  <span>Source light</span>
                  <span className="text-right text-[var(--text-body)]">
                    {analysisSummary.cueStrength > 0.08
                      ? `${analysisSummary.sourceLightAzimuth}° / ${analysisSummary.sourceLightElevation}°`
                      : 'none detected'}
                  </span>
                  <span>Directional shading cue</span>
                  <span className="text-right text-[var(--text-body)]">
                    {analysisSummary.cueStrength < 0.25
                      ? 'Weak'
                      : analysisSummary.cueStrength < 0.65
                        ? 'Medium'
                        : 'Strong'}
                  </span>
                  <span>Crevice strength</span>
                  <span className="text-right text-[var(--text-body)]">{Math.round(analysisSummary.cavityStrength * 100)}%</span>
                </div>
                <p className="text-[8px] leading-snug text-[var(--text-muted)]">{analysisSummary.rationale}</p>
              </div>
              </details>
            )}
          </div>
        )}

        {mode === 'manual' && (
          <>
            {/* 1) Light Direction — single source of truth: drag the sun, or fine-tune below */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-sans font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Light Direction
              </span>
              <LightGizmoOverlay
                size={96}
                showLabels={false}
                className="self-center my-0.5"
              />
              <span className="text-[9px] font-sans text-[var(--text-muted)] text-center">
                Drag the sun around the dome — center = overhead light
              </span>

              {/* Fine-tune sliders */}
              <div className="flex flex-col gap-2.5 pt-1">
                <StudioSlider
                  label="Direction"
                  value={tools.lightAzimuth}
                  min={0}
                  max={360}
                  unit="°"
                  onChange={(val) => setLightAzimuth(val)}
                />
                <StudioSlider
                  label="Height"
                  value={tools.lightElevation}
                  min={0}
                  max={90}
                  unit="°"
                  onChange={(val) => setLightElevation(val)}
                />
              </div>
            </div>

            {/* 2) Material — visual chips */}
            <div className="flex flex-col gap-1.5 pt-1">
              <span className="text-[10px] font-sans font-medium text-[var(--text-muted)] uppercase tracking-wider">
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
                          ? 'border-[var(--accent-gold)] bg-[var(--surface-3)] text-[var(--accent-gold)]'
                          : 'border-[var(--desk-border)] bg-[var(--surface-0)] text-[var(--text-body)] hover:border-[var(--desk-border-highlight)] hover:bg-[var(--surface-1)]'
                      }`}
                    >
                      <span
                        className="w-4 h-4 rounded-full shrink-0 shadow-xs ring-1 ring-black/30"
                        style={{ background: chip.swatch }}
                        aria-hidden="true"
                      />
                      <span className="flex flex-col min-w-0">
                        <span className="text-[10px] font-sans font-medium leading-tight truncate">
                          {chip.label}
                        </span>
                        <span
                          className={`text-[8px] font-sans leading-tight truncate ${
                            selected ? 'text-[var(--accent-gold)]/80' : 'text-[var(--text-muted)]'
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
              className="w-full flex items-center justify-between p-1 rounded-[2px] border border-[var(--desk-border)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer mt-1"
              aria-expanded={advancedLightingExpanded}
            >
              <span className="text-[10px] font-sans font-medium text-[var(--text-muted)] uppercase tracking-wide">
                {advancedLightingExpanded ? '▼ Advanced Shading' : '▶ Advanced Shading'}
              </span>
              <span className="text-[9px] font-mono text-[var(--text-muted)]">
                {Math.round(tools.lightBrightness * 100)}% · AO {Math.round(tools.cavityStrength * 100)}%
              </span>
            </button>

            {advancedLightingExpanded && (
              <div className="p-2.5 rounded-[2px] border border-[var(--desk-border)] flex flex-col gap-2.5 bg-[var(--surface-0)]">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-sans text-[var(--text-muted)]">Surface interpretation</span>
                  <div className="grid grid-cols-4 gap-0.5" role="group" aria-label="Surface interpretation override">
                    {(['auto', 'character', 'prop', 'orb'] as const).map((formType) => (
                      <button
                        key={formType}
                        type="button"
                        onClick={() => setFormType(formType)}
                        aria-pressed={tools.formType === formType}
                        className={`px-1 py-1 rounded-[1px] border text-[8px] font-sans capitalize cursor-pointer ${
                          tools.formType === formType
                            ? 'border-[var(--accent-gold)] bg-[var(--surface-3)] text-[var(--accent-gold)]'
                            : 'border-[var(--desk-border)] text-[var(--text-muted)] hover:text-[var(--text-heading)]'
                        }`}
                      >
                        {formType}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Brightness / Exposure */}
                <StudioSlider
                  label="Brightness"
                  value={Math.round(tools.lightBrightness * 100)}
                  min={50}
                  max={200}
                  step={5}
                  unit="%"
                  onChange={(val) => setLightBrightness(val / 100)}
                />

                <StudioSlider
                  label="Remove Painted Shading"
                  value={Math.round(tools.sourceShadingRemoval * 100)}
                  min={0}
                  max={100}
                  step={5}
                  unit="%"
                  onChange={(val) => setSourceShadingRemoval(val / 100)}
                />
                <p className="text-[8px] leading-snug text-[var(--text-muted)]">
                  Conservatively reduces directional shading already painted into a color ramp. Set to 0% to preserve every authored shade.
                </p>

                {/* Cavity / Crevice Ambient Occlusion */}
                <StudioSlider
                  label="Darken creases"
                  value={Math.round(tools.cavityStrength * 100)}
                  min={0}
                  max={100}
                  step={5}
                  unit="%"
                  onChange={(val) => setCavityStrength(val / 100)}
                />

                {/* Dither Modulation */}
                <StudioSlider
                  label="Dither Strength"
                  value={Math.round(tools.ditherModulation * 100)}
                  min={0}
                  max={100}
                  step={5}
                  unit="%"
                  onChange={(val) => setDitherModulation(val / 100)}
                />
              </div>
            )}
          </>
        )}

        {/* Main Lighting Action Buttons */}
        <div className="flex flex-col gap-1.5 mt-1">
          {mode === 'manual' && (
            <div className="grid grid-cols-2 gap-1.5">
              <TactileButton
                size="sm"
                variant="primary"
                onClick={handleRenderPhotometricLighting}
                title="Bake directional light and shadow onto the canvas"
                aria-label="Apply lighting"
                data-testid="bake-light-button"
                className="text-xs py-1.5 font-medium justify-center flex items-center gap-1.5"
              >
                <PixelIcon name="sun" size={13} />
                <span>Apply lighting</span>
              </TactileButton>

              <TactileButton
                size="sm"
                variant="default"
                onClick={handleStartLightGizmo}
                title="Place an interactive light bulb on the canvas (Enter to apply, Esc to cancel)"
                aria-label="Preview lighting"
                data-testid="light-bulb-button"
                className="text-xs py-1.5 font-medium justify-center flex items-center gap-1.5"
              >
                <PixelIcon name="lamp" size={13} />
                <span>Preview lighting</span>
              </TactileButton>
            </div>
          )}

          <details className="group border border-[var(--desk-border)] rounded-[2px] bg-[var(--surface-0)]">
            <summary className="min-h-7 px-2 flex items-center gap-1 text-[10px] font-medium text-[var(--text-body)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)]">
              <span aria-hidden="true" className="inline-block text-[9px] group-open:rotate-90">▸</span>More lighting actions
            </summary>
            <div className="p-1.5 pt-0 flex flex-col gap-1.5">
              <div className="grid grid-cols-2 gap-1.5">
                <TactileButton
                  size="sm"
                  variant="default"
                  onClick={handleBakeNormalMap}
                  title="Save 3D surface depth angles into a new normal map layer"
                  className="text-[10px] py-1 font-medium flex items-center justify-center gap-1"
                >
                  <PixelIcon name="export" size={11} />
                  <span>Bake Normal Map</span>
                </TactileButton>

                <TactileButton
                  size="sm"
                  variant={showNormalMapPreview ? 'primary' : 'default'}
                  onClick={toggleNormalMapPreview}
                  title="Preview 3D surface depth angles on the canvas"
                  className="text-[10px] py-1 font-medium flex items-center justify-center gap-1"
                >
                  <PixelIcon name={showNormalMapPreview ? 'eye-off' : 'eye'} size={11} />
                  <span>{showNormalMapPreview ? 'Hide Normals' : 'View Normals'}</span>
                </TactileButton>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <TactileButton
                  size="sm"
                  variant="default"
                  onClick={handleSpecularHighlight}
                  title="Move the light bulb to preview a soft or crisp highlight"
                  className="text-[10px] py-1 font-medium flex items-center justify-center gap-1"
                >
                  <PixelIcon name="sun" size={11} />
                  <span>Specular Glint</span>
                </TactileButton>

                <TactileButton
                  size="sm"
                  variant="default"
                  onClick={handleSelOut}
                  title="Selective outline lighting (Sel-Out): soften highlights and deepen shadows along borders"
                  className="text-[10px] py-1 font-medium flex items-center justify-center gap-1"
                >
                  <PixelIcon name="pen" size={11} />
                  <span>Sel-Out</span>
                </TactileButton>
              </div>
            </div>
          </details>
        </div>
      </div>
    </PanelSection>
  );
};
