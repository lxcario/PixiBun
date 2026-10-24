// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePhotometricEvents } from '@/hooks/viewport/events/usePhotometricEvents';
import { studioEvents } from '@/lib/events/studioEvents';
import { useStudioStore } from '@/stores/studioStore';
import { makeCanvas, type MockCanvas } from './helpers/mockCanvas';

const smartMathMocks = vi.hoisted(() => ({
  computePhotometricAnalysis: vi.fn(),
  executePhotometricPipeline: vi.fn(),
  detectMinecraftSkin: vi.fn(),
  renderParametric2p5DLighting: vi.fn(),
}));

vi.mock('@/lib/graphics/smartMathEngine', () => smartMathMocks);

function fillPixel(canvas: MockCanvas, x: number, y: number, rgba: [number, number, number, number]) {
  const ctx = canvas.getContext('2d')!;
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const index = (y * canvas.width + x) * 4;
  image.data.set(rgba, index);
  ctx.putImageData(image, 0, 0);
}

describe('photometric preview session lifecycle', () => {
  const width = 8;
  const height = 8;

  beforeEach(() => {
    useStudioStore.getState().resetToNewProject('photometric-preview-test');
    smartMathMocks.computePhotometricAnalysis.mockReturnValue({
      formType: 'orb',
      normalField: {
        nx: new Float32Array(width * height),
        ny: new Float32Array(width * height),
        nz: new Float32Array(width * height).fill(1),
      },
      cavityAO: new Float32Array(width * height).fill(1),
      appendageData: null,
    });
    smartMathMocks.renderParametric2p5DLighting.mockReturnValue({ specularPixels: [] });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('restores an existing lighting layer on cancel without undoing unrelated history', () => {
    const store = useStudioStore.getState();
    const baseLayerId = store.frames[0].layers[0].id;
    store.addLayer('Photometric matte', 'photometric');
    const photometricLayerId = useStudioStore.getState().frames[0].layers[0].id;
    useStudioStore.getState().setActiveLayer(baseLayerId);

    const baseCanvas = makeCanvas(width, height);
    fillPixel(baseCanvas, 1, 5, [120, 80, 160, 255]);
    fillPixel(baseCanvas, 2, 6, [120, 80, 160, 255]);

    const photometricCanvas = makeCanvas(width, height);
    fillPixel(photometricCanvas, 4, 4, [18, 28, 38, 255]);
    const originalPhotometric = new Uint8ClampedArray(photometricCanvas._imageData.data);

    const shadedCanvas = makeCanvas(width, height);
    fillPixel(shadedCanvas, 4, 4, [220, 180, 140, 255]);
    smartMathMocks.executePhotometricPipeline.mockReturnValue(shadedCanvas);

    const canvases = new Map<string, MockCanvas>([
      [baseLayerId, baseCanvas],
      [photometricLayerId, photometricCanvas],
    ]);
    const discardSnapshot = vi.fn();
    const renderComposite = vi.fn();

    const { unmount } = renderHook(() =>
      usePhotometricEvents({
        canvasWidth: width,
        canvasHeight: height,
        activeLayerId: baseLayerId,
        getOrCreateLayerCanvas: (layerId) => canvases.get(layerId)!,
        renderComposite,
        captureSnapshot: vi.fn(),
        commitSnapshot: vi.fn(),
        discardSnapshot,
        bumpBufferVersion: vi.fn(),
        compositeSourceSnapshot: () => baseCanvas.getContext('2d')!,
        updateTaggedLayer: vi.fn(),
        compositeNormalMapSnapshot: () => null,
      })
    );

    act(() => {
      studioEvents.emit('pixibun:photometric-gizmo-start', { auto: false });
    });

    expect(photometricCanvas._imageData.data).not.toEqual(originalPhotometric);
    expect(useStudioStore.getState().activeLayerId).toBe(baseLayerId);

    const renderParams = smartMathMocks.executePhotometricPipeline.mock.calls[0][3];
    expect(renderParams.lightCenterX).toBe(2);
    expect(renderParams.lightCenterY).toBe(6);

    act(() => {
      studioEvents.emit('pixibun:photometric-gizmo-cancel');
    });

    expect(photometricCanvas._imageData.data).toEqual(originalPhotometric);
    expect(discardSnapshot).toHaveBeenCalledTimes(1);
    expect(useStudioStore.getState().activeLayerId).toBe(baseLayerId);
    expect(useStudioStore.getState().photometricGizmoActive).toBe(false);
    expect(renderComposite).toHaveBeenCalled();

    unmount();
  });

  it('deletes a newly-created preview layer on cancel and restores the drawing layer focus', () => {
    const store = useStudioStore.getState();
    const baseLayerId = store.frames[0].layers[0].id;
    const baseCanvas = makeCanvas(width, height);
    fillPixel(baseCanvas, 3, 3, [100, 60, 140, 255]);

    const canvases = new Map<string, MockCanvas>([[baseLayerId, baseCanvas]]);
    const shadedCanvas = makeCanvas(width, height);
    fillPixel(shadedCanvas, 3, 3, [210, 170, 130, 255]);
    smartMathMocks.executePhotometricPipeline.mockReturnValue(shadedCanvas);

    const discardSnapshot = vi.fn();
    const { unmount } = renderHook(() =>
      usePhotometricEvents({
        canvasWidth: width,
        canvasHeight: height,
        activeLayerId: baseLayerId,
        getOrCreateLayerCanvas: (layerId) => {
          let canvas = canvases.get(layerId);
          if (!canvas) {
            canvas = makeCanvas(width, height);
            canvases.set(layerId, canvas);
          }
          return canvas;
        },
        renderComposite: vi.fn(),
        captureSnapshot: vi.fn(),
        commitSnapshot: vi.fn(),
        discardSnapshot,
        bumpBufferVersion: vi.fn(),
        compositeSourceSnapshot: () => baseCanvas.getContext('2d')!,
        updateTaggedLayer: vi.fn(),
        compositeNormalMapSnapshot: () => null,
      })
    );

    act(() => {
      studioEvents.emit('pixibun:photometric-gizmo-start', { auto: false });
    });
    expect(useStudioStore.getState().frames[0].layers.some((layer) => layer.tag === 'photometric')).toBe(true);
    expect(useStudioStore.getState().activeLayerId).toBe(baseLayerId);

    act(() => {
      studioEvents.emit('pixibun:photometric-gizmo-cancel');
    });

    expect(useStudioStore.getState().frames[0].layers.some((layer) => layer.tag === 'photometric')).toBe(false);
    expect(useStudioStore.getState().activeLayerId).toBe(baseLayerId);
    expect(discardSnapshot).toHaveBeenCalledTimes(1);

    unmount();
  });
});
