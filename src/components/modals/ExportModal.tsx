'use client';

import React, { useState } from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { TactileButton } from '@/components/ui/TactileButton';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { ModalWrapper } from '@/components/ui/ModalWrapper';
import { packSpriteSheet } from '@/lib/export/spriteSheetPacker';
import { createAnimatedGifBlobAsync } from '@/lib/export/gifEncoder';
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
    clips,
  } = useStudioStore();

  const [exportType, setExportType] = useState<'png' | 'gif' | 'spritesheet' | 'project'>('png');
  const [scale, setScale] = useState<number>(4);
  const [layoutMode, setLayoutMode] = useState<'horizontal' | 'vertical' | 'grid'>('horizontal');
  const [padding, setPadding] = useState<number>(0);
  const [includeMetadata, setIncludeMetadata] = useState<boolean>(true);
  const [selectedClipId, setSelectedClipId] = useState<string | 'all'>('all');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<{ current: number; total: number } | null>(null);
  const abortControllerRef = React.useRef<AbortController | null>(null);

  // Compute targeted frames based on selected clip scope with inverted/out-of-bounds safety
  const selectedClip = clips.find((c) => c.id === selectedClipId);
  let startIdx = 0;
  let endIdx = Math.max(0, frames.length - 1);
  if (selectedClip) {
    startIdx = Math.max(0, Math.min(selectedClip.startFrame, selectedClip.endFrame));
    endIdx = Math.min(Math.max(0, frames.length - 1), Math.max(selectedClip.startFrame, selectedClip.endFrame));
  }
  const targetFrames = selectedClip ? frames.slice(startIdx, endIdx + 1) : frames;
  const scopeSuffix = selectedClip ? `_${selectedClip.name.replace(/\s+/g, '_')}` : '';

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsExporting(false);
    setExportProgress(null);
    onClose();
  };

  const handleExportPNG = () => {
    const source = compositeFrame(frames, activeFrameIndex, canvasWidth, canvasHeight, { freshCanvas: true });
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
    link.download = `${projectName.toLowerCase().replace(/\s+/g, '-')}${scopeSuffix}-${canvasWidth * scale}x${canvasHeight * scale}.png`;
    link.href = dataUrl;
    link.click();
    onClose();
  };

  const handleExportSpriteSheet = () => {
    if (targetFrames.length === 0) return;
    const frameCanvases: HTMLCanvasElement[] = [];

    for (let i = 0; i < targetFrames.length; i++) {
      const composed = compositeFrame(targetFrames, i, canvasWidth, canvasHeight, { freshCanvas: true });
      frameCanvases.push(composed ?? new HTMLCanvasElement());
    }

    const packed = packSpriteSheet(frameCanvases, canvasWidth, canvasHeight, fps, projectName, {
      layout: layoutMode,
      scale,
      padding,
    });

    const dataUrl = packed.canvas.toDataURL('image/png');
    const baseFilename = `${projectName.toLowerCase().replace(/\s+/g, '-')}${scopeSuffix}-sheet-${scale}x`;
    const link = document.createElement('a');
    link.download = `${baseFilename}.png`;
    link.href = dataUrl;
    link.click();

    if (includeMetadata && packed.metadata) {
      // Export Godot 4 SpriteFrames .tres resource
      if (packed.metadata.godotTres) {
        const tresBlob = new Blob([packed.metadata.godotTres], { type: 'text/plain' });
        const tresUrl = URL.createObjectURL(tresBlob);
        const tresLink = document.createElement('a');
        tresLink.download = `${baseFilename}.tres`;
        tresLink.href = tresUrl;
        tresLink.click();
        URL.revokeObjectURL(tresUrl);
      }

      // Export standard TexturePacker & Unity JSON metadata
      const jsonContent = packed.metadata.texturePackerJson || packed.metadata.unityJson;
      if (jsonContent) {
        const metaBlob = new Blob([jsonContent], { type: 'application/json' });
        const metaUrl = URL.createObjectURL(metaBlob);
        const metaLink = document.createElement('a');
        metaLink.download = `${baseFilename}.json`;
        metaLink.href = metaUrl;
        metaLink.click();
        URL.revokeObjectURL(metaUrl);
      }
    }

    onClose();
  };

  const handleExportGIF = async () => {
    if (isExporting || targetFrames.length === 0) return;

    const frameCanvases: HTMLCanvasElement[] = [];

    for (let i = 0; i < targetFrames.length; i++) {
      const composed = compositeFrame(targetFrames, i, canvasWidth, canvasHeight, { freshCanvas: true });
      if (composed) {
        frameCanvases.push(composed);
      }
    }

    if (frameCanvases.length === 0) return;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsExporting(true);
    setExportProgress({ current: 0, total: frameCanvases.length });

    try {
      const blob = await createAnimatedGifBlobAsync(
        frameCanvases,
        fps,
        scale,
        (current, total) => {
          setExportProgress({ current, total });
        },
        controller.signal
      );

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `${projectName.toLowerCase().replace(/\s+/g, '-')}${scopeSuffix}-${scale}x.gif`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
      onClose();
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // User cancelled export intentionally
        return;
      }
      console.error('GIF export failed:', err);
    } finally {
      setIsExporting(false);
      setExportProgress(null);
      abortControllerRef.current = null;
    }
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
    <ModalWrapper isOpen={isOpen} onClose={handleCancel} title="Export Studio Assets" maxWidth="w-[460px]">
      {/* Format Selector Tabs */}
      <div className="flex gap-1 bg-[var(--desk-surface)] p-1 rounded-[2px] border-2 border-[var(--desk-border)]">
        {(['png', 'gif', 'spritesheet', 'project'] as const).map((type) => (
          <button
            key={type}
            disabled={isExporting}
            onClick={() => setExportType(type)}
            className={`flex-1 py-1.5 rounded-[2px] text-xs font-mono font-bold transition-colors cursor-pointer capitalize ${
              exportType === type
                ? 'bg-[#f0be7c] text-[#140d1f] shadow-xs'
                : 'text-[var(--text-body)] hover:text-[#f0be7c] hover:bg-[var(--desk-surface)]'
            } ${isExporting ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {type === 'spritesheet' ? 'Sprite Sheet' : type === 'project' ? '.pixibun' : type.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Export Scope (Tag Clips) Selector */}
      {clips.length > 0 && exportType !== 'project' && (
        <div className="flex items-center justify-between bg-[var(--desk-surface)] px-3 py-2 rounded-[2px] border-2 border-[var(--desk-border)] text-xs font-mono">
          <span className="text-[var(--text-body)] font-bold">Export Scope:</span>
          <select
            value={selectedClipId}
            disabled={isExporting}
            onChange={(e) => setSelectedClipId(e.target.value)}
            className="bg-[#181124] text-[var(--text-heading)] font-bold text-xs font-mono px-2.5 py-1 rounded-[2px] border border-[var(--desk-border)] outline-none cursor-pointer focus:border-[#f0be7c]"
          >
            <option value="all">All Frames (1–{frames.length})</option>
            {clips.map((clip) => (
              <option key={clip.id} value={clip.id}>
                {clip.name} (Frames {clip.startFrame + 1}–{clip.endFrame + 1})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Web Worker Export Progress Bar */}
      {isExporting && exportProgress && (
        <div className="bg-[var(--desk-surface)] p-3 rounded-[2px] border-2 border-[#f0be7c] flex flex-col gap-2 shadow-md animate-pulse">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[#f0be7c] font-bold">Encoding GIF via Web Worker:</span>
            <span className="text-[var(--text-heading)] font-bold">
              {exportProgress.current} / {exportProgress.total} frames ({Math.round((exportProgress.current / Math.max(1, exportProgress.total)) * 100)}%)
            </span>
          </div>
          <div className="w-full bg-[#181124] h-2.5 rounded-[2px] overflow-hidden border border-[var(--desk-border)]">
            <div
              className="bg-[#f0be7c] h-full transition-all duration-100 ease-out"
              style={{
                width: `${Math.round((exportProgress.current / Math.max(1, exportProgress.total)) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}

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
            <span className="text-[var(--text-body)] font-bold">Engine Metadata (Godot & JSON):</span>
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
          disabled={isExporting}
          onClick={handleCancel}
          className="bg-[var(--desk-surface)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[#f0be7c]"
        >
          Cancel
        </TactileButton>

        <TactileButton
          size="sm"
          variant="primary"
          disabled={isExporting}
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
          <span>{isExporting ? 'Encoding GIF...' : `Download ${exportType.toUpperCase()}`}</span>
        </TactileButton>
      </div>
    </ModalWrapper>
  );
};
