// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { AtelierEngineShowcase } from '@/components/landing/AtelierEngineShowcase';
import { makeCanvas, type MockCtx } from '../helpers/mockCanvas';

// Cache forwardRef wrapper components so React doesn't destroy/remount elements on every render
const motionComponentCache: Record<string, React.ComponentType<Record<string, unknown>>> = {};

vi.mock('motion/react', () => {
  return {
    useReducedMotion: () => true,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: new Proxy(
      {},
      {
        get: (_target, prop: string) => {
          if (!motionComponentCache[prop]) {
            motionComponentCache[prop] = React.forwardRef((props: Record<string, unknown>, ref: React.Ref<unknown>) => {
              const {
                initial: _initial,
                animate: _animate,
                exit: _exit,
                transition: _transition,
                variants: _variants,
                whileHover: _whileHover,
                whileTap: _whileTap,
                onAnimationComplete: _onAnimationComplete,
                viewport: _viewport,
                whileInView: _whileInView,
                layoutId: _layoutId,
                ...rest
              } = props;
              return React.createElement(prop, { ...rest, ref });
            });
          }
          return motionComponentCache[prop];
        },
      }
    ),
  };
});

vi.mock('next/dynamic', async () => {
  const Photometric = await import('@/components/landing/showcase/PhotometricShowcase');
  const RotSprite = await import('@/components/landing/showcase/RotSpriteShowcase');
  const Pixelize = await import('@/components/landing/showcase/PixelizeShowcase');
  const EngineExport = await import('@/components/landing/showcase/EngineExportShowcase');

  const componentMap: Record<string, React.ComponentType<Record<string, unknown>>> = {
    PhotometricShowcase: Photometric.PhotometricShowcase as React.ComponentType<Record<string, unknown>>,
    RotSpriteShowcase: RotSprite.RotSpriteShowcase as React.ComponentType<Record<string, unknown>>,
    PixelizeShowcase: Pixelize.PixelizeShowcase as React.ComponentType<Record<string, unknown>>,
    EngineExportShowcase: EngineExport.EngineExportShowcase as React.ComponentType<Record<string, unknown>>,
  };

  return {
    default: (loader: () => Promise<unknown>) => {
      const loaderStr = loader.toString();
      for (const [name, Comp] of Object.entries(componentMap)) {
        if (loaderStr.includes(name)) {
          return (props: Record<string, unknown>) => <Comp {...props} />;
        }
      }
      return () => null;
    },
  };
});

