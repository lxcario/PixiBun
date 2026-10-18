// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { ToolSettingsPanel } from '@/components/layout/inspector/ToolSettingsPanel';
import { LeftToolbar } from '@/components/layout/LeftToolbar';
import { useStudioStore } from '@/stores/studioStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useGradientPointerHandler } from '@/hooks/viewport/useGradientPointerHandler';
import { renderHook } from '@testing-library/react';
import { makeCanvas } from '../helpers/mockCanvas';

describe('ToolSettingsPanel and Dither on New Layer', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      return makeCanvas(this.width || 32, this.height || 32).getContext('2d');
    });
    useStudioStore.setState({
      tools: {
        ...useStudioStore.getState().tools,
        activeTool: 'gradient',
        brushSize: 1,
        pixelPerfect: false,
        ditherMatrix: '4x4',
        ditherDensity: 0.5,
      },
      frames: [
        {
          id: 'frame-1',
          durationMs: 100,
          layers: [
            { id: 'layer-base', name: 'Base Layer', visible: true, locked: false, opacity: 1, blendMode: 'source-over' },
          ],
        },
      ],
      activeFrameIndex: 0,
      activeLayerId: 'layer-base',
      primaryColor: '#ff0000',
      secondaryColor: '#0000ff',
      canvasWidth: 32,
      canvasHeight: 32,
    });

    useWorkspaceStore.setState({
      gradient: { shape: 'linear', ramp: 'foreground', dither: true, newLayer: true },
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders tool settings for gradient and toggles Draw on new layer', () => {
    render(<ToolSettingsPanel />);

    expect(screen.getByRole('region', { name: /detailed tool settings/i })).toBeDefined();
    expect(screen.getByText(/Pixel Gradient/i)).toBeDefined();

    const newLayerToggle = screen.getByRole('checkbox', { name: /draw on new layer/i });
    expect(newLayerToggle).toBeDefined();
    expect((newLayerToggle as HTMLInputElement).checked).toBe(true);

    fireEvent.click(newLayerToggle);
    expect(useWorkspaceStore.getState().gradient.newLayer).toBe(false);
  });

  it('renders LeftToolbar with scrollable tool container and pinned color dock', () => {
    const { container } = render(<LeftToolbar />);

    const aside = container.querySelector('aside');
    expect(aside).toBeDefined();
    expect(aside?.className).toContain('h-full');
    expect(aside?.className).toContain('overflow-hidden');

    const scrollContainer = aside?.querySelector('.overflow-y-auto');
    expect(scrollContainer).toBeDefined();

    const swapBtn = screen.getByRole('button', { name: /swap colors/i });
    expect(swapBtn).toBeDefined();
  });

  it('automatically draws pixel gradient on a new layer when newLayer is true', () => {
    const dummyCanvas = document.createElement('canvas');
    dummyCanvas.width = 32;
    dummyCanvas.height = 32;
    const previewRef = { current: dummyCanvas };
    const snapshotRef = { current: null };
    const renderComp = vi.fn();
    const getLayerCanvas = vi.fn(() => document.createElement('canvas'));

    const { result } = renderHook(() =>
      useGradientPointerHandler({
        canvasWidth: 32,
        canvasHeight: 32,
        strokeStart: { x: 0, y: 0 },
        previewCanvasRef: previewRef,
        getOrCreateLayerCanvas: getLayerCanvas,
        renderComposite: renderComp,
        currentStrokeSnapshotRef: snapshotRef,
      })
    );

    const initialLayerCount = useStudioStore.getState().frames[0].layers.length;
    expect(initialLayerCount).toBe(1);

    act(() => {
      // Commit gradient from (0,0) to (31,31)
      result.current.onPointerUp({ x: 31, y: 31 });
    });

    // A new layer should have been added at the top of the stack
    const newLayers = useStudioStore.getState().frames[0].layers;
    expect(newLayers.length).toBe(2);
    expect(newLayers[0].name).toBe('Dither Gradient');
    expect(useStudioStore.getState().activeLayerId).toBe(newLayers[0].id);
    expect(renderComp).toHaveBeenCalled();
  });

  it.each([
    ['bucket', 'Tool panel fill tolerance', /Red, green, blue and alpha measured together/],
    ['select-wand', 'Tool panel color tolerance', /largest difference in any one channel, alpha included/],
    ['color-replace', 'Tool panel color tolerance', /each pixel keeps its own alpha/],
    ['erase-color', 'Tool panel erase tolerance', /Match color family/],
  ] as const)('%s tolerance says what it compares', (tool, label, hint) => {
    act(() => { useStudioStore.setState({ tools: { ...useStudioStore.getState().tools, activeTool: tool } }); });
    render(<ToolSettingsPanel />);
    const slider = screen.getByRole('slider', { name: label });
    expect(document.getElementById(slider.getAttribute('aria-describedby')!)?.textContent).toMatch(hint);
  });
});
