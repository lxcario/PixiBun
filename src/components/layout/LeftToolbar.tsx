'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useStudioStore } from '@/stores/studioStore';
import { PixelIcon, PixelIconName } from '@/components/ui/PixelIcon';
import { ToolType } from '@/types/tools';

// Heavy color picker dialog is code-split client-side (Phase 33): it mounts
// only while open, so its chunk is fetched on first open, never on page load.
const ColorPickerModal = dynamic(
  () => import('@/components/modals/ColorPickerModal').then((m) => m.ColorPickerModal),
  { ssr: false }
);

interface ToolItem {
  id: ToolType;
  label: string;
  shortcut: string;
  icon: PixelIconName;
}

const TOOL_GROUPS: { groupName: string; tools: ToolItem[] }[] = [
  {
    groupName: 'Drawing',
    tools: [
      { id: 'pen', label: 'Pen', shortcut: 'B', icon: 'pen' },
      { id: 'curve', label: 'Bézier Curve', shortcut: 'C', icon: 'curve' },
      { id: 'eraser', label: 'Eraser', shortcut: 'E', icon: 'eraser' },
      { id: 'bucket', label: 'Flood Fill', shortcut: 'G', icon: 'bucket' },
      { id: 'dither', label: 'Dither Brush', shortcut: 'D', icon: 'dither' },
      { id: 'color-replace', label: 'Color Replace', shortcut: 'R', icon: 'color-replace' },
    ],
  },
  {
    groupName: 'Selection',
    tools: [
      { id: 'select-box', label: 'Marquee Box', shortcut: 'M', icon: 'select-box' },
      { id: 'select-lasso', label: 'Lasso Select', shortcut: 'Q', icon: 'select-lasso' },
      { id: 'select-wand', label: 'Magic Wand', shortcut: 'W', icon: 'select-wand' },
    ],
  },
  {
    groupName: 'Geometry',
    tools: [
      { id: 'line', label: 'Line', shortcut: 'L', icon: 'line' },
      { id: 'isometric-line', label: '2:1 Iso Line', shortcut: 'J', icon: 'isometric-line' },
      { id: 'rectangle', label: 'Rectangle', shortcut: 'U', icon: 'rectangle' },
      { id: 'ellipse', label: 'Ellipse', shortcut: 'O', icon: 'ellipse' },
    ],
  },
  {
    groupName: 'Utility',
    tools: [
      { id: 'eyedropper', label: 'Eyedropper', shortcut: 'I', icon: 'eyedropper' },
    ],
  },
];

export interface LeftToolbarProps {
  isPlaygroundMode?: boolean;
}

