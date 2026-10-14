'use client';

import React, { useState } from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { TactileButton } from '@/components/ui/TactileButton';
import { ModalWrapper } from '@/components/ui/ModalWrapper';

export type AnchorPosition = 
  | 'top-left' | 'top-center' | 'top-right'
  | 'middle-left' | 'center' | 'middle-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right';

interface CanvasResizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResize: (newWidth: number, newHeight: number, anchor: AnchorPosition, resample: boolean) => void;
}

const PRESETS = [16, 24, 32, 48, 64, 128];

export const CanvasResizeModal: React.FC<CanvasResizeModalProps> = ({
  isOpen,
  onClose,
  onResize,
}) => {
  const canvasWidth = useStudioStore((s) => s.canvasWidth);
  const canvasHeight = useStudioStore((s) => s.canvasHeight);

  const [width, setWidth] = useState(canvasWidth);
  const [height, setHeight] = useState(canvasHeight);
  const [lockAspect, setLockAspect] = useState(true);
  const [anchor, setAnchor] = useState<AnchorPosition>('center');
  const [resample, setResample] = useState(false);

  const handleWidthChange = (val: number) => {
    const clamped = Math.max(4, Math.min(512, val));
    setWidth(clamped);
    if (lockAspect) {
      const ratio = canvasHeight / canvasWidth;
      setHeight(Math.max(4, Math.min(512, Math.round(clamped * ratio))));
    }
  };

  const handleHeightChange = (val: number) => {
    const clamped = Math.max(4, Math.min(512, val));
    setHeight(clamped);
    if (lockAspect) {
      const ratio = canvasWidth / canvasHeight;
      setWidth(Math.max(4, Math.min(512, Math.round(clamped * ratio))));
    }
  };

  const handleApply = () => {
    onResize(width, height, anchor, resample);
    onClose();
  };

  const anchorPositions: AnchorPosition[] = [
    'top-left', 'top-center', 'top-right',
    'middle-left', 'center', 'middle-right',
    'bottom-left', 'bottom-center', 'bottom-right'
  ];

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Resize Canvas & Frame Bounds" maxWidth="w-[500px] max-w-[95vw]">
      {/* Quick Dimension Presets */}
      <div className="flex items-center gap-2 justify-between bg-[var(--desk-surface)] p-2.5 rounded-[2px] border-2 border-[var(--desk-border)] shadow-xs overflow-hidden">
        <span className="text-[11px] font-mono font-bold text-[var(--text-body)] shrink-0">PRESETS:</span>
        <div className="flex flex-wrap gap-1.5 justify-end">
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => {
                setWidth(p);
                setHeight(p);
              }}
              className={`px-2 py-1 rounded-[2px] border text-[11px] font-mono font-bold cursor-pointer transition-colors ${
                width === p && height === p
                  ? 'bg-[var(--primary-bg)] text-[var(--primary-fg)] border-[var(--ink)]'
                  : 'bg-[var(--desk-surface)] text-[var(--text-heading)] border-[var(--desk-border)] hover:border-[var(--accent-gold)]'
              }`}
            >
              {p}x{p}
            </button>
          ))}
        </div>
      </div>

      {/* Dimension Controls */}
      <div className="grid grid-cols-2 gap-3 bg-[var(--desk-surface)] p-3 rounded-[2px] border-2 border-[var(--desk-border)] shadow-xs">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-mono font-bold text-[var(--text-body)]">WIDTH (PX)</span>
          <input
            type="number"
            min={4}
            max={512}
            value={width}
            onChange={(e) => handleWidthChange(parseInt(e.target.value, 10) || 4)}
            className="bg-[var(--desk-surface)] text-[var(--text-heading)] font-mono font-bold text-sm px-2.5 py-1.5 rounded-[2px] border-2 border-[var(--desk-border)] focus:border-[var(--accent-gold)] outline-none"
          />
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-mono font-bold text-[var(--text-body)]">HEIGHT (PX)</span>
          <input
            type="number"
            min={4}
            max={512}
            value={height}
            onChange={(e) => handleHeightChange(parseInt(e.target.value, 10) || 4)}
            className="bg-[var(--desk-surface)] text-[var(--text-heading)] font-mono font-bold text-sm px-2.5 py-1.5 rounded-[2px] border-2 border-[var(--desk-border)] focus:border-[var(--accent-gold)] outline-none"
          />
        </div>

        <div className="col-span-2 flex items-center justify-between pt-1 border-t border-[var(--desk-border)] text-xs font-mono">
          <label className="flex items-center gap-2 cursor-pointer text-[var(--text-heading)] font-bold">
            <input
              type="checkbox"
              checked={lockAspect}
              onChange={(e) => setLockAspect(e.target.checked)}
              className="accent-[#f0be7c]"
            />
            <span>Lock Aspect Ratio</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-[var(--text-heading)] font-bold">
            <input
              type="checkbox"
              checked={resample}
              data-testid="resample-checkbox"
              aria-label="Scale Artwork (Resample)"
              onChange={(e) => setResample(e.target.checked)}
              className="accent-[#f0be7c]"
            />
            <span>Scale Artwork (Resample)</span>
          </label>
        </div>
      </div>

      {/* 9-Point Anchor Grid (Only shown when not resampling) */}
      {!resample && (
        <div
          data-testid="anchor-grid"
          className="flex items-center justify-between bg-[var(--desk-surface)] p-3 rounded-[2px] border-2 border-[var(--desk-border)] shadow-xs"
        >
          <div className="flex flex-col">
            <span className="text-xs font-mono font-bold text-[var(--text-heading)]">ANCHOR ALIGNMENT</span>
            <span className="text-[10px] font-mono text-[var(--text-muted)]">
              Where pixels stay when expanding/cropping
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1 bg-[var(--desk-surface)] p-1.5 rounded-[2px] border-2 border-[var(--desk-border)]">
            {anchorPositions.map((pos) => (
              <button
                key={pos}
                type="button"
                onClick={() => setAnchor(pos)}
                aria-label={`Anchor ${pos}`}
                data-testid={`anchor-${pos}`}
                className={`w-6 h-6 rounded-[2px] border flex items-center justify-center transition-all cursor-pointer ${
                  anchor === pos
                    ? 'bg-[var(--primary-bg)] border-[var(--ink)] shadow-xs scale-105'
                    : 'bg-[var(--desk-surface)] border-[var(--desk-border)] hover:bg-[#2e2040]'
                }`}
                title={`Anchor: ${pos}`}
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    anchor === pos ? 'bg-[var(--surface-0)]' : 'bg-[#d0c4df]/50'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2 border-t border-[var(--desk-border)]">
        <TactileButton
          size="sm"
          variant="default"
          onClick={onClose}
          className="bg-[var(--desk-surface)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[var(--accent-gold)]"
        >
          Cancel
        </TactileButton>
        <TactileButton
          size="sm"
          variant="primary"
          onClick={handleApply}
          className="bg-[var(--primary-bg)] text-[var(--primary-fg)] hover:bg-[var(--primary-hover)] hover:shadow-[0_2px_0_#8c5120] border-2 border-[var(--ink)] font-display font-bold shadow-[0_2px_0_#8c5120]"
        >
          Apply Resize
        </TactileButton>
      </div>
    </ModalWrapper>
  );
};
