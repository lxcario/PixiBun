'use client';

import React, { useEffect, useRef } from 'react';
import { ModalWrapper } from '@/components/ui/ModalWrapper';
import { POSTCARDS, postcardRgba, type Postcard, type PostcardId } from '@/lib/postcards/scenes';
import { createCycleRenderer } from '@/lib/color/cycleRenderer';

interface PostcardPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onChoose: (id: PostcardId) => void;
}

/** A postcard that is already moving, the way it will move on the desk. */
function LivePostcard({ card }: { card: Postcard }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const target = canvasRef.current?.getContext('2d');
    if (!target) return;
    const art = document.createElement('canvas');
    art.width = card.width; art.height = card.height;
    art.getContext('2d')!.putImageData(new ImageData(postcardRgba(card), card.width, card.height), 0, 0);
    const cycler = createCycleRenderer(art, card.palette, card.tracks);
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!cycler || reduce) { target.imageSmoothingEnabled = false; target.drawImage(art, 0, 0, target.canvas.width, target.canvas.height); return; }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => { cycler.render((now - start) / 1000, target); frame = requestAnimationFrame(tick); };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [card]);
  return <canvas ref={canvasRef} width={card.width * 3} height={card.height * 3} aria-hidden="true" className="block w-full h-auto [image-rendering:pixelated] rounded-[3px]" />;
}

/** File → Living postcard…: six scenes painted for color cycling. */
export function PostcardPicker({ isOpen, onClose, onChoose }: PostcardPickerProps) {
  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Living postcards" maxWidth="w-[760px] max-w-[95vw]">
      <div className="flex flex-col gap-3" data-testid="postcard-picker">
        <p className="text-xs text-[var(--text-body)] leading-relaxed">
          Six little scenes that move by color cycling, the old trick of making pixels flow by shifting the palette. Pick one, recolor its ramps in the Palette panel, then save a <strong>Cycle Loop</strong> or a cart to share it. Your current drawing is saved to Projects first.
        </p>
        <ul className="grid grid-cols-3 max-md:grid-cols-2 gap-3">
          {POSTCARDS.map(card => (
            <li key={card.id}>
              <button
                type="button"
                onClick={() => onChoose(card.id)}
                data-testid={`postcard-${card.id}`}
                className="w-full text-left rounded-[6px] border-2 border-[var(--desk-border)] bg-[var(--desk-surface)] p-2 hover:border-[var(--accent-gold)] focus-visible:border-[var(--accent-gold)] transition-colors cursor-pointer"
              >
                <LivePostcard card={card} />
                <span className="mt-2 block text-xs font-bold text-[var(--text-heading)]">{card.name}</span>
                <span className="block text-[11px] text-[var(--text-muted)] leading-snug">{card.blurb}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </ModalWrapper>
  );
}
