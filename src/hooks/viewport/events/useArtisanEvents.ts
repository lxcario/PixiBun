import { useEffect } from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { studioEvents } from '@/lib/events/studioEvents';
import {
  cleanJaggiesOnCanvas,
  generate47BlobEdgeData,
  applyAtmosphericColorGrade,
  quantizeToActivePalette,
  cleanStrayPixelsOnCanvas,
  morphInBetweenFrames,
} from '@/lib/ai/pixelAiEngine';
import {
  applyAtkinsonDither,
  applyRiemersmaDither,
  applyZhangSuenThinning,
} from '@/lib/ai/smartMathEngine';
import { synthesizeWfc } from '@/lib/procedural/waveFunctionCollapse';
import { getOrCreateBuffer } from '@/lib/engine/bufferRegistry';
import type { ViewportEventContext } from './types';

export function useArtisanEvents({
  canvasWidth,
  canvasHeight,
  activeLayerId,
  getOrCreateLayerCanvas,
  renderComposite,
  captureSnapshot,
  commitSnapshot,
  bumpBufferVersion,
  compositeSourceSnapshot,
  updateTaggedLayer,
}: ViewportEventContext) {
  useEffect(() => {
    const handleCleanJaggiesEvent = () => {
      captureSnapshot('AI Clean Jaggies');
      const currentLayerCanvas = getOrCreateLayerCanvas(activeLayerId);
      const ctx = currentLayerCanvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        cleanJaggiesOnCanvas(ctx, canvasWidth, canvasHeight);
        commitSnapshot();
        renderComposite();
        bumpBufferVersion();
      }
    };

    const handle47BlobEvent = () => {
      const srcCtx = compositeSourceSnapshot('blob-edges');
      if (!srcCtx) return;

      const { blobPixels } = generate47BlobEdgeData(srcCtx, canvasWidth, canvasHeight);

      updateTaggedLayer('47-Blob Contours', 'blob-edges', (outCtx) => {
        blobPixels.forEach((p) => {
          outCtx.fillStyle = `rgba(${p.r}, ${p.g}, ${p.b}, ${p.a / 255})`;
          outCtx.fillRect(p.x, p.y, 1, 1);
        });
      });
    };

    const handleWfcSynthesisEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      const detail = customEvent.detail || {};
      const n = detail.n ?? 2;
      const symmetries = detail.symmetries ?? 8;
      const seed = detail.seed ?? Math.floor(Math.random() * 100000);

      const state = useStudioStore.getState();
      const selection = state.selection;

      const srcCtx = compositeSourceSnapshot('wfc-synthesis');
      if (!srcCtx) return;

      let sampleX = 0;
      let sampleY = 0;
      let sampleW = canvasWidth;
      let sampleH = canvasHeight;

      if (selection && selection.w >= 2 && selection.h >= 2) {
        sampleX = Math.max(0, Math.min(canvasWidth - 1, Math.round(selection.x)));
        sampleY = Math.max(0, Math.min(canvasHeight - 1, Math.round(selection.y)));
        sampleW = Math.min(Math.round(selection.w), canvasWidth - sampleX);
        sampleH = Math.min(Math.round(selection.h), canvasHeight - sampleY);
      } else if (canvasWidth > 16 || canvasHeight > 16) {
        sampleW = Math.min(16, canvasWidth);
        sampleH = Math.min(16, canvasHeight);
      }

      const sampleImg = srcCtx.getImageData(sampleX, sampleY, sampleW, sampleH);

      const result = synthesizeWfc(
        {
          sampleData: sampleImg.data,
          sampleWidth: sampleW,
          sampleHeight: sampleH,
          outputWidth: canvasWidth,
          outputHeight: canvasHeight,
        },
        {
          N: n,
          symmetries,
          seed,
          periodicInput: true,
          periodicOutput: true,
        }
      );

      if (!result.success) {
        state.addAiMessage({
          sender: 'assistant',
          text: `WaveFunctionCollapse: synthesis encountered contradictions after retries. Try a different sample region or N=2.`,
        });
        return;
      }

      updateTaggedLayer('WFC Synthesis', 'wfc-synthesis', (outCtx) => {
        const outImgData = outCtx.createImageData(canvasWidth, canvasHeight);
        outImgData.data.set(result.data);
        outCtx.putImageData(outImgData, 0, 0);
      });

      state.addAiMessage({
        sender: 'assistant',
        text: `WaveFunctionCollapse synthesized a ${canvasWidth}×${canvasHeight} tileable pattern from the ${sampleW}×${sampleH} sample obeying local N=${n} neighborhood constraints with 0 adjacency violations!`,
      });
    };

    const handleAtkinsonDitherEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      const paletteColors = customEvent.detail?.colors || [];

      captureSnapshot('Atkinson Dither');
      const targetCanvas = getOrCreateLayerCanvas(activeLayerId);
      const tCtx = targetCanvas.getContext('2d', { willReadFrequently: true });
      if (tCtx) {
        applyAtkinsonDither(tCtx, canvasWidth, canvasHeight, paletteColors);
        commitSnapshot();
        renderComposite();
        bumpBufferVersion();
      }
    };

    const handleRiemersmaDitherEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      const paletteColors = customEvent.detail?.colors || [];

      captureSnapshot('Riemersma Dither');
      const targetCanvas = getOrCreateLayerCanvas(activeLayerId);
      const tCtx = targetCanvas.getContext('2d', { willReadFrequently: true });
      if (tCtx) {
        applyRiemersmaDither(tCtx, canvasWidth, canvasHeight, paletteColors);
        commitSnapshot();
        renderComposite();
        bumpBufferVersion();
      }
    };

    const handleSkeletonThinningEvent = () => {
      captureSnapshot('1px Skeleton Thinning');
      const targetCanvas = getOrCreateLayerCanvas(activeLayerId);
      const tCtx = targetCanvas.getContext('2d', { willReadFrequently: true });
      if (tCtx) {
        applyZhangSuenThinning(tCtx, canvasWidth, canvasHeight);
        commitSnapshot();
        renderComposite();
        bumpBufferVersion();
      }
    };

    const handleColorGradeEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      const grade = customEvent.detail?.grade || 'sunset';

      captureSnapshot(`AI Color Grade (${grade})`);
      const targetCanvas = getOrCreateLayerCanvas(activeLayerId);
      const tCtx = targetCanvas.getContext('2d');
      if (tCtx) {
        applyAtmosphericColorGrade(tCtx, canvasWidth, canvasHeight, grade);
        commitSnapshot();
        renderComposite();
        bumpBufferVersion();
      }
    };

    const handleQuantizePaletteEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      const paletteColors = customEvent.detail?.colors || [];

      captureSnapshot('AI Snap to Palette');
      const targetCanvas = getOrCreateLayerCanvas(activeLayerId);
      const tCtx = targetCanvas.getContext('2d');
      if (tCtx) {
        quantizeToActivePalette(tCtx, canvasWidth, canvasHeight, paletteColors);
        commitSnapshot();
        renderComposite();
        bumpBufferVersion();
      }
    };

    const handleRemoveStraysEvent = () => {
      captureSnapshot('AI Remove Stray Pixels');
      const targetCanvas = getOrCreateLayerCanvas(activeLayerId);
      const tCtx = targetCanvas.getContext('2d');
      if (tCtx) {
        cleanStrayPixelsOnCanvas(tCtx, canvasWidth, canvasHeight);
        commitSnapshot();
        renderComposite();
        bumpBufferVersion();
      }
    };

    const handleInBetweenFrameEvent = () => {
      const state = useStudioStore.getState();
      const currentIdx = state.activeFrameIndex;
      const totalFrames = state.frames.length;

      const frameA = state.frames[currentIdx];
      if (!frameA) return;

      let nextIdx = (currentIdx + 1) % totalFrames;
      if (totalFrames === 1) {
        state.duplicateFrame(0);
        nextIdx = 1;
      }
      const frameB = state.frames[nextIdx];

      const getCleanCtx = (frame: typeof frameA) => {
        const scratch = document.createElement('canvas');
        scratch.width = canvasWidth;
        scratch.height = canvasHeight;
        const ctx = scratch.getContext('2d')!;
        ctx.imageSmoothingEnabled = false;
        frame.layers
          .slice()
          .reverse()
          .forEach((l) => {
            if (!l.visible || l.tag) return;
            const lCanvas = getOrCreateLayerCanvas(l.id);
            ctx.globalAlpha = l.opacity;
            ctx.globalCompositeOperation = l.blendMode;
            ctx.drawImage(lCanvas, 0, 0);
          });
        return ctx;
      };

      const ctxA = getCleanCtx(frameA);
      const ctxB = getCleanCtx(frameB);

      const morphedCanvas = morphInBetweenFrames(ctxA, ctxB, canvasWidth, canvasHeight, 0.5);

      state.duplicateFrame(currentIdx);
      const updatedState = useStudioStore.getState();
      const newFrame = updatedState.frames[updatedState.activeFrameIndex];

      if (newFrame) {
        const nonTaggedLayers = newFrame.layers.filter((l) => !l.tag);
        const baseLayer = nonTaggedLayers[nonTaggedLayers.length - 1];

        if (baseLayer) {
          const targetBuf = getOrCreateBuffer(baseLayer.id, canvasWidth, canvasHeight);
          const tCtx = targetBuf.canvas.getContext('2d', { willReadFrequently: true });
          if (tCtx) {
            tCtx.clearRect(0, 0, canvasWidth, canvasHeight);
            tCtx.imageSmoothingEnabled = false;
            tCtx.drawImage(morphedCanvas, 0, 0);
          }
        }

        for (const l of nonTaggedLayers) {
          if (l.id !== baseLayer?.id) {
            const upperBuf = getOrCreateBuffer(l.id, canvasWidth, canvasHeight);
            upperBuf.canvas.getContext('2d')?.clearRect(0, 0, canvasWidth, canvasHeight);
          }
        }
      }

      renderComposite();
      bumpBufferVersion();

      if (frameA.layers.some((l) => l.tag === 'photometric')) {
        studioEvents.emit('pixibun:photometric-lighting', {});
      }
      if (frameA.layers.some((l) => l.tag === 'optical-output')) {
        studioEvents.emit('pixibun:volumetric-optics', {});
      }
      if (frameA.layers.some((l) => l.tag === 'cast-shadow')) {
        studioEvents.emit('pixibun:render-cast-shadow', {});
      }
    };

    const unsubs = [
      studioEvents.on('pixibun:clean-jaggies', handleCleanJaggiesEvent),
      studioEvents.on('pixibun:apply-47-blob', handle47BlobEvent),
      studioEvents.on('pixibun:wfc-synthesis', (detail) =>
        handleWfcSynthesisEvent({ detail } as CustomEvent)
      ),
      studioEvents.on('pixibun:atkinson-dither', (detail) =>
        handleAtkinsonDitherEvent({ detail } as CustomEvent)
      ),
      studioEvents.on('pixibun:riemersma-dither', (detail) =>
        handleRiemersmaDitherEvent({ detail } as CustomEvent)
      ),
      studioEvents.on('pixibun:skeleton-thinning', handleSkeletonThinningEvent),
      studioEvents.on('pixibun:color-grade', (detail) =>
        handleColorGradeEvent({ detail } as CustomEvent)
      ),
      studioEvents.on('pixibun:quantize-palette', (detail) =>
        handleQuantizePaletteEvent({ detail } as CustomEvent)
      ),
      studioEvents.on('pixibun:remove-strays', handleRemoveStraysEvent),
      studioEvents.on('pixibun:in-between-frame', handleInBetweenFrameEvent),
    ];

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [
    activeLayerId,
    bumpBufferVersion,
    canvasHeight,
    canvasWidth,
    captureSnapshot,
    commitSnapshot,
    compositeSourceSnapshot,
    getOrCreateLayerCanvas,
    renderComposite,
    updateTaggedLayer,
  ]);
}
