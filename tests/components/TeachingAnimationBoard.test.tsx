// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { TeachingAnimationBoard } from '@/components/playground/TeachingAnimationBoard';
import { TeachingBoardModal } from '@/components/playground/TeachingBoardModal';
import { useStudioStore } from '@/stores/studioStore';

describe('TeachingAnimationBoard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      imageSmoothingEnabled: false,
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      fillStyle: '',
      getImageData: vi.fn().mockReturnValue({ data: new Uint8ClampedArray(16 * 16 * 4) }),
    }) as unknown as typeof HTMLCanvasElement.prototype.getContext;
    useStudioStore.setState({
      canvasWidth: 16,
      canvasHeight: 16,
      fps: 10,
      frames: [{ id: 'f0', durationMs: 100, layers: [{ id: 'l0', name: 'Layer 1', visible: true, locked: false, opacity: 1, blendMode: 'source-over' }] }],
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders all 4 retro OS windows in PixiBun style', () => {
    render(<TeachingAnimationBoard />);

    // Window 1
    expect(screen.getByText(/BUILDING A BUN/i)).toBeDefined();
    // Window 2
    expect(screen.getByText(/ALT COLOURS/i)).toBeDefined();
    // Window 3
    expect(screen.getByText(/JUMP ANIMATION FRAMES/i)).toBeDefined();
    // Window 4
    expect(screen.getByText('ANIMATION')).toBeDefined();

    // Atelier Branding Watermark
    expect(screen.getByText(/PixiBun Atelier Standards/i)).toBeDefined();
    expect(screen.getByText('PIXIBUN ATELIER')).toBeDefined();
  });

  it('switches between Bun mascot and Gel Slime', () => {
    render(<TeachingAnimationBoard />);

    expect(screen.getByText(/BUILDING A BUN/i)).toBeDefined();

    const slimeBtn = screen.getByRole('button', { name: /Gel Slime/i });
    fireEvent.click(slimeBtn);

    expect(screen.getByText(/BUILDING A GEL SLIME/i)).toBeDefined();
  });

  it('switches alt colorways and updates active palette info', () => {
    render(<TeachingAnimationBoard />);

    // Default palette is Wisteria Lavender
    expect(screen.getByText('Wisteria Lavender')).toBeDefined();

    // Click on Lamp Amber
    const amberBtn = screen.getByTitle(/Lamp Amber/i);
    fireEvent.click(amberBtn);

    expect(screen.getByText('Lamp Amber')).toBeDefined();
    expect(screen.getByText('(Honey Glow)')).toBeDefined();
  });

  it('allows scrubbing jump animation frames by clicking frame buttons', () => {
    render(<TeachingAnimationBoard />);

    const frame5Btn = screen.getByRole('button', { name: '[5]' });
    fireEvent.click(frame5Btn);

    expect(screen.getByText(/Frame 5: Apex Float/i)).toBeDefined();
    expect(screen.getByText(/Height: 32px/i)).toBeDefined();
  });

  it('toggles playback with the Play/Pause button', () => {
    render(<TeachingAnimationBoard />);

    const playPauseBtn = screen.getByTitle(/Pause \(Space\)/i);
    expect(playPauseBtn).toBeDefined();

    fireEvent.click(playPauseBtn);
    expect(screen.getByText('Play')).toBeDefined();

    fireEvent.click(screen.getByTitle(/Play \(Space\)/i));
    expect(screen.getByText('Pause')).toBeDefined();
  });

  it('loads 10-frame animation into playground timeline on button click', () => {
    render(<TeachingAnimationBoard />);

    const loadBtn = screen.getByRole('button', { name: /Load into Playground Timeline/i });
    fireEvent.click(loadBtn);

    // Toast message appears
    expect(screen.getByText(/Loaded 10-frame Bun jump into Playground timeline!/i)).toBeDefined();

    // Studio state is synchronized to 10 frames
    const studio = useStudioStore.getState();
    expect(studio.frames.length).toBe(10);
    expect(studio.canvasWidth).toBe(16);
    expect(studio.canvasHeight).toBe(16);
  });

  it('renders and dismisses within TeachingBoardModal', () => {
    const handleClose = vi.fn();
    const { rerender } = render(
      <TeachingBoardModal isOpen={true} onClose={handleClose} />
    );

    expect(screen.getByRole('dialog', { name: 'PixiBun Teaching Animation Board' })).toBeDefined();

    // Press Escape to close
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);

    // Closed state
    rerender(<TeachingBoardModal isOpen={false} onClose={handleClose} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
