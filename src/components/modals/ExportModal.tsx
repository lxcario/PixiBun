'use client';

import React, { useState } from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { TactileButton } from '@/components/ui/TactileButton';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { ModalWrapper } from '@/components/ui/ModalWrapper';
import { packSpriteSheet } from '@/lib/export/spriteSheetPacker';
import { createAnimatedGifBlob } from '@/lib/export/gifEncoder';
import { compositeFrame } from '@/lib/render/compositor';
import { buildProjectFile } from '@/lib/project/serialize';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
  const {
    projectName,
    canvasWidth,
    canvasHeight,
    frames,
    activeFrameIndex,
    fps,
  } = useStudioStore();

  const [exportType, setExportType] = useState<'png' | 'gif' | 'spritesheet' | 'project'>('png');
  const [scale, setScale] = useState<number>(4);
  const [layoutMode, setLayoutMode] = useState<'horizontal' | 'vertical' | 'grid'>('horizontal');
  const [padding, setPadding] = useState<number>(0);
  const [includeMetadata, setIncludeMetadata] = useState<boolean>(true);

  const handleExportPNG = () => {
    const source = compositeFrame(frames, activeFrameIndex, canvasWidth, canvasHeight);
    if (!source) return;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvasWidth * scale;
    exportCanvas.height = canvasHeight * scale;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(source, 0, 0, exportCanvas.width, exportCanvas.height);

    const dataUrl = exportCanvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `${projectName.toLowerCase().replace(/\s+/g, '-')}-${canvasWidth * scale}x${canvasHeight * scale}.png`;
    link.href = dataUrl;
    link.click();
    onClose();
  };

  const handleExportSpriteSheet = () => {
    const frameCanvases: HTMLCanvasElement[] = [];

    for (let i = 0; i < frames.length; i++) {
      const composed = compositeFrame(frames, i, canvasWidth, canvasHeight);
      frameCanvases.push(composed ?? new HTMLCanvasElement());
    }

    const packed = packSpriteSheet(frameCanvases, canvasWidth, canvasHeight, fps, projectName, {
      layout: layoutMode,
      scale,
      padding,
    });

    const dataUrl = packed.canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `${projectName.toLowerCase().replace(/\s+/g, '-')}-sheet-${scale}x.png`;
    link.href = dataUrl;
    link.click();

    if (includeMetadata && packed.metadata?.unityJson) {
      const metaBlob = new Blob([packed.metadata.unityJson], { type: 'application/json' });
      const metaUrl = URL.createObjectURL(metaBlob);
      const metaLink = document.createElement('a');
      metaLink.download = `${projectName.toLowerCase().replace(/\s+/g, '-')}-sheet-${scale}x.json`;
      metaLink.href = metaUrl;
      metaLink.click();
      URL.revokeObjectURL(metaUrl);
    }

    onClose();
  };

  const handleExportGIF = () => {
    const frameCanvases: HTMLCanvasElement[] = [];

    for (let i = 0; i < frames.length; i++) {
      const composed = compositeFrame(frames, i, canvasWidth, canvasHeight);
      if (composed) {
        frameCanvases.push(composed);
      }
    }

    if (frameCanvases.length === 0) return;

    const blob = createAnimatedGifBlob(frameCanvases, fps, scale);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `${projectName.toLowerCase().replace(/\s+/g, '-')}-${scale}x.gif`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    onClose();
  };

  const handleExportProjectJson = () => {
    let projectData: string;
    try {
      projectData = JSON.stringify(buildProjectFile(), null, 2);
    } catch (err) {
      console.error('Project serialization failed during export:', err);
      return;
    }

    const blob = new Blob([projectData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `${projectName.toLowerCase().replace(/\s+/g, '-')}.pixibun`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    onClose();
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Export Studio Assets" maxWidth="w-[460px]">
      {/* Format Selector Tabs */}
      <div className="flex gap-1 bg-[var(--desk-surface)] p-1 rounded-[2px] border-2 border-[var(--desk-border)]">
        {(['png', 'gif', 'spritesheet', 'project'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setExportType(type)}
            className={`flex-1 py-1.5 rounded-[2px] text-xs font-mono font-bold transition-colors cursor-pointer capitalize ${
              exportType === type
                ? 'bg-[#f0be7c] text-[#140d1f] shadow-xs'
                : 'text-[var(--text-body)] hover:text-[#f0be7c] hover:bg-[var(--desk-surface)]'
            }`}
          >
            {type === 'spritesheet' ? 'Sprite Sheet' : type === 'project' ? '.pixibun' : type.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Export Configuration Options */}
      {exportType === 'png' && (
        <div className="flex flex-col gap-2.5 bg-[var(--desk-surface)] p-3 rounded-[2px] border-2 border-[var(--desk-border)] text-xs font-mono shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[var(--text-body)] font-bold">Scale Resolution:</span>
            <div className="flex gap-1">
              {[1, 2, 4, 8, 16].map((s) => (
                <button
                  key={s}
                  onClick={() => setScale(s)}
                  className={`px-2 py-0.5 rounded-[2px] border font-bold cursor-pointer transition-colors ${
                    scale === s
                      ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120]'
                      : 'bg-[var(--desk-surface)] text-[var(--text-heading)] border-[var(--desk-border)] hover:border-[#f0be7c]'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between text-[var(--text-body)]">
            <span className="font-bold">Output Size:</span>
            <span className="text-[#f0be7c] font-bold">
              {canvasWidth * scale} × {canvasHeight * scale} px
            </span>
          </div>
        </div>
      )}

      {exportType === 'gif' && (
        <div className="flex flex-col gap-2.5 bg-[var(--desk-surface)] p-3 rounded-[2px] border-2 border-[var(--desk-border)] text-xs font-mono shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[var(--text-body)] font-bold">Scale Resolution:</span>
            <div className="flex gap-1">
              {[1, 2, 4, 8].map((s) => (
                <button
                  key={s}
                  onClick={() => setScale(s)}
                  className={`px-2 py-0.5 rounded-[2px] border font-bold cursor-pointer transition-colors ${
                    scale === s
                      ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120]'
                      : 'bg-[var(--desk-surface)] text-[var(--text-heading)] border-[var(--desk-border)] hover:border-[#f0be7c]'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between text-[var(--text-body)]">
            <span className="font-bold">Output Info:</span>
            <span className="text-[#f0be7c] font-bold">
              {canvasWidth * scale} × {canvasHeight * scale} px, {frames.length} frames at {fps} FPS
            </span>
          </div>
          
          <p className="text-[#a89ab8] text-[11px] pt-1 border-t border-[var(--desk-border)]">
            Animated GIF with crisp nearest-neighbor integer scaling
          </p>
        </div>
      )}

      {exportType === 'spritesheet' && (
        <div className="flex flex-col gap-2.5 bg-[var(--desk-surface)] p-3 rounded-[2px] border-2 border-[var(--desk-border)] text-xs font-mono shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[var(--text-body)] font-bold">Layout Packing:</span>
            <div className="flex gap-1">
              {(['horizontal', 'vertical', 'grid'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setLayoutMode(mode)}
                  className={`px-2 py-0.5 rounded-[2px] border capitalize font-bold cursor-pointer transition-colors ${
                    layoutMode === mode
                      ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120]'
                      : 'bg-[var(--desk-surface)] text-[var(--text-heading)] border-[var(--desk-border)] hover:border-[#f0be7c]'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[var(--text-body)] font-bold">Frame Scale:</span>
            <div className="flex gap-1">
              {[1, 2, 4].map((s) => (
                <button
                  key={s}
                  onClick={() => setScale(s)}
                  className={`px-2 py-0.5 rounded-[2px] border font-bold cursor-pointer transition-colors ${
                    scale === s
                      ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120]'
                      : 'bg-[var(--desk-surface)] text-[var(--text-heading)] border-[var(--desk-border)] hover:border-[#f0be7c]'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[var(--text-body)] font-bold">Padding:</span>
            <div className="flex gap-1">
              {[0, 1, 2, 4].map((p) => (
                <button
                  key={p}
                  onClick={() => setPadding(p)}
                  className={`px-2 py-0.5 rounded-[2px] border font-bold cursor-pointer transition-colors ${
                    padding === p
                      ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120]'
                      : 'bg-[var(--desk-surface)] text-[var(--text-heading)] border-[var(--desk-border)] hover:border-[#f0be7c]'
                  }`}
                >
                  {p}px
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-[var(--desk-border)]">
            <span className="text-[var(--text-body)] font-bold">Godot/Unity JSON:</span>
            <button
              onClick={() => setIncludeMetadata(!includeMetadata)}
              className={`px-2 py-0.5 rounded-[2px] border text-[10px] font-bold cursor-pointer transition-colors ${
                includeMetadata
                  ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120]'
                  : 'bg-[var(--desk-surface)] text-[var(--text-body)] border-[var(--desk-border)]'
              }`}
            >
              {includeMetadata ? 'ENABLED' : 'OFF'}
            </button>
          </div>
        </div>
      )}

      {exportType === 'project' && (
        <div className="flex flex-col gap-2 bg-[var(--desk-surface)] p-3 rounded-[2px] border-2 border-[var(--desk-border)] text-xs font-mono shadow-xs">
          <p className="text-[var(--text-body)] leading-relaxed font-medium">
            Export the full project file (.pixibun) containing all {frames.length} frames, layers, palettes, and timing metadata.
          </p>
        </div>
      )}

      {/* Modal Actions */}
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
          onClick={
            exportType === 'project'
              ? handleExportProjectJson
              : exportType === 'spritesheet'
              ? handleExportSpriteSheet
              : exportType === 'gif'
              ? handleExportGIF
              : handleExportPNG
          }
          className="bg-[#f0be7c] text-[#140d1f] hover:bg-[#fff8db] border-2 border-[#8c5120] font-display font-bold shadow-[0_2px_0_#8c5120]"
        >
          <PixelIcon name="export" size={12} />
          <span>Download {exportType.toUpperCase()}</span>
        </TactileButton>
      </div>
    </ModalWrapper>
  );
};
