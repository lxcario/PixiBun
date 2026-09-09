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
import { buildProjectFileAsync } from '@/lib/project/serialize';
import {
  generateGodot4Shader,
  generateUnityUrpShader,
  generateLoopAnimationCanvases,
} from '@/lib/export/shaderExporter';
import { ExportTabsNav, type ExportType } from './export/ExportTabsNav';
import { ExportScopeSelector } from './export/ExportScopeSelector';
import { ExportProgressBar } from './export/ExportProgressBar';
import { PngExportTab } from './export/PngExportTab';
import { AnimatedExportTab } from './export/AnimatedExportTab';
import { SpritesheetExportTab } from './export/SpritesheetExportTab';
import { ReplayExportTab } from './export/ReplayExportTab';
import { VectorSvgExportTab } from './export/VectorSvgExportTab';
import { ShaderExportTab } from './export/ShaderExportTab';
import { ProjectExportTab } from './export/ProjectExportTab';

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

  const [exportType, setExportType] = useState<ExportType>('png');
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
        setTimeout(() => URL.revokeObjectURL(tresUrl), 1000);
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
        setTimeout(() => URL.revokeObjectURL(metaUrl), 1000);
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
      setTimeout(() => URL.revokeObjectURL(url), 1000);
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
      setTimeout(() => URL.revokeObjectURL(url), 1000);
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
      setTimeout(() => URL.revokeObjectURL(url), 1000);
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
      setTimeout(() => URL.revokeObjectURL(url), 1000);
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
    setTimeout(() => URL.revokeObjectURL(url), 1000);
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
      setTimeout(() => URL.revokeObjectURL(url), 1000);
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

  const handleExportProjectJson = async () => {
    let projectData: string;
    try {
      const project = await buildProjectFileAsync();
      projectData = JSON.stringify(project, null, 2);
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
    setTimeout(() => URL.revokeObjectURL(url), 1000);
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
    setTimeout(() => URL.revokeObjectURL(url), 1000);
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
        setTimeout(() => URL.revokeObjectURL(url), 1000);
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
        setTimeout(() => URL.revokeObjectURL(url), 1000);
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
      <ExportTabsNav
        exportType={exportType}
        onSelectType={setExportType}
        isExporting={isExporting}
      />

      {/* Export Scope (Tag Clips) Selector */}
      {clips.length > 0 && exportType !== 'project' && (
        <ExportScopeSelector
          clips={clips}
          selectedClipId={selectedClipId}
          onSelectClipId={setSelectedClipId}
          isExporting={isExporting}
          totalFrames={frames.length}
        />
      )}

      {/* Web Worker Export Progress Bar */}
      {isExporting && exportProgress && (
        <ExportProgressBar
          exportType={exportType}
          exportProgress={exportProgress}
        />
      )}

      {/* Modular Export Configuration Options */}
      {exportType === 'png' && (
        <PngExportTab
          scale={scale}
          setScale={setScale}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
        />
      )}

      {(exportType === 'gif' || exportType === 'apng' || exportType === 'webm' || exportType === 'mp4') && (
        <AnimatedExportTab
          exportType={exportType}
          scale={scale}
          setScale={setScale}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
          totalFrames={targetFrames.length}
          fps={fps}
          videoLoopCount={videoLoopCount}
          setVideoLoopCount={setVideoLoopCount}
          isMp4Supported={isMp4Supported}
        />
      )}

      {exportType === 'spritesheet' && (
        <SpritesheetExportTab
          layoutMode={layoutMode}
          setLayoutMode={setLayoutMode}
          scale={scale}
          setScale={setScale}
          padding={padding}
          setPadding={setPadding}
          includeMetadata={includeMetadata}
          setIncludeMetadata={setIncludeMetadata}
        />
      )}

      {exportType === 'replay' && (
        <ReplayExportTab
          replayFormat={replayFormat}
          setReplayFormat={setReplayFormat}
          scale={scale}
          setScale={setScale}
          replayFps={replayFps}
          setReplayFps={setReplayFps}
          holdLastFrameMs={holdLastFrameMs}
          setHoldLastFrameMs={setHoldLastFrameMs}
          historyLength={historyLength}
          isMp4Supported={isMp4Supported}
        />
      )}

      {exportType === 'svg' && (
        <VectorSvgExportTab
          scale={scale}
          setScale={setScale}
          svgSmooth={svgSmooth}
          setSvgSmooth={setSvgSmooth}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
        />
      )}

      {exportType === 'shader' && (
        <ShaderExportTab
          isPaletteCycle={false}
          shaderTarget={shaderTarget}
          setShaderTarget={setShaderTarget}
          activeCycleTracksCount={activeCycleTracks.length}
        />
      )}

      {exportType === 'palette-cycle' && (
        <ShaderExportTab
          isPaletteCycle={true}
          cycleLoopDuration={cycleLoopDuration}
          setCycleLoopDuration={setCycleLoopDuration}
          cycleLoopFormat={cycleLoopFormat}
          setCycleLoopFormat={setCycleLoopFormat}
          scale={scale}
          setScale={setScale}
        />
      )}

      {exportType === 'project' && (
        <ProjectExportTab totalFrames={frames.length} />
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
