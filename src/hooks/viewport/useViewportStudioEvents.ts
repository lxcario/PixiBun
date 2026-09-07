import { useEffect, useCallback, useRef, RefObject } from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { studioEvents } from '@/lib/events/studioEvents';
import { rgbaToHex } from '@/lib/canvas/floodFill';
import { MaterialType } from '@/types/tools';
import {
  cleanJaggiesOnCanvas,
  generateSelOutData,
  generateOuterStrokeData,
  generateGroundShadowData,
  generate47BlobEdgeData,
  applyAtmosphericColorGrade,
  quantizeToActivePalette,
  cleanStrayPixelsOnCanvas,
  morphInBetweenFrames,
} from '@/lib/ai/pixelAiEngine';
import {
  rotateWithRotSprite,
  applyAtkinsonDither,
  applyRiemersmaDither,
  applyZhangSuenThinning,
  renderParametric2p5DLighting,
  executePhotometricPipeline,
  executeVolumetricOpticalPipeline,
  computeSeparableEDT,
  generateInflatedHeightmap,
  applyBilateralFilter,
  computeTangentNormalField,
  bakeNormalMapToCanvas,
  detectMinecraftSkin,
  computeMinecraftSkinNormalField,
  renderBoundedSpriteCastShadow,
} from '@/lib/ai/smartMathEngine';
import { synthesizeWfc } from '@/lib/procedural/waveFunctionCollapse';
import { getOrCreateBuffer } from '@/lib/engine/bufferRegistry';
import { inferPhotometricSettings, RecognizedFormType } from '@/lib/ai/math/photometricAuto';
import { inferRaymarchedShadowSettings } from '@/lib/ai/math/shadowAuto';

interface UseViewportStudioEventsProps {
  mainCanvasRef: RefObject<HTMLCanvasElement | null>;
  canvasWidth: number;
  canvasHeight: number;
  activeLayerId: string;
  getOrCreateLayerCanvas: (layerId: string) => HTMLCanvasElement;
  renderComposite: () => void;
  captureSnapshot: (
    description: string,
    overrideLayerId?: string,
    createdLayerId?: string,
    createdLayerTag?: string
  ) => void;
  commitSnapshot: () => void;
  performUndo: () => void;
  performRedo: () => void;
}

