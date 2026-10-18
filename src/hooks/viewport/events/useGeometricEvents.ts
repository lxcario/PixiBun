import { useEffect, useRef } from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { studioEvents } from '@/lib/events/studioEvents';
import {
  generateSelOutData,
  generateOuterStrokeData,
} from '@/lib/graphics/pixelRasterEngine';
import {
  renderParametric2p5DLighting,
  computeSeparableEDT,
  renderBoundedSpriteCastShadow,
} from '@/lib/graphics/smartMathEngine';
import { inferRaymarchedShadowSettings } from '@/lib/graphics/math/shadowAuto';
import type { ViewportEventContext } from './types';
import { pushStructuralHistoryStep } from '@/lib/engine/structuralHistory';
import { planLayerRotation } from '@/lib/canvas/rotSpriteLayer';
import { runRotSpriteInWorker } from '@/lib/engine/workerDispatcher';
import { beginWorkspaceJob, type WorkspaceJob } from '@/lib/engine/workspaceJob';
import { getBufferRevision, touchBuffer } from '@/lib/engine/bufferRegistry';
import { isNormalLayer } from '@/lib/export/normalLayers';

export function useGeometricEvents({
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
  const rotationInFlightRef = useRef(false);
  useEffect(() => {
    let disposed = false;
    let rotationJob: WorkspaceJob | undefined;
    const handleAutoShadeEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      const tools = useStudioStore.getState().tools;
      const lightAz = customEvent.detail?.lightAzimuth ?? tools.lightAzimuth;
      const lightEl = customEvent.detail?.lightElevation ?? tools.lightElevation;

      const srcCtx = compositeSourceSnapshot('auto-shade');
      if (!srcCtx) return;

      const { shadedPixels } = renderParametric2p5DLighting(srcCtx, canvasWidth, canvasHeight, {
        azimuthDeg: lightAz,
        elevationDeg: lightEl,
        shadowIntensity: 0.8,
        specularShininess: 16,
      });

      updateTaggedLayer(`Auto Shade ${lightAz}°`, 'auto-shade', (outCtx) => {
        shadedPixels.forEach((p) => {
          outCtx.fillStyle = `rgba(${p.r}, ${p.g}, ${p.b}, ${p.a / 255})`;
          outCtx.fillRect(p.x, p.y, 1, 1);
        });
      }, {
        kind: 'auto-shade',
        version: 1,
        sourceMode: 'composite-excluding-self',
        params: { lightAzimuth: lightAz, lightElevation: lightEl, shadowIntensity: 0.8 },
      });
    };

    const handleHighlightEvent = () => {
      studioEvents.emit('pixibun:photometric-gizmo-start', { auto: false, glintOnly: true });
    };

    const handleSelOutEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      const tools = useStudioStore.getState().tools;
      const lightAz = customEvent.detail?.lightAzimuth ?? tools.lightAzimuth;

      const srcCtx = compositeSourceSnapshot('sel-out');
      if (!srcCtx) return;

      const { selOutPixels } = generateSelOutData(srcCtx, canvasWidth, canvasHeight, lightAz);

      updateTaggedLayer('Selective Outline', 'sel-out', (outCtx) => {
        selOutPixels.forEach((p) => {
          outCtx.fillStyle = `rgba(${p.r}, ${p.g}, ${p.b}, ${p.a / 255})`;
          outCtx.fillRect(p.x, p.y, 1, 1);
        });
      }, {
        kind: 'sel-out',
        version: 1,
        sourceMode: 'composite-excluding-self',
        params: { lightAzimuth: lightAz },
      });
    };

    const handleAutoOutlineEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      const strokeColor = customEvent.detail?.color || '#2B2038';
      const thickness = Math.max(1, Math.min(8, Math.round(customEvent.detail?.thickness ?? 1)));

      const srcCtx = compositeSourceSnapshot('auto-outline');
      if (!srcCtx) return;

      const { strokePixels } = generateOuterStrokeData(
        srcCtx,
        canvasWidth,
        canvasHeight,
        strokeColor,
        thickness
      );

      updateTaggedLayer(`Outline ${thickness}px`, 'auto-outline', (outCtx) => {
        strokePixels.forEach((p) => {
          outCtx.fillStyle = `rgba(${p.r}, ${p.g}, ${p.b}, ${p.a / 255})`;
          outCtx.fillRect(p.x, p.y, 1, 1);
        });
      }, {
        kind: 'outline',
        version: 1,
        sourceMode: 'composite-excluding-self',
        params: { color: strokeColor, thickness },
      });
    };

    const handleRenderCastShadowEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      const detail = customEvent.detail || {};

      const srcCtx = compositeSourceSnapshot('cast-shadow');
      if (!srcCtx) return;

      const imgData = srcCtx.getImageData(0, 0, canvasWidth, canvasHeight);
      const data = imgData.data;

      const isOpaque = (x: number, y: number) => {
        if (x < 0 || x >= canvasWidth || y < 0 || y >= canvasHeight) return false;
        return data[(y * canvasWidth + x) * 4 + 3] > 30;
      };

      const edt = computeSeparableEDT((x, y) => !isOpaque(x, y), canvasWidth, canvasHeight);

      const shadowImgData = renderBoundedSpriteCastShadow(edt, canvasWidth, canvasHeight, {
        lightX: detail.lightX ?? Math.round(canvasWidth / 2),
        lightY: detail.lightY ?? Math.round(canvasHeight / 4),
        lightAzimuth: detail.lightAzimuth,
        lightElevation: detail.lightElevation,
        lightRadius: detail.lightRadius ?? 16,
        shadowOpacity: detail.shadowOpacity ?? 0.65,
        shadowColor: detail.shadowColor ?? '#180B26',
        ditherMode: detail.ditherMode ?? 'none',
        shadowStyle: detail.shadowStyle ?? 'cast',
        mode: detail.mode ?? 'bounded-2.5d',
      });

      updateTaggedLayer('Cast Shadow', 'cast-shadow', (outCtx) => {
        outCtx.putImageData(shadowImgData, 0, 0);
      }, {
        kind: 'cast-shadow',
        version: 1,
        sourceMode: 'composite-excluding-self',
        params: {
          lightX: detail.lightX ?? Math.round(canvasWidth / 2),
          lightY: detail.lightY ?? Math.round(canvasHeight / 4),
          lightAzimuth: detail.lightAzimuth ?? null,
          lightElevation: detail.lightElevation ?? null,
          lightRadius: detail.lightRadius ?? 16,
          shadowOpacity: detail.shadowOpacity ?? 0.65,
          shadowColor: detail.shadowColor ?? '#180B26',
          ditherMode: detail.ditherMode ?? 'none',
          shadowStyle: detail.shadowStyle ?? 'cast',
          mode: detail.mode ?? 'bounded-2.5d',
        },
      });
    };

    const handleRenderCastShadowAutoEvent = (e?: Event) => {
      const customEvent = e as CustomEvent | undefined;
      const detail = customEvent?.detail || {};

      const srcCtx = compositeSourceSnapshot('cast-shadow');
      if (!srcCtx) return;

      const imgData = srcCtx.getImageData(0, 0, canvasWidth, canvasHeight);
      const data = imgData.data;

      const state = useStudioStore.getState();
      const inferred = inferRaymarchedShadowSettings(data, canvasWidth, canvasHeight, {
        keyLightAzimuth: state.tools.lightAzimuth,
        keyLightElevation: state.tools.lightElevation,
      });

      studioEvents.emit('pixibun:shadow-settings-inferred', {
        ...inferred,
        shadowStyle: detail?.shadowStyle ?? 'cast',
      });

      const isOpaque = (x: number, y: number) => {
        if (x < 0 || x >= canvasWidth || y < 0 || y >= canvasHeight) return false;
        return data[(y * canvasWidth + x) * 4 + 3] > 30;
      };

      const edt = computeSeparableEDT((x, y) => !isOpaque(x, y), canvasWidth, canvasHeight);

      const shadowImgData = renderBoundedSpriteCastShadow(edt, canvasWidth, canvasHeight, {
        lightX: inferred.lightX,
        lightY: inferred.lightY,
        lightAzimuth: inferred.lightAzimuth,
        lightElevation: inferred.lightElevation,
        lightRadius: inferred.lightRadius,
        shadowOpacity: inferred.shadowOpacity,
        shadowColor: inferred.shadowColor,
        ditherMode: detail.ditherMode ?? inferred.ditherMode ?? 'none',
        shadowStyle: detail.shadowStyle ?? 'cast',
        mode: 'bounded-2.5d',
      });

      updateTaggedLayer('Cast Shadow', 'cast-shadow', (outCtx) => {
        outCtx.putImageData(shadowImgData, 0, 0);
      }, {
        kind: 'cast-shadow',
        version: 1,
        sourceMode: 'composite-excluding-self',
        params: {
          lightX: inferred.lightX,
          lightY: inferred.lightY,
          lightAzimuth: inferred.lightAzimuth ?? null,
          lightElevation: inferred.lightElevation ?? null,
          lightRadius: inferred.lightRadius,
          shadowOpacity: inferred.shadowOpacity,
          shadowColor: inferred.shadowColor,
          ditherMode: detail.ditherMode ?? inferred.ditherMode ?? 'none',
          shadowStyle: detail.shadowStyle ?? 'cast',
          mode: 'bounded-2.5d',
        },
        analysis: { rationale: inferred.rationale },
      });
    };

    const handleRotSpriteEvent = async (e: Event) => {
      if (rotationInFlightRef.current) return;
      const customEvent = e as CustomEvent;
      const angle =
        customEvent.detail?.angle ??
        (typeof customEvent.detail === 'number' ? customEvent.detail : 45);

      const state = useStudioStore.getState();
      const currentFrame = state.frames[state.activeFrameIndex];
      const taggedIds = currentFrame
        ? currentFrame.layers.filter((layer) => layer.id !== activeLayerId && layer.tag).map((layer) => layer.id)
        : [];
      const affectedLayerIds = [activeLayerId, ...taggedIds];
      const angleRad = angle * Math.PI / 180;
      const originalRevision = state.editRevision;
      const originalFrameIndex = state.activeFrameIndex;
      const prepared = [] as Array<{ id: string; canvas: HTMLCanvasElement; plan: NonNullable<ReturnType<typeof planLayerRotation>['plan']> }>;
      for (const id of affectedLayerIds) {
        const canvas = getOrCreateLayerCanvas(id);
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;
        const pixels = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
        const result = planLayerRotation({ width: canvasWidth, height: canvasHeight, data: pixels.data }, angleRad);
        if (result.error) {
          studioEvents.emit('pixibun:toast', { type: 'error', message: result.error });
          return;
        }
        if (result.plan) prepared.push({ id, canvas, plan: result.plan });
      }
      if (prepared.length === 0) return;
      const originalBufferRevisions = new Map(affectedLayerIds.map((id) => [id, getBufferRevision(id)]));

      rotationInFlightRef.current = true;
      const job = beginWorkspaceJob(affectedLayerIds);
      rotationJob = job;
      try {
        const rotated = [] as Array<{ id: string; canvas: HTMLCanvasElement; plan: (typeof prepared)[number]['plan']; data: Uint8ClampedArray }>;
        for (const item of prepared) {
          const plan = item.plan;
          const layer = currentFrame?.layers.find((l) => l.id === item.id);
          const isNormal = layer ? isNormalLayer(layer) : false;
          const output = await runRotSpriteInWorker(
            plan.source, angleRad, plan.sourcePivotX, plan.sourcePivotY,
            plan.targetWidth, plan.targetHeight,
            { outPivotX: plan.outputPivotX, outPivotY: plan.outputPivotY, pixelPerfect: true, isNormalMap: isNormal, timeoutMs: 30_000, signal: job.signal }
          );
          rotated.push({ ...item, data: output.data });
        }
        const latest = useStudioStore.getState();
        if (disposed) return;
        job.check();
        if (latest.editRevision !== originalRevision || latest.activeFrameIndex !== originalFrameIndex ||
            affectedLayerIds.some((id) => getBufferRevision(id) !== originalBufferRevisions.get(id)) ||
            latest.canvasWidth !== canvasWidth || latest.canvasHeight !== canvasHeight) {
          studioEvents.emit('pixibun:toast', { type: 'error', message: 'The canvas changed during rotation. No artwork was replaced; please try again.' });
          return;
        }
        const ready = rotated.map((item) => {
          const ctx = item.canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) throw new Error('A layer canvas is unavailable.');
          const image = ctx.createImageData(item.plan.targetWidth, item.plan.targetHeight);
          image.data.set(item.data);
          return { ...item, ctx, image };
        });
        if (!pushStructuralHistoryStep(`RotSprite ${angle}°`, {
          opKind: 'rotsprite', affectedLayerIds, canvasWidth, canvasHeight,
        })) return;
        for (const item of ready) {
          item.ctx.clearRect(0, 0, canvasWidth, canvasHeight);
          item.ctx.putImageData(item.image, item.plan.destX, item.plan.destY);
          touchBuffer(item.id);
        }
        useStudioStore.setState((draft) => {
          const frame = draft.frames[draft.activeFrameIndex];
          if (!frame) return;
          frame.layers.forEach((layer) => {
            if (affectedLayerIds.includes(layer.id)) layer.effect = undefined;
          });
          draft.isDirty = true;
          draft.editRevision += 1;
        });
        renderComposite();
        bumpBufferVersion();
      } catch (error) {
        if (job.signal.aborted) return;
        studioEvents.emit('pixibun:toast', {
          type: 'error',
          message: error instanceof Error ? `Rotation failed: ${error.message}` : 'Rotation failed.',
        });
      } finally {
        job.dispose();
        if (rotationJob === job) rotationJob = undefined;
        rotationInFlightRef.current = false;
      }
    };

    const unsubs = [
      studioEvents.on('pixibun:auto-shade', (detail) =>
        handleAutoShadeEvent({ detail } as CustomEvent)
      ),
      studioEvents.on('pixibun:highlight', handleHighlightEvent),
      studioEvents.on('pixibun:sel-out', (detail) => handleSelOutEvent({ detail } as CustomEvent)),
      studioEvents.on('pixibun:auto-outline', (detail) =>
        handleAutoOutlineEvent({ detail } as CustomEvent)
      ),
      studioEvents.on('pixibun:render-cast-shadow', (detail) =>
        handleRenderCastShadowEvent({ detail } as CustomEvent)
      ),
      studioEvents.on('pixibun:render-cast-shadow-auto', (detail) =>
        handleRenderCastShadowAutoEvent({ detail } as CustomEvent)
      ),
      studioEvents.on('pixibun:rot-sprite', (detail) =>
        handleRotSpriteEvent({ detail } as CustomEvent)
      ),
    ];

    return () => {
      disposed = true;
      rotationJob?.cancel();
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
