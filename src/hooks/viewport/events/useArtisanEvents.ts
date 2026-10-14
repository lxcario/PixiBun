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
import { runMorphInWorker } from '@/lib/engine/workerDispatcher';
import { canAddFramesToProject } from '@/lib/project/workspaceEnvelopeGuard';
import type { ViewportEventContext } from './types';
import { beginWorkspaceJob, type WorkspaceJob } from '@/lib/engine/workspaceJob';

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
    const jobs = new Set<WorkspaceJob>();
    const handleCleanJaggiesEvent = () => {
      captureSnapshot('Clean Jaggies');
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

      captureSnapshot(`Color Grade (${grade})`);
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

      captureSnapshot('Snap to Palette');
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
      captureSnapshot('Remove Stray Pixels');
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
      const capacity = canAddFramesToProject(state.frames, canvasWidth, canvasHeight,
        [{ layerCount: frameA.layers.length }]);
      if (!capacity.ok) {
        studioEvents.emit('pixibun:toast', { message: capacity.reason || 'Cannot insert an in-between frame.', type: 'error' });
        return;
      }

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

      const job = beginWorkspaceJob([...frameA.layers, ...frameB.layers].map(layer => layer.id));
      jobs.add(job);
      try {
      let morphed;
      try {
        [morphed] = await runMorphInWorker(
          { width: canvasWidth, height: canvasHeight, data: dataA },
          { width: canvasWidth, height: canvasHeight, data: dataB },
          1, undefined, { signal: job.signal }
        );
        job.check();
        if (!morphed || morphed.width !== canvasWidth || morphed.height !== canvasHeight ||
          morphed.data.length !== canvasWidth * canvasHeight * 4) {
          throw new Error('In-between generation returned invalid pixels.');
        }
      } catch (error) {
        if (job.signal.aborted) return;
        studioEvents.emit('pixibun:toast', {
          message: error instanceof Error ? error.message : 'In-between generation failed; artwork was preserved.',
          type: 'error',
        });
        return;
      }

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
        return;
      }

      const inserted = latest.duplicateFrame(currentIdx, morphed);
      if (!inserted) {
        studioEvents.emit('pixibun:toast', {
          message: 'Could not insert in-between frame: project capacity limit reached.',
          type: 'error',
        });
        return;
      }

      studioEvents.emit('pixibun:toast', {
        type: 'success',
        message: 'In-between frame inserted',
        action: {
          label: 'Undo',
          onClick: () => {
            studioEvents.emit('pixibun:undo');
          },
        },
      });

      renderComposite();
      bumpBufferVersion();

      if (frameA.layers.some((l) => l.tag === 'photometric')) {
        studioEvents.emit('pixibun:photometric-lighting', {});
      }
      if (frameA.layers.some((l) => l.tag === 'cast-shadow')) {
        studioEvents.emit('pixibun:render-cast-shadow', {});
      }
      } finally { job.dispose(); jobs.delete(job); }
    };

    const unsubs = [
      studioEvents.on('pixibun:clean-jaggies', handleCleanJaggiesEvent),
      studioEvents.on('pixibun:apply-47-blob', handle47BlobEvent),
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
      jobs.forEach(job => job.cancel()); jobs.clear();
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
