'use client';

import React, { useRef } from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { parsePaletteFile } from '@/lib/color/lospecPalette';

export const PalettePanel: React.FC = () => {
  const {
    palettes,
    currentPaletteId,
    selectPalette,
    primaryColor,
    secondaryColor,
    setPrimaryColor,
    setSecondaryColor,
    generateAndAddRamp,
    addExtractedPalette,
  } = useStudioStore();

  const currentPalette = palettes.find((p) => p.id === currentPaletteId) || palettes[0];
  const paletteFileInputRef = useRef<HTMLInputElement | null>(null);

  const handlePaletteImportFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (!content) return;
      try {
        const pal = parsePaletteFile(content, file.name);
        addExtractedPalette(pal.name, pal.colors);
      } catch (err) {
        console.error('Failed to parse palette file:', err);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const file = e.dataTransfer.files?.[0];
        if (file) handlePaletteImportFile(file);
      }}
      className="flex-1 flex flex-col p-3 gap-3 overflow-hidden"
    >
      {/* Palette Selector & Quick Tools */}
      <div className="flex flex-col gap-2 pb-2 border-b border-[var(--desk-border)]">
        <select
          value={currentPaletteId}
          aria-label="Color palette preset"
          onChange={(e) => selectPalette(e.target.value)}
          className="bg-[var(--desk-surface-raised)] text-[var(--text-heading)] font-bold text-xs font-mono px-2.5 py-1.5 rounded-[2px] border-2 border-[var(--desk-border)] outline-none w-full cursor-pointer shadow-xs"
        >
          {palettes.map((pal) => (
            <option key={pal.id} value={pal.id}>
              {pal.name} ({pal.colors.length})
            </option>
          ))}
        </select>

        <div className="flex gap-1.5">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('pixibun:extract-palette'))}
            className="flex-1 bg-[var(--desk-surface-raised)] hover:bg-[#2e2040] text-[#f0be7c] font-bold text-[10px] font-mono py-1.5 rounded-[2px] border border-[var(--desk-border)] transition-colors cursor-pointer text-center"
            title="Scan canvas for unique colors and create new palette"
          >
            Scan Canvas
          </button>

          <button
            onClick={() => generateAndAddRamp(primaryColor)}
            className="flex-1 bg-[var(--desk-surface-raised)] hover:bg-[#2e2040] text-[#dcabdf] font-bold text-[10px] font-mono py-1.5 rounded-[2px] border border-[var(--desk-border)] transition-colors cursor-pointer text-center"
            title="Generate 5-step highlight & shadow ramp in OKLCH"
          >
            + OKLCH Ramp
          </button>

          <button
            onClick={() => paletteFileInputRef.current?.click()}
            className="flex-1 bg-[var(--desk-surface-raised)] hover:bg-[#2e2040] text-[#7ce0be] font-bold text-[10px] font-mono py-1.5 rounded-[2px] border border-[var(--desk-border)] transition-colors cursor-pointer text-center"
            title="Import Lospec .hex or GIMP .gpl palette file (or drag and drop)"
          >
            + Lospec (.hex)
          </button>

          <input
            ref={paletteFileInputRef}
            type="file"
            accept=".hex,.gpl,.txt,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handlePaletteImportFile(file);
              e.target.value = '';
            }}
          />
        </div>
      </div>

      {/* Color Swatch Grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-4 gap-2 bg-[var(--desk-surface)] p-2.5 rounded-[2px] border-2 border-[var(--desk-border)] shadow-xs">
          {currentPalette.colors.map((color, idx) => {
            const isPrimary = color.toLowerCase() === primaryColor.toLowerCase();
            const isSecondary = color.toLowerCase() === secondaryColor.toLowerCase();

            return (
              <button
                key={`${color}-${idx}`}
                onClick={() => setPrimaryColor(color)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setSecondaryColor(color);
                }}
                style={{ backgroundColor: color }}
                className={`h-8 w-full rounded-[2px] border-2 transition-transform hover:scale-110 active:scale-95 cursor-pointer relative ${
                  isPrimary
                    ? 'border-[#ffffff] ring-2 ring-[#f0be7c] shadow-sm'
                    : isSecondary
                    ? 'border-[#ffffff] ring-2 ring-[#dcabdf]'
                    : 'border-[#1a1126] hover:border-[#ffffff]'
                }`}
                title={`${color} (Left click: Primary | Right click: Secondary)`}
                aria-label={`Select color ${color}`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};
