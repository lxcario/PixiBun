import { useEffect, useRef } from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { studioEvents } from '@/lib/events/studioEvents';
import { MaterialType, PhotometricAnalysisGeometry, PhotometricLightingParams } from '@/types/tools';
import {
  executePhotometricPipeline,
  computePhotometricAnalysis,
  detectMinecraftSkin,
} from '@/lib/ai/smartMathEngine';
import { runEdtNormalMapInWorker } from '@/lib/engine/workerDispatcher';
import { inferPhotometricSettings, RecognizedFormType } from '@/lib/ai/math/photometricAuto';
import { computeArtworkCentroid } from '@/lib/canvas/lightGizmoMath';
import { createId } from '@/lib/engine/id';
import type { ViewportPhotometricContext } from './types';
import type { LayerEffectRecipe } from '@/types/canvas';
import { deleteBuffers } from '@/lib/engine/bufferRegistry';
import { renderPixelGlints } from '@/lib/ai/math/pixelGlint';
import { canAddLayersToFrame } from '@/lib/project/workspaceEnvelopeGuard';
import { beginWorkspaceJob, type WorkspaceJob } from '@/lib/engine/workspaceJob';

function renderLightPreview(
  srcCtx: CanvasRenderingContext2D, width: number, height: number,
  params: PhotometricLightingParams, paletteColors: string[], glintOnly: boolean
): HTMLCanvasElement {
  if (!glintOnly) return executePhotometricPipeline(srcCtx, width, height, params, paletteColors);
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const image = ctx.createImageData(width, height);
  const geometry = params.precomputedAnalysis ?? computePhotometricAnalysis(srcCtx, width, height, params);
  const source = srcCtx.getImageData(0, 0, width, height).data;
  for (const pixel of renderPixelGlints(source, width, height, { ...params, glintStyle: params.glintStyle ?? 'soft' }, geometry)) {
    image.data.set([pixel.r, pixel.g, pixel.b, pixel.a], (pixel.y * width + pixel.x) * 4);
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

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
  discardSnapshot,
}: ViewportPhotometricContext) {
  const photometricSessionRef = useRef<{
    srcCtx: CanvasRenderingContext2D;
    targetLayerId: string;
    isNewLayer: boolean;
    material: MaterialType;
    glintOnly: boolean;
    previousTargetBlend?: import('@/types/canvas').BlendMode;
    brightness: number;
    formType: RecognizedFormType;
    paletteColors: string[];
    lastCenterX?: number;
    lastCenterY?: number;
    normalMapData?: ImageData | null;
    analysis?: PhotometricAnalysisGeometry;
    cachedAzimuth?: number;
    previousTargetData?: ImageData;
    previousTargetName?: string;
    previousTargetTag?: string;
    previousTargetEffect?: LayerEffectRecipe;
    previousActiveLayerId: string;
    effectId: string;
    inference: ReturnType<typeof inferPhotometricSettings>;
  } | null>(null);

  useEffect(() => {
    const jobs = new Set<WorkspaceJob>();
    const handlePhotometricGizmoStartEvent = (detail?: { auto?: boolean; layerId?: string; glintOnly?: boolean }) => {
      if (photometricSessionRef.current) return;
      const srcCtx = compositeSourceSnapshot('photometric');
      if (!srcCtx) return;

      const state = useStudioStore.getState();
      const currentFrame = state.frames[state.activeFrameIndex];
      if (!currentFrame) return;
      const previousActiveLayerId = state.activeLayerId;

      const requestedLayer = detail?.layerId
        ? currentFrame.layers.find((layer) => layer.id === detail.layerId)
        : undefined;
      const glintOnly = detail?.glintOnly || requestedLayer?.effect?.kind === 'specular' || false;
      const existing = requestedLayer ?? currentFrame.layers.find((layer) => layer.tag === (glintOnly ? 'specular' : 'photometric'));
      if (existing?.locked) {
        studioEvents.emit('pixibun:toast', { message: 'Unlock the effect layer before previewing changes.', type: 'error' });
        return;
      }
      const savedParams = existing?.effect?.params;
      state.setGlintStyle(savedParams?.glintStyle === 'off' || savedParams?.glintStyle === 'soft' || savedParams?.glintStyle === 'crisp'
        ? savedParams.glintStyle : glintOnly ? 'crisp' : state.tools.glintStyle ?? 'soft');
      const readNumber = (key: string, fallback: number) =>
        typeof savedParams?.[key] === 'number' ? savedParams[key] : fallback;
      const readString = (key: string, fallback: string) =>
        typeof savedParams?.[key] === 'string' ? savedParams[key] : fallback;

      let azimuth = state.tools.lightAzimuth;
      let elevation = state.tools.lightElevation;
      let material = state.tools.materialPreset;
      let brightness = state.tools.lightBrightness;
      let cavityStrength = state.tools.cavityStrength;
      let ditherModulation = state.tools.ditherModulation;
      let sourceShadingRemoval = state.tools.sourceShadingRemoval;
      let minecraftSkinMode = state.tools.minecraftSkinMode ?? 'auto';

      const imgData = srcCtx.getImageData(0, 0, canvasWidth, canvasHeight);
      const inferred = inferPhotometricSettings(imgData.data, canvasWidth, canvasHeight);

      let formType: RecognizedFormType =
        state.tools.formType && state.tools.formType !== 'auto'
          ? state.tools.formType
          : inferred.formType;

      if (!detail?.auto && savedParams) {
        azimuth = readNumber('lightAzimuth', azimuth);
        elevation = readNumber('lightElevation', elevation);
        brightness = readNumber('lightBrightness', brightness);
        cavityStrength = readNumber('cavityStrength', cavityStrength);
        ditherModulation = readNumber('ditherModulation', ditherModulation);
        sourceShadingRemoval = readNumber('sourceShadingRemoval', sourceShadingRemoval);
        const savedMaterial = readString('material', material) as MaterialType;
        if (savedMaterial === 'matte' || savedMaterial === 'metal' || savedMaterial === 'gold' || savedMaterial === 'glass' || savedMaterial === 'fabric') {
          material = savedMaterial;
        }
        const savedForm = readString('formType', formType);
        if (savedForm === 'character' || savedForm === 'orb' || savedForm === 'prop') formType = savedForm;
        const savedSkinMode = readString('minecraftSkinMode', minecraftSkinMode);
        if (savedSkinMode === 'auto' || savedSkinMode === 'enabled' || savedSkinMode === 'disabled') {
          minecraftSkinMode = savedSkinMode;
        }
        const savedBands = readNumber('shadingBands', state.tools.shadingBands);
        if (savedBands === 1 || savedBands === 2 || savedBands === 3) {
          state.setShadingBands(savedBands);
        }
      }

      if (detail?.auto) {
        azimuth = inferred.lightAzimuth;
        elevation = inferred.lightElevation;
        material = inferred.material;
        brightness = inferred.brightness;
        // Strong categorical cavity bands read as fixed painted shadows when
        // the bulb moves. Auto mode keeps AO restrained; artists can raise it
        // explicitly in Manual mode when the sprite genuinely needs it.
        cavityStrength = Math.min(inferred.cavityStrength, 0.5);
        // Single-image albedo recovery is ambiguous. Auto mode must preserve
        // authored colors and details; destructive ramp normalization remains
        // an explicit Manual control only.
        sourceShadingRemoval = 0;
      }

      state.setLightAzimuth(azimuth);
      state.setLightElevation(elevation);
      state.setMaterialPreset(material);
      state.setLightBrightness(brightness);
      state.setCavityStrength(cavityStrength);
      state.setDitherModulation(ditherModulation);
      state.setSourceShadingRemoval(sourceShadingRemoval);
      state.setMinecraftSkinMode(minecraftSkinMode);
      if (savedParams) state.setFormType(formType);

      studioEvents.emit('pixibun:photometric-analysis', {
        formType: inferred.formType,
        material: inferred.material,
        sourceLightAzimuth: inferred.lightAzimuth,
        sourceLightElevation: inferred.lightElevation,
        cueStrength: inferred.directionalShadingCue,
        cavityStrength: inferred.cavityStrength,
        rationale: inferred.rationale,
      });

      let targetLayerId: string;
      let isNewLayer = false;
      const tag = glintOnly ? 'specular' : 'photometric';
      const displayName = glintOnly ? 'Glint' : `Photometric ${material}`;

      if (existing) {
        targetLayerId = existing.id;
        const existingIndex = currentFrame.layers.findIndex((layer) => layer.id === targetLayerId);
        captureSnapshot(displayName, targetLayerId, undefined, tag, true, existingIndex);
      } else {
        const state = useStudioStore.getState();
        const capacity = canAddLayersToFrame(
          state.frames,
          state.activeFrameIndex,
          state.canvasWidth,
          state.canvasHeight,
          1
        );
        if (!capacity.ok) {
          studioEvents.emit('pixibun:toast', {
            message: capacity.reason || 'Cannot create photometric layer: workspace capacity ceiling reached.',
            type: 'error',
          });
          return;
        }

        isNewLayer = true;
        targetLayerId = createId('layer');
        useStudioStore.setState((draft) => {
          const frame = draft.frames[draft.activeFrameIndex];
          if (!frame) return;
          frame.layers.unshift({
            id: targetLayerId,
            name: displayName,
            visible: true,
            locked: false,
            opacity: 1,
            blendMode: 'source-atop',
            tag,
          });
          draft.activeLayerId = targetLayerId;
        });
        captureSnapshot(displayName, targetLayerId, targetLayerId, tag, true, 0);
      }

      useStudioStore.setState((draft) => {
        const layer = draft.frames[draft.activeFrameIndex]?.layers.find(
          (candidate) => candidate.id === targetLayerId
        );
        if (layer) {
          layer.name = displayName;
          layer.tag = tag;
          layer.blendMode = 'source-atop';
        }
      });

      const normalMapData = compositeNormalMapSnapshot();
      const targetCanvas = getOrCreateLayerCanvas(targetLayerId);
      const targetCtx = targetCanvas.getContext('2d', { willReadFrequently: true });
      const previousTargetData = !isNewLayer && targetCtx
        ? targetCtx.getImageData(0, 0, canvasWidth, canvasHeight)
        : undefined;
      const inferredCenter = computeArtworkCentroid(imgData.data, canvasWidth, canvasHeight);
      const initialCenter = {
        x: readNumber('lightCenterX', inferredCenter.x),
        y: readNumber('lightCenterY', inferredCenter.y),
      };

      const params = {
        glintStyle: useStudioStore.getState().tools.glintStyle ?? 'soft',
        lightAzimuth: azimuth,
        lightElevation: elevation,
        lightRadius: 64,
        lightColor: '#FFFFFF',
        ambientIntensity: 0.48,
        lightBrightness: brightness,
        sourceShadingRemoval,
        material,
        cavityStrength,
        ditherModulation,
        bayerSize: '4x4' as const,
        formType,
        minecraftSkinMode,
        shadingBands: state.tools.shadingBands,
        lightCenterX: initialCenter.x,
        lightCenterY: initialCenter.y,
        normalMapData: normalMapData || undefined,
      };

      const analysis = computePhotometricAnalysis(srcCtx, canvasWidth, canvasHeight, params, inferred);

      const shadedCanvas = renderLightPreview(
        srcCtx,
        canvasWidth,
        canvasHeight,
        {
          ...params,
          precomputedAnalysis: analysis,
        },
        [],
        glintOnly
      );

      if (targetCtx) {
        targetCtx.imageSmoothingEnabled = false;
        targetCtx.clearRect(0, 0, canvasWidth, canvasHeight);
        targetCtx.drawImage(shadedCanvas, 0, 0);
      }

      renderComposite();
      bumpBufferVersion();

      photometricSessionRef.current = {
        srcCtx,
        targetLayerId,
        isNewLayer,
        material,
        glintOnly,
        previousTargetBlend: existing?.blendMode,
        brightness,
        formType,
        paletteColors: [],
        normalMapData,
        analysis,
        cachedAzimuth: azimuth,
        lastCenterX: initialCenter.x,
        lastCenterY: initialCenter.y,
        previousTargetData,
        previousTargetName: existing?.name,
        previousTargetTag: existing?.tag,
        previousTargetEffect: existing?.effect ? structuredClone(existing.effect) : undefined,
        previousActiveLayerId,
        effectId: existing?.effect?.id ?? createId('effect'),
        inference: inferred,
      };

      if (previousActiveLayerId && previousActiveLayerId !== targetLayerId) {
        state.setActiveLayer(previousActiveLayerId);
      }
      useStudioStore.setState({ photometricGlintOnly: glintOnly });
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
            glintStyle: state.tools.glintStyle ?? 'soft',
          lightAzimuth: detail.lightAzimuth,
            lightElevation: detail.lightElevation,
            lightRadius: 64,
            lightColor: '#FFFFFF',
            ambientIntensity: 0.48,
            lightBrightness: session.brightness,
            sourceShadingRemoval: state.tools.sourceShadingRemoval,
            material: session.material,
            cavityStrength: state.tools.cavityStrength,
            ditherModulation: state.tools.ditherModulation,
            bayerSize: '4x4' as const,
            formType: session.formType,
            minecraftSkinMode: state.tools.minecraftSkinMode,
            shadingBands: state.tools.shadingBands,
            normalMapData: session.normalMapData || undefined,
          };
          session.analysis = computePhotometricAnalysis(
            session.srcCtx,
            canvasWidth,
            canvasHeight,
            params,
            session.inference
          );
          session.cachedAzimuth = detail.lightAzimuth;
        }
      }

      const shadedCanvas = renderLightPreview(
        session.srcCtx,
        canvasWidth,
        canvasHeight,
        {
          glintStyle: state.tools.glintStyle ?? 'soft',
          lightAzimuth: detail.lightAzimuth,
          lightElevation: detail.lightElevation,
          lightRadius: 64,
          lightColor: '#FFFFFF',
          ambientIntensity: 0.48,
          lightBrightness: session.brightness,
          sourceShadingRemoval: state.tools.sourceShadingRemoval,
          material: session.material,
          cavityStrength: state.tools.cavityStrength,
          ditherModulation: state.tools.ditherModulation,
          bayerSize: '4x4',
          formType: session.formType,
          minecraftSkinMode: state.tools.minecraftSkinMode,
          shadingBands: state.tools.shadingBands,
          lightCenterX: session.lastCenterX,
          lightCenterY: session.lastCenterY,
          normalMapData: session.normalMapData || undefined,
          precomputedAnalysis: session.analysis,
        },
        session.paletteColors,
        session.glintOnly
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
            glintStyle: state.tools.glintStyle ?? 'soft',
            lightAzimuth: state.tools.lightAzimuth,
            lightElevation: state.tools.lightElevation,
            lightRadius: 64,
            lightColor: '#FFFFFF',
            ambientIntensity: 0.48,
            lightBrightness: session.brightness,
            sourceShadingRemoval: state.tools.sourceShadingRemoval,
            material: session.material,
            cavityStrength: state.tools.cavityStrength,
            ditherModulation: state.tools.ditherModulation,
            bayerSize: '4x4' as const,
            formType: session.formType,
            minecraftSkinMode: state.tools.minecraftSkinMode,
            shadingBands: state.tools.shadingBands,
            normalMapData: session.normalMapData || undefined,
          }, session.inference);
        }

        // Ensure the final commit render strictly aligns with the committed azimuth and elevation
        const shadedCanvas = renderLightPreview(
          session.srcCtx,
          canvasWidth,
          canvasHeight,
          {
            glintStyle: state.tools.glintStyle ?? 'soft',
            lightAzimuth: state.tools.lightAzimuth,
            lightElevation: state.tools.lightElevation,
            lightRadius: 64,
            lightColor: '#FFFFFF',
            ambientIntensity: 0.48,
            lightBrightness: session.brightness,
            sourceShadingRemoval: state.tools.sourceShadingRemoval,
            material: session.material,
            cavityStrength: state.tools.cavityStrength,
            ditherModulation: state.tools.ditherModulation,
            bayerSize: '4x4',
            formType: session.formType,
            minecraftSkinMode: state.tools.minecraftSkinMode,
            shadingBands: state.tools.shadingBands,
            lightCenterX: session.lastCenterX,
            lightCenterY: session.lastCenterY,
            normalMapData: session.normalMapData || undefined,
            precomputedAnalysis: commitAnalysis,
          },
          session.paletteColors,
          session.glintOnly
        );

        const lCanvas = getOrCreateLayerCanvas(session.targetLayerId);
        const lCtx = lCanvas.getContext('2d', { willReadFrequently: true });
        if (lCtx) {
          lCtx.imageSmoothingEnabled = false;
          lCtx.clearRect(0, 0, canvasWidth, canvasHeight);
          lCtx.drawImage(shadedCanvas, 0, 0);
        }

        const committedEffect: LayerEffectRecipe = {
          id: session.effectId,
          kind: session.glintOnly ? 'specular' : 'photometric',
          version: 1,
          sourceMode: 'composite-excluding-self',
          params: {
            glintStyle: state.tools.glintStyle ?? 'soft',
            lightAzimuth: state.tools.lightAzimuth,
            lightElevation: state.tools.lightElevation,
            lightCenterX: session.lastCenterX ?? null,
            lightCenterY: session.lastCenterY ?? null,
            lightBrightness: session.brightness,
            material: session.material,
            cavityStrength: state.tools.cavityStrength,
            ditherModulation: state.tools.ditherModulation,
            sourceShadingRemoval: state.tools.sourceShadingRemoval,
            formType: session.formType,
            minecraftSkinMode: state.tools.minecraftSkinMode ?? 'auto',
            shadingBands: state.tools.shadingBands,
          },
          analysis: {
            formType: session.inference.formType,
            sourceLightAzimuth: session.inference.lightAzimuth,
            sourceLightElevation: session.inference.lightElevation,
            cueStrength: session.inference.directionalShadingCue,
            rationale: session.inference.rationale,
          },
          updatedAt: Date.now(),
        };
        useStudioStore.setState((draft) => {
          const layer = draft.frames[draft.activeFrameIndex]?.layers.find(
            (candidate) => candidate.id === session.targetLayerId
          );
          if (layer) layer.effect = committedEffect;
        });

        commitSnapshot();
        state.setLightBrightness(session.brightness);

        photometricSessionRef.current = null;
        if (session.previousActiveLayerId) {
          state.setActiveLayer(session.previousActiveLayerId);
        }
      }

      useStudioStore.setState({ photometricGlintOnly: false });
      state.setPhotometricGizmoActive(false);
      renderComposite();
      bumpBufferVersion();
    };

    const handlePhotometricGizmoCancelEvent = () => {
      const session = photometricSessionRef.current;
      const state = useStudioStore.getState();

      if (session) {
        if (session.isNewLayer) {
          useStudioStore.setState((draft) => {
            const frame = draft.frames[draft.activeFrameIndex];
            if (!frame) return;
            frame.layers = frame.layers.filter((layer) => layer.id !== session.targetLayerId);
          });
          deleteBuffers([session.targetLayerId]);
        } else if (session.previousTargetData) {
          const targetCanvas = getOrCreateLayerCanvas(session.targetLayerId);
          const targetCtx = targetCanvas.getContext('2d', { willReadFrequently: true });
          targetCtx?.putImageData(session.previousTargetData, 0, 0);
          useStudioStore.setState((draft) => {
            const layer = draft.frames[draft.activeFrameIndex]?.layers.find(
              (candidate) => candidate.id === session.targetLayerId
            );
            if (!layer) return;
            layer.name = session.previousTargetName ?? layer.name;
            layer.tag = session.previousTargetTag;
            if (session.previousTargetBlend) layer.blendMode = session.previousTargetBlend;
            layer.effect = session.previousTargetEffect
              ? structuredClone(session.previousTargetEffect)
              : undefined;
          });
        }
        discardSnapshot();
        if (session.previousActiveLayerId) {
          state.setActiveLayer(session.previousActiveLayerId);
        }
        photometricSessionRef.current = null;
      }

      useStudioStore.setState({ photometricGlintOnly: false });
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
      const sourceData = srcCtx.getImageData(0, 0, canvasWidth, canvasHeight).data;
      const inferred = inferPhotometricSettings(sourceData, canvasWidth, canvasHeight);
      const lightAzimuth = detail.lightAzimuth ?? state.tools.lightAzimuth;
      const lightElevation = detail.lightElevation ?? state.tools.lightElevation;
      const lightBrightness = detail.lightBrightness ?? state.tools.lightBrightness ?? 1.15;
      const cavityStrength = detail.cavityStrength ?? state.tools.cavityStrength;
      const ditherModulation = detail.ditherModulation ?? state.tools.ditherModulation;
      const formType = detail.formType ?? state.tools.formType ?? 'auto';
      const minecraftSkinMode = detail.minecraftSkinMode ?? state.tools.minecraftSkinMode ?? 'auto';
      const sourceShadingRemoval = detail.sourceShadingRemoval ?? state.tools.sourceShadingRemoval;
      const shadingBands = detail.shadingBands ?? state.tools.shadingBands;
      const pipelineParams = {
        glintStyle: state.tools.glintStyle ?? 'soft',
        lightAzimuth,
        lightElevation,
        lightRadius: detail.lightRadius ?? state.tools.lightRadius,
        lightBrightness,
        sourceShadingRemoval,
        lightColor: detail.lightColor ?? '#FFFFFF',
        ambientIntensity: detail.ambientIntensity ?? 0.45,
        material: materialName,
        cavityStrength,
        ditherModulation,
        bayerSize: detail.bayerSize || '4x4',
        formType,
        minecraftSkinMode,
        shadingBands,
        normalMapData: normalMapData || undefined,
      } as const;
      const analysis = computePhotometricAnalysis(
        srcCtx,
        canvasWidth,
        canvasHeight,
        pipelineParams,
        inferred
      );
      const shadedCanvas = executePhotometricPipeline(
        srcCtx,
        canvasWidth,
        canvasHeight,
        {
          ...pipelineParams,
          precomputedAnalysis: analysis,
        },
        detail.paletteColors || []
      );

      updateTaggedLayer(`Photometric ${materialName}`, 'photometric', (outCtx) => {
        outCtx.drawImage(shadedCanvas, 0, 0);
      }, {
        kind: 'photometric',
        version: 1,
        sourceMode: 'composite-excluding-self',
        params: {
          lightAzimuth,
          lightElevation,
          lightBrightness,
          material: materialName,
          cavityStrength,
          ditherModulation,
          sourceShadingRemoval,
          formType,
          minecraftSkinMode,
          shadingBands,
          paletteColors: detail.paletteColors || [],
        },
        analysis: {
          formType: inferred.formType,
          sourceLightAzimuth: inferred.lightAzimuth,
          sourceLightElevation: inferred.lightElevation,
          cueStrength: inferred.directionalShadingCue,
          rationale: inferred.rationale,
        },
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
      const origin = {
        projectId: state.currentProjectId,
        frameId: state.frames[state.activeFrameIndex]?.id,
        revision: state.editRevision,
      };
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

      const job = beginWorkspaceJob(state.frames[state.activeFrameIndex].layers.map(layer => layer.id));
      jobs.add(job);
      try {
      const res = await runEdtNormalMapInWorker(data, canvasWidth, canvasHeight, {
        isMinecraftSkin: isMcSkin,
        depthScale: 2.0,
        signal: job.signal,
      });
      job.check();

      const latest = useStudioStore.getState();
      if (
        latest.currentProjectId !== origin.projectId ||
        latest.frames[latest.activeFrameIndex]?.id !== origin.frameId ||
        latest.editRevision !== origin.revision
      ) {
        studioEvents.emit('pixibun:toast', {
          message: 'Normal-map result was discarded because the source frame changed while it was processing.',
          type: 'error',
        });
        return;
      }

      const normalImgData = new ImageData(
        new Uint8ClampedArray(res.data.buffer as ArrayBuffer),
        canvasWidth,
        canvasHeight
      );

      updateTaggedLayer('Normal Map', 'normal-map', (outCtx) => {
        outCtx.putImageData(normalImgData, 0, 0);
      }, {
        kind: 'normal-map',
        version: 1,
        sourceMode: 'composite-excluding-self',
        params: {
          depthScale: 2,
          minecraftSkinMode: skinMode,
          minecraftSkinDetected: isMcSkin,
        },
      });
      } catch (error) {
        if (!job.signal.aborted) studioEvents.emit('pixibun:toast', { type: 'error',
          message: error instanceof Error ? error.message : 'Normal-map generation failed.' });
      } finally { job.dispose(); jobs.delete(job); }
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
      studioEvents.on('pixibun:bake-normal-map', handleBakeNormalMapEvent),
    ];

    return () => {
      jobs.forEach(job => job.cancel()); jobs.clear();
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
    discardSnapshot,
    getOrCreateLayerCanvas,
    renderComposite,
    updateTaggedLayer,
  ]);
}
