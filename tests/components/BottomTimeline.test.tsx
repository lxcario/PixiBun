// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
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
});
