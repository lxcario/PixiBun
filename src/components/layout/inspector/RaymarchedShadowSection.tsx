'use client';

import React, { useState } from 'react';
import { useStudioStore } from '@/stores/studioStore';
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
    showNormalMapPreview,
    toggleNormalMapPreview,
  } = useStudioStore();

  const [shadowLightX, setShadowLightX] = useState<number>(Math.round(canvasWidth / 2));
  const [shadowLightY, setShadowLightY] = useState<number>(Math.round(canvasHeight / 4));
  const [shadowLightRadius, setShadowLightRadius] = useState<number>(16);
  const [shadowOpacity, setShadowOpacity] = useState<number>(0.6);
  const [shadowColor, setShadowColor] = useState<string>('#180B26');
  const [shadowDitherMode, setShadowDitherMode] = useState<'none' | '2x2' | '4x4' | '8x8'>('4x4');

  const handleRenderCastShadow = () => {
    if (showNormalMapPreview) toggleNormalMapPreview();
    window.dispatchEvent(
      new CustomEvent('pixibun:render-cast-shadow', {
        detail: {
          lightX: shadowLightX,
          lightY: shadowLightY,
          lightRadius: shadowLightRadius,
          shadowOpacity: shadowOpacity,
          shadowColor: shadowColor,
          ditherMode: shadowDitherMode,
        },
      })
    );
  };

  return (
    <div className="bg-[var(--desk-surface)] p-2.5 rounded-[2px] border-2 border-[var(--desk-border)] flex flex-col gap-2.5 shadow-xs">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono font-bold text-[#f0be7c] uppercase tracking-wider flex items-center gap-1">
          <PixelIcon name="sun" size={12} />
          <span>Raymarched Soft Shadows</span>
        </span>
        <span className="text-[9px] font-mono text-[#dcabdf] font-bold">2D Cone Tracing</span>
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

      {/* Shadow Color Presets & Custom Picker */}
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
          {(['none', '2x2', '4x4', '8x8'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setShadowDitherMode(mode)}
              className={`px-1.5 py-0.5 text-[9px] font-mono font-bold rounded-[1px] border transition-colors cursor-pointer ${
                shadowDitherMode === mode
                  ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120] shadow-[0_1px_0_#8c5120]'
                  : 'bg-[var(--desk-surface)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[#f0be7c]'
              }`}
            >
              {mode.toUpperCase()}
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
    </div>
  );
};