export const LeftToolbar: React.FC<LeftToolbarProps> = ({ isPlaygroundMode = false }) => {
  const {
    tools,
    setActiveTool,
    primaryColor,
    secondaryColor,
    setPrimaryColor,
    setSecondaryColor,
    swapColors,
    palettes,
    currentPaletteId,
    recentColors,
  } = useStudioStore();

  const [colorPickerTarget, setColorPickerTarget] = useState<'primary' | 'secondary' | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const currentPalette = palettes.find((p) => p.id === currentPaletteId) || palettes[0];

  const activeToolGroups = isPlaygroundMode
    ? [
        {
          groupName: 'Essential Drawing',
          tools: [
            { id: 'pen' as ToolType, label: 'Pen', shortcut: 'B', icon: 'pen' as PixelIconName },
            { id: 'eraser' as ToolType, label: 'Eraser', shortcut: 'E', icon: 'eraser' as PixelIconName },
          ],
        },
      ]
    : TOOL_GROUPS;

  return (
    <aside className="w-14 bg-[var(--desk-surface)] border-r-2 border-[var(--desk-border)] flex flex-col items-center py-2 justify-between select-none z-10 shadow-sm overflow-y-auto transition-colors duration-300">
      {/* 1. Categorized Tool Groups */}
      <div className="flex flex-col gap-2 w-full px-1.5 items-center">
        {activeToolGroups.map((group, gIdx) => (
          <div key={group.groupName} className="flex flex-col gap-1 w-full items-center">
            {gIdx > 0 && <div className="w-7 h-px bg-[var(--desk-border)] my-0.5" />}
            {group.tools.map((tool) => {
              const isActive = tools.activeTool === tool.id;
              return (
                <button
                  key={tool.id}
                  onClick={() => setActiveTool(tool.id)}
                  title={`${tool.label} (${tool.shortcut})`}
                  data-tutorial={`${tool.id}-tool`}
                  className={`w-9 h-9 rounded-[2px] border-2 flex items-center justify-center cursor-pointer transition-all ${
                    isActive
                      ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120] shadow-[0_2px_0_#8c5120] scale-105'
                      : 'bg-[var(--desk-surface-raised)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[#f0be7c] hover:bg-[#2e2040] active:scale-95'
                  }`}
                >
                  <PixelIcon name={tool.icon} size={17} />
                </button>
              );
            })}
          </div>
        ))}

      </div>

      {/* 2. Color Wells, Swap & Quick Palette Dock */}
      <div className="flex flex-col items-center gap-1.5 w-full px-1.5 pt-2 border-t border-[var(--desk-border)]">
        {/* Overlapping Primary / Secondary Color Wells */}
        <div className="relative w-10 h-10">
          {/* Secondary Color Well (Behind) */}
          <button
            type="button"
            onClick={() => setColorPickerTarget('secondary')}
            onContextMenu={(e) => {
              e.preventDefault();
              swapColors();
            }}
            style={{ backgroundColor: secondaryColor }}
            className="absolute bottom-0 right-0 w-6 h-6 rounded-[2px] border-2 border-[var(--desk-border)] shadow-[0_2px_0_var(--btn-shadow)] cursor-pointer hover:scale-110 transition-transform p-0"
            aria-label={`Secondary color ${secondaryColor}. Click to choose, right click to swap`}
            title={`Secondary Color (${secondaryColor}) - Click to Pick / Right-click to Swap`}
          />

          {/* Primary Color Well (Front) */}
          <button
            type="button"
            onClick={() => setColorPickerTarget('primary')}
            style={{ backgroundColor: primaryColor }}
            className="absolute top-0 left-0 w-6 h-6 rounded-[2px] border-2 border-[#f0be7c] shadow-[0_2px_4px_rgba(0,0,0,0.6)] cursor-pointer hover:scale-110 transition-transform p-0 z-10"
            aria-label={`Primary color ${primaryColor}. Click to choose`}
            title={`Primary Color (${primaryColor}) - Click to Pick Color`}
          />
        </div>

        {/* Swap Colors Button */}
        <button
          onClick={swapColors}
          className="text-[9px] font-mono font-bold bg-[var(--desk-surface-raised)] hover:bg-[#2e2040] border border-[var(--desk-border)] text-[var(--text-body)] hover:text-[#f0be7c] w-9 py-0.5 rounded-[2px] cursor-pointer transition-colors"
          title="Swap Colors (X)"
        >
          [X]
        </button>

        {/* Recent Colors Strip */}
        {isMounted && recentColors.length > 0 && (
          <div className="w-full pt-1 pb-1 flex flex-col items-center gap-1">
            <div className="text-[8px] font-mono font-bold text-[var(--text-muted)] w-full text-center tracking-tighter">RECENT</div>
            <div className="grid grid-cols-2 gap-1 w-full max-h-28 overflow-y-auto pr-0.5">
              {recentColors.map((color, idx) => {
                const isPrimary = color.toLowerCase() === primaryColor.toLowerCase();
                return (
                  <button
                    key={`recent-${color}-${idx}`}
                    onClick={() => setPrimaryColor(color)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setSecondaryColor(color);
                    }}
                    style={{ backgroundColor: color }}
                    className={`w-full h-3.5 rounded-[1px] border transition-transform hover:scale-110 cursor-pointer ${
                      isPrimary
                        ? 'border-[#ffffff] ring-1 ring-[#f0be7c] scale-105'
                        : 'border-[#140d1f]'
                    }`}
                    title={`${color} (Recent) (L: Primary | R: Secondary)`}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Quick Palette 8-Swatch Dock */}
        <div className="w-full pt-1 border-t border-[var(--desk-border)]/60 flex flex-col items-center gap-1">
          <div className="grid grid-cols-2 gap-1 w-full max-h-28 overflow-y-auto pr-0.5">
            {currentPalette.colors.slice(0, 8).map((color, idx) => {
              const isPrimary = color.toLowerCase() === primaryColor.toLowerCase();
              return (
                <button
                  key={`${color}-${idx}`}
                  onClick={() => setPrimaryColor(color)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setSecondaryColor(color);
                  }}
                  style={{ backgroundColor: color }}
                  className={`w-full h-3.5 rounded-[1px] border transition-transform hover:scale-110 cursor-pointer ${
                    isPrimary
                      ? 'border-[#ffffff] ring-1 ring-[#f0be7c] scale-105'
                      : 'border-[#140d1f]'
                  }`}
                  title={`${color} (L: Primary | R: Secondary)`}
                />
              );
            })}

            {/* Custom Color Picker Trigger */}
            <button
              onClick={() => setColorPickerTarget('primary')}
              className="w-full h-3.5 rounded-[1px] border border-dashed border-[#f0be7c] bg-[var(--desk-surface-raised)] hover:bg-[#2e2040] text-[#f0be7c] font-bold text-[9px] flex items-center justify-center cursor-pointer col-span-2"
              title="Pick Custom Color"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Full Color Picker Modal */}
      {colorPickerTarget && (
        <ColorPickerModal
          isOpen={Boolean(colorPickerTarget)}
          onClose={() => setColorPickerTarget(null)}
          target={colorPickerTarget}
        />
      )}
    </aside>
  );
};
