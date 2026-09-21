'use client';

import React, { useState, useEffect } from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { studioEvents } from '@/lib/events/studioEvents';
import { TactileButton } from '@/components/ui/TactileButton';
import { PixelIcon } from '@/components/ui/PixelIcon';
import PanelSection from '@/components/ui/PanelSection';
import StudioSlider from '@/components/ui/StudioSlider';

const SHADOW_COLOR_PRESETS = [
  { label: 'Indigo', hex: '#180B26' },
  { label: 'Obsidian', hex: '#0A0612' },
  { label: 'Umber', hex: '#26140B' },
  { label: 'Violet', hex: '#2E1065' },
  { label: 'Teal/Fog', hex: '#062419' },
];

export const RaymarchedShadowSection: React.FC = () => {
  const canvasWidth = useStudioStore((s) => s.canvasWidth);
  const canvasHeight = useStudioStore((s) => s.canvasHeight);
  const tools = useStudioStore((s) => s.tools);
  const showNormalMapPreview = useStudioStore((s) => s.showNormalMapPreview);
  const toggleNormalMapPreview = useStudioStore((s) => s.toggleNormalMapPreview);

  const [mode, setMode] = useState<'auto' | 'manual'>('auto');
  const [shadowLightX, setShadowLightX] = useState<number>(Math.round(canvasWidth / 2));
  const [shadowLightY, setShadowLightY] = useState<number>(Math.round(canvasHeight / 4));
  const [shadowAzimuth, setShadowAzimuth] = useState<number>(315);
  const [shadowElevation, setShadowElevation] = useState<number>(45);
  const [shadowLightRadius, setShadowLightRadius] = useState<number>(16);
  const [shadowOpacity, setShadowOpacity] = useState<number>(0.65);
  const [shadowColor, setShadowColor] = useState<string>('#180B26');
  const [shadowDitherMode, setShadowDitherMode] = useState<'none' | '2x2' | '4x4' | '8x8'>('none');
  const [shadowStyle, setShadowStyle] = useState<'cast' | 'drop'>('cast');
  const [inferredRationale, setInferredRationale] = useState<string>('');

  useEffect(() => {
    const unsub = studioEvents.on('pixibun:shadow-settings-inferred', (inferred) => {
      setShadowLightX(inferred.lightX);
      setShadowLightY(inferred.lightY);
      if (inferred.lightAzimuth !== undefined) setShadowAzimuth(inferred.lightAzimuth);
      if (inferred.lightElevation !== undefined) setShadowElevation(inferred.lightElevation);
      setShadowLightRadius(inferred.lightRadius);
      setShadowOpacity(inferred.shadowOpacity);
      setShadowColor(inferred.shadowColor);
      setShadowDitherMode(inferred.ditherMode);
      if (inferred.shadowStyle) setShadowStyle(inferred.shadowStyle);
      setInferredRationale(inferred.rationale);
    });
    return unsub;
  }, []);

  const handleAutoRenderCastShadow = () => {
    if (showNormalMapPreview) toggleNormalMapPreview();
    studioEvents.emit('pixibun:render-cast-shadow-auto', { shadowStyle });
  };

  const handleRenderCastShadow = () => {
    if (showNormalMapPreview) toggleNormalMapPreview();
    studioEvents.emit('pixibun:render-cast-shadow', {
      lightX: shadowLightX,
      lightY: shadowLightY,
      lightAzimuth: shadowAzimuth,
      lightElevation: shadowElevation,
      lightRadius: shadowLightRadius,
      shadowOpacity: shadowOpacity,
      shadowColor: shadowColor,
      ditherMode: shadowDitherMode,
      shadowStyle: shadowStyle,
      mode: 'bounded-2.5d',
    });
  };

  const handleAlignWithKeyLight = () => {
    const azRad = (tools.lightAzimuth * Math.PI) / 180;
    const elRad = (Math.max(15, tools.lightElevation) * Math.PI) / 180;
    const cx = Math.round(canvasWidth / 2);
    const cy = Math.round(canvasHeight / 2);
    const dist = Math.max(canvasWidth, canvasHeight) * (0.85 + 0.45 * (1 - Math.sin(elRad)));
    const lx = Math.round(cx + Math.sin(azRad) * dist);
    const ly = Math.round(cy - Math.cos(azRad) * dist);
    setShadowLightX(lx);
    setShadowLightY(ly);
    setShadowAzimuth(tools.lightAzimuth);
    setShadowElevation(tools.lightElevation);
  };

  return (
    <PanelSection
      title="Cast & Ground Shadows"
      ariaLabel="Cast & Ground Shadows (Raymarched Soft Shadows)"
      storageKey="pixibun:panel:shadows"
      defaultOpen={false}
      actions={<span className="text-[9px] font-sans text-[var(--text-muted)]">Floor Shadow</span>}
    >
      <div className="flex flex-col gap-2.5">
        {/* Mode Switch: Auto analysis vs Manual artist control */}
        <div
          className="inline-flex w-full bg-[var(--surface-0)] border border-[var(--desk-border)] rounded-[2px] p-0.5"
          role="group"
          aria-label="Raymarched soft shadows mode"
        >
          <button
            type="button"
            onClick={() => setMode('auto')}
            aria-pressed={mode === 'auto'}
            className={`flex-1 py-1 text-[10px] font-sans font-medium text-center rounded-[1px] transition-colors cursor-pointer flex items-center justify-center gap-1 ${
              mode === 'auto'
                ? 'bg-[var(--surface-3)] text-[var(--text-heading)] font-semibold shadow-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text-heading)]'
            }`}
          >
            <PixelIcon name="sun" size={11} />
            <span>Auto</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('manual')}
            aria-pressed={mode === 'manual'}
            className={`flex-1 py-1 text-[10px] font-sans font-medium text-center rounded-[1px] transition-colors cursor-pointer flex items-center justify-center gap-1 ${
              mode === 'manual'
                ? 'bg-[var(--surface-3)] text-[var(--text-heading)] font-semibold shadow-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text-heading)]'
            }`}
          >
            <PixelIcon name="pen" size={11} />
            <span>Manual</span>
          </button>
        </div>

        {/* Shadow Style: Directional Cast vs Ground Drop (Classic RPG Oval) */}
        <div className="flex items-center justify-between text-xs font-mono bg-[var(--desk-surface-raised)] p-1.5 rounded-[2px] border border-[var(--desk-border)]">
          <span className="text-[10px] text-[var(--text-body)] font-bold">Style:</span>
          <div className="flex gap-1" role="group" aria-label="Shadow projection style">
            <button
              type="button"
              onClick={() => setShadowStyle('cast')}
              aria-pressed={shadowStyle === 'cast'}
              className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded-[1px] border transition-colors cursor-pointer ${
                shadowStyle === 'cast'
                  ? 'bg-[var(--accent-gold)] text-[var(--desk-bg)] border-[#8c5120] shadow-[0_1px_0_#8c5120]'
                  : 'bg-[var(--desk-surface)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[var(--accent-gold)]'
              }`}
            >
              Directional Cast
            </button>
            <button
              type="button"
              onClick={() => setShadowStyle('drop')}
              aria-pressed={shadowStyle === 'drop'}
              className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded-[1px] border transition-colors cursor-pointer ${
                shadowStyle === 'drop'
                  ? 'bg-[var(--accent-gold)] text-[var(--desk-bg)] border-[#8c5120] shadow-[0_1px_0_#8c5120]'
                  : 'bg-[var(--desk-surface)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[var(--accent-gold)]'
              }`}
            >
              Ground Drop (Oval)
            </button>
          </div>
        </div>

        {mode === 'auto' && (
          <div className="bg-[var(--desk-surface-raised)] p-2 rounded-[2px] border border-[var(--desk-border)] flex flex-col gap-2">
            <span className="text-[10px] font-mono font-bold text-[var(--text-body)] uppercase">
              Auto Floor Shadow
            </span>
            <p className="text-[9px] font-mono text-[var(--text-body)] opacity-80 leading-relaxed">
              Detects character baseline and lighting angle to automatically cast a soft ground shadow.
            </p>

            {/* Inferred Parameters Summary */}
            <div className="grid grid-cols-2 gap-1.5 bg-[var(--desk-surface)] p-2 rounded-[2px] border border-[var(--desk-border)] text-[9px] font-mono">
              <div className="flex flex-col">
                <span className="text-[var(--text-body)] opacity-70">Direction:</span>
                <span className="text-[var(--accent-gold)] font-bold">{shadowAzimuth}° / {shadowElevation}°</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[var(--text-body)] opacity-70">Softness (Blur):</span>
                <span className="text-[var(--accent-plum)] font-bold">{shadowLightRadius}px radius</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[var(--text-body)] opacity-70">Shadow Tint:</span>
                <div className="flex items-center gap-1">
                  <span
                    className="w-2.5 h-2.5 rounded-[1px] border border-[var(--accent-gold)]"
                    style={{ backgroundColor: shadowColor }}
                  />
                  <span className="text-[var(--accent-gold)] font-bold">{shadowColor.toUpperCase()}</span>
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-[var(--text-body)] opacity-70">Dither / Opacity:</span>
                <span className="text-[var(--accent-plum)] font-bold">{shadowDitherMode.toUpperCase()} ({Math.round(shadowOpacity * 100)}%)</span>
              </div>
            </div>

            {inferredRationale && (
              <div className="p-1.5 bg-[#26140b] text-[var(--accent-gold)] text-[9px] font-mono rounded-[2px] border border-[#8c5120] leading-relaxed">
                {inferredRationale}
              </div>
            )}

            <TactileButton
              size="sm"
              variant="primary"
              onClick={handleAutoRenderCastShadow}
              title="Analyze artwork baseline and cast a soft ground shadow"
              aria-label="Analyze & Cast Shadow"
              className="text-xs py-2 font-bold justify-center"
            >
              <PixelIcon name="sun" size={14} />
              <span>Add Floor Shadow</span>
            </TactileButton>
          </div>
        )}

        {mode === 'manual' && (
          <>
            {/* Quick Action: Align with Studio Key Light */}
            <div className="flex items-center justify-between bg-[var(--desk-surface-raised)] p-1.5 rounded-[2px] border border-[var(--desk-border)]">
              <span className="text-[9px] font-mono text-[var(--text-body)] opacity-80">
                Sync with {tools.lightAzimuth}° scene light:
              </span>
              <button
                type="button"
                onClick={handleAlignWithKeyLight}
                className="px-2 py-0.5 text-[9px] font-mono font-bold text-[var(--accent-gold)] bg-[var(--desk-surface)] hover:bg-[#3a204d] rounded-[1px] border border-[var(--desk-border)] transition-colors cursor-pointer"
              >
                Match Scene Light
              </button>
            </div>

            {/* Light Position Coordinates X & Y */}
            <div className="grid grid-cols-2 gap-4 bg-[var(--desk-surface-raised)] p-3 rounded-[2px] border border-[var(--desk-border)]">
              <StudioSlider
                label="Light X"
                value={shadowLightX}
                min={-canvasWidth}
                max={canvasWidth * 2}
                unit="px"
                onChange={(val) => setShadowLightX(val)}
              />
              <StudioSlider
                label="Light Y"
                value={shadowLightY}
                min={-canvasHeight}
                max={canvasHeight * 2}
                unit="px"
                onChange={(val) => setShadowLightY(val)}
              />
            </div>

            {/* Light Radius & Opacity */}
            <div className="grid grid-cols-2 gap-4 bg-[var(--desk-surface-raised)] p-3 rounded-[2px] border border-[var(--desk-border)]">
              <StudioSlider
                label="Softness Radius"
                value={shadowLightRadius}
                min={1}
                max={64}
                unit="px"
                onChange={(val) => setShadowLightRadius(val)}
              />
              <StudioSlider
                label="Opacity"
                value={Math.round(shadowOpacity * 100)}
                min={0}
                max={100}
                step={5}
                unit="%"
                onChange={(val) => setShadowOpacity(val / 100)}
              />
            </div>

            {/* Shadow Color Presets */}
            <div className="flex flex-col gap-1.5 bg-[var(--desk-surface-raised)] p-2 rounded-[2px] border border-[var(--desk-border)]">
              <div className="flex justify-between items-center text-[9px] font-mono">
                <span className="text-[var(--text-body)] font-bold">Shadow Tint:</span>
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-3.5 h-3.5 rounded-[1px] border border-[var(--accent-gold)]"
                    style={{ backgroundColor: shadowColor }}
                  />
                  <span className="text-[var(--accent-gold)] font-bold">{shadowColor.toUpperCase()}</span>
                </div>
              </div>

              <div className="flex gap-1">
                {SHADOW_COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.hex}
                    type="button"
                    onClick={() => setShadowColor(preset.hex)}
                    className={`flex-1 py-1 text-[8px] font-mono font-bold rounded-[1px] border transition-colors cursor-pointer text-center ${
                      shadowColor.toLowerCase() === preset.hex.toLowerCase()
                        ? 'border-[var(--accent-gold)] bg-[#3a204d] text-[var(--accent-gold)]'
                        : 'border-[var(--desk-border)] bg-[var(--desk-surface)] text-[var(--text-body)] hover:text-[var(--accent-gold)]'
                    }`}
                    title={`${preset.label} (${preset.hex})`}
                  >
                    {preset.label.split('/')[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Dither Mode Selector */}
            <div className="flex items-center justify-between text-xs font-mono bg-[var(--desk-surface-raised)] p-1.5 rounded-[2px] border border-[var(--desk-border)]">
              <span className="text-[10px] text-[var(--text-body)] font-bold">Dither Shading:</span>
              <div className="flex gap-1">
                {(['none', '2x2', '4x4', '8x8'] as const).map((dMode) => (
                  <button
                    key={dMode}
                    type="button"
                    onClick={() => setShadowDitherMode(dMode)}
                    className={`px-1.5 py-0.5 text-[9px] font-mono font-bold rounded-[1px] border transition-colors cursor-pointer ${
                      shadowDitherMode === dMode
                        ? 'bg-[var(--accent-gold)] text-[var(--desk-bg)] border-[#8c5120] shadow-[0_1px_0_#8c5120]'
                        : 'bg-[var(--desk-surface)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[var(--accent-gold)]'
                    }`}
                  >
                    {dMode.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Render Cast Shadow Button */}
            <TactileButton
              size="sm"
              variant="primary"
              onClick={handleRenderCastShadow}
              title="Generate a soft ground shadow on a new layer"
              aria-label="Render Cast Shadow"
              className="text-xs py-2 font-bold justify-center"
            >
              <PixelIcon name="sun" size={14} />
              <span>Cast Ground Shadow</span>
            </TactileButton>
          </>
        )}
      </div>
    </PanelSection>
  );
};
