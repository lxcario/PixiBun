'use client';

import React, { useState, useEffect } from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { TactileButton } from '@/components/ui/TactileButton';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { ModalWrapper } from '@/components/ui/ModalWrapper';
import {
  packSpriteSheet,
  calculateSpriteSheetGeometry,
  validateExportGeometry,
} from '@/lib/export/spriteSheetPacker';
import { studioEvents } from '@/lib/events/studioEvents';
import { createAnimatedGifBlobAsync } from '@/lib/export/gifEncoder';
import { exportProcessReplayGifAsync } from '@/lib/export/processReplay';
import { depixelizeToSvg } from '@/lib/export/depixelizeVector';
import { exportAnimationToWebmAsync, isWebmExportSupported } from '@/lib/export/webmEncoder';
import { exportAnimationToApngAsync, apngFailureMessage } from '@/lib/export/apngEncoder';
import { reserveMemory } from '@/lib/safety/memoryBudget';
import { prepareExportFrames, prepareExportFramesAsync } from '@/lib/export/prepareFrames';
import { exportAnimationToMp4Async, probeMp4ExportSupport } from '@/lib/export/mp4Encoder';
import { exportProcessReplayMp4Async } from '@/lib/export/speedpaintExporter';
import {
  getGlobalHistory,
  isGlobalHistoryTruncated,
  getGlobalBaselineCheckpoint,
} from '@/lib/engine/historyEngine';
import { compositeFrame } from '@/lib/render/compositor';
import { buildProjectFileAsync } from '@/lib/project/serialize';
import {
  generateGodot4Shader,
  generateUnityUrpShader,
  generateLoopAnimationCanvases,
} from '@/lib/export/shaderExporter';
import { DesktopFileSystem } from '@/lib/storage/desktopFileSystem';
import { ExportTabsNav, type ExportType } from './export/ExportTabsNav';
import {
  MAX_SAFE_CANVAS_DIMENSION,
  MAX_SAFE_CANVAS_PIXELS,
  MAX_EXPORT_AGGREGATE_PIXELS,
} from '@/config/canvasLimits';
import { ExportScopeSelector } from './export/ExportScopeSelector';
import { ExportProgressBar } from './export/ExportProgressBar';
import { PngExportTab } from './export/PngExportTab';
import { AnimatedExportTab } from './export/AnimatedExportTab';
import { SpritesheetExportTab } from './export/SpritesheetExportTab';
import { ReplayExportTab } from './export/ReplayExportTab';
import { VectorSvgExportTab } from './export/VectorSvgExportTab';
import { ShaderExportTab } from './export/ShaderExportTab';
import { ProjectExportTab } from './export/ProjectExportTab';
import { GodotKitExportTab } from './export/GodotKitExportTab';
import { CartExportTab, type CartExportHandle } from './export/CartExportTab';
import { buildGodotKit } from '@/lib/export/godotKit';
import { buildAnimationModel, playbackOrder } from '@/lib/export/animationModel';
import { downloadCompanionAsset } from '@/lib/export/downloadAsset';
import { beginWorkspaceJob, type WorkspaceJob } from '@/lib/engine/workspaceJob';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: ExportType;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, initialType = 'png' }) => {
  const projectName = useStudioStore((s) => s.projectName);
  const canvasWidth = useStudioStore((s) => s.canvasWidth);
  const canvasHeight = useStudioStore((s) => s.canvasHeight);
  const frames = useStudioStore((s) => s.frames);
  const activeFrameIndex = useStudioStore((s) => s.activeFrameIndex);
  const fps = useStudioStore((s) => s.fps);
  const clips = useStudioStore((s) => s.clips);
  const loopMode = useStudioStore((s) => s.loopMode);
  const palettes = useStudioStore((s) => s.palettes);
  const currentPaletteId = useStudioStore((s) => s.currentPaletteId);
  const paletteCycleSpeedMultiplier = useStudioStore((s) => s.paletteCycleSpeedMultiplier);

  const [exportType, setExportType] = useState<ExportType>(initialType);
  const cartRef = React.useRef<CartExportHandle>(null);
  const [isCartBusy, setIsCartBusy] = useState(false);
  const [projectExportError, setProjectExportError] = useState<string | null>(null);
  const [isProjectExporting, setIsProjectExporting] = useState(false);
  const projectExportInFlightRef = React.useRef(false);
  const [shaderTarget, setShaderTarget] = useState<'godot' | 'unity'>('godot');
  const [kitIndexed, setKitIndexed] = useState(false);
  const [kitNormals, setKitNormals] = useState(false);
  const [kitPivot, setKitPivot] = useState<'center' | 'feet'>('center');
  const [kitError, setKitError] = useState<string | null>(null);
  const kitInFlightRef = React.useRef(false);
  const [cycleLoopDuration, setCycleLoopDuration] = useState<number>(2.0);
  const [cycleLoopFps, setCycleLoopFps] = useState<number>(8);
  const [cycleLoopFormat, setCycleLoopFormat] = useState<'apng' | 'gif'>('apng');
  const [replayFormat, setReplayFormat] = useState<'gif' | 'mp4'>('gif');
  // Isolated export scale state per export tab to prevent cross-tab clamping and state bleed
  const [tabScales, setTabScales] = useState<Record<ExportType, number>>({
    cart: 1,
    png: 4,
    gif: 4,
    apng: 4,
    webm: 4,
    mp4: 4,
    spritesheet: 2,
    'godot-kit': 1,
    replay: 4,
    svg: 4,
    shader: 4,
    'palette-cycle': 4,
    project: 1,
  });
  const scale = tabScales[exportType] ?? 4;
  const setScale = (newScale: number | ((prev: number) => number)) => {
    setTabScales((prev) => {
      const currentVal = prev[exportType] ?? 4;
      const resolved = typeof newScale === 'function' ? newScale(currentVal) : newScale;
      return {
        ...prev,
        [exportType]: resolved,
      };
    });
  };
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
  const [isMp4Supported, setIsMp4Supported] = useState(false);
  const [isWebmSupported, setIsWebmSupported] = useState(false);
  const abortControllerRef = React.useRef<AbortController | null>(null);
  useEffect(() => () => abortControllerRef.current?.abort(), []);
  useEffect(() => { if (!isOpen) abortControllerRef.current?.abort(); }, [isOpen]);
  const finishExport = (controller: AbortController) => {
    if (abortControllerRef.current !== controller) return;
    abortControllerRef.current = null;
    setIsExporting(false);
    setExportProgress(null);
  };

  useEffect(() => {
    if (isOpen && !abortControllerRef.current) {
      setExportType(initialType);
      setProjectExportError(null);
      setKitError(null);
    }
  }, [isOpen, initialType]);

  useEffect(() => {
    let disposed = false;
    setIsMp4Supported(false);
    setIsWebmSupported(false);
    // Native codec queries can stall a browser's media backend. Image, game-kit
    // and backup exports must not enter that backend just to open their dialog.
    if (isOpen && (exportType === 'webm' || exportType === 'mp4')) {
      setIsWebmSupported(isWebmExportSupported());
    }
    if (isOpen && (exportType === 'mp4' || (exportType === 'replay' && replayFormat === 'mp4'))) {
      const exportFps = exportType === 'replay' ? replayFps : fps;
      void probeMp4ExportSupport(canvasWidth * scale, canvasHeight * scale, exportFps).then(supported => {
        if (!disposed) setIsMp4Supported(supported);
      });
    }
    return () => { disposed = true; };
  }, [isOpen, exportType, replayFormat, replayFps, canvasWidth, canvasHeight, scale, fps]);

  // Compute targeted frames based on selected clip scope with inverted/out-of-bounds safety
  const selectedClip = clips.find((c) => c.id === selectedClipId);
  let startIdx = 0;
  let endIdx = Math.max(0, frames.length - 1);
  if (selectedClip) {
    startIdx = Math.max(0, Math.min(selectedClip.startFrame, selectedClip.endFrame));
    endIdx = Math.min(Math.max(0, frames.length - 1), Math.max(selectedClip.startFrame, selectedClip.endFrame));
  }
  const targetFrames = selectedClip ? frames.slice(startIdx, endIdx + 1) : frames;
  const animationFrames = playbackOrder(0, targetFrames.length - 1, selectedClip?.loopMode, loopMode)
    .map(index => targetFrames[index]);
  const scopeSuffix = selectedClip ? `_${selectedClip.name.replace(/\s+/g, '_')}` : '';

  const handleCancel = () => {
    // Keep the operation's lease until native callbacks and cleanup drain.
    abortControllerRef.current?.abort();
    onClose();
  };


  const handleSelectExportType = (type: ExportType) => {
    setExportType(type);
    setProjectExportError(null);
    setKitError(null);
  };

  const handleExportGodotKit = async () => {
    if (abortControllerRef.current || kitInFlightRef.current) return;
    kitInFlightRef.current = true;
    const controller = new AbortController(); abortControllerRef.current = controller;
    setIsExporting(true); setKitError(null);
    try {
      const { blob } = await buildGodotKit({ clipId: selectedClipId, indexed: kitIndexed, normals: kitNormals, pivot: kitPivot, signal: controller.signal });
      if (controller.signal.aborted) return;
      const url = URL.createObjectURL(blob), link = document.createElement('a');
      link.download = `${projectName.toLowerCase().replace(/[^a-z0-9_-]+/g, '_').slice(0, 64) || 'sprite'}-godot-kit.zip`;
      link.href = url; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); onClose();
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) setKitError(error instanceof Error ? error.message : 'Game kit export failed. Retry the export.');
    } finally {
      kitInFlightRef.current = false;
      if (abortControllerRef.current === controller) { abortControllerRef.current = null; setIsExporting(false); }
    }
  };

  const handleExportPNG = () => {
    const source = compositeFrame(frames, activeFrameIndex, canvasWidth, canvasHeight, { freshCanvas: true });
    if (!source) {
      studioEvents.emit('pixibun:toast', { type: 'error', message: 'PNG export failed: the active frame could not be rendered.' });
      return;
    }

    const exportWidth = canvasWidth * scale;
    const exportHeight = canvasHeight * scale;

    if (
      exportWidth > MAX_SAFE_CANVAS_DIMENSION ||
      exportHeight > MAX_SAFE_CANVAS_DIMENSION ||
      exportWidth * exportHeight > MAX_SAFE_CANVAS_PIXELS
    ) {
      const message = `PNG export aborted: requested dimensions ${exportWidth}x${exportHeight} exceed the ${MAX_SAFE_CANVAS_DIMENSION}px / 16.7MP safety limit.`;
      console.error(message);
      studioEvents.emit('pixibun:toast', { type: 'error', message });
      return;
    }

    try {
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = exportWidth;
      exportCanvas.height = exportHeight;
      const ctx = exportCanvas.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to acquire 2D rendering context for export.');
      }

      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(source, 0, 0, exportCanvas.width, exportCanvas.height);

      const dataUrl = exportCanvas.toDataURL('image/png');
      if (!dataUrl || dataUrl === 'data:,' || dataUrl.length < 64) {
        throw new Error('toDataURL returned empty or corrupted data.');
      }

      const link = document.createElement('a');
      link.download = `${projectName.toLowerCase().replace(/\s+/g, '-')}${scopeSuffix}-${exportWidth}x${exportHeight}.png`;
      link.href = dataUrl;
      link.click();
      onClose();
    } catch (err) {
      console.error('PNG export failed:', err);
      studioEvents.emit('pixibun:toast', {
        type: 'error',
        message: `PNG export failed: ${err instanceof Error ? err.message : 'Unable to create the image.'}`,
      });
    }
  };

  const handleExportSpriteSheet = () => {
    if (targetFrames.length === 0) return;

    const effectiveScale = Math.min(scale, 4);
    const geometry = calculateSpriteSheetGeometry(targetFrames.length, canvasWidth, canvasHeight, {
      layout: layoutMode,
      scale: effectiveScale,
      padding,
    });

    const validation = validateExportGeometry(geometry.sheetWidth, geometry.sheetHeight);
    if (!validation.valid) {
      console.error(`Sprite sheet export aborted: ${validation.error}`);
      studioEvents.emit('pixibun:toast', {
        message: 'The sprite sheet would be too large to export safely.',
        type: 'error',
      });
      return;
    }

    let prepared: ReturnType<typeof prepareExportFrames> | undefined;
    let releaseSheet: (() => void) | undefined;
    let sheet: HTMLCanvasElement | undefined;
    try {
      releaseSheet = reserveMemory(geometry.sheetWidth * geometry.sheetHeight * 4 * 4, 'Preparing sprite sheet and PNG');
      prepared = prepareExportFrames(targetFrames, canvasWidth, canvasHeight);
      const frameCanvases = prepared.canvases;
      const baseFilename = `${`${projectName}${scopeSuffix}`.toLowerCase().replace(/[^a-z0-9_-]+/g, '_').slice(0, 64) || 'sprite'}-sheet-${effectiveScale}x`;
      const animation = buildAnimationModel(targetFrames, selectedClip ? [selectedClip] : clips,
        useStudioStore.getState().loopMode, targetFrames.map((_, i) => startIdx + i));
      const packed = packSpriteSheet(frameCanvases, canvasWidth, canvasHeight, fps, projectName, {
        layout: layoutMode,
        scale: effectiveScale,
        padding,
        animation,
        textureFilename: `${baseFilename}.png`,
      });

      sheet = packed.canvas;
      const dataUrl = packed.canvas.toDataURL('image/png');
      if (!dataUrl || dataUrl === 'data:,' || dataUrl.length < 64) {
        throw new Error('toDataURL returned empty or corrupted data.');
      }

      const link = document.createElement('a');
      link.download = `${baseFilename}.png`;
      link.href = dataUrl;
      link.click();

      if (includeMetadata && packed.metadata) {
        // Export Godot 4 SpriteFrames .tres resource
        if (packed.metadata.godotTres) {
          const tresBlob = new Blob([packed.metadata.godotTres], { type: 'text/plain' });
          const tresUrl = URL.createObjectURL(tresBlob);
          downloadCompanionAsset(tresUrl, `${baseFilename}.tres`);
          setTimeout(() => URL.revokeObjectURL(tresUrl), 1000);
        }

        // Export standard TexturePacker & Unity JSON metadata
        const jsonContent = packed.metadata.texturePackerJson || packed.metadata.unityJson;
        if (jsonContent) {
          const metaBlob = new Blob([jsonContent], { type: 'application/json' });
          const metaUrl = URL.createObjectURL(metaBlob);
          downloadCompanionAsset(metaUrl, `${baseFilename}.json`);
          setTimeout(() => URL.revokeObjectURL(metaUrl), 1000);
        }
      }

      onClose();
    } catch (err) {
      console.error('Sprite sheet export failed:', err);
      studioEvents.emit('pixibun:toast', {
        message: err instanceof Error ? err.message : 'Sprite sheet export failed. Retry the export.',
        type: 'error',
      });
    } finally {
      prepared?.release();
      if (sheet) { sheet.width = 0; sheet.height = 0; }
      releaseSheet?.();
    }
  };

  const handleExportGIF = async () => {
    if (abortControllerRef.current || isExporting || animationFrames.length === 0) return;

    const effectiveScale = Math.min(scale, 8);
    const outW = canvasWidth * effectiveScale;
    const outH = canvasHeight * effectiveScale;
    const validation = validateExportGeometry(outW, outH, {
      frameCount: animationFrames.length,
      maxAggregatePixels: MAX_EXPORT_AGGREGATE_PIXELS,
    });
    if (!validation.valid) {
      console.error(`GIF export aborted: ${validation.error}`);
      studioEvents.emit('pixibun:toast', {
        message: 'This animation would be too large to export safely.',
        type: 'error',
      });
      return;
    }

    let prepared: ReturnType<typeof prepareExportFrames> | undefined;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsExporting(true);
    setExportProgress({ current: 0, total: animationFrames.length });

    const delays = animationFrames.map((f) => {
      const ms = f.durationMs || Math.round(1000 / fps);
      return Math.max(2, Math.round(ms / 10));
    });

    try {
      prepared = await prepareExportFramesAsync(animationFrames, canvasWidth, canvasHeight, controller.signal);
      const frameCanvases = prepared.canvases;
      const blob = await createAnimatedGifBlobAsync(
        frameCanvases,
        fps,
        effectiveScale,
        (current, total) => {
          if (!controller.signal.aborted) setExportProgress({ current, total });
        },
        controller.signal,
        delays,
        loopMode !== 'once'
      );

      controller.signal.throwIfAborted();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `${projectName.toLowerCase().replace(/\s+/g, '-')}${scopeSuffix}-${effectiveScale}x.gif`;
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
      studioEvents.emit('pixibun:toast', {
        message: err instanceof Error ? err.message : 'GIF export failed. Please retry.',
        type: 'error',
      });
    } finally {
      prepared?.release();
      finishExport(controller);
    }
  };

  const handleExportReplay = async () => {
    const history = getGlobalHistory();
    if (abortControllerRef.current || isExporting || history.length === 0) return;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsExporting(true);
    setExportProgress({ current: 0, total: history.length });

    const isMp4 = replayFormat === 'mp4';
    const effectiveScale = Math.min(scale, 8);
    const baseline = getGlobalBaselineCheckpoint();
    let prepared: ReturnType<typeof prepareExportFrames> | undefined;
    let releaseFinalMemory: (() => void) | undefined;
    let sourceJob: WorkspaceJob | undefined;
    try {
      const source = useStudioStore.getState(), frame = source.frames[source.activeFrameIndex];
      if (!frame) throw new Error('The current artwork is unavailable. Retry the timelapse export.');
      sourceJob = beginWorkspaceJob(frame.layers.map(layer => layer.id), controller.signal);
      prepared = prepareExportFrames([frame], source.canvasWidth, source.canvasHeight);
      releaseFinalMemory = reserveMemory(source.canvasWidth * source.canvasHeight * 4 * (1 + effectiveScale * effectiveScale), 'Preparing final timelapse artwork');
      const context = prepared.canvases[0].getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error('The final artwork could not be read. Retry the timelapse export.');
      const finalFrame = { width: source.canvasWidth, height: source.canvasHeight,
        data: context.getImageData(0, 0, source.canvasWidth, source.canvasHeight).data };
      sourceJob.check();
      const blob = isMp4
        ? await exportProcessReplayMp4Async(history, {
            fps: replayFps,
            scale: effectiveScale,
            holdLastFrameMs,
            baseline,
            finalFrame,
            onProgress: (current, total) => {
              if (!controller.signal.aborted) setExportProgress({ current, total });
            },
            signal: sourceJob.signal,
          })
        : await exportProcessReplayGifAsync(history, {
            fps: replayFps,
            scale: effectiveScale,
            holdLastFrameMs,
            baseline,
            finalFrame,
            onProgress: (current, total) => {
              if (!controller.signal.aborted) setExportProgress({ current, total });
            },
            signal: sourceJob.signal,
          });

      const ext = isMp4 ? 'mp4' : 'gif';
      sourceJob.check();
      controller.signal.throwIfAborted();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `${projectName.toLowerCase().replace(/\s+/g, '-')}-timelapse-${effectiveScale}x.${ext}`;
      link.href = url;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      onClose();
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError' && controller.signal.aborted) {
        return;
      }
      console.error('Process replay export failed:', err);
      studioEvents.emit('pixibun:toast', { message: err instanceof Error ? err.message : 'Timelapse export failed. Please retry.', type: 'error' });
    } finally {
      prepared?.release();
      releaseFinalMemory?.();
      sourceJob?.dispose();
      finishExport(controller);
    }
  };

  const handleExportApng = async () => {
    if (abortControllerRef.current || isExporting || animationFrames.length === 0) return;

    const effectiveScale = Math.min(scale, 16);
    const outW = canvasWidth * effectiveScale;
    const outH = canvasHeight * effectiveScale;
    const validation = validateExportGeometry(outW, outH, {
      frameCount: animationFrames.length,
      maxAggregatePixels: MAX_EXPORT_AGGREGATE_PIXELS,
    });
    if (!validation.valid) {
      console.error(`APNG export aborted: ${validation.error}`);
      studioEvents.emit('pixibun:toast', {
        message: 'This animation would be too large to export safely.',
        type: 'error',
      });
      return;
    }

    let prepared: ReturnType<typeof prepareExportFrames> | undefined;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsExporting(true);
    setExportProgress({ current: 0, total: animationFrames.length });

    const durationsMs = animationFrames.map((f) => f.durationMs || Math.round(1000 / fps));

    try {
      prepared = await prepareExportFramesAsync(animationFrames, canvasWidth, canvasHeight, controller.signal);
      const frameCanvases = prepared.canvases;
      const blob = await exportAnimationToApngAsync(frameCanvases, {
        fps,
        scale: effectiveScale,
        durationsMs,
        loopCount: loopMode === 'once' ? 1 : 0,
        onProgress: (current, total) => {
          if (!controller.signal.aborted) setExportProgress({ current, total });
        },
        signal: controller.signal,
      });

      controller.signal.throwIfAborted();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `${projectName.toLowerCase().replace(/\s+/g, '-')}${scopeSuffix}-${effectiveScale}x.png`;
      link.href = url;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      onClose();
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      console.error('APNG export failed:', err);
      studioEvents.emit('pixibun:toast', {
        message: apngFailureMessage(err),
        type: 'error',
      });
    } finally {
      prepared?.release();
      finishExport(controller);
    }
  };

  const handleExportMp4 = async () => {
    if (abortControllerRef.current || isExporting || animationFrames.length === 0) return;

    const effectiveScale = Math.min(scale, 16);
    const outW = (canvasWidth * effectiveScale + 1) & ~1;
    const outH = (canvasHeight * effectiveScale + 1) & ~1;
    const validation = validateExportGeometry(outW, outH);
    if (!validation.valid) {
      console.error(`MP4 export aborted: ${validation.error}`);
      studioEvents.emit('pixibun:toast', {
        message: 'This animation would be too large to export safely.',
        type: 'error',
      });
      return;
    }

    let prepared: ReturnType<typeof prepareExportFrames> | undefined;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsExporting(true);
    setExportProgress({ current: 0, total: animationFrames.length * videoLoopCount });

    const durationsMs = animationFrames.map((f) => f.durationMs || Math.round(1000 / fps));

    try {
      prepared = await prepareExportFramesAsync(animationFrames, canvasWidth, canvasHeight, controller.signal);
      const frameCanvases = prepared.canvases;
      const blob = await exportAnimationToMp4Async(frameCanvases, {
        fps,
        scale: effectiveScale,
        durationsMs,
        loopCount: videoLoopCount,
        onProgress: (current, total) => {
          if (!controller.signal.aborted) setExportProgress({ current, total });
        },
        signal: controller.signal,
      });

      controller.signal.throwIfAborted();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `${projectName.toLowerCase().replace(/\s+/g, '-')}${scopeSuffix}-${effectiveScale}x.mp4`;
      link.href = url;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      onClose();
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      console.error('MP4 export failed:', err);
      studioEvents.emit('pixibun:toast', {
        message: err instanceof Error ? err.message : 'MP4 export failed. Please retry.',
        type: 'error',
      });
    } finally {
      prepared?.release();
      finishExport(controller);
    }
  };

  const handleExportSvg = () => {
    const source = compositeFrame(frames, activeFrameIndex, canvasWidth, canvasHeight, { freshCanvas: true });
    if (!source) return;

    const ctx = source.getContext('2d');
    if (!ctx) return;

    const effectiveScale = Math.min(scale, 32);
    const imgData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
    const result = depixelizeToSvg(imgData, { scale: Math.max(1, effectiveScale), smooth: svgSmooth });

    const blob = new Blob([result.svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `${projectName.toLowerCase().replace(/\s+/g, '-')}${scopeSuffix}-vector-${effectiveScale}x.svg`;
    link.href = url;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    onClose();
  };

  const handleExportWebm = async () => {
    if (abortControllerRef.current || isExporting || animationFrames.length === 0) return;

    const effectiveScale = Math.min(scale, 16);
    const outW = canvasWidth * effectiveScale;
    const outH = canvasHeight * effectiveScale;
    const validation = validateExportGeometry(outW, outH);
    if (!validation.valid) {
      console.error(`WebM export aborted: ${validation.error}`);
      studioEvents.emit('pixibun:toast', {
        message: 'This animation would be too large to export safely.',
        type: 'error',
      });
      return;
    }

    let prepared: ReturnType<typeof prepareExportFrames> | undefined;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsExporting(true);
    setExportProgress({ current: 0, total: animationFrames.length * videoLoopCount });

    const durationsMs = animationFrames.map((f) => f.durationMs || Math.round(1000 / fps));

    try {
      prepared = await prepareExportFramesAsync(animationFrames, canvasWidth, canvasHeight, controller.signal);
      const frameCanvases = prepared.canvases;
      const blob = await exportAnimationToWebmAsync(frameCanvases, {
        fps,
        scale: effectiveScale,
        durationsMs,
        loopCount: videoLoopCount,
        onProgress: (current, total) => {
          if (!controller.signal.aborted) setExportProgress({ current, total });
        },
        signal: controller.signal,
      });

      controller.signal.throwIfAborted();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `${projectName.toLowerCase().replace(/\s+/g, '-')}${scopeSuffix}-${effectiveScale}x.webm`;
      link.href = url;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      onClose();
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      console.error('WebM export failed:', err);
      studioEvents.emit('pixibun:toast', {
        message: err instanceof Error ? err.message : 'WebM export failed. Please retry.',
        type: 'error',
      });
    } finally {
      prepared?.release();
      finishExport(controller);
    }
  };

  const handleExportProjectJson = async () => {
    if (abortControllerRef.current || projectExportInFlightRef.current) return;
    const controller = new AbortController(); abortControllerRef.current = controller;
    projectExportInFlightRef.current = true;
    setIsProjectExporting(true);
    setProjectExportError(null);
    try {
      const project = await buildProjectFileAsync(controller.signal);
      controller.signal.throwIfAborted();
      const projectData = JSON.stringify(project, null, 2);
      const filename = `${(projectName || 'project').toLowerCase().replace(/\s+/g, '-')}.pixibun`;
      const result = await DesktopFileSystem.saveProject(projectData, filename, true, undefined, controller.signal);
      controller.signal.throwIfAborted();
      if (!result.success) {
        setProjectExportError(
          result.error === 'Save cancelled by user'
            ? 'No backup was created. Your project is still open here.'
            : 'Couldn’t create the project backup. Try again or choose another location.'
        );
        return;
      }
      onClose();
    } catch (err) {
      if (controller.signal.aborted) return;
      console.error('Project backup failed:', err);
      setProjectExportError('Couldn’t create the project backup. Try again or choose another location.');
    } finally {
      projectExportInFlightRef.current = false;
      setIsProjectExporting(false);
      finishExport(controller);
    }
  };

  const currentPalette = palettes.find((p) => p.id === currentPaletteId) || palettes[0];
  const activeCycleTracks = currentPalette?.cycleTracks?.filter((t) => t.enabled && t.rate > 0 && t.high > t.low) || [];

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
    if (abortControllerRef.current || !currentPalette || !activeCycleTracks.length) return;
    const effectiveScale = cycleLoopFormat === 'apng' ? Math.min(scale, 16) : Math.min(scale, 8);
    const outW = canvasWidth * effectiveScale;
    const outH = canvasHeight * effectiveScale;
    const estimatedFrames = Math.max(1, Math.round(cycleLoopDuration * cycleLoopFps));
    const isAggregateFormat = cycleLoopFormat === 'apng' || cycleLoopFormat === 'gif';
    const validation = validateExportGeometry(outW, outH, {
      frameCount: isAggregateFormat ? estimatedFrames : undefined,
      maxAggregatePixels: isAggregateFormat ? MAX_EXPORT_AGGREGATE_PIXELS : undefined,
    });
    if (!validation.valid) {
      console.error(`Palette cycle loop export aborted: ${validation.error}`);
      studioEvents.emit('pixibun:toast', {
        message: 'This animation would be too large to export safely.',
        type: 'error',
      });
      return;
    }

    const controller = new AbortController(); abortControllerRef.current = controller;
    let source: HTMLCanvasElement | null = null;
    let frameCanvases: HTMLCanvasElement[] = [];
    let releaseFrames: (() => void) | undefined;
    setIsExporting(true);
    try {
      releaseFrames = reserveMemory((estimatedFrames + 4) * canvasWidth * canvasHeight * 4, "Preparing palette cycle frames");
      await new Promise<void>(resolve => setTimeout(resolve, 0));
      controller.signal.throwIfAborted();
      source = compositeFrame(frames, activeFrameIndex, canvasWidth, canvasHeight, { freshCanvas: true });
      if (!source) throw new Error("The active frame could not be rendered.");
      const loopFps = cycleLoopFps;
      frameCanvases = generateLoopAnimationCanvases(
        source,
        currentPalette.colors,
        activeCycleTracks.map(track => ({ ...track, rate: track.rate * paletteCycleSpeedMultiplier })),
        cycleLoopDuration,
        loopFps
      );

      if (cycleLoopFormat === 'apng') {
        const effectiveScale = Math.min(scale, 16);
        const apngBlob = await exportAnimationToApngAsync(frameCanvases, {
          fps: loopFps,
          scale: effectiveScale,
          loopCount: 0,
          signal: controller.signal,
          onProgress: (current: number, total: number) => {
            if (!controller.signal.aborted) setExportProgress({ current, total });
          },
        });
        controller.signal.throwIfAborted();
        const url = URL.createObjectURL(apngBlob);
        const link = document.createElement('a');
        link.download = `${projectName.toLowerCase().replace(/\s+/g, '-')}-cycle-loop-${effectiveScale}x.png`;
        link.href = url;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else {
        const effectiveScale = Math.min(scale, 8);
        // Distribute GIF's centisecond rounding across frames instead of drifting
        // the whole loop (15 FPS uses 70/60/70ms, totaling exactly 2s for 30 frames).
        const delays = frameCanvases.map((_, i) => Math.max(2,
          Math.round((i + 1) * 100 / loopFps) - Math.round(i * 100 / loopFps)));
        const gifBlob = await createAnimatedGifBlobAsync(
          frameCanvases,
          loopFps,
          effectiveScale,
          (current: number, total: number) => {
            if (!controller.signal.aborted) setExportProgress({ current, total });
          },
          controller.signal,
          delays
        );
        controller.signal.throwIfAborted();
        const url = URL.createObjectURL(gifBlob);
        const link = document.createElement('a');
        link.download = `${projectName.toLowerCase().replace(/\s+/g, '-')}-cycle-loop-${effectiveScale}x.gif`;
        link.href = url;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
      onClose();
    } catch (err) {
      if (controller.signal.aborted) return;
      console.error('Palette cycle loop export failed:', err);
      studioEvents.emit('pixibun:toast', {
        message: apngFailureMessage(err),
        type: 'error',
      });
    } finally {
      if (source) { source.width = 0; source.height = 0; }
      for (const canvas of frameCanvases) { canvas.width = 0; canvas.height = 0; }
      releaseFrames?.();
      finishExport(controller);
    }
  };

  const historyLength = getGlobalHistory().length;

  return (
    <ModalWrapper isOpen={isOpen} onClose={handleCancel} title={exportType === 'project' ? 'Project backup' : 'Export Studio Assets'} maxWidth="w-[560px]">
      {/* Format Selector Tabs */}
      <ExportTabsNav
        exportType={exportType}
        onSelectType={handleSelectExportType}
        isExporting={isExporting || isProjectExporting}
      />

      {/* Export Scope (Tag Clips) Selector */}
      {clips.length > 0 && exportType !== 'cart' && exportType !== 'project' && exportType !== 'palette-cycle' && exportType !== 'shader' && (
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
      {exportType === 'cart' && (
        <CartExportTab ref={cartRef} disabled={isCartBusy} onBusy={setIsCartBusy} onDone={onClose} />
      )}

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
          totalFrames={animationFrames.length}
          fps={fps}
          videoLoopCount={videoLoopCount}
          setVideoLoopCount={setVideoLoopCount}
          isMp4Supported={isMp4Supported}
          isWebmSupported={isWebmSupported}
          onSelectType={setExportType}
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
          isTruncated={isGlobalHistoryTruncated()}
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
          cycleLoopFps={cycleLoopFps}
          setCycleLoopFps={setCycleLoopFps}
          activeCycleTracksCount={activeCycleTracks.length}
          scale={scale}
          setScale={setScale}
        />
      )}

      {exportType === 'project' && (
        <ProjectExportTab totalFrames={frames.length} />
      )}

      {exportType === 'godot-kit' && <GodotKitExportTab indexed={kitIndexed} normals={kitNormals} pivot={kitPivot}
        onIndexed={setKitIndexed} onNormals={setKitNormals} onPivot={setKitPivot} disabled={isExporting} />}
      {exportType === 'godot-kit' && kitError && <p role="alert" className="text-xs text-[var(--state-danger)]">{kitError}</p>}

      {projectExportError && exportType === 'project' && (
        <p role="alert" className="text-xs text-[var(--state-danger)] border border-[var(--state-danger)]/40 bg-[var(--surface-0)] px-2 py-1.5 rounded-[2px]">
          {projectExportError}
        </p>
      )}

      {/* Modal Actions */}
      <div className="flex justify-end gap-2 pt-2 border-t border-[var(--desk-border)]">
        <TactileButton
          size="sm"
          variant="default"
          onClick={handleCancel}
          aria-label="Cancel"
          data-testid="export-cancel-button"
          className="bg-[var(--desk-surface)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[var(--accent-gold)]"
        >
          Cancel
        </TactileButton>

        <TactileButton
          size="sm"
          variant="primary"
          disabled={
            isExporting || isProjectExporting || isCartBusy ||
            (exportType === 'replay' && (historyLength === 0 || (replayFormat === 'mp4' && !isMp4Supported))) ||
            (exportType === 'mp4' && !isMp4Supported) ||
            (exportType === 'webm' && !isWebmSupported)
            || (exportType === 'palette-cycle' && activeCycleTracks.length === 0)
          }
          onClick={
            exportType === 'cart'
              ? () => void cartRef.current?.save()
              : exportType === 'godot-kit'
              ? handleExportGodotKit
              : exportType === 'shader'
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
          className="bg-[var(--primary-bg)] text-[var(--primary-fg)] hover:bg-[var(--primary-hover)] hover:shadow-[0_2px_0_#8c5120] border-2 border-[var(--ink)] font-display font-bold shadow-[0_2px_0_#8c5120]"
        >
          <PixelIcon name="export" size={12} />
          <span>{exportType === 'cart' ? (isCartBusy ? 'Packing the cart…' : 'Save cart') : isProjectExporting ? 'Preparing backup…' : isExporting ? 'Preparing export…' : exportType === 'project' ? 'Download project backup' : exportType === 'godot-kit' ? 'Download Godot kit' : exportType === 'palette-cycle' ? 'Download cycle animation' : `Download ${exportType.toUpperCase()}`}</span>
        </TactileButton>
      </div>
    </ModalWrapper>
  );
};
