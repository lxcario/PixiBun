'use client';

import React, { useState } from 'react';
import { TactileButton } from '@/components/ui/TactileButton';
import { ModalWrapper } from '@/components/ui/ModalWrapper';

export interface ImportPayload {
  type: 'image' | 'project';
  filename: string;
  dataUrl?: string;
  /** Raw parsed JSON, validated before anything touches studio state. */
  projectJson?: unknown;
  imgWidth?: number;
  imgHeight?: number;
}

interface ImportModalProps {
  isOpen: boolean;
  payload: ImportPayload | null;
  error?: string | null;
  onClose: () => void;
  onConfirmImage: (target: 'new-layer' | 'new-frame' | 'replace-layer') => void;
  onConfirmProject: () => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  payload,
  error,
  onClose,
  onConfirmImage,
  onConfirmProject,
}) => {
  const [imageTarget, setImageTarget] = useState<'new-layer' | 'new-frame' | 'replace-layer'>('new-layer');

  if (!payload) return null;

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title={payload.type === 'project' ? 'Import Project (.pixibun)' : 'Import Image Asset'} maxWidth="w-[460px]">
      {/* Payload Summary Preview */}
      {payload.type === 'image' && payload.dataUrl && (
        <div className="flex gap-3 bg-[var(--desk-surface)] p-3 rounded-[2px] border-2 border-[var(--desk-border)] shadow-xs items-center">
          <div className="w-16 h-16 bg-[var(--desk-surface)] border-2 border-[var(--desk-border)] rounded-[2px] flex items-center justify-center overflow-hidden">
            <img
              src={payload.dataUrl}
              alt="Import Preview"
              className="max-w-full max-h-full object-contain pixelated"
            />
          </div>

          <div className="flex flex-col gap-1 text-xs font-mono">
            <span className="font-bold text-[var(--text-heading)] truncate max-w-[280px]">
              {payload.filename}
            </span>
            <span className="text-[var(--text-body)]">
              Dimensions: {payload.imgWidth || '--'} × {payload.imgHeight || '--'} px
            </span>
          </div>
        </div>
      )}

      {payload.type === 'project' && (
        <div className="flex flex-col gap-2 bg-[var(--desk-surface)] p-3 rounded-[2px] border-2 border-[var(--desk-border)] shadow-xs text-xs font-mono">
          <span className="font-bold text-[var(--text-heading)]">
            File: {payload.filename}
          </span>
          <span className="text-[var(--text-body)]">
            Frames: {String(Array.isArray((payload.projectJson as { frames?: unknown[] })?.frames) ? (payload.projectJson as { frames: unknown[] }).frames.length : '--')} | Size: {String((payload.projectJson as { width?: unknown })?.width ?? '--')}x{String((payload.projectJson as { height?: unknown })?.height ?? '--')}
          </span>
          <p className="text-[#a89ab8] text-[11px] leading-relaxed">
            Loading this project will replace the current canvas workspace with all saved frames, layers, and color palettes.
          </p>

          {error && (
            <p className="bg-[#3d1928] border border-[#6b283d] text-[#ff99aa] rounded-[2px] px-2 py-1.5 leading-relaxed font-bold">
              {error}
            </p>
          )}
        </div>
      )}

      {/* Image Import Destination Choice */}
      {payload.type === 'image' && (
        <div className="flex flex-col gap-2 bg-[var(--desk-surface)] p-3 rounded-[2px] border-2 border-[var(--desk-border)] shadow-xs">
          <span className="text-xs font-mono font-bold text-[#f0be7c] uppercase tracking-wider">
            Import Destination
          </span>

          <div className="flex flex-col gap-1.5 text-xs font-mono">
            <label className="flex items-center gap-2 p-2 rounded-[2px] bg-[var(--desk-surface)] border border-[var(--desk-border)] hover:border-[#f0be7c] cursor-pointer transition-colors">
              <input
                type="radio"
                name="import-dest"
                checked={imageTarget === 'new-layer'}
                onChange={() => setImageTarget('new-layer')}
                className="accent-[#f0be7c]"
              />
              <span className="font-bold text-[var(--text-heading)]">Import as New Layer (Current Frame)</span>
            </label>

            <label className="flex items-center gap-2 p-2 rounded-[2px] bg-[var(--desk-surface)] border border-[var(--desk-border)] hover:border-[#f0be7c] cursor-pointer transition-colors">
              <input
                type="radio"
                name="import-dest"
                checked={imageTarget === 'new-frame'}
                onChange={() => setImageTarget('new-frame')}
                className="accent-[#f0be7c]"
              />
              <span className="font-bold text-[var(--text-heading)]">Import as New Animation Frame</span>
            </label>

            <label className="flex items-center gap-2 p-2 rounded-[2px] bg-[var(--desk-surface)] border border-[var(--desk-border)] hover:border-[#f0be7c] cursor-pointer transition-colors">
              <input
                type="radio"
                name="import-dest"
                checked={imageTarget === 'replace-layer'}
                onChange={() => setImageTarget('replace-layer')}
                className="accent-[#f0be7c]"
              />
              <span className="font-bold text-[var(--text-heading)]">Replace Active Layer Pixels</span>
            </label>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2 border-t border-[var(--desk-border)]">
        <TactileButton
          size="sm"
          variant="default"
          onClick={onClose}
          className="bg-[var(--desk-surface)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[#f0be7c]"
        >
          Cancel
        </TactileButton>

        <TactileButton
          size="sm"
          variant="primary"
          onClick={() => {
            if (payload.type === 'project') {
              onConfirmProject();
            } else {
              onConfirmImage(imageTarget);
            }
            onClose();
          }}
          className="bg-[#f0be7c] text-[#140d1f] hover:bg-[#fff8db] border-2 border-[#8c5120] font-display font-bold shadow-[0_2px_0_#8c5120]"
        >
          Confirm Import
        </TactileButton>
      </div>
    </ModalWrapper>
  );
};