export function useViewportStudioEvents({
  mainCanvasRef,
  canvasWidth,
  canvasHeight,
  activeLayerId,
  getOrCreateLayerCanvas,
  renderComposite,
  captureSnapshot,
  commitSnapshot,
  performUndo,
  performRedo,
}: UseViewportStudioEventsProps) {
  const addExtractedPalette = useStudioStore((s) => s.addExtractedPalette);
  const bumpBufferVersion = useStudioStore((s) => s.bumpBufferVersion);
  const primaryColor = useStudioStore((s) => s.primaryColor);
  const tools = useStudioStore((s) => s.tools);

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
  } | null>(null);

  // Helper: composite source snapshot of all layers excluding tagged target
  const compositeSourceSnapshot = useCallback(
    (excludeTag?: string): CanvasRenderingContext2D | null => {
      const state = useStudioStore.getState();
      const currentFrame = state.frames[state.activeFrameIndex];
      if (!currentFrame) return null;

      const scratch = document.createElement('canvas');
      scratch.width = canvasWidth;
      scratch.height = canvasHeight;
      const sCtx = scratch.getContext('2d', { willReadFrequently: true });
      if (!sCtx) return null;
      sCtx.imageSmoothingEnabled = false;

      // 1. Composite excluding the tag (base artwork)
      currentFrame.layers
        .slice()
        .reverse()
        .forEach((layer) => {
          if (!layer.visible) return;
          if (
            excludeTag &&
            (layer.tag === excludeTag ||
              (excludeTag === 'photometric' &&
                (layer.tag === 'specular' ||
                  layer.name.toLowerCase().startsWith('photometric') ||
                  layer.name.toLowerCase().startsWith('specular'))))
          ) {
            return;
          }
          const lCanvas = getOrCreateLayerCanvas(layer.id);
          sCtx.globalAlpha = layer.opacity;
          sCtx.globalCompositeOperation = layer.blendMode;
          sCtx.drawImage(lCanvas, 0, 0);
        });

      // 2. Count opaque pixels in the non-tagged composite
      const nonTaggedData = sCtx.getImageData(0, 0, canvasWidth, canvasHeight).data;
      let nonTaggedPixels = 0;
      for (let i = 3; i < nonTaggedData.length; i += 4) {
        if (nonTaggedData[i] > 20) nonTaggedPixels++;
      }

      // If the base artwork (excluding the target tag) has content, ALWAYS use it!
      // This ensures re-running photometric lighting does not re-feed or compound on previous lighting passes.
      if (nonTaggedPixels > 0) {
        sCtx.globalAlpha = 1.0;
        sCtx.globalCompositeOperation = 'source-over';
        return sCtx;
      }

      // 3. Fallback only if base artwork is completely empty: composite all visible layers
      const fullScratch = document.createElement('canvas');
      fullScratch.width = canvasWidth;
      fullScratch.height = canvasHeight;
      const fullCtx = fullScratch.getContext('2d', { willReadFrequently: true });
      if (!fullCtx) return sCtx;
      fullCtx.imageSmoothingEnabled = false;

      currentFrame.layers
        .slice()
        .reverse()
        .forEach((layer) => {
          if (!layer.visible) return;
          const lCanvas = getOrCreateLayerCanvas(layer.id);
          fullCtx.globalAlpha = layer.opacity;
          fullCtx.globalCompositeOperation = layer.blendMode;
          fullCtx.drawImage(lCanvas, 0, 0);
        });

      fullCtx.globalAlpha = 1.0;
      fullCtx.globalCompositeOperation = 'source-over';
      return fullCtx;
    },
    [canvasHeight, canvasWidth, getOrCreateLayerCanvas]
  );

  // Helper: write AI generated content to a dedicated tagged layer
  const updateTaggedLayer = useCallback(
    (displayName: string, tag: string, drawFn: (ctx: CanvasRenderingContext2D) => void) => {
      const state = useStudioStore.getState();
      const currentFrame = state.frames[state.activeFrameIndex];
      if (!currentFrame) return;

      const previousActiveLayerId = state.activeLayerId;
      let targetLayerId: string;
      let isNewLayer = false;

      // Find existing tagged layer by explicit tag OR by name prefix fallback
      const isPhotometric = tag === 'photometric';
      const existing = currentFrame.layers.find(
        (l) =>
          l.tag === tag ||
          (isPhotometric && (l.tag === 'photometric' || l.name.toLowerCase().startsWith('photometric')))
      );

      if (existing) {
        targetLayerId = existing.id;
        // Strictly preserve the tag via an immutable store action — store state
        // is Immer-frozen, so mutating `existing.tag` directly would throw.
        if (existing.tag !== tag) {
          state.setLayerTag(targetLayerId, tag);
        }
        if (existing.name !== displayName) {
          state.renameLayer(targetLayerId, displayName);
        }
      } else {
        isNewLayer = true;
        state.addLayer(displayName, tag);
        const freshState = useStudioStore.getState();
        const freshFrame = freshState.frames[freshState.activeFrameIndex];
        const newLayer = freshFrame?.layers[0];
        if (!newLayer) return;
        targetLayerId = newLayer.id;

        if (tag === 'cast-shadow' || tag === 'ground-shadow') {
          const layerCount = freshFrame.layers.length;
          if (layerCount > 1) {
            freshState.reorderLayers(0, layerCount - 1);
          }
        }
      }

      // Prune any extraneous duplicate layers with the same tag (e.g. from previous runs)
      const duplicateLayers = currentFrame.layers.filter(
        (l) =>
          (l.tag === tag || (isPhotometric && l.name.toLowerCase().startsWith('photometric'))) &&
          l.id !== targetLayerId
      );
      if (duplicateLayers.length > 0) {
        duplicateLayers.forEach((dup) => {
          state.deleteLayer(dup.id);
        });
      }

      // Crucially capture the layer's pristine state BEFORE writing AI output
      // (tag preserved so redo can re-create the tagged layer correctly)
      captureSnapshot(displayName, targetLayerId, isNewLayer ? targetLayerId : undefined, tag);

      const lCanvas = getOrCreateLayerCanvas(targetLayerId);
      const lCtx = lCanvas.getContext('2d', { willReadFrequently: true });
      if (lCtx) {
        lCtx.imageSmoothingEnabled = false;
        lCtx.clearRect(0, 0, canvasWidth, canvasHeight);
        drawFn(lCtx);
      }

      commitSnapshot();
      renderComposite();
      bumpBufferVersion();

      // Maintain selection on the original artwork layer
      if (previousActiveLayerId && previousActiveLayerId !== targetLayerId) {
        useStudioStore.getState().setActiveLayer(previousActiveLayerId);
      }
    },
    [
      bumpBufferVersion,
      canvasHeight,
      canvasWidth,
      captureSnapshot,
      commitSnapshot,
      getOrCreateLayerCanvas,
      renderComposite,
    ]
  );

  useEffect(() => {
    const handleUndoEvent = () => performUndo();
    const handleRedoEvent = () => performRedo();

    const handleExtractPaletteEvent = () => {
      const mainCanvas = mainCanvasRef.current;
      if (!mainCanvas) return;
      const ctx = mainCanvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      const imgData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
      const data = imgData.data;
      const uniqueColors = new Set<string>();

      for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 3];
        if (a > 30) {
          const hex = rgbaToHex(data[i], data[i + 1], data[i + 2], a);
          uniqueColors.add(hex);
        }
      }

      const colorsArr = Array.from(uniqueColors);
      if (colorsArr.length > 0) {
        addExtractedPalette(`Extracted (${colorsArr.length})`, colorsArr);
      }
    };

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

    const handleAutoShadeEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      const lightAz = customEvent.detail?.lightAzimuth ?? tools.lightAzimuth;
      const lightEl = customEvent.detail?.lightElevation ?? tools.lightElevation;

      const srcCtx = compositeSourceSnapshot('auto-shade');
      if (!srcCtx) return;

      const { shadedPixels } = renderParametric2p5DLighting(srcCtx, canvasWidth, canvasHeight, {
        azimuthDeg: lightAz,
        elevationDeg: lightEl,
        shadowIntensity: 0.8,
        specularShininess: 16,
        rimLight: false,
        selOut: false,
      });

      updateTaggedLayer(`Auto Shade ${lightAz}°`, 'auto-shade', (outCtx) => {
        shadedPixels.forEach((p) => {
          outCtx.fillStyle = `rgba(${p.r}, ${p.g}, ${p.b}, ${p.a / 255})`;
          outCtx.fillRect(p.x, p.y, 1, 1);
        });
      });
    };

    const handleHighlightEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      const lightAz = customEvent.detail?.lightAzimuth ?? tools.lightAzimuth;
      const lightEl = customEvent.detail?.lightElevation ?? tools.lightElevation;

      const srcCtx = compositeSourceSnapshot('specular');
      if (!srcCtx) return;

      const { specularPixels } = renderParametric2p5DLighting(srcCtx, canvasWidth, canvasHeight, {
        azimuthDeg: lightAz,
        elevationDeg: lightEl,
        shadowIntensity: 0.8,
        specularShininess: 16,
        rimLight: false,
        selOut: false,
        material: tools.materialPreset,
      });

      updateTaggedLayer(`Specular ${lightAz}°`, 'specular', (outCtx) => {
        specularPixels.forEach((p) => {
          outCtx.fillStyle = `rgba(${p.r}, ${p.g}, ${p.b}, ${p.a / 255})`;
          outCtx.fillRect(p.x, p.y, 1, 1);
        });
      });
    };

    const handleSelOutEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      const lightAz = customEvent.detail?.lightAzimuth ?? tools.lightAzimuth;

      const srcCtx = compositeSourceSnapshot('sel-out');
      if (!srcCtx) return;

      const { selOutPixels } = generateSelOutData(srcCtx, canvasWidth, canvasHeight, lightAz);

      updateTaggedLayer('Selective Outline', 'sel-out', (outCtx) => {
        selOutPixels.forEach((p) => {
          outCtx.fillStyle = `rgba(${p.r}, ${p.g}, ${p.b}, ${p.a / 255})`;
          outCtx.fillRect(p.x, p.y, 1, 1);
        });
      });
    };

    const handleAutoOutlineEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      const strokeColor = customEvent.detail?.color || '#2B2038';

      captureSnapshot('AI Auto Outline');
      const srcCtx = compositeSourceSnapshot();
      if (!srcCtx) return;

      const { strokePixels } = generateOuterStrokeData(srcCtx, canvasWidth, canvasHeight, strokeColor);

      const targetCanvas = getOrCreateLayerCanvas(activeLayerId);
      const tCtx = targetCanvas.getContext('2d');
      if (tCtx) {
        strokePixels.forEach((p) => {
          tCtx.fillStyle = `rgba(${p.r}, ${p.g}, ${p.b}, ${p.a / 255})`;
          tCtx.fillRect(p.x, p.y, 1, 1);
        });
        commitSnapshot();
        renderComposite();
        bumpBufferVersion();
      }
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

      // Measure distance from empty receiver canvas to the solid sprite occluder:
      // Solid sprite pixels -> distance = 0
      // Empty canvas pixels -> distance > 0 (distance to nearest sprite pixel)
      const edt = computeSeparableEDT((x, y) => !isOpaque(x, y), canvasWidth, canvasHeight);

      const shadowImgData = renderBoundedSpriteCastShadow(
        edt,
        canvasWidth,
        canvasHeight,
        {
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
        }
      );

      updateTaggedLayer('Cast Shadow', 'cast-shadow', (outCtx) => {
        outCtx.putImageData(shadowImgData, 0, 0);
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

      // Synchronize inspector controls and listeners
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('pixibun:shadow-settings-inferred', {
            detail: {
              ...inferred,
              shadowStyle: detail.shadowStyle ?? 'cast',
            },
          })
        );
      }

      const isOpaque = (x: number, y: number) => {
        if (x < 0 || x >= canvasWidth || y < 0 || y >= canvasHeight) return false;
        return data[(y * canvasWidth + x) * 4 + 3] > 30;
      };

      // Measure distance from empty receiver canvas to the solid sprite occluder
      const edt = computeSeparableEDT((x, y) => !isOpaque(x, y), canvasWidth, canvasHeight);

      const shadowImgData = renderBoundedSpriteCastShadow(
        edt,
        canvasWidth,
        canvasHeight,
        {
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
        }
      );

      updateTaggedLayer('Cast Shadow', 'cast-shadow', (outCtx) => {
        outCtx.putImageData(shadowImgData, 0, 0);
      });
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

      // Determine sample source
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
    const handleRotSpriteEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      const angle = customEvent.detail?.angle ?? (typeof customEvent.detail === 'number' ? customEvent.detail : 45);

      captureSnapshot(`RotSprite ${angle}°`);
      const targetCanvas = getOrCreateLayerCanvas(activeLayerId);
      const tCtx = targetCanvas.getContext('2d', { willReadFrequently: true });
      if (tCtx) {
        const rotated = rotateWithRotSprite(tCtx, canvasWidth, canvasHeight, angle);
        tCtx.clearRect(0, 0, canvasWidth, canvasHeight);
        tCtx.drawImage(rotated, 0, 0);

        // Synchronously rotate companion tagged layers (e.g. Photometric Lighting) to keep artwork aligned
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
                lCtx.drawImage(lRotated, 0, 0);
              }
            }
          });
        }

        commitSnapshot();
        renderComposite();
        bumpBufferVersion();
      }
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

    // Deep art analysis & interactive on-canvas live light bulb gizmo session.
    // Infers light direction, elevation, material and exposure, mounts the pixel light bulb
    // on canvas, and allows real-time dragging before committing with Enter or cancelling with Esc.
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
      }

      // Find or create target layer
      let targetLayerId: string;
      let isNewLayer = false;
      const tag = 'photometric';
      const displayName = `Photometric ${material}`;

      const existing = currentFrame.layers.find(
        (l) =>
          l.tag === tag ||
          (l.tag === 'photometric' || l.name.toLowerCase().startsWith('photometric'))
      );

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

      // Capture single clean snapshot before modifying (tag preserved for redo)
      captureSnapshot(displayName, targetLayerId, isNewLayer ? targetLayerId : undefined, tag);

      // Render initial photometric lighting
      const shadedCanvas = executePhotometricPipeline(
        srcCtx,
        canvasWidth,
        canvasHeight,
        {
          lightAzimuth: azimuth,
          lightElevation: elevation,
          lightRadius: 64,
          lightColor: '#FFFFFF',
          ambientIntensity: 0.48,
          lightBrightness: brightness,
          material,
          cavityStrength: state.tools.cavityStrength,
          ditherModulation: state.tools.ditherModulation,
          bayerSize: '4x4',
          formType,
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

      // Store in session ref for live updates
      photometricSessionRef.current = {
        srcCtx,
        targetLayerId,
        isNewLayer,
        material,
        brightness,
        formType,
        paletteColors: [],
      };

      // Activate interactive on-canvas light bulb gizmo
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
          lightCenterX: session.lastCenterX,
          lightCenterY: session.lastCenterY,
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
        commitSnapshot();
        state.setLightBrightness(session.brightness);

        // Optional Specular Glint layer for shiny/metallic materials (never on matte or fabric)
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

      const materialName = detail.material ?? tools.materialPreset;
      const shadedCanvas = executePhotometricPipeline(
        srcCtx,
        canvasWidth,
        canvasHeight,
        {
          lightAzimuth: detail.lightAzimuth ?? tools.lightAzimuth,
          lightElevation: detail.lightElevation ?? tools.lightElevation,
          lightRadius: detail.lightRadius ?? tools.lightRadius,
          lightBrightness: detail.lightBrightness ?? tools.lightBrightness ?? 1.15,
          lightColor: detail.lightColor ?? '#FFFFFF',
          ambientIntensity: detail.ambientIntensity ?? 0.45,
          material: materialName,
          cavityStrength: detail.cavityStrength ?? tools.cavityStrength,
          ditherModulation: detail.ditherModulation ?? tools.ditherModulation,
          bayerSize: detail.bayerSize || '4x4',
          formType: detail.formType ?? tools.formType ?? 'auto',
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

      const preset = detail.preset ?? tools.opticalPreset;
      const shadedCanvas = executeVolumetricOpticalPipeline(
        srcCtx,
        canvasWidth,
        canvasHeight,
        {
          preset,
          translucencyDepth: detail.translucencyDepth ?? tools.translucencyDepth,
          fresnelPower: detail.fresnelPower ?? tools.fresnelPower,
          anisoAngle: detail.anisoAngle ?? tools.anisoAngle,
          anisoFlow: detail.anisoFlow ?? tools.anisoFlow,
          celTones: detail.celTones ?? tools.opticalCelTones,
          lightAzimuth: detail.lightAzimuth ?? tools.lightAzimuth,
          lightElevation: detail.lightElevation ?? tools.lightElevation,
          lightColor: detail.lightColor ?? '#FFFFFF',
          paletteColors: detail.paletteColors ?? [],
          ditherModulation: detail.ditherModulation ?? tools.ditherModulation ?? 0.0,
        }
      );

      updateTaggedLayer(`Optics (${preset})`, 'optical-output', (outCtx) => {
        outCtx.drawImage(shadedCanvas, 0, 0);
      });
    };

    const handleBakeNormalMapEvent = () => {
      const srcCtx = compositeSourceSnapshot('normal-map');
      if (!srcCtx) return;

      const imgData = srcCtx.getImageData(0, 0, canvasWidth, canvasHeight);
      const data = imgData.data;
      const isOpaque = (x: number, y: number) => {
        if (x < 0 || x >= canvasWidth || y < 0 || y >= canvasHeight) return false;
        return data[(y * canvasWidth + x) * 4 + 3] > 30;
      };

      const isMcSkin = detectMinecraftSkin(isOpaque, canvasWidth, canvasHeight);
      const normalField = isMcSkin
        ? computeMinecraftSkinNormalField(canvasWidth, canvasHeight)
        : computeTangentNormalField(
            applyBilateralFilter(
              generateInflatedHeightmap(computeSeparableEDT(isOpaque, canvasWidth, canvasHeight), canvasWidth, canvasHeight, 0.5),
              canvasWidth,
              canvasHeight,
              1.5,
              2.0
            ),
            canvasWidth,
            canvasHeight,
            2.0
          );
      const normalCanvas = bakeNormalMapToCanvas(normalField, canvasWidth, canvasHeight, isOpaque);

      updateTaggedLayer('Normal Map', 'normal-map', (outCtx) => {
        outCtx.drawImage(normalCanvas, 0, 0);
      });
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
        frame.layers.slice().reverse().forEach((l) => {
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
      studioEvents.on('pixibun:undo', handleUndoEvent),
      studioEvents.on('pixibun:redo', handleRedoEvent),
      studioEvents.on('pixibun:extract-palette', handleExtractPaletteEvent),
      studioEvents.on('pixibun:clean-jaggies', handleCleanJaggiesEvent),
      studioEvents.on('pixibun:auto-shade', (detail) => handleAutoShadeEvent({ detail } as CustomEvent)),
      studioEvents.on('pixibun:highlight', (detail) => handleHighlightEvent({ detail } as CustomEvent)),
      studioEvents.on('pixibun:sel-out', (detail) => handleSelOutEvent({ detail } as CustomEvent)),
      studioEvents.on('pixibun:auto-outline', (detail) => handleAutoOutlineEvent({ detail } as CustomEvent)),
      studioEvents.on('pixibun:ground-shadow', handleGroundShadowEvent),
      studioEvents.on('pixibun:render-cast-shadow', (detail) => handleRenderCastShadowEvent({ detail } as CustomEvent)),
      studioEvents.on('pixibun:render-cast-shadow-auto', (detail) => handleRenderCastShadowAutoEvent({ detail } as CustomEvent)),
      studioEvents.on('pixibun:apply-47-blob', handle47BlobEvent),
      studioEvents.on('pixibun:wfc-synthesis', (detail) => handleWfcSynthesisEvent({ detail } as CustomEvent)),
      studioEvents.on('pixibun:rot-sprite', (detail) => handleRotSpriteEvent({ detail } as CustomEvent)),
      studioEvents.on('pixibun:atkinson-dither', (detail) => handleAtkinsonDitherEvent({ detail } as CustomEvent)),
      studioEvents.on('pixibun:riemersma-dither', (detail) => handleRiemersmaDitherEvent({ detail } as CustomEvent)),
      studioEvents.on('pixibun:skeleton-thinning', handleSkeletonThinningEvent),
      studioEvents.on('pixibun:color-grade', (detail) => handleColorGradeEvent({ detail } as CustomEvent)),
      studioEvents.on('pixibun:quantize-palette', (detail) => handleQuantizePaletteEvent({ detail } as CustomEvent)),
      studioEvents.on('pixibun:remove-strays', handleRemoveStraysEvent),
      studioEvents.on('pixibun:photometric-lighting', (detail) => handlePhotometricLightingEvent({ detail } as CustomEvent)),
      studioEvents.on('pixibun:photometric-auto', () => handlePhotometricAutoEvent()),
      studioEvents.on('pixibun:photometric-gizmo-start', (detail) => handlePhotometricGizmoStartEvent(detail || undefined)),
      studioEvents.on('pixibun:photometric-lighting-live', (detail) => handlePhotometricLightingLiveEvent(detail)),
      studioEvents.on('pixibun:photometric-gizmo-commit', handlePhotometricGizmoCommitEvent),
      studioEvents.on('pixibun:photometric-gizmo-cancel', handlePhotometricGizmoCancelEvent),
      studioEvents.on('pixibun:volumetric-optics', (detail) => handleVolumetricOpticsEvent({ detail } as CustomEvent)),
      studioEvents.on('pixibun:bake-normal-map', handleBakeNormalMapEvent),
      studioEvents.on('pixibun:in-between-frame', handleInBetweenFrameEvent),
    ];

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [
    activeLayerId,
    addExtractedPalette,
    bumpBufferVersion,
    canvasHeight,
    canvasWidth,
    captureSnapshot,
    commitSnapshot,
    compositeSourceSnapshot,
    getOrCreateLayerCanvas,
    mainCanvasRef,
    performRedo,
    performUndo,
    primaryColor,
    renderComposite,
    tools,
    updateTaggedLayer,
  ]);
}
