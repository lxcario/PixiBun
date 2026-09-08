'use client';

import React, { useState, useEffect } from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { TactileButton } from '@/components/ui/TactileButton';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { ModalWrapper } from '@/components/ui/ModalWrapper';
import { packSpriteSheet } from '@/lib/export/spriteSheetPacker';
import { createAnimatedGifBlobAsync } from '@/lib/export/gifEncoder';
import { exportProcessReplayGifAsync } from '@/lib/export/processReplay';
import { depixelizeToSvg } from '@/lib/export/depixelizeVector';
import { exportAnimationToWebmAsync } from '@/lib/export/webmEncoder';
import { exportAnimationToApngAsync } from '@/lib/export/apngEncoder';
import { exportAnimationToMp4Async, isMp4ExportSupported } from '@/lib/export/mp4Encoder';
import { exportProcessReplayMp4Async } from '@/lib/export/speedpaintExporter';
import { getGlobalHistory } from '@/lib/engine/historyEngine';
import { compositeFrame } from '@/lib/render/compositor';
import { buildProjectFile } from '@/lib/project/serialize';
import {
  generateGodot4Shader,
  generateUnityUrpShader,
  generateLoopAnimationCanvases,
} from '@/lib/export/shaderExporter';

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
    palettes,
    currentPaletteId,
  } = useStudioStore();

  const [exportType, setExportType] = useState<
    'png' | 'gif' | 'apng' | 'spritesheet' | 'replay' | 'svg' | 'webm' | 'mp4' | 'project' | 'shader' | 'palette-cycle'
  >('png');
  const [shaderTarget, setShaderTarget] = useState<'godot' | 'unity'>('godot');
  const [cycleLoopDuration, setCycleLoopDuration] = useState<number>(2.0);
  const [cycleLoopFormat, setCycleLoopFormat] = useState<'apng' | 'gif'>('apng');
  const [replayFormat, setReplayFormat] = useState<'gif' | 'mp4'>('gif');
  const [scale, setScale] = useState<number>(4);
  const [svgSmooth, setSvgSmooth] = useState<boolean>(true);
  const [videoLoopCount, setVideoLoopCount] = useState<number>(2);
  const [layoutMode, setLayoutMode] = useState<'horizontal' | 'vertical' | 'grid'>('horizontal');
  const [padding, setPadding] = useState<number>(0);
  const [includeMetadata, setIncludeMetadata] = useState<boolean>(true);
  const [selectedClipId, setSelectedClipId] = useState<string | 'all'>('all');
  const [replayFps, setReplayFps] = useState<number>(12);
  const [holdLastFrameMs, setHoldLastFrameMs] = useState<number>(1000);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<{ current: number; total: number } | null>(null);
  const [isMp4Supported, setIsMp4Supported] = useState<boolean>(() =>
    typeof window !== 'undefined' ? isMp4ExportSupported() : false
  );
  const abortControllerRef = React.useRef<AbortController | null>(null);

  useEffect(() => {
    setIsMp4Supported(isMp4ExportSupported());
  }, [isOpen]);

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
      if (!composed) {
        console.error(`Failed to composite frame ${i + 1} for sprite sheet export.`);
        const fallback = document.createElement('canvas');
        fallback.width = canvasWidth;
        fallback.height = canvasHeight;
        frameCanvases.push(fallback);
      } else {
        frameCanvases.push(composed);
      }
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

    const delays = targetFrames.map((f) => {
      const ms = f.durationMs || Math.round(1000 / fps);
      return Math.max(2, Math.round(ms / 10));
    });

    try {
      const blob = await createAnimatedGifBlobAsync(
        frameCanvases,
        fps,
        scale,
        (current, total) => {
          setExportProgress({ current, total });
        },
        controller.signal,
        delays
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
      setIsExporting(false);
      setExportProgress(null);
      abortControllerRef.current = null;
    }
  };

  const handleExportReplay = async () => {
    const history = getGlobalHistory();
    if (isExporting || history.length === 0) return;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsExporting(true);
    setExportProgress({ current: 0, total: history.length });

    const isMp4 = replayFormat === 'mp4';
    try {
      const blob = isMp4
        ? await exportProcessReplayMp4Async(history, {
            fps: replayFps,
            scale,
            holdLastFrameMs,
            onProgress: (current, total) => {
              setExportProgress({ current, total });
            },
            signal: controller.signal,
          })
        : await exportProcessReplayGifAsync(history, {
            fps: replayFps,
            scale,
            holdLastFrameMs,
            onProgress: (current, total) => {
              setExportProgress({ current, total });
            },
            signal: controller.signal,
          });

      const ext = isMp4 ? 'mp4' : 'gif';
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `${projectName.toLowerCase().replace(/\s+/g, '-')}-timelapse-${scale}x.${ext}`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
      onClose();
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      console.error('Process replay export failed:', err);
    } finally {
      setIsExporting(false);
      setExportProgress(null);
      abortControllerRef.current = null;
    }
  };

  const handleExportApng = async () => {
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

    const durationsMs = targetFrames.map((f) => f.durationMs || Math.round(1000 / fps));

    try {
      const blob = await exportAnimationToApngAsync(frameCanvases, {
        fps,
        scale,
        durationsMs,
        loopCount: 0,
        onProgress: (current, total) => {
          setExportProgress({ current, total });
        },
        signal: controller.signal,
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `${projectName.toLowerCase().replace(/\s+/g, '-')}${scopeSuffix}-${scale}x.png`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
      onClose();
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      console.error('APNG export failed:', err);
    } finally {
      setIsExporting(false);
      setExportProgress(null);
      abortControllerRef.current = null;
    }
  };

  const handleExportMp4 = async () => {
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
    setExportProgress({ current: 0, total: frameCanvases.length * videoLoopCount });

    const durationsMs = targetFrames.map((f) => f.durationMs || Math.round(1000 / fps));

    try {
      const blob = await exportAnimationToMp4Async(frameCanvases, {
        fps,
        scale,
        durationsMs,
        loopCount: videoLoopCount,
        onProgress: (current, total) => {
          setExportProgress({ current, total });
        },
        signal: controller.signal,
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `${projectName.toLowerCase().replace(/\s+/g, '-')}${scopeSuffix}-${scale}x.mp4`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
      onClose();
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      console.error('MP4 export failed:', err);
    } finally {
      setIsExporting(false);
      setExportProgress(null);
      abortControllerRef.current = null;
    }
  };

  const handleExportSvg = () => {
    const source = compositeFrame(frames, activeFrameIndex, canvasWidth, canvasHeight, { freshCanvas: true });
    if (!source) return;

    const ctx = source.getContext('2d');
    if (!ctx) return;

    const imgData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
    const result = depixelizeToSvg(imgData, { scale: Math.max(1, scale), smooth: svgSmooth });

    const blob = new Blob([result.svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `${projectName.toLowerCase().replace(/\s+/g, '-')}${scopeSuffix}-vector-${scale}x.svg`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    onClose();
  };

  const handleExportWebm = async () => {
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
    setExportProgress({ current: 0, total: frameCanvases.length * videoLoopCount });

    const durationsMs = targetFrames.map((f) => f.durationMs || Math.round(1000 / fps));

    try {
      const blob = await exportAnimationToWebmAsync(frameCanvases, {
        fps,
        scale,
        durationsMs,
        loopCount: videoLoopCount,
        onProgress: (current, total) => {
          setExportProgress({ current, total });
        },
        signal: controller.signal,
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `${projectName.toLowerCase().replace(/\s+/g, '-')}${scopeSuffix}-${scale}x.webm`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
      onClose();
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      console.error('WebM export failed:', err);
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

  const currentPalette = palettes.find((p) => p.id === currentPaletteId) || palettes[0];
  const activeCycleTracks = currentPalette?.cycleTracks?.filter((t) => t.enabled && t.rate > 0) || [];

  const handleExportShader = () => {
    const code =
      shaderTarget === 'godot'
        ? generateGodot4Shader(activeCycleTracks, currentPalette.colors.length)
        : generateUnityUrpShader(activeCycleTracks, currentPalette.colors.length);
    const ext = shaderTarget === 'godot' ? 'gdshader' : 'shader';
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `${projectName.toLowerCase().replace(/\s+/g, '-')}-palette-cycling.${ext}`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    onClose();
  };

  const handleExportCycleLoop = async () => {
    const source = compositeFrame(frames, activeFrameIndex, canvasWidth, canvasHeight, { freshCanvas: true });
    if (!source) return;

    setIsExporting(true);
    try {
      const loopFps = 30;
      const frameCanvases = generateLoopAnimationCanvases(
        source,
        currentPalette.colors,
        activeCycleTracks,
        cycleLoopDuration,
        loopFps
      );

      if (cycleLoopFormat === 'apng') {
        const delays = frameCanvases.map(() => 1000 / loopFps);
        const apngBlob = await exportAnimationToApngAsync(frameCanvases, {
          fps: loopFps,
          scale,
          durationsMs: delays,
          loopCount: 0,
          onProgress: (current: number, total: number) => {
            setExportProgress({ current, total });
          },
        });
        const url = URL.createObjectURL(apngBlob);
        const link = document.createElement('a');
        link.download = `${projectName.toLowerCase().replace(/\s+/g, '-')}-cycle-loop-${scale}x.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
      } else {
        const delays = frameCanvases.map(() => Math.max(2, Math.round((1000 / loopFps) / 10)));
        const gifBlob = await createAnimatedGifBlobAsync(
          frameCanvases,
          loopFps,
          scale,
          (current: number, total: number) => {
            setExportProgress({ current, total });
          },
          undefined,
          delays
        );
        const url = URL.createObjectURL(gifBlob);
        const link = document.createElement('a');
        link.download = `${projectName.toLowerCase().replace(/\s+/g, '-')}-cycle-loop-${scale}x.gif`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Palette cycle loop export failed:', err);
    } finally {
      setIsExporting(false);
      setExportProgress(null);
      onClose();
    }
  };

  const historyLength = getGlobalHistory().length;

  return (
    <ModalWrapper isOpen={isOpen} onClose={handleCancel} title="Export Studio Assets" maxWidth="w-[560px]">
      {/* Format Selector Tabs */}
      <div className="flex gap-1 bg-[var(--desk-surface)] p-1 rounded-[2px] border-2 border-[var(--desk-border)]">
        {(['png', 'gif', 'apng', 'webm', 'mp4', 'spritesheet', 'replay', 'svg', 'shader', 'palette-cycle', 'project'] as const).map((type) => (
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
            {type === 'spritesheet'
              ? 'Sprite Sheet'
              : type === 'replay'
              ? 'Timelapse'
              : type === 'svg'
              ? 'Vector SVG'
              : type === 'webm'
              ? 'WebM Video'
              : type === 'mp4'
              ? 'MP4 Video'
              : type === 'apng'
              ? 'APNG'
              : type === 'shader'
              ? 'Shaders'
              : type === 'palette-cycle'
              ? 'Cycle Loop'
              : type === 'project'
              ? '.pixibun'
              : type.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Export Scope (Tag Clips) Selector */}
      {clips.length > 0 && exportType !== 'project' && (
        <div className="flex items-center justify-between bg-[var(--desk-surface)] px-3 py-2 rounded-[2px] border-2 border-[var(--desk-border)] text-xs font-mono">
          <span className="text-[var(--text-body)] font-bold">Export Scope:</span>
          <select
            value={selectedClipId}
            aria-label="Export frame scope"
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
            <span className="text-[#f0be7c] font-bold">Encoding {exportType.toUpperCase()} via Browser Codec:</span>
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

      {exportType === 'apng' && (
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
            <span className="font-bold">Output Animation Info:</span>
            <span className="text-[#f0be7c] font-bold">
              {canvasWidth * scale} × {canvasHeight * scale} px, {targetFrames.length} frames (24-bit Truecolor APNG)
            </span>
          </div>

          <p className="text-[#a89ab8] text-[11px] pt-1 border-t border-[var(--desk-border)]">
            Animated PNG (APNG) retains 100% full 24-bit/32-bit RGBA color without GIF&apos;s 256-color degradation or palette quantization noise. Encoded with uncompressed DEFLATE store blocks (BTYPE 00) for instant, zero-dependency offline generation (file sizes may be larger than compressed PNGs).
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

      {exportType === 'replay' && (
        <div className="flex flex-col gap-2.5 bg-[var(--desk-surface)] p-3 rounded-[2px] border-2 border-[var(--desk-border)] text-xs font-mono shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[var(--text-body)] font-bold">Timelapse Format:</span>
            <div className="flex gap-1">
              {(['gif', 'mp4'] as const).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setReplayFormat(fmt)}
                  className={`px-2 py-0.5 rounded-[2px] border font-bold cursor-pointer transition-colors uppercase ${
                    replayFormat === fmt
                      ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120]'
                      : 'bg-[var(--desk-surface)] text-[var(--text-heading)] border-[var(--desk-border)] hover:border-[#f0be7c]'
                  }`}
                >
                  {fmt === 'mp4' ? 'MP4 Video' : 'Animated GIF'}
                </button>
              ))}
            </div>
          </div>

          {replayFormat === 'mp4' && !isMp4Supported && (
            <div className="flex flex-col gap-1 p-2.5 rounded-[2px] bg-[#3a1d28] border border-[#b84a62] text-xs font-mono text-[#ffb3c1]">
              <div className="flex items-center gap-1.5 font-bold text-[#ff8099]">
                <PixelIcon name="warning" size={13} />
                <span>MP4 Video Recording Unsupported</span>
              </div>
              <p className="text-[11px] leading-relaxed text-[#fcd2d7]">
                Your browser lacks native MP4 (H.264) MediaRecorder support. Please choose <strong>Animated GIF</strong> for timelapse export.
              </p>
            </div>
          )}

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

          <div className="flex items-center justify-between">
            <span className="text-[var(--text-body)] font-bold">Playback Speed:</span>
            <div className="flex gap-1">
              {[6, 12, 18, 24].map((f) => (
                <button
                  key={f}
                  onClick={() => setReplayFps(f)}
                  className={`px-2 py-0.5 rounded-[2px] border font-bold cursor-pointer transition-colors ${
                    replayFps === f
                      ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120]'
                      : 'bg-[var(--desk-surface)] text-[var(--text-heading)] border-[var(--desk-border)] hover:border-[#f0be7c]'
                  }`}
                >
                  {f} FPS
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[var(--text-body)] font-bold">Hold Final Frame:</span>
            <div className="flex gap-1">
              {[500, 1000, 2000].map((ms) => (
                <button
                  key={ms}
                  onClick={() => setHoldLastFrameMs(ms)}
                  className={`px-2 py-0.5 rounded-[2px] border font-bold cursor-pointer transition-colors ${
                    holdLastFrameMs === ms
                      ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120]'
                      : 'bg-[var(--desk-surface)] text-[var(--text-heading)] border-[var(--desk-border)] hover:border-[#f0be7c]'
                  }`}
                >
                  {ms / 1000}s
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between text-[var(--text-body)] pt-1 border-t border-[var(--desk-border)]">
            <span className="font-bold">History Steps:</span>
            <span className="text-[#f0be7c] font-bold">
              {historyLength} stroke snapshots recorded
            </span>
          </div>

          {historyLength === 0 && (
            <p className="text-[#e06c75] text-[11px] pt-1">
              No drawing strokes recorded in current session yet. Draw on the canvas to generate a timelapse.
            </p>
          )}
        </div>
      )}

      {exportType === 'svg' && (
        <div className="flex flex-col gap-2.5 bg-[var(--desk-surface)] p-3 rounded-[2px] border-2 border-[var(--desk-border)] text-xs font-mono shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[var(--text-body)] font-bold">Scale Resolution:</span>
            <div className="flex gap-1">
              {[4, 8, 16, 32].map((s) => (
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
            <span className="text-[var(--text-body)] font-bold">Contour Smoothing:</span>
            <button
              onClick={() => setSvgSmooth(!svgSmooth)}
              className={`px-2 py-0.5 rounded-[2px] border text-[10px] font-bold cursor-pointer transition-colors ${
                svgSmooth
                  ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120]'
                  : 'bg-[var(--desk-surface)] text-[var(--text-body)] border-[var(--desk-border)]'
              }`}
            >
              {svgSmooth ? 'SMOOTH SPLINES (BÉZIER)' : 'CRISP POLYGONS'}
            </button>
          </div>

          <div className="flex items-center justify-between text-[var(--text-body)] pt-1 border-t border-[var(--desk-border)]">
            <span className="font-bold">Output Format:</span>
            <span className="text-[#f0be7c] font-bold">
              {canvasWidth * scale} × {canvasHeight * scale} px (Lossless Vector SVG)
            </span>
          </div>

          <p className="text-[#a89ab8] text-[11px] pt-1 border-t border-[var(--desk-border)]">
            Kopf–Lischinski depixelization resolves diagonal pixel ambiguity and fits smooth cubic Bézier curves for high-DPI merchandise, print, and stickers.
          </p>
        </div>
      )}

      {exportType === 'webm' && (
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

          <div className="flex items-center justify-between">
            <span className="text-[var(--text-body)] font-bold">Animation Cycles:</span>
            <div className="flex gap-1">
              {[1, 2, 4].map((c) => (
                <button
                  key={c}
                  onClick={() => setVideoLoopCount(c)}
                  className={`px-2 py-0.5 rounded-[2px] border font-bold cursor-pointer transition-colors ${
                    videoLoopCount === c
                      ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120]'
                      : 'bg-[var(--desk-surface)] text-[var(--text-heading)] border-[var(--desk-border)] hover:border-[#f0be7c]'
                  }`}
                >
                  {c} {c === 1 ? 'loop' : 'loops'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between text-[var(--text-body)] pt-1 border-t border-[var(--desk-border)]">
            <span className="font-bold">Output Video Info:</span>
            <span className="text-[#f0be7c] font-bold">
              {canvasWidth * scale} × {canvasHeight * scale} px WebM (VP9/VP8)
            </span>
          </div>

          <p className="text-[#a89ab8] text-[11px] pt-1 border-t border-[var(--desk-border)]">
            Encodes animation with exact per-frame millisecond holds for high-quality game dev video showcases and social sharing.
          </p>
        </div>
      )}

      {exportType === 'mp4' && (
        <div className="flex flex-col gap-2.5 bg-[var(--desk-surface)] p-3 rounded-[2px] border-2 border-[var(--desk-border)] text-xs font-mono shadow-xs">
          {!isMp4Supported && (
            <div className="flex flex-col gap-1 p-2.5 rounded-[2px] bg-[#3a1d28] border border-[#b84a62] text-xs font-mono text-[#ffb3c1]">
              <div className="flex items-center gap-1.5 font-bold text-[#ff8099]">
                <PixelIcon name="warning" size={13} />
                <span>MP4 Video Recording Unsupported</span>
              </div>
              <p className="text-[11px] leading-relaxed text-[#fcd2d7]">
                Your browser lacks native MP4 (H.264) MediaRecorder support. Please choose <strong>WebM</strong> for video or <strong>GIF / APNG</strong> for animation export instead.
              </p>
            </div>
          )}

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

          <div className="flex items-center justify-between">
            <span className="text-[var(--text-body)] font-bold">Animation Cycles:</span>
            <div className="flex gap-1">
              {[1, 2, 4].map((c) => (
                <button
                  key={c}
                  onClick={() => setVideoLoopCount(c)}
                  className={`px-2 py-0.5 rounded-[2px] border font-bold cursor-pointer transition-colors ${
                    videoLoopCount === c
                      ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120]'
                      : 'bg-[var(--desk-surface)] text-[var(--text-heading)] border-[var(--desk-border)] hover:border-[#f0be7c]'
                  }`}
                >
                  {c} {c === 1 ? 'loop' : 'loops'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between text-[var(--text-body)] pt-1 border-t border-[var(--desk-border)]">
            <span className="font-bold">Output Video Info:</span>
            <span className="text-[#f0be7c] font-bold">
              {canvasWidth * scale} × {canvasHeight * scale} px MP4 (H.264 / ISOBMFF)
            </span>
          </div>

          <p className="text-[#a89ab8] text-[11px] pt-1 border-t border-[var(--desk-border)]">
            Universal MP4 container optimized for instant video previews across Discord, Twitter/X, and modern video players.
          </p>
        </div>
      )}

      {exportType === 'project' && (
        <div className="flex flex-col gap-2 bg-[var(--desk-surface)] p-3 rounded-[2px] border-2 border-[var(--desk-border)] text-xs font-mono shadow-xs">
          <p className="text-[var(--text-body)] leading-relaxed font-medium">
            Export the full project file (.pixibun) containing all {frames.length} frames, layers, palettes, and timing metadata.
          </p>
        </div>
      )}

      {exportType === 'shader' && (
        <div className="flex flex-col gap-2.5 bg-[var(--desk-surface)] p-3 rounded-[2px] border-2 border-[var(--desk-border)] text-xs font-mono shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[var(--text-body)] font-bold">Engine Target:</span>
            <div className="flex gap-1">
              <button
                onClick={() => setShaderTarget('godot')}
                className={`px-2.5 py-1 rounded-[2px] border font-bold cursor-pointer transition-colors ${
                  shaderTarget === 'godot'
                    ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120]'
                    : 'bg-[var(--desk-surface)] text-[var(--text-heading)] border-[var(--desk-border)] hover:border-[#f0be7c]'
                }`}
              >
                Godot 4 (.gdshader)
              </button>
              <button
                onClick={() => setShaderTarget('unity')}
                className={`px-2.5 py-1 rounded-[2px] border font-bold cursor-pointer transition-colors ${
                  shaderTarget === 'unity'
                    ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120]'
                    : 'bg-[var(--desk-surface)] text-[var(--text-heading)] border-[var(--desk-border)] hover:border-[#f0be7c]'
                }`}
              >
                Unity URP 2D (.shader)
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
            <span>Active Tracks:</span>
            <span className="font-bold text-[#f0be7c]">{activeCycleTracks.length} tracks configured</span>
          </div>

          <p className="text-[#a89ab8] text-[11px] pt-1 border-t border-[var(--desk-border)]">
            Hardware-accelerated pixel shader with point-filtering, ping-pong oscillation, and sub-step color interpolation.
          </p>
        </div>
      )}

      {exportType === 'palette-cycle' && (
        <div className="flex flex-col gap-2.5 bg-[var(--desk-surface)] p-3 rounded-[2px] border-2 border-[var(--desk-border)] text-xs font-mono shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[var(--text-body)] font-bold">Target Loop Duration:</span>
            <div className="flex gap-1">
              {[1.0, 2.0, 3.0, 4.0, 5.0].map((sec) => (
                <button
                  key={sec}
                  onClick={() => setCycleLoopDuration(sec)}
                  className={`px-2 py-0.5 rounded-[2px] border font-bold cursor-pointer transition-colors ${
                    cycleLoopDuration === sec
                      ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120]'
                      : 'bg-[var(--desk-surface)] text-[var(--text-heading)] border-[var(--desk-border)] hover:border-[#f0be7c]'
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[var(--text-body)] font-bold">Animation Format:</span>
            <div className="flex gap-1">
              {(['apng', 'gif'] as const).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setCycleLoopFormat(fmt)}
                  className={`px-2.5 py-0.5 rounded-[2px] border font-bold cursor-pointer uppercase transition-colors ${
                    cycleLoopFormat === fmt
                      ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120]'
                      : 'bg-[var(--desk-surface)] text-[var(--text-heading)] border-[var(--desk-border)] hover:border-[#f0be7c]'
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>

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

          <p className="text-[#a89ab8] text-[11px] pt-1 border-t border-[var(--desk-border)]">
            Powered by Farey rational retuning to guarantee 100% seamless zero-pop looping across all cycle tracks.
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
          disabled={
            isExporting ||
            (exportType === 'replay' && (historyLength === 0 || (replayFormat === 'mp4' && !isMp4Supported))) ||
            (exportType === 'mp4' && !isMp4Supported)
          }
          onClick={
            exportType === 'shader'
              ? handleExportShader
              : exportType === 'palette-cycle'
              ? handleExportCycleLoop
              : exportType === 'project'
              ? handleExportProjectJson
              : exportType === 'spritesheet'
              ? handleExportSpriteSheet
              : exportType === 'gif'
              ? handleExportGIF
              : exportType === 'apng'
              ? handleExportApng
              : exportType === 'replay'
              ? handleExportReplay
              : exportType === 'svg'
              ? handleExportSvg
              : exportType === 'webm'
              ? handleExportWebm
              : exportType === 'mp4'
              ? handleExportMp4
              : handleExportPNG
          }
          className="bg-[#f0be7c] text-[#140d1f] hover:bg-[#fcd699] hover:shadow-[0_2px_0_#8c5120] border-2 border-[#8c5120] font-display font-bold shadow-[0_2px_0_#8c5120]"
        >
          <PixelIcon name="export" size={12} />
          <span>{isExporting ? 'Encoding Video...' : `Download ${exportType.toUpperCase()}`}</span>
        </TactileButton>
      </div>
    </ModalWrapper>
  );
};
