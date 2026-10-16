'use client';

import React, { useRef } from 'react';
import { ModalWrapper } from '@/components/ui/ModalWrapper';
import { PixelIcon } from '@/components/ui/PixelIcon';

/* `cells` is how many grid squares the little preview draws: denser for bigger canvases, but never finer than a readable 2.5 px. */
const SIZES: { size: number; hint: string; cells: number }[] = [
  { size: 16, hint: 'Tiny icon', cells: 4 },
  { size: 24, hint: 'Small sprite', cells: 6 },
  { size: 32, hint: 'Sprite', cells: 8 },
  { size: 48, hint: 'Character', cells: 10 },
  { size: 64, hint: 'Scene', cells: 12 },
  { size: 128, hint: 'Big scene', cells: 16 },
];

interface NewDrawingModalProps {
  isOpen: boolean;
  size: number;
  onSizeChange: (size: number) => void;
  onClose: () => void;
  onConfirm: (size: number) => void;
}

/** Confirms replacing the canvas and picks the new canvas size. */
export function NewDrawingModal({ isOpen, size, onSizeChange, onClose, onConfirm }: NewDrawingModalProps) {
  const group = useRef<HTMLDivElement>(null);
  const pick = (index: number) => {
    const next = SIZES[(index + SIZES.length) % SIZES.length];
    onSizeChange(next.size);
    group.current?.querySelector<HTMLButtonElement>(`[data-size="${next.size}"]`)?.focus();
  };
  const current = Math.max(0, SIZES.findIndex(entry => entry.size === size));

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Start a New Drawing?" maxWidth="w-[440px]">
      <div className="flex flex-col gap-4 text-[var(--text-body)]">
        <p className="m-0 text-[13px] leading-[19px]">
          This clears the canvas and starts a fresh, blank project. Your current drawing is saved first.
        </p>

        <div>
          <p id="new-drawing-size-label" className="pb-eyebrow" style={{ marginInline: 2 }}>Canvas size</p>
          <div
            ref={group}
            role="radiogroup"
            tabIndex={-1}
            aria-labelledby="new-drawing-size-label"
            className="pb-size-grid"
            onKeyDown={event => {
              const step = { ArrowRight: 1, ArrowDown: 3, ArrowLeft: -1, ArrowUp: -3 }[event.key];
              if (step) { event.preventDefault(); pick(current + step); }
              else if (event.key === 'Home') { event.preventDefault(); pick(0); }
              else if (event.key === 'End') { event.preventDefault(); pick(SIZES.length - 1); }
            }}
          >
            {SIZES.map(({ size: option, hint, cells }) => {
              const cell = 40 / cells;
              return (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  data-size={option}
                  aria-checked={size === option}
                  aria-label={`${option} by ${option} pixels, ${hint}`}
                  tabIndex={size === option ? 0 : -1}
                  onClick={() => onSizeChange(option)}
                  className="pb-size"
                >
                  <span aria-hidden="true" className="pb-size-preview" style={{ backgroundSize: `${cell}px ${cell}px` }} />
                  <span className="pb-size-label">{option}×{option}</span>
                  <span className="pb-size-hint">{hint}</span>
                </button>
              );
            })}
          </div>
        </div>

        <p className="pb-callout m-0">
          <PixelIcon name="export" size={14} />
          <span>Want a copy to keep? Export it as a PNG or a .pixibun project file before starting over.</span>
        </p>

        <div className="flex items-center justify-end gap-2.5 pt-1">
          <button type="button" className="pb-button" onClick={onClose}>
            Keep Drawing
          </button>
          <button type="button" className="pb-button" data-tone="danger" onClick={() => onConfirm(size)}>
            Start New Drawing
          </button>
        </div>
      </div>
    </ModalWrapper>
  );
}
