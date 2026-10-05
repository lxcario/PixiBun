'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { useStudioStore } from '@/stores/studioStore';
import { PixelIcon } from '@/components/ui/PixelIcon';

const ColorPickerModal = dynamic(
  () => import('@/components/modals/ColorPickerModal').then((m) => m.ColorPickerModal),
  { ssr: false }
);

export const QuickPaletteBar: React.FC = () => {
  const primaryColor = useStudioStore((s) => s.primaryColor);
  const secondaryColor = useStudioStore((s) => s.secondaryColor);
  const setPrimaryColor = useStudioStore((s) => s.setPrimaryColor);
  const setSecondaryColor = useStudioStore((s) => s.setSecondaryColor);
  const palettes = useStudioStore((s) => s.palettes);
  const currentPaletteId = useStudioStore((s) => s.currentPaletteId);
  const setActiveInspectorTab = useStudioStore((s) => s.setActiveInspectorTab);

  const [colorPickerTarget, setColorPickerTarget] = useState<'primary' | 'secondary' | null>(null);

  const currentPalette = palettes.find((p) => p.id === currentPaletteId) || palettes[0];
  const colors = currentPalette?.colors ?? [];

  const handleSwap = () => {
    const temp = primaryColor;
    setPrimaryColor(secondaryColor);
    setSecondaryColor(temp);
  };

  return (
    <section
      aria-label="Quick palette strip"
      className="px-2 py-1.5 bg-[var(--desk-surface-raised)]/50 border-b border-[var(--desk-border)] flex items-center gap-1.5 min-w-0 max-w-full shrink-0 select-none"
    >
      {/* Dual Foreground / Background Color Indicator & Quick Swap */}
      <div className="flex items-center gap-0.5 shrink-0" title="Color swatch: Click to customize, or click ⇄ to swap (X)">
        <div className="relative w-6 h-6 mr-1">
          {/* Secondary Color (Background) */}
          <button
            type="button"
            onClick={() => setColorPickerTarget('secondary')}
            className="absolute bottom-0 right-0 w-4 h-4 rounded-[1px] border border-[var(--desk-border)] shadow-xs transition-transform hover:scale-110 focus:outline-none focus:ring-1 focus:ring-[var(--accent-plum)]"
            style={{ backgroundColor: secondaryColor }}
            title={`Background color: ${secondaryColor} (Click to edit)`}
            aria-label={`Background color ${secondaryColor}`}
          />
          {/* Primary Color (Foreground) */}
          <button
            type="button"
            onClick={() => setColorPickerTarget('primary')}
            className="absolute top-0 left-0 w-4 h-4 rounded-[1px] border border-white shadow-xs z-10 transition-transform hover:scale-110 focus:outline-none focus:ring-1 focus:ring-[var(--accent-gold)]"
            style={{ backgroundColor: primaryColor }}
            title={`Foreground color: ${primaryColor} (Click to edit)`}
            aria-label={`Foreground color ${primaryColor}`}
          />
        </div>

        {/* Swap Colors Button */}
        <button
          type="button"
          onClick={handleSwap}
          className="w-5 h-5 flex items-center justify-center rounded-[2px] text-[11px] font-bold text-[var(--text-muted)] hover:text-[var(--text-heading)] hover:bg-[var(--surface-0)] border border-transparent hover:border-[var(--desk-border)] transition-colors"
          title="Swap foreground & background colors (X)"
          aria-label="Swap foreground and background colors"
        >
          ⇄
        </button>
      </div>

      {/* Vertical separator */}
      <div className="w-[1px] h-4 bg-[var(--desk-border)] shrink-0" aria-hidden="true" />

      {/* Swatches Horizontal Scroll Strip */}
      <div className="flex items-center gap-1 overflow-x-auto min-w-0 flex-1 py-0.5 no-scrollbar">
        {colors.map((color, idx) => {
          const isPrimary = color.toLowerCase() === primaryColor.toLowerCase();
          const isSecondary = color.toLowerCase() === secondaryColor.toLowerCase();

          return (
            <button
              key={`${color}-${idx}`}
              type="button"
              onClick={() => setPrimaryColor(color)}
              onContextMenu={(e) => {
                e.preventDefault();
                setSecondaryColor(color);
              }}
              style={{ backgroundColor: color }}
              aria-label={`Select color ${color}`}
              aria-pressed={isPrimary}
              title={`${color} (Left-click: Primary | Right-click: Secondary)`}
              className={`w-4 h-4 shrink-0 rounded-[2px] border transition-all hover:scale-115 relative cursor-pointer ${
                isPrimary
                  ? 'border-white ring-2 ring-[var(--accent-gold)] z-10 scale-105'
                  : isSecondary
                  ? 'border-white ring-2 ring-[var(--accent-plum)] z-10 scale-105'
                  : 'border-[var(--desk-border)] hover:border-white/70'
              }`}
            />
          );
        })}
      </div>

      {/* Quick link to full palette tab */}
      <button
        type="button"
        onClick={() => setActiveInspectorTab('palette')}
        className="w-5 h-5 flex items-center justify-center shrink-0 rounded-[2px] text-[var(--text-muted)] hover:text-[var(--accent-gold)] hover:bg-[var(--surface-0)] border border-transparent hover:border-[var(--desk-border)] transition-colors"
        title="Open full palette manager"
        aria-label="Open full palette manager"
      >
        <PixelIcon name="palette" size={12} />
      </button>

      {/* Color Picker Modal */}
      {colorPickerTarget && (
        <ColorPickerModal
          isOpen={Boolean(colorPickerTarget)}
          onClose={() => setColorPickerTarget(null)}
          target={colorPickerTarget}
        />
      )}
    </section>
  );
};
