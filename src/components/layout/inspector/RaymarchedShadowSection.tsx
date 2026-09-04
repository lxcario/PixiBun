'use client';

import React, { useState, useEffect } from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { studioEvents } from '@/lib/events/studioEvents';
import { TactileButton } from '@/components/ui/TactileButton';
import { PixelIcon } from '@/components/ui/PixelIcon';

const SHADOW_COLOR_PRESETS = [
  { label: 'Indigo', hex: '#180B26' },
  { label: 'Obsidian', hex: '#0A0612' },
  { label: 'Umber', hex: '#26140B' },
  { label: 'Violet', hex: '#2E1065' },
  { label: 'Teal/Fog', hex: '#062419' },
];

export const RaymarchedShadowSection: React.FC = () => {
  const {
    canvasWidth,
    canvasHeight,
    tools,
    showNormalMapPreview,
    toggleNormalMapPreview,
  } = useStudioStore();

  const [mode, setMode] = useState<'auto' | 'manual'>('auto');
  const [shadowLightX, setShadowLightX] = useState<number>(Math.round(canvasWidth / 2));
  const [shadowLightY, setShadowLightY] = useState<number>(Math.round(canvasHeight / 4));
  const [shadowAzimuth, setShadowAzimuth] = useState<number>(315);
  const [shadowElevation, setShadowElevation] = useState<number>(45);
  const [shadowLightRadius, setShadowLightRadius] = useState<number>(16);
  const [shadowOpacity, setShadowOpacity] = useState<number>(0.65);
  const [shadowColor, setShadowColor] = useState<string>('#180B26');
  const [shadowDitherMode, setShadowDitherMode] = useState<'none' | '2x2' | '4x4' | '8x8'>('4x4');
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
      setInferredRationale(inferred.rationale);
    });
    return unsub;
  }, []);

  const handleAutoRenderCastShadow = () => {
    if (showNormalMapPreview) toggleNormalMapPreview();
    window.dispatchEvent(new CustomEvent('pixibun:render-cast-shadow-auto'));
  };

  const handleRenderCastShadow = () => {
    if (showNormalMapPreview) toggleNormalMapPreview();
    window.dispatchEvent(
      new CustomEvent('pixibun:render-cast-shadow', {
        detail: {
          lightX: shadowLightX,
          lightY: shadowLightY,
          lightAzimuth: shadowAzimuth,
          lightElevation: shadowElevation,
          lightRadius: shadowLightRadius,
          shadowOpacity: shadowOpacity,
          shadowColor: shadowColor,
          ditherMode: shadowDitherMode,
          mode: 'bounded-2.5d',
        },
      })
    );
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
    <div className="bg-[var(--desk-surface)] p-2.5 rounded-[2px] border-2 border-[var(--desk-border)] flex flex-col gap-2.5 shadow-xs">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono font-bold text-[#f0be7c] uppercase tracking-wider flex items-center gap-1">
          <PixelIcon name="sun" size={12} />
          <span>Raymarched Soft Shadows</span>
        </span>
        <span className="text-[9px] font-mono text-[#dcabdf] font-bold">2.5D Ground Projection</span>
      </div>

      {/* Mode Switch: Auto analysis vs Manual artist control */}
      <div
        className="grid grid-cols-2 gap-1 p-1 bg-[var(--desk-surface-raised)] rounded-[2px] border border-[var(--desk-border)]"
        role="group"
        aria-label="Raymarched soft shadows mode"
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
        <div className="bg-[var(--desk-surface-raised)] p-2 rounded-[2px] border border-[var(--desk-border)] flex flex-col gap-2">
          <span className="text-[10px] font-mono font-bold text-[var(--text-body)] uppercase">
            Smart Shadow Analysis
          </span>
          <p className="text-[9px] font-mono text-[var(--text-body)] opacity-80 leading-relaxed">
            Analyzes the canvas art&apos;s silhouette, ground contact baseline, and scene lighting
            angle to automatically calculate light position, penumbra scale, and atmospheric tint.
          </p>

          {/* Inferred Parameters Summary */}
          <div className="grid grid-cols-2 gap-1.5 bg-[var(--desk-surface)] p-2 rounded-[2px] border border-[var(--desk-border)] text-[9px] font-mono">
            <div className="flex flex-col">
              <span className="text-[var(--text-body)] opacity-70">Direction:</span>
              <span className="text-[#f0be7c] font-bold">{shadowAzimuth}° / {shadowElevation}°</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[var(--text-body)] opacity-70">Penumbra Blur:</span>
              <span className="text-[#dcabdf] font-bold">{shadowLightRadius}px radius</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[var(--text-body)] opacity-70">Shadow Tint:</span>
              <div className="flex items-center gap-1">
                <span
                  className="w-2.5 h-2.5 rounded-[1px] border border-[#f0be7c]"
                  style={{ backgroundColor: shadowColor }}
                />
                <span className="text-[#f0be7c] font-bold">{shadowColor.toUpperCase()}</span>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-[var(--text-body)] opacity-70">Dither / Opacity:</span>
              <span className="text-[#dcabdf] font-bold">{shadowDitherMode.toUpperCase()} ({Math.round(shadowOpacity * 100)}%)</span>
            </div>
          </div>

          {inferredRationale && (
            <div className="p-1.5 bg-[#26140b] text-[#f0be7c] text-[9px] font-mono rounded-[2px] border border-[#8c5120] leading-relaxed">
              {inferredRationale}
            </div>
          )}

          <TactileButton
            size="sm"
            variant="primary"
            onClick={handleAutoRenderCastShadow}
            title="Analyze canvas art and cast physically accurate raymarched soft shadow"
            className="text-xs py-2 font-bold justify-center"
          >
            <PixelIcon name="sun" size={14} />
            <span>Analyze &amp; Cast Shadow</span>
          </TactileButton>
        </div>
      )}

      {mode === 'manual' && (
        <>
          {/* Quick Action: Align with Studio Key Light */}
          <div className="flex items-center justify-between bg-[var(--desk-surface-raised)] p-1.5 rounded-[2px] border border-[var(--desk-border)]">
            <span className="text-[9px] font-mono text-[var(--text-body)] opacity-80">
              Sync with {tools.lightAzimuth}° Gizmo:
            </span>
            <button
              type="button"
              onClick={handleAlignWithKeyLight}
              className="px-2 py-0.5 text-[9px] font-mono font-bold text-[#f0be7c] bg-[var(--desk-surface)] hover:bg-[#3a204d] rounded-[1px] border border-[var(--desk-border)] transition-colors cursor-pointer"
            >
              Align with Key Light
            </button>
          </div>

          {/* Light Position Coordinates X & Y */}
          <div className="grid grid-cols-2 gap-2 bg-[var(--desk-surface-raised)] p-2 rounded-[2px] border border-[var(--desk-border)]">
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[9px] font-mono">
                <span className="text-[var(--text-body)]">Light X:</span>
                <span className="text-[#f0be7c] font-bold">{shadowLightX}px</span>
              </div>
              <input
                type="range"
                min={-canvasWidth}
                max={canvasWidth * 2}
                value={shadowLightX}
                aria-label="Raymarched light source X coordinate"
                onChange={(e) => setShadowLightX(parseInt(e.target.value, 10))}
                className="w-full accent-[#f0be7c] cursor-pointer"
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[9px] font-mono">
                <span className="text-[var(--text-body)]">Light Y:</span>
                <span className="text-[#f0be7c] font-bold">{shadowLightY}px</span>
              </div>
              <input
                type="range"
                min={-canvasHeight}
                max={canvasHeight * 2}
                value={shadowLightY}
                aria-label="Raymarched light source Y coordinate"
                onChange={(e) => setShadowLightY(parseInt(e.target.value, 10))}
                className="w-full accent-[#f0be7c] cursor-pointer"
              />
            </div>
          </div>

          {/* Light Radius & Opacity */}
          <div className="grid grid-cols-2 gap-2 bg-[var(--desk-surface-raised)] p-2 rounded-[2px] border border-[var(--desk-border)]">
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[9px] font-mono">
                <span className="text-[var(--text-body)]">Light Size:</span>
                <span className="text-[#dcabdf] font-bold">{shadowLightRadius}px</span>
              </div>
              <input
                type="range"
                min={1}
                max={64}
                value={shadowLightRadius}
                aria-label="Raymarched area light radius (penumbra blur)"
                onChange={(e) => setShadowLightRadius(parseInt(e.target.value, 10))}
                className="w-full accent-[#dcabdf] cursor-pointer"
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[9px] font-mono">
                <span className="text-[var(--text-body)]">Opacity:</span>
                <span className="text-[#dcabdf] font-bold">{Math.round(shadowOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={shadowOpacity}
                aria-label="Raymarched shadow layer opacity"
                onChange={(e) => setShadowOpacity(parseFloat(e.target.value))}
                className="w-full accent-[#dcabdf] cursor-pointer"
              />
            </div>
          </div>

          {/* Shadow Color Presets */}
          <div className="flex flex-col gap-1.5 bg-[var(--desk-surface-raised)] p-2 rounded-[2px] border border-[var(--desk-border)]">
            <div className="flex justify-between items-center text-[9px] font-mono">
              <span className="text-[var(--text-body)] font-bold">Shadow Tint:</span>
              <div className="flex items-center gap-1.5">
                <span
                  className="w-3.5 h-3.5 rounded-[1px] border border-[#f0be7c]"
                  style={{ backgroundColor: shadowColor }}
                />
                <span className="text-[#f0be7c] font-bold">{shadowColor.toUpperCase()}</span>
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
                      ? 'border-[#f0be7c] bg-[#3a204d] text-[#f0be7c]'
                      : 'border-[var(--desk-border)] bg-[var(--desk-surface)] text-[var(--text-body)] hover:text-[#f0be7c]'
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
            <span className="text-[10px] text-[var(--text-body)] font-bold">Dither Filter:</span>
            <div className="flex gap-1">
              {(['none', '2x2', '4x4', '8x8'] as const).map((dMode) => (
                <button
                  key={dMode}
                  type="button"
                  onClick={() => setShadowDitherMode(dMode)}
                  className={`px-1.5 py-0.5 text-[9px] font-mono font-bold rounded-[1px] border transition-colors cursor-pointer ${
                    shadowDitherMode === dMode
                      ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120] shadow-[0_1px_0_#8c5120]'
                      : 'bg-[var(--desk-surface)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[#f0be7c]'
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
            title="Execute 2D sphere tracing over EDT distance field and composite non-destructive cast shadow layer"
            className="text-xs py-2 font-bold justify-center"
          >
            <PixelIcon name="sun" size={14} />
            <span>Render Cast Shadow</span>
          </TactileButton>
        </>
      )}
    </div>
  );
};
