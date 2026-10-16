'use client';

import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { lazyPanel } from '@/components/system/lazyPanel';
import { useStudioStore } from '@/stores/studioStore';
import { PixelIcon, PixelIconName } from '@/components/ui/PixelIcon';
import { AnimatePresence } from 'motion/react';
import { ToolType } from '@/types/tools';
import {
  DrawingToolPreview,
  DrawingToolsPreviewLayer,
} from '@/components/ui/ToolMotionPreview';

// Heavy color picker dialog is code-split client-side (Phase 33): it mounts
// only while open, so its chunk is fetched on first open, never on page load.
const ColorPickerModal = lazyPanel(
  () => import('@/components/modals/ColorPickerModal').then((m) => m.ColorPickerModal),
  'Color picker'
);

import { EXTRAS_SLOT, TOOL_GROUPS, TOOL_SLOTS } from '@/config/shortcuts';
import { ToolSlotButton } from './ToolSlotButton';
import { ColorAccessFlyout, type ColorTarget } from './ColorAccessFlyout';
import { ToolRailLens } from '@/experimental/liquidControls/ToolRailLens';
import { planShelf, visibleGroups, type FoldStage } from '@/lib/layout/toolShelf';

// Client layout effects only; the server render keeps the full shelf.
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export interface LeftToolbarProps {
  isPlaygroundMode?: boolean;
}

