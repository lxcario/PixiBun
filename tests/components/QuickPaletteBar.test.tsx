// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { QuickPaletteBar } from '@/components/layout/inspector/QuickPaletteBar';
import { PinnedColorPanel } from '@/components/ui/ArtistColorPicker';
import { useStudioStore } from '@/stores/studioStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';

describe('QuickPaletteBar and PinnedColorPanel', () => {
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

  it('renders quick swatches and swaps foreground and background colors', () => {
    render(<QuickPaletteBar />);

    expect(screen.getByRole('region', { name: /quick palette strip/i })).toBeDefined();

    const swapBtn = screen.getByRole('button', { name: /swap foreground and background colors/i });
    expect(swapBtn).toBeDefined();

    expect(useStudioStore.getState().primaryColor).toBe('#000000');
    expect(useStudioStore.getState().secondaryColor).toBe('#ffffff');

    fireEvent.click(swapBtn);

    expect(useStudioStore.getState().primaryColor).toBe('#ffffff');
    expect(useStudioStore.getState().secondaryColor).toBe('#000000');
  });

  it('sets primary color on left-click and secondary color on right-click', () => {
    render(<QuickPaletteBar />);

    const redSwatch = screen.getByRole('button', { name: /select color #ff0000/i });
    expect(redSwatch).toBeDefined();

    fireEvent.click(redSwatch);
    expect(useStudioStore.getState().primaryColor).toBe('#ff0000');

    const blueSwatch = screen.getByRole('button', { name: /select color #0000ff/i });
    fireEvent.contextMenu(blueSwatch);
    expect(useStudioStore.getState().secondaryColor).toBe('#0000ff');
  });

  it('navigates to the palette tab when clicking the palette button', () => {
    render(<QuickPaletteBar />);

    const paletteBtn = screen.getByRole('button', { name: /open full palette manager/i });
    fireEvent.click(paletteBtn);

    expect(useStudioStore.getState().activeInspectorTab).toBe('palette');
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
