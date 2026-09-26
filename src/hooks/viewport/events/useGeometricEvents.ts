import { useEffect } from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { studioEvents } from '@/lib/events/studioEvents';
import {
  generateSelOutData,
  generateOuterStrokeData,
  generateGroundShadowData,
} from '@/lib/ai/pixelAiEngine';
import {
  rotateWithRotSprite,
  renderParametric2p5DLighting,
  computeSeparableEDT,
  renderBoundedSpriteCastShadow,
} from '@/lib/ai/smartMathEngine';
import { inferRaymarchedShadowSettings } from '@/lib/ai/math/shadowAuto';
import type { ViewportEventContext } from './types';
import { pushStructuralHistoryStep } from '@/lib/engine/structuralHistory';

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
  useEffect(() => {
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

    const handleHighlightEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      const tools = useStudioStore.getState().tools;
      const lightAz = customEvent.detail?.lightAzimuth ?? tools.lightAzimuth;
      const lightEl = customEvent.detail?.lightElevation ?? tools.lightElevation;

      const srcCtx = compositeSourceSnapshot('specular');
      if (!srcCtx) return;

      const { specularPixels } = renderParametric2p5DLighting(srcCtx, canvasWidth, canvasHeight, {
        azimuthDeg: lightAz,
        elevationDeg: lightEl,
        shadowIntensity: 0.8,
        specularShininess: 16,
        material: tools.materialPreset,
      });

      updateTaggedLayer(`Specular ${lightAz}°`, 'specular', (outCtx) => {
        specularPixels.forEach((p) => {
          outCtx.fillStyle = `rgba(${p.r}, ${p.g}, ${p.b}, ${p.a / 255})`;
          outCtx.fillRect(p.x, p.y, 1, 1);
        });
      }, {
        kind: 'specular',
        version: 1,
        sourceMode: 'composite-excluding-self',
        params: { lightAzimuth: lightAz, lightElevation: lightEl, material: tools.materialPreset },
      });
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

    const handleGroundShadowEvent = () => {
      const srcCtx = compositeSourceSnapshot('ground-shadow');
      if (!srcCtx) return;

      const { shadowPixels } = generateGroundShadowData(srcCtx, canvasWidth, canvasHeight);
      updateTaggedLayer('Ground Shadow', 'ground-shadow', (outCtx) => {
        shadowPixels.forEach((p) => {
          outCtx.fillStyle = `rgba(${p.r}, ${p.g}, ${p.b}, ${p.a / 255})`;
          outCtx.fillRect(p.x, p.y, 1, 1);
        });
      }, {
        kind: 'ground-shadow',
        version: 1,
        sourceMode: 'composite-excluding-self',
        params: {},
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

    const handleRotSpriteEvent = (e: Event) => {
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

      pushStructuralHistoryStep(`RotSprite ${angle}°`, {
        opKind: 'rotsprite',
        affectedLayerIds,
        canvasWidth,
        canvasHeight,
      });
      const targetCanvas = getOrCreateLayerCanvas(activeLayerId);
      const tCtx = targetCanvas.getContext('2d', { willReadFrequently: true });
      if (tCtx) {
        const rotated = rotateWithRotSprite(tCtx, canvasWidth, canvasHeight, angle);
        tCtx.clearRect(0, 0, canvasWidth, canvasHeight);
        const dx = Math.round((canvasWidth - rotated.width) / 2);
        const dy = Math.round((canvasHeight - rotated.height) / 2);
        tCtx.drawImage(rotated, dx, dy);

        const state = useStudioStore.getState();
        const currentFrame = state.frames[state.activeFrameIndex];
        if (currentFrame) {
          currentFrame.layers.forEach((layer) => {
            if (layer.id !== activeLayerId && layer.tag) {
              const lCanvas = getOrCreateLayerCanvas(layer.id);
              const lCtx = lCanvas.getContext('2d', { willReadFrequently: true });
              if (lCtx) {
                const lRotated = rotateWithRotSprite(lCtx, canvasWidth, canvasHeight, angle);
                lCtx.clearRect(0, 0, canvasWidth, canvasHeight);
                const ldx = Math.round((canvasWidth - lRotated.width) / 2);
                const ldy = Math.round((canvasHeight - lRotated.height) / 2);
                lCtx.drawImage(lRotated, ldx, ldy);
              }
            }
          });
        }

        useStudioStore.setState((draft) => {
          const frame = draft.frames[draft.activeFrameIndex];
          if (!frame) return;
          frame.layers.forEach((layer) => {
            if (layer.id === activeLayerId || layer.tag) layer.effect = undefined;
          });
          draft.isDirty = true;
          draft.editRevision += 1;
        });
        renderComposite();
        bumpBufferVersion();
      }
    };

    const unsubs = [
      studioEvents.on('pixibun:auto-shade', (detail) =>
        handleAutoShadeEvent({ detail } as CustomEvent)
      ),
      studioEvents.on('pixibun:highlight', (detail) =>
        handleHighlightEvent({ detail } as CustomEvent)
      ),
      studioEvents.on('pixibun:sel-out', (detail) => handleSelOutEvent({ detail } as CustomEvent)),
      studioEvents.on('pixibun:auto-outline', (detail) =>
        handleAutoOutlineEvent({ detail } as CustomEvent)
      ),
      studioEvents.on('pixibun:ground-shadow', handleGroundShadowEvent),
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