export const LeftToolbar = React.memo(function LeftToolbar({ isPlaygroundMode = false }: LeftToolbarProps) {
  const activeTool = useStudioStore((s) => s.tools.activeTool);
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

  const [colorPickerTarget, setColorPickerTarget] = useState<ColorTarget | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
  const [activeFlyoutTarget, setActiveFlyoutTarget] = useState<ColorTarget>('primary');
  const wellsContainerRef = useRef<HTMLDivElement>(null);
  const flyoutTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setIsMounted(true);
    loadRecentColors();
  }, [loadRecentColors]);

  const openFlyout = useCallback((target: ColorTarget) => {
    setActiveFlyoutTarget(target);
    setIsFlyoutOpen(true);
  }, []);

  const closeFlyout = useCallback((restoreFocus: boolean) => {
    setIsFlyoutOpen(false);
    if (restoreFocus) flyoutTriggerRef.current?.focus();
  }, []);

  const openSpectrum = useCallback((target: ColorTarget) => {
    setIsFlyoutOpen(false);
    setColorPickerTarget(target);
  }, []);

  const resetDefaultColors = useCallback(() => {
    setPrimaryColor('#000000');
    setSecondaryColor('#ffffff');
  }, [setPrimaryColor, setSecondaryColor]);

  // Small windows: fold tool groups into flyout slots, only as many as needed.
  const toolScrollRef = useRef<HTMLDivElement>(null);
  const [folded, setFolded] = useState<ReadonlySet<FoldStage>>(() => new Set());
  useIsomorphicLayoutEffect(() => {
    const el = toolScrollRef.current;
    if (!el || isPlaygroundMode) return;
    const check = () => {
      const next = planShelf(el.clientHeight);
      setFolded(prev => (prev.size === next.size && [...next].every(group => prev.has(group)) ? prev : next));
    };
    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [isPlaygroundMode]);

  // Each slot shows the active tool if it is in that group, else the last one used there.
  const [lastUsed, setLastUsed] = useState<Record<string, ToolType>>({});
  useEffect(() => {
    const slot = TOOL_SLOTS.find(candidate => candidate.tools.includes(activeTool));
    if (slot) setLastUsed(prev => (prev[slot.id] === activeTool ? prev : { ...prev, [slot.id]: activeTool }));
  }, [activeTool]);

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
    <aside className="w-14 h-full max-h-full bg-[var(--desk-surface)] border-r border-[var(--desk-border)] flex flex-col items-center select-none z-10 transition-colors duration-150 relative overflow-hidden">
      {/* 1. Categorized Tool Groups: Scrollable Container */}
      <div
        ref={toolScrollRef}
        data-shelf={folded.size ? `folded ${[...folded].join(' ')}` : 'full'}
        className="flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden flex flex-col items-center py-2 px-1 custom-scrollbar"
      >
        <DrawingToolsPreviewLayer>
          <div className="lq-rail-host flex flex-col gap-1 w-full px-0.5 items-center">
            {/* Labs: a glass lens sweeps between tools (renders nothing when off) */}
            <ToolRailLens activeTool={activeTool} />
            {activeToolGroups.filter(group => isPlaygroundMode || visibleGroups(folded).some(name => name === group.groupName)).map((group, gIdx) => (
              <div
                key={group.groupName}
                role="group"
                aria-label={group.groupName}
                className="flex flex-col gap-1 w-full items-center"
              >
                {gIdx > 0 && (
                  <div
                    className="w-8 h-[1px] bg-[var(--desk-border)] my-0.5 shrink-0"
                    aria-hidden="true"
                  />
                )}
                {(folded.has(group.groupName as FoldStage) || (group.groupName === '2.5D Sculpt' && folded.has('Extras'))) && !isPlaygroundMode ? (group.groupName === '2.5D Sculpt' && folded.has('Extras') ? [EXTRAS_SLOT] : TOOL_SLOTS.filter(slot => slot.group === group.groupName)).map(slot => {
                  const holdsActive = slot.tools.includes(activeTool);
                  const shown = holdsActive ? activeTool : lastUsed[slot.id] ?? slot.tools[0];
                  return <ToolSlotButton key={slot.id} slot={slot} shown={shown} active={holdsActive} onChoose={setActiveTool} />;
                }) : group.tools.map((tool) => {
                  const isActive = activeTool === tool.id;
                  return (
                    <DrawingToolPreview
                      key={tool.id}
                      toolId={tool.id}
                    >
                      <button
                        onClick={() => setActiveTool(tool.id)}
                        aria-label={tool.label}
                        aria-pressed={isActive}
                        // The hover card names the tool and its key; a native title would stack on top of it.
                        aria-keyshortcuts={tool.shortcut ? tool.shortcut.replace(/ \+ /g, '+') : undefined}
                        data-testid={`${tool.id}-tool`}
                        data-tutorial={`${tool.id}-tool`}
                        className={`w-9 h-9 rounded-[2px] flex items-center justify-center cursor-pointer transition-all ${
                          isActive
                            ? 'pixel-primary-btn font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_1px_0_var(--btn-shadow)] ring-2 ring-[var(--accent-gold)] ring-offset-1 ring-offset-[var(--desk-surface)] z-10'
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
      </div>

      {/* 2. Professional Creative Suite Color Dock: Pinned at bottom */}
      <div
        ref={wellsContainerRef}
        data-testid="toolbar-color-dock"
        className="flex flex-col items-center gap-1 w-full px-1.5 pt-1 pb-1 border-t border-[var(--desk-border)] shrink-0 bg-[var(--desk-surface)] shadow-sm z-10"
      >
        {/* Compact overlapping wells, with swap and reset in the free corners. */}
        <div className="relative w-10 h-10 select-none">
          {/* Swap Colors Micro-Action (Top-Right) */}
          <button
            type="button"
            onClick={swapColors}
            title="Swap Foreground & Background Colors (X)"
            aria-label="Swap colors (X)"
            className="absolute top-0 right-0 w-3.5 h-3.5 rounded-[1px] border border-[var(--desk-border)] bg-[var(--surface-0)] text-[var(--text-muted)] hover:text-[var(--accent-gold)] hover:border-[var(--accent-gold)] hover:bg-[var(--surface-2)] flex items-center justify-center cursor-pointer transition-colors z-20 p-0 text-[9px] leading-none"
          >
            ⇄
          </button>

          {/* Default Colors Micro-Action (Bottom-Left) */}
          <button
            type="button"
            onClick={resetDefaultColors}
            title="Default Colors: Black & White (Shift+D)"
            aria-label="Reset default black and white colors (Shift+D)"
            className="absolute bottom-0 left-0 w-3.5 h-3.5 rounded-[1px] border border-[var(--desk-border)] bg-[var(--surface-0)] hover:border-[var(--accent-gold)] hover:bg-[var(--surface-2)] flex items-center justify-center cursor-pointer transition-colors z-20 group p-0"
          >
            {/* Dual black & white micro squares */}
            <span className="relative w-2.5 h-2.5 block pointer-events-none">
              <span className="absolute bottom-0 right-0 w-1.5 h-1.5 bg-white border border-black/80 rounded-[0.5px]" />
              <span className="absolute top-0 left-0 w-1.5 h-1.5 bg-black border border-white/60 rounded-[0.5px]" />
            </span>
          </button>

          {/* Secondary Color Well (Bottom-right) */}
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
            className={`absolute bottom-0.5 right-0.5 w-[22px] h-[22px] rounded-[2px] border border-black/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_1px_3px_rgba(0,0,0,0.5)] cursor-pointer hover:brightness-110 transition-colors p-0 ${
              isFlyoutOpen && activeFlyoutTarget === 'secondary'
                ? 'ring-1.5 ring-[var(--accent-plum)] z-15'
                : 'hover:ring-1 hover:ring-white/40 z-0'
            }`}
            aria-label={`Secondary color ${secondaryColor}. Click for quick swatches, double click for picker, right click to swap`}
            title={`Secondary Color (${secondaryColor})\nClick: Quick Swatches | Double click: Picker | Right-click: Swap`}
          />

          {/* Primary Color Well (Top-left) */}
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
            className={`absolute top-0.5 left-0.5 w-[24px] h-[24px] rounded-[2px] border border-black/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_2px_4px_rgba(0,0,0,0.6)] cursor-pointer hover:brightness-110 transition-colors p-0 z-10 ${
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
                className="w-3.5 h-3.5 rounded-[1px] border border-black/40 hover:border-[var(--accent-gold)] transition-colors cursor-pointer"
                aria-label={`Quick color ${color}`}
                title={`${color} (Click: Primary | Right-click: Secondary)`}
              />
            ))}
          </div>

          {/* Opens the Colors flyout: palette, shades, recent colors and hex entry */}
          <button
            ref={flyoutTriggerRef}
            type="button"
            onClick={() => (isFlyoutOpen ? closeFlyout(false) : openFlyout('primary'))}
            title="Colors: palette, shades, recent colors and hex"
            aria-label="Quick Swatches Flyout"
            aria-haspopup="dialog"
            aria-expanded={isFlyoutOpen}
            className={`w-9 h-6 rounded-[2px] border flex items-center justify-center cursor-pointer transition-colors pixel-tactile-btn ${
              isFlyoutOpen
                ? 'bg-[var(--surface-2)] text-[var(--accent-gold)] border-[var(--accent-gold)]/60'
                : 'text-[var(--text-muted)] border-[var(--desk-border)] hover:text-[var(--text-heading)] hover:border-[var(--desk-border-highlight)]'
            }`}
          >
            <PixelIcon name="swatches" size={16} />
          </button>
        </div>
      </div>

      {/* 3. Colors flyout, portaled above every panel */}
      {isMounted && createPortal(
        <AnimatePresence>
          {isFlyoutOpen && (
            <ColorAccessFlyout
              key="color-access"
              anchor={wellsContainerRef.current}
              target={activeFlyoutTarget}
              onTargetChange={setActiveFlyoutTarget}
              onClose={closeFlyout}
              onOpenSpectrum={openSpectrum}
            />
          )}
        </AnimatePresence>,
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
});
