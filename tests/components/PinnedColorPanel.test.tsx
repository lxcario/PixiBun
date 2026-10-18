// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { PinnedColorPanel } from '@/components/ui/ArtistColorPicker';
import { useStudioStore } from '@/stores/studioStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';

describe('PinnedColorPanel', () => {
  beforeEach(() => {
    useStudioStore.setState({
      primaryColor: '#000000',
      secondaryColor: '#ffffff',
      activeInspectorTab: 'tools',
      palettes: [
        {
          id: 'test-pal',
          name: 'Test Palette',
          colors: ['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff'],
        },
      ],
      currentPaletteId: 'test-pal',
    });
    useWorkspaceStore.setState({
      layout: {
        inspectorSide: 'right',
        inspectorWidth: 292,
        timeline: true,
        color: true,
        navigator: false,
      },
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('PinnedColorPanel supports collapsing and unpinning', () => {
    render(<PinnedColorPanel />);

    const section = screen.getByRole('region', { name: /pinned color panel/i });
    expect(section).toBeDefined();

    // Color picker sliders should initially be visible
    expect(screen.getByTestId('artist-color-picker')).toBeDefined();

    // Collapse panel
    const collapseBtn = screen.getByRole('button', { name: /collapse pinned color panel/i });
    fireEvent.click(collapseBtn);

    // Color picker is hidden
    expect(screen.queryByTestId('artist-color-picker')).toBeNull();

    // Expand panel again
    const expandBtn = screen.getByRole('button', { name: /expand pinned color panel/i });
    fireEvent.click(expandBtn);
    expect(screen.getByTestId('artist-color-picker')).toBeDefined();

    // Unpin panel
    const unpinBtn = screen.getByRole('button', { name: /unpin color panel/i });
    fireEvent.click(unpinBtn);

    expect(useWorkspaceStore.getState().layout.color).toBe(false);
  });
});
