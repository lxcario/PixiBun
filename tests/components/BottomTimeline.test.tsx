// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { BottomTimeline } from '@/components/layout/BottomTimeline';
import { useStudioStore } from '@/stores/studioStore';

describe('Canonical clip playback', () => {
  let callback: FrameRequestCallback;
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { callback = cb; return 1; });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    useStudioStore.setState({ frames: [70, 230, 110].map((durationMs, i) => ({ id: `hold-${i}`, durationMs, layers: [] })),
      activeFrameIndex: 0, activeClipId: 'test-clip', isPlaying: false, loopMode: 'once', clips: [
        { id: 'test-clip', name: 'Test', startFrame: 0, endFrame: 2, loopMode: 'reverse' },
      ] });
  });
  afterEach(() => { cleanup(); useStudioStore.setState({ isPlaying: false }); vi.unstubAllGlobals(); });
  const tick = (time: number) => act(() => callback(time));
  it('plays reverse holds in order and stops after the final 70ms hold', () => {
    render(<BottomTimeline />); act(() => useStudioStore.getState().setIsPlaying(true));
    tick(0); expect(useStudioStore.getState().activeFrameIndex).toBe(2);
    tick(109); expect(useStudioStore.getState().activeFrameIndex).toBe(2);
    tick(110); expect(useStudioStore.getState().activeFrameIndex).toBe(1);
    tick(339); expect(useStudioStore.getState().activeFrameIndex).toBe(1);
    tick(340); expect(useStudioStore.getState().activeFrameIndex).toBe(0); expect(useStudioStore.getState().isPlaying).toBe(true);
    tick(410); expect(useStudioStore.getState().isPlaying).toBe(false);
  });
  it('plays a complete ping-pong period without doubling either endpoint', () => {
    useStudioStore.setState({ loopMode: 'repeat', clips: [{ id: 'test-clip', name: 'Test', startFrame: 0, endFrame: 2, loopMode: 'ping-pong' }] });
    render(<BottomTimeline />); act(() => useStudioStore.getState().setIsPlaying(true));
    const observed: number[] = [];
    for (const time of [0, 70, 300, 410, 640]) { tick(time); observed.push(useStudioStore.getState().activeFrameIndex); }
    expect(observed).toEqual([0, 1, 2, 1, 0]);
  });
  it('starts a fresh hold after an explicit scrub during playback', () => {
    render(<BottomTimeline />); act(() => useStudioStore.getState().setIsPlaying(true)); tick(0); tick(50);
    act(() => useStudioStore.getState().setActiveFrame(1)); tick(70); tick(299);
    expect(useStudioStore.getState().activeFrameIndex).toBe(1); tick(300); expect(useStudioStore.getState().activeFrameIndex).toBe(0);
  });
});

describe('BottomTimeline Drag & Drop Frame Reordering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useStudioStore.setState({ loopMode: 'repeat', isPlaying: false, clips: [], activeClipId: null });
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
    fireEvent.click(screen.getByRole('button', { name: 'Move frame earlier' }));
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

  it('changes preview speed without changing frame durations', () => {
    const state = useStudioStore.getState();
    state.frames.forEach((frame) => { frame.durationMs = 100; });
    const callbacks: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callbacks.push(callback);
      return callbacks.length;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    render(<BottomTimeline />);
    fireEvent.click(screen.getByRole('button', { name: 'Preview 1× speed' }));
    fireEvent.click(screen.getByRole('button', { name: '2× preview speed' }));
    act(() => useStudioStore.getState().setIsPlaying(true));
    act(() => callbacks.shift()?.(1000));
    act(() => callbacks.shift()?.(1050));
    expect(useStudioStore.getState().activeFrameIndex).toBe(1);
    expect(useStudioStore.getState().frames[0].durationMs).toBe(100);
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