describe('AtelierEngineShowcase Component', () => {
  let originalGetContext: typeof HTMLCanvasElement.prototype.getContext;

  beforeEach(() => {
    // Prevent recursive animation loops from blocking React act() in happy-dom
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});

    // Cache contexts per canvas so sequential getContext('2d') calls retain drawing operations
    const contextMap = new WeakMap<HTMLCanvasElement, MockCtx>();
    originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, contextId: string) {
      if (contextId === '2d') {
        let ctx = contextMap.get(this);
        if (!ctx) {
          const mc = makeCanvas(this.width || 32, this.height || 32);
          ctx = mc.getContext('2d') as MockCtx;
          contextMap.set(this, ctx);
        }
        return ctx;
      }
      return null;
    } as unknown as typeof HTMLCanvasElement.prototype.getContext;
  });

  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders the section header and all 4 curated feature tabs', () => {
    render(<AtelierEngineShowcase />);

    // Section title & philosophy
    expect(
      screen.getByRole('heading', {
        name: /A REAL COMPUTER GRAPHICS ATELIER IN YOUR BROWSER/i,
      })
    ).toBeDefined();

    // Tab list and 4 tabs
    const tabList = screen.getByRole('tablist', { name: /Atelier Engine Features/i });
    expect(tabList).toBeDefined();

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(4);

    const expectedTitles = [
      '2.5D Lighting & Shadows',
      'RotSprite Precision',
      'Image Synthesis',
      'Game Engine Exports',
    ];

    expectedTitles.forEach((title, idx) => {
      expect(tabs[idx].textContent).toContain(title);
      expect(tabs[idx].textContent).toContain(`0${idx + 1}`);
    });
  });

  it('defaults to Tab 01 (2.5D Lighting & Shadows) and allows toggling shadow mode, normal map and materials', async () => {
    render(<AtelierEngineShowcase />);

    const tab01 = screen.getByRole('tab', { name: /2.5D Lighting & Shadows/i });
    expect(tab01.getAttribute('aria-selected')).toBe('true');

    // Tabpanel for photometric
    const panel = screen.getByRole('tabpanel');
    expect(panel.id).toBe('panel-photometric');

    // Heading inside PhotometricShowcase (merged with cast shadows)
    expect(screen.getByRole('heading', { name: /2\.5D Photometric Studio & Bounded Cast Shadows/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Orbit/i })).toBeDefined();

    // Shadow mode toggles (Cast Ray, Drop AO, None)
    const dropAoBtn = screen.getByRole('button', { name: /Drop AO/i });
    expect(dropAoBtn).toBeDefined();
    await act(async () => {
      fireEvent.click(dropAoBtn);
    });

    const castRayBtn = screen.getByRole('button', { name: /Cast Ray/i });
    expect(castRayBtn).toBeDefined();
    await act(async () => {
      fireEvent.click(castRayBtn);
    });

    // Material presets
    const goldBtn = screen.getByRole('button', { name: /^gold$/i });
    expect(goldBtn).toBeDefined();
    await act(async () => {
      fireEvent.click(goldBtn);
    });

    // Toggle normal map button
    const normalMapBtn = screen.getByRole('button', { name: /Normal Field/i });
    expect(normalMapBtn).toBeDefined();
    await act(async () => {
      fireEvent.click(normalMapBtn);
    });
  });

  it('switches between tabs via direct tab clicks', async () => {
    render(<AtelierEngineShowcase />);

    // Click Tab 02: RotSprite Precision
    const rotTab = screen.getByRole('tab', { name: /RotSprite Precision/i });
    await act(async () => {
      fireEvent.click(rotTab);
    });

    expect(rotTab.getAttribute('aria-selected')).toBe('true');
    expect(screen.getAllByText(/ROTSPRITE 8X/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/STANDARD NEAREST/i)).toBeDefined();

    // Click snap angle button (e.g. 45°)
    const snap45 = screen.getByRole('button', { name: '45°' });
    await act(async () => {
      fireEvent.click(snap45);
    });
    expect(screen.getByText(/Angle: 45°/i)).toBeDefined();

    // Click Tab 04: Game Engine Exports
    const exportTab = screen.getByRole('tab', { name: /Game Engine Exports/i });
    await act(async () => {
      fireEvent.click(exportTab);
    });

    expect(exportTab.getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('button', { name: /Godot 4/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Unity/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Phaser 3/i })).toBeDefined();

    // Switch export sub-tab to Unity / JSON
    const unityBtn = screen.getByRole('button', { name: /Unity/i });
    await act(async () => {
      fireEvent.click(unityBtn);
    });
    expect(screen.getByText(/bun_walk_0\.png/i)).toBeDefined();

    // Switch export sub-tab to Phaser 3
    const phaserBtn = screen.getByRole('button', { name: /Phaser 3/i });
    await act(async () => {
      fireEvent.click(phaserBtn);
    });
    expect(screen.getByText(/bun_walk_spritesheet\.png/i)).toBeDefined();
    expect(screen.getByText(/frame_000/i)).toBeDefined();
  });

  it('navigates sequentially using the Next and Prev buttons across the 4 curated tabs', async () => {
    render(<AtelierEngineShowcase />);

    const nextBtn = screen.getByRole('button', { name: /Next feature/i });
    const prevBtn = screen.getByRole('button', { name: /Previous feature/i });

    // Initial is 01 Photometric & Shadows
    expect(screen.getByRole('tab', { name: /2.5D Lighting & Shadows/i }).getAttribute('aria-selected')).toBe('true');

    // Click Next -> 02 RotSprite Precision
    await act(async () => {
      fireEvent.click(nextBtn);
    });
    expect(screen.getByRole('tab', { name: /RotSprite Precision/i }).getAttribute('aria-selected')).toBe('true');

    // Click Next -> 03 Image Synthesis
    await act(async () => {
      fireEvent.click(nextBtn);
    });
    expect(screen.getByRole('tab', { name: /Image Synthesis/i }).getAttribute('aria-selected')).toBe('true');

    // Click Next -> 04 Game Engine Exports
    await act(async () => {
      fireEvent.click(nextBtn);
    });
    expect(screen.getByRole('tab', { name: /Game Engine Exports/i }).getAttribute('aria-selected')).toBe('true');

    // Click Next again -> wraps to 01 Lighting & Shadows
    await act(async () => {
      fireEvent.click(nextBtn);
    });
    expect(screen.getByRole('tab', { name: /2.5D Lighting & Shadows/i }).getAttribute('aria-selected')).toBe('true');

    // Click Prev -> wraps backwards to 04 Game Engine Exports
    await act(async () => {
      fireEvent.click(prevBtn);
    });
    expect(screen.getByRole('tab', { name: /Game Engine Exports/i }).getAttribute('aria-selected')).toBe('true');
  });

  it('renders Image Synthesis showcase and allows switching scenes and quantize levels', async () => {
    render(<AtelierEngineShowcase />);

    const pixelizeTab = screen.getByRole('tab', { name: /Image Synthesis/i });
    await act(async () => {
      fireEvent.click(pixelizeTab);
    });

    expect(screen.getByText(/Sobel Salience/i)).toBeDefined();
    expect(screen.getByText(/Naive Nearest/i)).toBeDefined();

    // Scene switcher buttons exist
    const mountainBtn = screen.getByRole('button', { name: /Mountain Sunset/i });
    const hearthBtn = screen.getByRole('button', { name: /Lamplit Hearth/i });
    expect(mountainBtn).toBeDefined();
    expect(hearthBtn).toBeDefined();

    // Switch to Lamplit Hearth scene
    await act(async () => {
      fireEvent.click(hearthBtn);
    });
    expect(screen.getByText(/Hearth Atelier/i)).toBeDefined();

    // Quantize buttons
    const sixteenColorsBtn = screen.getByRole('button', { name: '16 Colors' });
    await act(async () => {
      fireEvent.click(sixteenColorsBtn);
    });
  });

  it('handles interactive pointer drag on the photometric light bulb gizmo', async () => {
    render(<AtelierEngineShowcase />);

    // Tab 01 is active by default
    const gizmoOverlay = screen.getByTitle(/Drag the glowing bulb to change the light source direction/i);
    expect(gizmoOverlay).toBeDefined();

    // Mock getBoundingClientRect for gizmo container
    vi.spyOn(gizmoOverlay, 'getBoundingClientRect').mockReturnValue({
      width: 320,
      height: 320,
      top: 100,
      left: 100,
      bottom: 420,
      right: 420,
      x: 100,
      y: 100,
      toJSON: () => {},
    });

    // Simulate pointer down near the East perimeter
    await act(async () => {
      fireEvent.pointerDown(gizmoOverlay, {
        clientX: 380,
        clientY: 260,
        pointerId: 1,
      });
    });

    // Simulate pointer move to North-West
    await act(async () => {
      fireEvent.pointerMove(gizmoOverlay, {
        clientX: 180,
        clientY: 180,
        pointerId: 1,
      });
    });

    // Simulate pointer up
    await act(async () => {
      fireEvent.pointerUp(gizmoOverlay, { pointerId: 1 });
    });
  });

  it('triggers sample download for Phaser 3 engine export', async () => {
    render(<AtelierEngineShowcase />);

    const exportTab = screen.getByRole('tab', { name: /Game Engine Exports/i });
    await act(async () => {
      fireEvent.click(exportTab);
    });

    // Switch to Phaser 3
    const phaserBtn = screen.getByRole('button', { name: /Phaser 3/i });
    await act(async () => {
      fireEvent.click(phaserBtn);
    });

    // Mock URL.createObjectURL and HTMLAnchorElement.prototype.click
    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    const downloadBtn = screen.getByRole('button', { name: 'Download' });
    await act(async () => {
      fireEvent.click(downloadBtn);
    });

    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalled();
  });

  it('copies engine export code to clipboard and shows tactile copied confirmation', async () => {
    render(<AtelierEngineShowcase />);

    const exportTab = screen.getByRole('tab', { name: /Game Engine Exports/i });
    await act(async () => {
      fireEvent.click(exportTab);
    });

    // Mock navigator.clipboard
    const writeTextSpy = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: writeTextSpy,
      },
      configurable: true,
    });

    const copyBtn = screen.getByRole('button', { name: /Copy Code/i });
    await act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(writeTextSpy).toHaveBeenCalled();
    expect(screen.getByText(/Copied/i)).toBeDefined();
  });
});


