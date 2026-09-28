'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import { useStudioStore } from '@/stores/studioStore';
import { PixelIcon, PixelIconName } from '@/components/ui/PixelIcon';
import { motion } from 'motion/react';
import { ToolType } from '@/types/tools';
import {
  DrawingToolPreview,
  DrawingToolsPreviewLayer,
} from '@/components/ui/ToolMotionPreview';

// Heavy color picker dialog is code-split client-side (Phase 33): it mounts
// only while open, so its chunk is fetched on first open, never on page load.
const ColorPickerModal = dynamic(
  () => import('@/components/modals/ColorPickerModal').then((m) => m.ColorPickerModal),
  { ssr: false }
);

import { TOOL_GROUPS } from '@/config/shortcuts';

export interface LeftToolbarProps {
  isPlaygroundMode?: boolean;
}

export const LeftToolbar: React.FC<LeftToolbarProps> = ({ isPlaygroundMode = false }) => {
  const tools = useStudioStore((s) => s.tools);
  const setActiveTool = useStudioStore((s) => s.setActiveTool);
  const primaryColor = useStudioStore((s) => s.primaryColor);
  const secondaryColor = useStudioStore((s) => s.secondaryColor);
  const setPrimaryColor = useStudioStore((s) => s.setPrimaryColor);
  const setSecondaryColor = useStudioStore((s) => s.setSecondaryColor);
  const swapColors = useStudioStore((s) => s.swapColors);
  const palettes = useStudioStore((s) => s.palettes);
  const currentPaletteId = useStudioStore((s) => s.currentPaletteId);
  const recentColors = useStudioStore((s) => s.recentColors);
  const loadRecentColors = useStudioStore((s) => s.loadRecentColors);
  const setActiveInspectorTab = useStudioStore((s) => s.setActiveInspectorTab);

  const [colorPickerTarget, setColorPickerTarget] = useState<'primary' | 'secondary' | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
  const [activeFlyoutTarget, setActiveFlyoutTarget] = useState<'primary' | 'secondary'>('primary');
  const wellsContainerRef = useRef<HTMLDivElement>(null);
  const flyoutRef = useRef<HTMLDivElement>(null);
  const [flyoutBottom, setFlyoutBottom] = useState<number | null>(null);

  useEffect(() => {
    setIsMounted(true);
    loadRecentColors();
  }, [loadRecentColors]);

  const calculateFlyoutBottom = useCallback((triggerEl?: HTMLElement | null) => {
    const el = triggerEl || wellsContainerRef.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      const timelineEl = typeof document !== 'undefined' ? document.querySelector('footer') : null;
      const timelineHeight = timelineEl ? timelineEl.getBoundingClientRect().height : 112;
      const desiredBottom = window.innerHeight - rect.bottom;
      return Math.max(timelineHeight + 8, desiredBottom);
    }
    return 120;
  }, []);

  const openFlyout = useCallback((target: 'primary' | 'secondary', triggerEl?: HTMLElement | null) => {
    setActiveFlyoutTarget(target);
    const calculated = calculateFlyoutBottom(triggerEl);
    setFlyoutBottom(calculated);
    setIsFlyoutOpen(true);
  }, [calculateFlyoutBottom]);

  const toggleFlyout = useCallback((e?: React.MouseEvent<HTMLElement>) => {
    if (!isFlyoutOpen) {
      openFlyout('primary', e?.currentTarget);
    } else {
      setIsFlyoutOpen(false);
    }
  }, [isFlyoutOpen, openFlyout]);

  const updateFlyoutCoords = useCallback(() => {
    const calculated = calculateFlyoutBottom();
    setFlyoutBottom(calculated);
  }, [calculateFlyoutBottom]);

  const resetDefaultColors = useCallback(() => {
    setPrimaryColor('#000000');
    setSecondaryColor('#ffffff');
  }, [setPrimaryColor, setSecondaryColor]);

  useEffect(() => {
    if (!isFlyoutOpen) return;
    updateFlyoutCoords();

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        wellsContainerRef.current && !wellsContainerRef.current.contains(target) &&
        flyoutRef.current && !flyoutRef.current.contains(target)
      ) {
        setIsFlyoutOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFlyoutOpen(false);
    };

    window.addEventListener('resize', updateFlyoutCoords);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('resize', updateFlyoutCoords);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFlyoutOpen, updateFlyoutCoords]);

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

  const handleApplyColor = (color: string, overrideTarget?: 'primary' | 'secondary') => {
    const target = overrideTarget || activeFlyoutTarget;
    if (target === 'primary') {
      setPrimaryColor(color);
    } else {
      setSecondaryColor(color);
    }
  };

  return (
    <aside className="w-14 bg-[var(--desk-surface)] border-r border-[var(--desk-border)] flex flex-col items-center py-2 justify-between select-none z-10 overflow-y-auto transition-colors duration-150">
      {/* 1. Categorized Tool Groups */}
      <DrawingToolsPreviewLayer>
        <div className="flex flex-col gap-2 w-full px-1.5 items-center">
          {activeToolGroups.map((group, gIdx) => (
            <div key={group.groupName} className="flex flex-col gap-1 w-full items-center">
              {gIdx > 0 && <div className="w-7 h-[1px] bg-gradient-to-r from-transparent via-[var(--desk-border-highlight)]/40 to-transparent my-1" />}
              {group.tools.map((tool) => {
                const isActive = tools.activeTool === tool.id;
                return (
                  <DrawingToolPreview
                    key={tool.id}
                    toolId={tool.id}
                  >
                    <button
                      onClick={() => setActiveTool(tool.id)}
                      aria-label={tool.label}
                      data-testid={`${tool.id}-tool`}
                      data-tutorial={`${tool.id}-tool`}
                      className={`w-8 h-8 rounded-[2px] flex items-center justify-center cursor-pointer ${
                        isActive
                          ? 'pixel-primary-btn font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_1px_0_var(--btn-shadow)]'
                          : 'pixel-tactile-btn text-[var(--text-body)] hover:text-[var(--text-heading)]'
                      }`}
                    >
                      <PixelIcon name={tool.icon} size={16} />
                    </button>
                  </DrawingToolPreview>
                );
              })}
            </div>
          ))}
        </div>
      </DrawingToolsPreviewLayer>

      {/* 2. Professional Creative Suite Color Dock */}
      <div
        ref={wellsContainerRef}
        className="flex flex-col items-center gap-2 w-full px-1.5 pt-2 pb-1 border-t border-[var(--desk-border)] shrink-0"
      >
        {/* Overlapping Primary / Secondary Wells Cluster with Integrated Corner Micro-Actions */}
        <div className="relative w-10 h-10 select-none">
          {/* Swap Colors Micro-Action (Top-Right) */}
          <button
            type="button"
            onClick={swapColors}
            title="Swap Foreground & Background Colors (X)"
            aria-label="Swap colors (X)"
            className="absolute top-0 right-0 w-3.5 h-3.5 rounded-[1px] border border-[var(--desk-border)] bg-[var(--surface-0)] text-[var(--text-muted)] hover:text-[var(--accent-gold)] hover:border-[var(--accent-gold)] hover:bg-[var(--surface-2)] active:scale-90 flex items-center justify-center cursor-pointer transition-colors z-20 p-0 text-[9px] leading-none"
          >
            ⇄
          </button>

          {/* Default Colors Micro-Action (Bottom-Left) */}
          <button
            type="button"
            onClick={resetDefaultColors}
            title="Default Colors: Black & White (Shift+D)"
            aria-label="Reset default black and white colors (Shift+D)"
            className="absolute bottom-0 left-0 w-3.5 h-3.5 rounded-[1px] border border-[var(--desk-border)] bg-[var(--surface-0)] hover:border-[var(--accent-gold)] hover:bg-[var(--surface-2)] active:scale-90 flex items-center justify-center cursor-pointer transition-colors z-20 group p-0"
          >
            {/* Dual black & white micro squares */}
            <span className="relative w-2.5 h-2.5 block pointer-events-none">
              <span className="absolute bottom-0 right-0 w-1.5 h-1.5 bg-white border border-black/80 rounded-[0.5px]" />
              <span className="absolute top-0 left-0 w-1.5 h-1.5 bg-black border border-white/60 rounded-[0.5px]" />
            </span>
          </button>

          {/* Secondary Color Well (Behind, offset bottom-right) */}
          <button
            type="button"
            onClick={() => openFlyout('secondary')}
            onDoubleClick={() => {
              setIsFlyoutOpen(false);
              setColorPickerTarget('secondary');
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              swapColors();
            }}
            style={{ backgroundColor: secondaryColor }}
            className={`absolute bottom-0.5 right-0.5 w-[22px] h-[22px] rounded-[2px] border border-black/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_1px_3px_rgba(0,0,0,0.5)] cursor-pointer hover:brightness-110 active:scale-95 transition-transform p-0 ${
              isFlyoutOpen && activeFlyoutTarget === 'secondary'
                ? 'ring-1.5 ring-[var(--accent-plum)] z-15'
                : 'hover:ring-1 hover:ring-white/40 z-0'
            }`}
            aria-label={`Secondary color ${secondaryColor}. Click for quick swatches, double click for picker, right click to swap`}
            title={`Secondary Color (${secondaryColor})\nClick: Quick Swatches | Double click: Picker | Right-click: Swap`}
          />

          {/* Primary Color Well (Front, offset top-left) */}
          <button
            type="button"
            onClick={() => openFlyout('primary')}
            onDoubleClick={() => {
              setIsFlyoutOpen(false);
              setColorPickerTarget('primary');
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              swapColors();
            }}
            style={{ backgroundColor: primaryColor }}
            className={`absolute top-0.5 left-0.5 w-[24px] h-[24px] rounded-[2px] border border-black/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_2px_4px_rgba(0,0,0,0.6)] cursor-pointer hover:brightness-110 active:scale-95 transition-transform p-0 z-10 ${
              isFlyoutOpen && activeFlyoutTarget === 'primary'
                ? 'ring-1.5 ring-[var(--accent-gold)]'
                : 'hover:ring-1 hover:ring-white/40'
            }`}
            aria-label={`Primary color ${primaryColor}. Click for quick swatches, double click for picker, right click to swap`}
            title={`Primary Color (${primaryColor})\nClick: Quick Swatches | Double click: Picker | Right-click: Swap`}
          />
        </div>

        {/* Quick Swatches Tray & Flyout Trigger */}
        <div className="flex flex-col items-center gap-1 w-full pt-0.5">
          <div className="grid grid-cols-2 gap-1 p-0.5 bg-[var(--surface-0)]/60 rounded-[2px] border border-[var(--desk-border)]" suppressHydrationWarning>
            {(isMounted && recentColors.length >= 4 ? recentColors.slice(0, 4) : currentPalette.colors.slice(0, 4)).map((color, idx) => (
              <button
                key={`rail-swatch-${color}-${idx}`}
                onClick={() => setPrimaryColor(color)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setSecondaryColor(color);
                }}
                style={{ backgroundColor: color }}
                className="w-3.5 h-3.5 rounded-[1px] border border-black/40 hover:border-[var(--accent-gold)] hover:scale-110 transition-transform cursor-pointer"
                title={`${color} (Click: Primary | Right-click: Secondary)`}
              />
            ))}
          </div>

          {/* Discreet Flyout Trigger Button */}
          <button
            onClick={toggleFlyout}
            title="Quick Swatches & Color Access (Click to toggle)"
            aria-label="Quick Swatches Flyout"
            className={`w-9 h-3.5 rounded-[2px] border text-[8px] font-mono flex items-center justify-center gap-0.5 cursor-pointer transition-colors pixel-tactile-btn ${
              isFlyoutOpen
                ? 'bg-[var(--surface-2)] text-[var(--accent-gold)] border-[var(--accent-gold)]/60'
                : 'text-[var(--text-muted)] border-[var(--desk-border)] hover:text-[var(--text-heading)] hover:border-[var(--desk-border-highlight)]'
            }`}
          >
            <span className="w-0.5 h-0.5 rounded-full bg-current" />
            <span className="w-0.5 h-0.5 rounded-full bg-current" />
            <span className="w-0.5 h-0.5 rounded-full bg-current" />
          </button>
        </div>
      </div>

      {/* 3. Discreet Floating Color Flyout (Hoisted via Portal at z-9999) */}
      {isFlyoutOpen && isMounted && flyoutBottom !== null && createPortal(
        <motion.div
          ref={flyoutRef}
          role="region"
          aria-label="Color quick access flyout"
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -8 }}
          transition={{ duration: 0.1, ease: 'easeOut' }}
          style={{
            position: 'fixed',
            left: '58px',
            bottom: `${flyoutBottom}px`,
            zIndex: 9999,
            transformOrigin: 'left bottom',
            maxHeight: 'calc(100vh - 120px)',
          }}
          className="w-56 bg-[var(--surface-2)] border border-[var(--desk-border-highlight)] rounded-[2px] shadow-[0_8px_24px_rgba(0,0,0,0.7)] p-2.5 flex flex-col gap-2.5 text-xs font-sans select-none overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-1 border-b border-[var(--desk-border)]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent-gold)] font-sans">
              Color Access
            </span>
            <span className="text-[9px] text-[var(--text-muted)] font-mono">ESC</span>
          </div>

          {/* Active Target Switcher & Hex Info */}
          <div className="flex items-center justify-between gap-1 p-1 bg-[var(--surface-0)] rounded-[2px] border border-[var(--desk-border)]">
            <button
              onClick={() => setActiveFlyoutTarget('primary')}
              className={`flex-1 flex items-center gap-1.5 px-1.5 py-0.5 rounded-[2px] transition-colors cursor-pointer ${
                activeFlyoutTarget === 'primary'
                  ? 'bg-[var(--surface-2)] text-[var(--text-heading)] border border-[var(--accent-gold)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-heading)] border border-transparent'
              }`}
            >
              <span
                className="w-3.5 h-3.5 rounded-[1px] border border-[var(--desk-border)] shrink-0"
                style={{ backgroundColor: primaryColor }}
              />
              <div className="flex flex-col text-left leading-tight">
                <span className="text-[8px] font-sans font-medium text-[var(--text-muted)] uppercase">Pri</span>
                <span className="text-[9px] font-mono font-bold text-[var(--text-heading)] truncate max-w-[50px]">
                  {primaryColor}
                </span>
              </div>
            </button>

            <button
              onClick={swapColors}
              title="Swap Colors (X)"
              className="px-1 py-0.5 text-[10px] text-[var(--text-muted)] hover:text-[var(--accent-gold)] cursor-pointer"
            >
              ⇄
            </button>

            <button
              onClick={() => setActiveFlyoutTarget('secondary')}
              className={`flex-1 flex items-center gap-1.5 px-1.5 py-0.5 rounded-[2px] transition-colors cursor-pointer ${
                activeFlyoutTarget === 'secondary'
                  ? 'bg-[var(--surface-2)] text-[var(--text-heading)] border border-[var(--accent-plum)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-heading)] border border-transparent'
              }`}
            >
              <span
                className="w-3.5 h-3.5 rounded-[1px] border border-[var(--desk-border)] shrink-0"
                style={{ backgroundColor: secondaryColor }}
              />
              <div className="flex flex-col text-left leading-tight">
                <span className="text-[8px] font-sans font-medium text-[var(--text-muted)] uppercase">Sec</span>
                <span className="text-[9px] font-mono font-bold text-[var(--text-heading)] truncate max-w-[50px]">
                  {secondaryColor}
                </span>
              </div>
            </button>
          </div>

          {/* Quick Palette Swatches */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[9px] text-[var(--text-muted)]">
              <span className="truncate max-w-[120px] font-medium font-sans">{currentPalette.name}</span>
              <span className="font-mono text-[8px]">{currentPalette.colors.length}c</span>
            </div>
            <div className="grid grid-cols-8 gap-1">
              {currentPalette.colors.slice(0, 16).map((color, idx) => {
                const isSelected =
                  (activeFlyoutTarget === 'primary' ? primaryColor : secondaryColor).toLowerCase() ===
                  color.toLowerCase();
                return (
                  <button
                    key={`flyout-pal-${color}-${idx}`}
                    onClick={() => handleApplyColor(color)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      handleApplyColor(color, activeFlyoutTarget === 'primary' ? 'secondary' : 'primary');
                    }}
                    style={{ backgroundColor: color }}
                    className={`w-[21px] h-[21px] rounded-[1px] border transition-transform hover:scale-110 active:scale-95 cursor-pointer relative ${
                      isSelected
                        ? 'border-white ring-1 ring-[var(--accent-gold)] z-10'
                        : 'border-[var(--desk-border)]'
                    }`}
                    title={`${color} (Click: ${activeFlyoutTarget} | Right-click: alternate)`}
                  />
                );
              })}
            </div>
          </div>

          {/* Recent Colors */}
          {recentColors.length > 0 && (
            <div className="flex flex-col gap-1 pt-1 border-t border-[var(--desk-border)]">
              <span className="text-[9px] text-[var(--text-muted)] font-medium font-sans">Recent Colors</span>
              <div className="flex items-center gap-1 flex-wrap">
                {recentColors.slice(0, 8).map((color, idx) => (
                  <button
                    key={`flyout-rec-${color}-${idx}`}
                    onClick={() => handleApplyColor(color)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      handleApplyColor(color, activeFlyoutTarget === 'primary' ? 'secondary' : 'primary');
                    }}
                    style={{ backgroundColor: color }}
                    className="w-4 h-4 rounded-[1px] border border-[var(--desk-border)] hover:scale-110 cursor-pointer"
                    title={`${color} (Recent)`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Progressive Actions: Spectrum Picker & Full Palette Tab */}
          <div className="flex flex-col gap-1 pt-1 border-t border-[var(--desk-border)]">
            <button
              onClick={() => {
                setIsFlyoutOpen(false);
                setColorPickerTarget(activeFlyoutTarget);
              }}
              className="w-full py-1 px-2 text-[10px] font-sans font-medium pixel-tactile-btn text-[var(--text-body)] hover:text-[var(--text-heading)] border border-[var(--desk-border)] rounded-[2px] cursor-pointer flex items-center justify-between"
            >
              <span>Custom Spectrum Picker...</span>
              <span className="text-[10px] text-[var(--accent-gold)] font-mono">+</span>
            </button>
            <button
              onClick={() => {
                setIsFlyoutOpen(false);
                setActiveInspectorTab('palette');
              }}
              className="w-full py-1 px-2 text-[10px] font-sans font-medium pixel-tactile-btn text-[var(--accent-gold)] hover:bg-[var(--surface-3)] border border-transparent hover:border-[var(--desk-border)] rounded-[2px] cursor-pointer flex items-center justify-between transition-colors"
            >
              <span>Open Full Palette Tab</span>
              <span className="text-[10px]">▸</span>
            </button>
          </div>
        </motion.div>,
        document.body
      )}

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
