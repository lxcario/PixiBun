import { useEffect, useRef } from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { studioEvents } from '@/lib/events/studioEvents';
import { MaterialType, PhotometricAnalysisGeometry } from '@/types/tools';
import {
  executePhotometricPipeline,
  computePhotometricAnalysis,
  executeVolumetricOpticalPipeline,
  detectMinecraftSkin,
  renderParametric2p5DLighting,
} from '@/lib/ai/smartMathEngine';
import { runEdtNormalMapInWorker } from '@/lib/engine/workerDispatcher';
import { inferPhotometricSettings, RecognizedFormType } from '@/lib/ai/math/photometricAuto';
import type { ViewportPhotometricContext } from './types';

export function usePhotometricEvents({
  canvasWidth,
  canvasHeight,
  getOrCreateLayerCanvas,
  renderComposite,
  captureSnapshot,
  commitSnapshot,
  bumpBufferVersion,
  compositeSourceSnapshot,
  updateTaggedLayer,
  compositeNormalMapSnapshot,
  performUndo,
}: ViewportPhotometricContext) {
  const photometricSessionRef = useRef<{
    srcCtx: CanvasRenderingContext2D;
    targetLayerId: string;
    isNewLayer: boolean;
    material: MaterialType;
    brightness: number;
    formType: RecognizedFormType;
    paletteColors: string[];
    lastCenterX?: number;
    lastCenterY?: number;
    normalMapData?: ImageData | null;
    analysis?: PhotometricAnalysisGeometry;
    cachedAzimuth?: number;
  } | null>(null);

  useEffect(() => {
    const handlePhotometricGizmoStartEvent = (detail?: { auto?: boolean }) => {
      const srcCtx = compositeSourceSnapshot('photometric');
      if (!srcCtx) return;

      const state = useStudioStore.getState();
      const currentFrame = state.frames[state.activeFrameIndex];
      if (!currentFrame) return;

      let azimuth = state.tools.lightAzimuth;
      let elevation = state.tools.lightElevation;
      let material = state.tools.materialPreset;
      let brightness = state.tools.lightBrightness;

      const imgData = srcCtx.getImageData(0, 0, canvasWidth, canvasHeight);
      const inferred = inferPhotometricSettings(imgData.data, canvasWidth, canvasHeight);

      const formType: RecognizedFormType =
        state.tools.formType && state.tools.formType !== 'auto'
          ? state.tools.formType
          : inferred.formType;

      if (detail?.auto) {
        azimuth = inferred.lightAzimuth;
        elevation = inferred.lightElevation;
        material = inferred.material;
        brightness = inferred.brightness;

        state.setLightAzimuth(azimuth);
        state.setLightElevation(elevation);
        state.setMaterialPreset(material);
        state.setLightBrightness(brightness);
        state.setCavityStrength(inferred.cavityStrength);
      }

      let targetLayerId: string;
      let isNewLayer = false;
      const tag = 'photometric';
      const displayName = `Photometric ${material}`;

      const existing = currentFrame.layers.find((l) => l.tag === tag);

      if (existing) {
        targetLayerId = existing.id;
        if (existing.tag !== tag) state.setLayerTag(targetLayerId, tag);
        if (existing.name !== displayName) state.renameLayer(targetLayerId, displayName);
      } else {
        isNewLayer = true;
        state.addLayer(displayName, tag);
        const freshState = useStudioStore.getState();
        const freshFrame = freshState.frames[freshState.activeFrameIndex];
        const newLayer = freshFrame?.layers[0];
        if (!newLayer) return;
        targetLayerId = newLayer.id;
      }

      captureSnapshot(displayName, targetLayerId, isNewLayer ? targetLayerId : undefined, tag);

      const normalMapData = compositeNormalMapSnapshot();

      const params = {
        lightAzimuth: azimuth,
        lightElevation: elevation,
        lightRadius: 64,
        lightColor: '#FFFFFF',
        ambientIntensity: 0.48,
        lightBrightness: brightness,
        material,
        cavityStrength: state.tools.cavityStrength,
        ditherModulation: state.tools.ditherModulation,
        bayerSize: '4x4' as const,
        formType,
        minecraftSkinMode: state.tools.minecraftSkinMode,
        normalMapData: normalMapData || undefined,
      };

      const analysis = computePhotometricAnalysis(srcCtx, canvasWidth, canvasHeight, params);

      const shadedCanvas = executePhotometricPipeline(
        srcCtx,
        canvasWidth,
        canvasHeight,
        {
          ...params,
          precomputedAnalysis: analysis,
        },
        []
      );

      const lCanvas = getOrCreateLayerCanvas(targetLayerId);
      const lCtx = lCanvas.getContext('2d', { willReadFrequently: true });
      if (lCtx) {
        lCtx.imageSmoothingEnabled = false;
        lCtx.clearRect(0, 0, canvasWidth, canvasHeight);
        lCtx.drawImage(shadedCanvas, 0, 0);
      }

      renderComposite();
      bumpBufferVersion();

      photometricSessionRef.current = {
        srcCtx,
        targetLayerId,
        isNewLayer,
        material,
        brightness,
        formType,
        paletteColors: [],
        normalMapData,
        analysis,
        cachedAzimuth: azimuth,
      };

      state.setPhotometricGizmoActive(true);
    };

    const handlePhotometricLightingLiveEvent = (detail: {
      lightAzimuth: number;
      lightElevation: number;
      lightCenterX?: number;
      lightCenterY?: number;
      lightBrightness?: number;
    }) => {
      const session = photometricSessionRef.current;
      if (!session) return;

      if (detail.lightCenterX !== undefined) session.lastCenterX = detail.lightCenterX;
      if (detail.lightCenterY !== undefined) session.lastCenterY = detail.lightCenterY;
      if (detail.lightBrightness !== undefined) session.brightness = detail.lightBrightness;

      const state = useStudioStore.getState();

      // Phase 60a: Invalidate/recompute cached analysis when light azimuth drifts past threshold (20°)
      // on character forms or appendage-bearing sprites, bounding any geometry drift during live drag.
      if (session.formType === 'character' || session.analysis?.appendageData) {
        const cachedAz = session.cachedAzimuth ?? detail.lightAzimuth;
        const diff = Math.abs(detail.lightAzimuth - cachedAz);
        const angularDrift = Math.min(diff, 360 - diff);

        if (angularDrift >= 20) {
          const params = {
            lightAzimuth: detail.lightAzimuth,
            lightElevation: detail.lightElevation,
            lightRadius: 64,
            lightColor: '#FFFFFF',
            ambientIntensity: 0.48,
            lightBrightness: session.brightness,
            material: session.material,
            cavityStrength: state.tools.cavityStrength,
            ditherModulation: state.tools.ditherModulation,
            bayerSize: '4x4' as const,
            formType: session.formType,
            minecraftSkinMode: state.tools.minecraftSkinMode,
            normalMapData: session.normalMapData || undefined,
          };
          session.analysis = computePhotometricAnalysis(session.srcCtx, canvasWidth, canvasHeight, params);
          session.cachedAzimuth = detail.lightAzimuth;
        }
      }

      const shadedCanvas = executePhotometricPipeline(
        session.srcCtx,
        canvasWidth,
        canvasHeight,
        {
          lightAzimuth: detail.lightAzimuth,
          lightElevation: detail.lightElevation,
          lightRadius: 64,
          lightColor: '#FFFFFF',
          ambientIntensity: 0.48,
          lightBrightness: session.brightness,
          material: session.material,
          cavityStrength: state.tools.cavityStrength,
          ditherModulation: state.tools.ditherModulation,
          bayerSize: '4x4',
          formType: session.formType,
          minecraftSkinMode: state.tools.minecraftSkinMode,
          lightCenterX: session.lastCenterX,
          lightCenterY: session.lastCenterY,
          normalMapData: session.normalMapData || undefined,
          precomputedAnalysis: session.analysis,
        },
        session.paletteColors
      );

      const lCanvas = getOrCreateLayerCanvas(session.targetLayerId);
      const lCtx = lCanvas.getContext('2d', { willReadFrequently: true });
      if (lCtx) {
        lCtx.imageSmoothingEnabled = false;
        lCtx.clearRect(0, 0, canvasWidth, canvasHeight);
        lCtx.drawImage(shadedCanvas, 0, 0);
      }

      renderComposite();
      bumpBufferVersion();
    };

    const handlePhotometricGizmoCommitEvent = () => {
      const session = photometricSessionRef.current;
      const state = useStudioStore.getState();

      if (session) {
        // Phase 60a: On drag release commit, perform fresh single-shot analysis recomputation
        // for character silhouettes / appendage-bearing geometry to ensure 0 azimuth staleness is committed.
        let commitAnalysis = session.analysis;
        if (session.formType === 'character' || session.analysis?.appendageData) {
          commitAnalysis = computePhotometricAnalysis(session.srcCtx, canvasWidth, canvasHeight, {
            lightAzimuth: state.tools.lightAzimuth,
            lightElevation: state.tools.lightElevation,
            lightRadius: 64,
            lightColor: '#FFFFFF',
            ambientIntensity: 0.48,
            lightBrightness: session.brightness,
            material: session.material,
            cavityStrength: state.tools.cavityStrength,
            ditherModulation: state.tools.ditherModulation,
            bayerSize: '4x4' as const,
            formType: session.formType,
            minecraftSkinMode: state.tools.minecraftSkinMode,
            normalMapData: session.normalMapData || undefined,
          });
        }

        // Ensure the final commit render strictly aligns with the committed azimuth and elevation
        const shadedCanvas = executePhotometricPipeline(
          session.srcCtx,
          canvasWidth,
          canvasHeight,
          {
            lightAzimuth: state.tools.lightAzimuth,
            lightElevation: state.tools.lightElevation,
            lightRadius: 64,
            lightColor: '#FFFFFF',
            ambientIntensity: 0.48,
            lightBrightness: session.brightness,
            material: session.material,
            cavityStrength: state.tools.cavityStrength,
            ditherModulation: state.tools.ditherModulation,
            bayerSize: '4x4',
            formType: session.formType,
            minecraftSkinMode: state.tools.minecraftSkinMode,
            lightCenterX: session.lastCenterX,
            lightCenterY: session.lastCenterY,
            normalMapData: session.normalMapData || undefined,
            precomputedAnalysis: commitAnalysis,
          },
          session.paletteColors
        );

        const lCanvas = getOrCreateLayerCanvas(session.targetLayerId);
        const lCtx = lCanvas.getContext('2d', { willReadFrequently: true });
        if (lCtx) {
          lCtx.imageSmoothingEnabled = false;
          lCtx.clearRect(0, 0, canvasWidth, canvasHeight);
          lCtx.drawImage(shadedCanvas, 0, 0);
        }

        commitSnapshot();
        state.setLightBrightness(session.brightness);

        const isMatteOrFabric = session.material === 'matte' || session.material === 'fabric';
        if (!isMatteOrFabric) {
          const { specularPixels } = renderParametric2p5DLighting(session.srcCtx, canvasWidth, canvasHeight, {
            azimuthDeg: state.tools.lightAzimuth,
            elevationDeg: state.tools.lightElevation,
            shadowIntensity: 0.8,
            specularShininess: 16,
            rimLight: false,
            selOut: false,
            material: session.material,
          });

          if (specularPixels.length > 0) {
            updateTaggedLayer(`Specular ${state.tools.lightAzimuth}°`, 'specular', (outCtx) => {
              specularPixels.forEach((p) => {
                outCtx.fillStyle = `rgba(${p.r}, ${p.g}, ${p.b}, ${p.a / 255})`;
                outCtx.fillRect(p.x, p.y, 1, 1);
              });
            });
          }
        }

        photometricSessionRef.current = null;
      }

      state.setPhotometricGizmoActive(false);
      renderComposite();
      bumpBufferVersion();
    };

    const handlePhotometricGizmoCancelEvent = () => {
      const session = photometricSessionRef.current;
      const state = useStudioStore.getState();

      if (session) {
        if (session.isNewLayer) {
          state.deleteLayer(session.targetLayerId);
        } else {
          performUndo();
        }
        photometricSessionRef.current = null;
      }

      state.setPhotometricGizmoActive(false);
      renderComposite();
      bumpBufferVersion();
    };

    const handlePhotometricAutoEvent = () => {
      handlePhotometricGizmoStartEvent({ auto: true });
    };

    const handlePhotometricLightingEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      const detail = customEvent.detail || {};

      const srcCtx = compositeSourceSnapshot('photometric');
      if (!srcCtx) return;

      const state = useStudioStore.getState();
      const normalMapData = compositeNormalMapSnapshot();
      const materialName = detail.material ?? state.tools.materialPreset;
      const shadedCanvas = executePhotometricPipeline(
        srcCtx,
        canvasWidth,
        canvasHeight,
        {
          lightAzimuth: detail.lightAzimuth ?? state.tools.lightAzimuth,
          lightElevation: detail.lightElevation ?? state.tools.lightElevation,
          lightRadius: detail.lightRadius ?? state.tools.lightRadius,
          lightBrightness: detail.lightBrightness ?? state.tools.lightBrightness ?? 1.15,
          lightColor: detail.lightColor ?? '#FFFFFF',
          ambientIntensity: detail.ambientIntensity ?? 0.45,
          material: materialName,
          cavityStrength: detail.cavityStrength ?? state.tools.cavityStrength,
          ditherModulation: detail.ditherModulation ?? state.tools.ditherModulation,
          bayerSize: detail.bayerSize || '4x4',
          formType: detail.formType ?? state.tools.formType ?? 'auto',
          minecraftSkinMode: detail.minecraftSkinMode ?? state.tools.minecraftSkinMode ?? 'auto',
          normalMapData: normalMapData || undefined,
        },
        detail.paletteColors || []
      );

      updateTaggedLayer(`Photometric ${materialName}`, 'photometric', (outCtx) => {
        outCtx.drawImage(shadedCanvas, 0, 0);
      });
    };

    const handleVolumetricOpticsEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      const detail = customEvent.detail || {};

      const srcCtx = compositeSourceSnapshot('optical-output');
      if (!srcCtx) return;

      const state = useStudioStore.getState();
      const preset = detail.preset ?? state.tools.opticalPreset;
      const shadedCanvas = executeVolumetricOpticalPipeline(
        srcCtx,
        canvasWidth,
        canvasHeight,
        {
          preset,
          translucencyDepth: detail.translucencyDepth ?? state.tools.translucencyDepth,
          fresnelPower: detail.fresnelPower ?? state.tools.fresnelPower,
          anisoAngle: detail.anisoAngle ?? state.tools.anisoAngle,
          anisoFlow: detail.anisoFlow ?? state.tools.anisoFlow,
          celTones: detail.celTones ?? state.tools.opticalCelTones,
          lightAzimuth: detail.lightAzimuth ?? state.tools.lightAzimuth,
          lightElevation: detail.lightElevation ?? state.tools.lightElevation,
          lightColor: detail.lightColor ?? '#FFFFFF',
          paletteColors: detail.paletteColors ?? [],
          ditherModulation: detail.ditherModulation ?? state.tools.ditherModulation ?? 0.0,
        }
      );

      updateTaggedLayer(`Optics (${preset})`, 'optical-output', (outCtx) => {
        outCtx.drawImage(shadedCanvas, 0, 0);
      });
    };

    const handleBakeNormalMapEvent = async () => {
      const srcCtx = compositeSourceSnapshot('normal-map');
      if (!srcCtx) return;

      const imgData = srcCtx.getImageData(0, 0, canvasWidth, canvasHeight);
      const data = imgData.data;
      const isOpaque = (x: number, y: number) => {
        if (x < 0 || x >= canvasWidth || y < 0 || y >= canvasHeight) return false;
        return data[(y * canvasWidth + x) * 4 + 3] > 30;
      };

      const state = useStudioStore.getState();
      const skinMode = state.tools.minecraftSkinMode ?? 'auto';
      let isMcSkin = false;
      if (canvasWidth === 64 && (canvasHeight === 64 || canvasHeight === 32)) {
        if (skinMode === 'enabled') {
          isMcSkin = true;
        } else if (
          skinMode === 'auto' &&
          state.tools.formType !== 'character' &&
          state.tools.formType !== 'orb' &&
          state.tools.formType !== 'prop'
        ) {
          isMcSkin = detectMinecraftSkin(isOpaque, canvasWidth, canvasHeight);
        }
      }

      const res = await runEdtNormalMapInWorker(data, canvasWidth, canvasHeight, {
        isMinecraftSkin: isMcSkin,
        depthScale: 2.0,
      });

      const normalImgData = new ImageData(
        new Uint8ClampedArray(res.data.buffer as ArrayBuffer),
        canvasWidth,
        canvasHeight
      );

      updateTaggedLayer('Normal Map', 'normal-map', (outCtx) => {
        outCtx.putImageData(normalImgData, 0, 0);
      });
    };

    const unsubs = [
      studioEvents.on('pixibun:photometric-lighting', (detail) =>
        handlePhotometricLightingEvent({ detail } as CustomEvent)
      ),
      studioEvents.on('pixibun:photometric-auto', () => handlePhotometricAutoEvent()),
      studioEvents.on('pixibun:photometric-gizmo-start', (detail) =>
        handlePhotometricGizmoStartEvent(detail || undefined)
      ),
      studioEvents.on('pixibun:photometric-lighting-live', (detail) =>
        handlePhotometricLightingLiveEvent(detail)
      ),
      studioEvents.on('pixibun:photometric-gizmo-commit', handlePhotometricGizmoCommitEvent),
      studioEvents.on('pixibun:photometric-gizmo-cancel', handlePhotometricGizmoCancelEvent),
      studioEvents.on('pixibun:volumetric-optics', (detail) =>
        handleVolumetricOpticsEvent({ detail } as CustomEvent)
      ),
      studioEvents.on('pixibun:bake-normal-map', handleBakeNormalMapEvent),
    ];

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [
    bumpBufferVersion,
    canvasHeight,
    canvasWidth,
    captureSnapshot,
    commitSnapshot,
    compositeNormalMapSnapshot,
    compositeSourceSnapshot,
    getOrCreateLayerCanvas,
    performUndo,
    renderComposite,
    updateTaggedLayer,
  ]);
}
