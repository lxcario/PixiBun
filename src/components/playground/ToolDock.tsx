'use client';

import React, { useMemo } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { useStudioStore } from '@/stores/studioStore';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { studioEvents } from '@/lib/events/studioEvents';
import { getTemplateRows } from '@/lib/art/playgroundLessons';
import { LESSON_PALETTE } from '@/lib/art/lessonPalette';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { useLessonActions } from './useLessonActions';

const SIZES = [1, 2, 3];

/** The colors the current pose uses, most common first, topped up from the project palette. */
function useLessonColors(): string[] {
  const template = useOnboardingStore((s) => s.getCurrentFrameTemplate());
  const palette = useStudioStore((s) => s.palettes.find(p => p.id === s.currentPaletteId) ?? s.palettes[0]);
  return useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of template ? getTemplateRows(template) : []) {
      for (const char of row) {
        const color = LESSON_PALETTE[char];
        if (color) counts.set(color, (counts.get(color) ?? 0) + 1);
      }
    }
    const colors = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([color]) => color);
    for (const color of palette?.colors ?? []) {
      if (colors.length >= 6) break;
      if (!colors.some(c => c.toLowerCase() === color.toLowerCase())) colors.push(color);
    }
    return colors.slice(0, 6);
  }, [template, palette]);
}

const dockButton = 'w-11 h-11 flex items-center justify-center rounded-[2px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] disabled:opacity-35 disabled:cursor-not-allowed';

export const ToolDock: React.FC = () => {
  const activeTool = useStudioStore((s) => s.tools.activeTool);
  const brushSize = useStudioStore((s) => s.tools.brushSize);
  const primaryColor = useStudioStore((s) => s.primaryColor);
  const canUndo = useStudioStore((s) => s.canUndo);
  const canRedo = useStudioStore((s) => s.canRedo);
  const isPlaying = useStudioStore((s) => s.isPlaying);
  const setActiveTool = useStudioStore((s) => s.setActiveTool);
  const setBrushSize = useStudioStore((s) => s.setBrushSize);
  const setPrimaryColor = useStudioStore((s) => s.setPrimaryColor);
  const colors = useLessonColors();
  const { clearFrame } = useLessonActions();
  const reduceMotion = Boolean(useReducedMotion());

  const tool = (id: 'pen' | 'eraser' | 'bucket', label: string, key: string, icon: 'pen' | 'eraser' | 'bucket' = id) => {
    const active = activeTool === id;
    return (
      <button
        type="button"
        data-testid={`${id}-tool`}
        aria-pressed={active}
        aria-label={`${label} (${key})`}
        title={`${label} (${key})`}
        onClick={() => setActiveTool(id)}
        className={`${dockButton} relative ${active ? 'pixel-primary-btn' : 'pixel-tactile-btn text-[var(--text-body)] hover:text-[var(--text-heading)]'}`}
      >
        <PixelIcon name={icon} size={18} />
      </button>
    );
  };

  return (
    <motion.nav
      aria-label="Drawing tools"
      initial={reduceMotion ? false : { opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 26, delay: 0.1 }}
      className="pointer-events-auto flex flex-col items-center gap-2 p-2 rounded-[3px] border-2 border-[var(--ink)] bg-[var(--desk-surface)] shadow-[0_4px_0_var(--ink)]"
    >
      {tool('pen', 'Pen', 'B')}
      {tool('bucket', 'Fill', 'G')}
      {tool('eraser', 'Eraser', 'E')}

      <div role="group" aria-label="Pen size" className="flex items-center gap-0.5 pt-1">
        {SIZES.map(size => (
          <button
            key={size}
            type="button"
            aria-pressed={brushSize === size}
            aria-label={`Pen size ${size}`}
            title={`Pen size ${size}`}
            onClick={() => setBrushSize(size)}
            className={`w-[15px] h-[18px] flex items-end justify-center pb-[3px] rounded-[1px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] ${brushSize === size ? 'bg-[var(--surface-3)]' : 'hover:bg-[var(--desk-surface-raised)]'}`}
          >
            <span className={brushSize === size ? 'bg-[var(--accent-gold)]' : 'bg-[var(--text-muted)]'} style={{ width: size * 3, height: size * 3 }} />
          </button>
        ))}
      </div>

      <div className="w-full h-px bg-[var(--desk-border)]" />

      <div role="group" aria-label="Colors" className="grid grid-cols-2 gap-1">
        {colors.map(color => {
          const active = primaryColor.toLowerCase() === color.toLowerCase();
          return (
            <button
              key={color}
              type="button"
              aria-pressed={active}
              aria-label={`Use color ${color}`}
              title={color}
              onClick={() => { setPrimaryColor(color); if (activeTool === 'eraser') setActiveTool('pen'); }}
              className={`relative w-5 h-5 rounded-[1px] border-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] ${active ? 'border-[var(--text-heading)]' : 'border-[var(--ink)]'}`}
              style={{ backgroundColor: color }}
            >
              {active && <motion.span layoutId="playground-color" className="absolute -inset-[4px] border-2 border-[var(--accent-gold)] rounded-[2px]" transition={{ type: 'spring', stiffness: 500, damping: 32 }} />}
            </button>
          );
        })}
      </div>

      <div className="w-full h-px bg-[var(--desk-border)]" />

      <div className="grid grid-cols-2 gap-1">
        <button type="button" disabled={!canUndo} onClick={() => studioEvents.emit('pixibun:undo')} title="Undo (Ctrl+Z)" aria-label="Undo"
          className="w-[21px] h-8 flex items-center justify-center pixel-tactile-btn rounded-[2px] text-[var(--text-body)] hover:text-[var(--text-heading)] disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed">
          <PixelIcon name="undo" size={12} />
        </button>
        <button type="button" disabled={!canRedo} onClick={() => studioEvents.emit('pixibun:redo')} title="Redo (Ctrl+Y)" aria-label="Redo"
          className="w-[21px] h-8 flex items-center justify-center pixel-tactile-btn rounded-[2px] text-[var(--text-body)] hover:text-[var(--text-heading)] disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed">
          <PixelIcon name="redo" size={12} />
        </button>
      </div>

      <button
        type="button"
        onClick={clearFrame}
        disabled={isPlaying}
        title="Erase everything on this frame (you can Undo)"
        className={`${dockButton} h-9 pixel-tactile-btn text-[var(--text-muted)] hover:text-[var(--state-danger)]`}
      >
        <PixelIcon name="trash" size={14} />
        <span className="sr-only">Clear frame</span>
      </button>
    </motion.nav>
  );
};
