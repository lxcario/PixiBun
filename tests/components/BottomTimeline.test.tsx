// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { BottomTimeline } from '@/components/layout/BottomTimeline';
import { useStudioStore } from '@/stores/studioStore';

describe('BottomTimeline Drag & Drop Frame Reordering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const state = useStudioStore.getState();
    // Initialize with 3 frames
    state.frames = [
      { id: 'f1', durationMs: 100, layers: [{ id: 'l1', name: 'L1', visible: true, locked: false, opacity: 1, blendMode: 'source-over' }] },
      { id: 'f2', durationMs: 100, layers: [{ id: 'l2', name: 'L2', visible: true, locked: false, opacity: 1, blendMode: 'source-over' }] },
      { id: 'f3', durationMs: 100, layers: [{ id: 'l3', name: 'L3', visible: true, locked: false, opacity: 1, blendMode: 'source-over' }] },
    ];
    state.activeFrameIndex = 0;
  });

  afterEach(() => {
    cleanup();
  });

  it('renders all frame buttons with draggable enabled', () => {
    render(<BottomTimeline />);

    const frame1 = screen.getByLabelText(/Select frame 1/);
    const frame2 = screen.getByLabelText(/Select frame 2/);
    const frame3 = screen.getByLabelText(/Select frame 3/);

    expect(frame1).toBeDefined();
    expect(frame2).toBeDefined();
    expect(frame3).toBeDefined();
    expect(frame1.getAttribute('draggable')).toBe('true');
  });

  it('reorders frames when dragging frame 1 and dropping onto frame 3', () => {
    render(<BottomTimeline />);

    const frame1 = screen.getByLabelText(/Select frame 1/);
    const frame3 = screen.getByLabelText(/Select frame 3/);

    // Mock dataTransfer
    const mockDataTransfer = {
      setData: vi.fn(),
      getData: vi.fn().mockReturnValue('0'),
      effectAllowed: 'move',
      dropEffect: 'move',
    };

    // 1. Start drag on Frame 1 (index 0)
    fireEvent.dragStart(frame1, { dataTransfer: mockDataTransfer });
    expect(mockDataTransfer.setData).toHaveBeenCalledWith('text/plain', '0');

    // 2. Drag over Frame 3 (index 2)
    fireEvent.dragOver(frame3, { dataTransfer: mockDataTransfer });

    // 3. Drop on Frame 3
    fireEvent.drop(frame3, { dataTransfer: mockDataTransfer });

    // Verify frames in store have been reordered: [f2, f3, f1]
    const updatedFrames = useStudioStore.getState().frames;
    expect(updatedFrames.map(f => f.id)).toEqual(['f2', 'f3', 'f1']);
    expect(useStudioStore.getState().activeFrameIndex).toBe(2);
  });

  it('renders Manage Tags button and opens TagManagerModal when clicked', () => {
    render(<BottomTimeline />);

    const manageTagsBtn = screen.getByTestId('manage-tags-button');
    expect(manageTagsBtn).toBeDefined();

    fireEvent.click(manageTagsBtn);

    // Modal title should now be visible in DOM
    const modalTitle = screen.getByText(/Animation Tags & Clips/);
    expect(modalTitle).toBeDefined();
  });

  it('moves the selected frame with a button', () => {
    render(<BottomTimeline />);
    fireEvent.click(screen.getByLabelText(/Select frame 2/));
    fireEvent.click(screen.getByRole('button', { name: 'Move active frame left' }));
    expect(useStudioStore.getState().frames.map((frame) => frame.id)).toEqual(['f2', 'f1', 'f3']);
    expect(useStudioStore.getState().activeFrameIndex).toBe(0);
  });

  it('keeps fractional elapsed time across frame transitions', () => {
    const state = useStudioStore.getState();
    state.frames.forEach((frame) => { frame.durationMs = 10; });
    const callbacks = new Map<number, FrameRequestCallback>();
    let nextId = 0;
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      const id = ++nextId;
      callbacks.set(id, callback);
      return id;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => callbacks.delete(id));
    const advance = (time: number) => {
      const entry = callbacks.entries().next().value;
      expect(entry).toBeDefined();
      callbacks.delete(entry![0]);
      act(() => entry![1](time));
    };
    render(<BottomTimeline />);
    act(() => useStudioStore.getState().setIsPlaying(true));
    advance(1000);
    advance(1016);
    expect(useStudioStore.getState().activeFrameIndex).toBe(1);
    advance(1032);
    expect(useStudioStore.getState().activeFrameIndex).toBe(0);
    advance(1048);
    expect(useStudioStore.getState().activeFrameIndex).toBe(1);
    act(() => useStudioStore.getState().setIsPlaying(false));
    vi.unstubAllGlobals();
  });

  it('stops once playback after the hold of a single frame', () => {
    useStudioStore.getState().resetToNewProject();
    useStudioStore.getState().setFrameDuration(0, 10);
    useStudioStore.getState().setLoopMode('once');
    const callbacks: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callbacks.push(callback);
      return callbacks.length;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    render(<BottomTimeline />);
    act(() => useStudioStore.getState().setIsPlaying(true));
    act(() => callbacks.shift()?.(1000));
    act(() => callbacks.shift()?.(1016));
    expect(useStudioStore.getState().isPlaying).toBe(false);
    vi.unstubAllGlobals();
  });
});
