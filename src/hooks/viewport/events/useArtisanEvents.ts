import { useEffect } from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { studioEvents } from '@/lib/events/studioEvents';
import {
  cleanJaggiesOnCanvas,
  generate47BlobEdgeData,
  applyAtmosphericColorGrade,
  quantizeToActivePalette,
  cleanStrayPixelsOnCanvas,
} from '@/lib/ai/pixelAiEngine';
import {
  applyAtkinsonDither,
  applyRiemersmaDither,
  applyZhangSuenThinning,
} from '@/lib/ai/smartMathEngine';
import { runWfcInWorker, runMorphInWorker } from '@/lib/engine/workerDispatcher';
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
      }, {
        kind: 'autotile',
        version: 1,
        sourceMode: 'composite-excluding-self',
        params: { mode: '47-blob-contours' },
      });
    };

    const handleWfcSynthesisEvent = async (e: Event) => {
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
      const origin = {
        projectId: state.currentProjectId,
        frameId: state.frames[state.activeFrameIndex]?.id,
        revision: state.editRevision,
      };

      const result = await runWfcInWorker(
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

      const latest = useStudioStore.getState();
      if (
        latest.currentProjectId !== origin.projectId ||
        latest.frames[latest.activeFrameIndex]?.id !== origin.frameId ||
        latest.editRevision !== origin.revision
      ) {
        studioEvents.emit('pixibun:toast', {
          message: 'Pattern result was discarded because the source frame changed while it was processing.',
          type: 'error',
        });
        latest.addAiMessage({
          sender: 'assistant',
          text: 'Pattern result was discarded because the source frame changed while it was processing.',
        });
        return;
      }

      if (!result.success) {
        studioEvents.emit('pixibun:toast', {
          message: 'WaveFunctionCollapse: synthesis encountered contradictions after retries. Try a different sample region or N=2.',
          type: 'error',
        });
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
      }, {
        kind: 'wfc',
        version: 1,
        sourceMode: selection ? 'selection' : 'composite-excluding-self',
        params: {
          n,
          symmetries,
          seed,
          sampleX,
          sampleY,
          sampleWidth: sampleW,
          sampleHeight: sampleH,
          periodicInput: true,
          periodicOutput: true,
        },
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

    const handleInBetweenFrameEvent = async () => {
      const state = useStudioStore.getState();
      const currentIdx = state.activeFrameIndex;
      const totalFrames = state.frames.length;

      const frameA = state.frames[currentIdx];
      if (!frameA) return;

      let nextIdx = (currentIdx + 1) % totalFrames;
      if (totalFrames === 1) {
        nextIdx = 0;
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

      const dataA = ctxA.getImageData(0, 0, canvasWidth, canvasHeight).data;
      const dataB = ctxB.getImageData(0, 0, canvasWidth, canvasHeight).data;
      const preparedState = useStudioStore.getState();
      const origin = {
        projectId: preparedState.currentProjectId,
        activeFrameId: preparedState.frames[preparedState.activeFrameIndex]?.id,
        revision: preparedState.editRevision,
      };

      const [morphed] = await runMorphInWorker(
        { width: canvasWidth, height: canvasHeight, data: dataA },
        { width: canvasWidth, height: canvasHeight, data: dataB },
        1
      );

      const latest = useStudioStore.getState();
      if (
        latest.currentProjectId !== origin.projectId ||
        latest.frames[latest.activeFrameIndex]?.id !== origin.activeFrameId ||
        latest.editRevision !== origin.revision
      ) {
        studioEvents.emit('pixibun:toast', {
          message: 'In-between result was discarded because the animation changed while it was processing.',
          type: 'error',
        });
        latest.addAiMessage({
          sender: 'assistant',
          text: 'In-between result was discarded because the animation changed while it was processing.',
        });
        return;
      }

      latest.duplicateFrame(currentIdx);
      const updatedState = useStudioStore.getState();
      const newFrame = updatedState.frames[updatedState.activeFrameIndex];

      if (newFrame && morphed) {
        const nonTaggedLayers = newFrame.layers.filter((l) => !l.tag);
        const baseLayer = nonTaggedLayers[nonTaggedLayers.length - 1];

        if (baseLayer) {
          const targetBuf = getOrCreateBuffer(baseLayer.id, canvasWidth, canvasHeight);
          const tCtx = targetBuf.canvas.getContext('2d', { willReadFrequently: true });
          if (tCtx) {
            tCtx.clearRect(0, 0, canvasWidth, canvasHeight);
            const imgData = tCtx.createImageData(canvasWidth, canvasHeight);
            imgData.data.set(morphed.data);
            tCtx.putImageData(imgData, 0, 0);
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
