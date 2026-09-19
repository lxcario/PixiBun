// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, fireEvent, screen, cleanup, act } from '@testing-library/react';
import { useThemeStore, getInitialStudioTheme, StudioTheme } from '@/stores/themeStore';
import { useStudioStore } from '@/stores/studioStore';
import { AppearancePopover } from '@/components/ui/AppearancePopover';

describe('Phase M: Dual First-Party Studio Themes (Atelier & Cozy Classic)', () => {
  beforeEach(() => {
    localStorage.clear();
    act(() => {
      useThemeStore.getState().setStudioTheme('atelier');
      useThemeStore.getState().setColorScheme('dark');
    });
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  // Requirement 1
  it('1. Atelier is default studio theme', () => {
    expect(useThemeStore.getState().studioTheme).toBe('atelier');
    expect(document.documentElement.getAttribute('data-studio-theme')).toBe('atelier');
  });

  // Requirement 2
  it('2. Cozy Classic can be selected and applies DOM attributes', () => {
    act(() => {
      useThemeStore.getState().setStudioTheme('cozy-classic');
    });

    expect(useThemeStore.getState().studioTheme).toBe('cozy-classic');
    expect(document.documentElement.getAttribute('data-studio-theme')).toBe('cozy-classic');
    expect(localStorage.getItem('pixibun-studio-theme')).toBe('cozy-classic');
  });

  // Requirement 3
  it('3. StudioTheme persists in storage after reload', () => {
    localStorage.setItem('pixibun-studio-theme', 'cozy-classic');
    expect(getInitialStudioTheme()).toBe('cozy-classic');

    localStorage.setItem('pixibun-studio-theme', 'atelier');
    expect(getInitialStudioTheme()).toBe('atelier');
  });

  // Requirement 4
  it('4. Atelier can be restored after Cozy Classic was active', () => {
    act(() => {
      useThemeStore.getState().setStudioTheme('cozy-classic');
    });
    expect(useThemeStore.getState().studioTheme).toBe('cozy-classic');

    act(() => {
      useThemeStore.getState().setStudioTheme('atelier');
    });
    expect(useThemeStore.getState().studioTheme).toBe('atelier');
    expect(document.documentElement.getAttribute('data-studio-theme')).toBe('atelier');
    expect(localStorage.getItem('pixibun-studio-theme')).toBe('atelier');
  });

  // Requirement 5
  it('5. Invalid theme value safely falls back to Atelier', () => {
    act(() => {
      useThemeStore.getState().setStudioTheme('neon-cyberpunk' as unknown as StudioTheme);
    });
    expect(useThemeStore.getState().studioTheme).toBe('atelier');
    expect(document.documentElement.getAttribute('data-studio-theme')).toBe('atelier');

    localStorage.setItem('pixibun-studio-theme', 'corrupted-theme-key');
    expect(getInitialStudioTheme()).toBe('atelier');
  });

  // Requirement 6
  it('6. Theme switch does NOT mutate project/document data', () => {
    const store = useStudioStore.getState();
    act(() => {
      store.setProjectName('Archival Masterpiece');
    });

    const initialProjectName = useStudioStore.getState().projectName;
    const initialWidth = useStudioStore.getState().canvasWidth;
    const initialHeight = useStudioStore.getState().canvasHeight;
    const initialFrameCount = useStudioStore.getState().frames.length;
    const initialLayers = JSON.stringify(useStudioStore.getState().frames[0].layers);

    // Switch Atelier -> Cozy Classic -> Atelier
    act(() => {
      useThemeStore.getState().setStudioTheme('cozy-classic');
    });
    act(() => {
      useThemeStore.getState().setStudioTheme('atelier');
    });

    const afterStore = useStudioStore.getState();
    expect(afterStore.projectName).toBe(initialProjectName);
    expect(afterStore.canvasWidth).toBe(initialWidth);
    expect(afterStore.canvasHeight).toBe(initialHeight);
    expect(afterStore.frames.length).toBe(initialFrameCount);
    expect(JSON.stringify(afterStore.frames[0].layers)).toBe(initialLayers);
  });

  // Requirement 7
  it('7. Theme switch does NOT reset active workspace state (tools, zoom, pan, symmetry)', () => {
    const store = useStudioStore.getState();
    act(() => {
      store.setActiveTool('bucket');
      store.setBrushSize(4);
      store.setZoom(800);
      store.setPan(120, -60);
      store.setPrimaryColor('#42b883');
      store.setSecondaryColor('#35495e');
      if (!store.tools.symmetryHorizontal) store.toggleSymmetryH();
      store.setActiveInspectorTab('palette');
    });

    // Switch to Cozy Classic
    act(() => {
      useThemeStore.getState().setStudioTheme('cozy-classic');
    });

    const midStore = useStudioStore.getState();
    expect(midStore.tools.activeTool).toBe('bucket');
    expect(midStore.tools.brushSize).toBe(4);
    expect(midStore.zoom).toBe(800);
    expect(midStore.panX).toBe(120);
    expect(midStore.panY).toBe(-60);
    expect(midStore.primaryColor).toBe('#42b883');
    expect(midStore.secondaryColor).toBe('#35495e');
    expect(midStore.tools.symmetryHorizontal).toBe(true);
    expect(midStore.activeInspectorTab).toBe('palette');

    // Switch back to Atelier
    act(() => {
      useThemeStore.getState().setStudioTheme('atelier');
    });

    const finalStore = useStudioStore.getState();
    expect(finalStore.tools.activeTool).toBe('bucket');
    expect(finalStore.tools.brushSize).toBe(4);
    expect(finalStore.zoom).toBe(800);
    expect(finalStore.panX).toBe(120);
    expect(finalStore.panY).toBe(-60);
    expect(finalStore.primaryColor).toBe('#42b883');
    expect(finalStore.secondaryColor).toBe('#35495e');
    expect(finalStore.tools.symmetryHorizontal).toBe(true);
    expect(finalStore.activeInspectorTab).toBe('palette');
  });

  // Requirement 8
  it('8. Appearance popover is keyboard accessible and closes on Escape', () => {
    render(<AppearancePopover />);
    const trigger = screen.getByTestId('appearance-button');
    expect(trigger).toBeDefined();

    // Open popover
    fireEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');

    const dialog = screen.getByRole('dialog', { name: /appearance settings/i });
    expect(dialog).toBeDefined();
    expect(dialog.getAttribute('aria-modal')).toBe('false');

    // Radiogroups exist
    const styleGroup = screen.getByRole('radiogroup', { name: /studio style/i });
    expect(styleGroup).toBeDefined();
    const schemeGroup = screen.getByRole('radiogroup', { name: /color scheme/i });
    expect(schemeGroup).toBeDefined();

    // Options exist and work with radio semantics
    const cozyOption = screen.getByTestId('theme-option-cozy-classic');
    expect(cozyOption.getAttribute('role')).toBe('radio');
    expect(cozyOption.getAttribute('aria-checked')).toBe('false');
    fireEvent.click(cozyOption);
    expect(useThemeStore.getState().studioTheme).toBe('cozy-classic');
    expect(cozyOption.getAttribute('aria-checked')).toBe('true');

    const atelierOption = screen.getByTestId('theme-option-atelier');
    expect(atelierOption.getAttribute('role')).toBe('radio');
    fireEvent.click(atelierOption);
    expect(useThemeStore.getState().studioTheme).toBe('atelier');
    expect(atelierOption.getAttribute('aria-checked')).toBe('true');

    // Color scheme options work with radio semantics
    const lightOption = screen.getByTestId('scheme-option-light');
    expect(lightOption.getAttribute('role')).toBe('radio');
    fireEvent.click(lightOption);
    expect(useThemeStore.getState().colorScheme).toBe('light');
    expect(lightOption.getAttribute('aria-checked')).toBe('true');
    expect(document.documentElement.style.colorScheme).toBe('light');

    const darkOption = screen.getByTestId('scheme-option-dark');
    expect(darkOption.getAttribute('role')).toBe('radio');
    fireEvent.click(darkOption);
    expect(useThemeStore.getState().colorScheme).toBe('dark');
    expect(darkOption.getAttribute('aria-checked')).toBe('true');
    expect(document.documentElement.style.colorScheme).toBe('dark');

    // Escape closes popover
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  // Requirement 9
  it('9. Both themes render without console errors or hydration warnings', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Render in Atelier
    act(() => {
      useThemeStore.getState().setStudioTheme('atelier');
    });
    const { unmount } = render(<AppearancePopover />);

    // Render in Cozy Classic
    act(() => {
      useThemeStore.getState().setStudioTheme('cozy-classic');
    });
    unmount();
    render(<AppearancePopover />);

    expect(errorSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();

    errorSpy.mockRestore();
    warnSpy.mockRestore();
  });

  // Requirement 10
  it('10. Current drawing workflows continue to execute under both themes', () => {
    const store = useStudioStore.getState();

    // Workflow in Atelier
    act(() => {
      useThemeStore.getState().setStudioTheme('atelier');
      store.setActiveTool('pen');
      store.setBrushSize(2);
      store.setPrimaryColor('#ff0000');
    });
    expect(useStudioStore.getState().tools.activeTool).toBe('pen');
    expect(useStudioStore.getState().tools.brushSize).toBe(2);

    // Workflow in Cozy Classic
    act(() => {
      useThemeStore.getState().setStudioTheme('cozy-classic');
      store.setActiveTool('eraser');
      store.setBrushSize(3);
      store.setSecondaryColor('#00ff00');
    });
    expect(useStudioStore.getState().tools.activeTool).toBe('eraser');
    expect(useStudioStore.getState().tools.brushSize).toBe(3);
    expect(useStudioStore.getState().secondaryColor).toBe('#00ff00');
  });
});
