// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useStudioStore } from '@/stores/studioStore';
import { useWorkspaceStore, WORKSPACE_PRESETS } from '@/stores/workspaceStore';
import { executeStudioCommand, studioCommandForKey } from '@/config/studioCommands';
import { CommandPaletteModal } from '@/components/modals/CommandPaletteModal';

afterEach(cleanup);
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); document.body.innerHTML = '';
  useWorkspaceStore.setState({ activeLayout: 'drawing', layout: { ...WORKSPACE_PRESETS.drawing }, savedLayouts: [], pixiToolsDomain: undefined });
  useStudioStore.setState({ activeInspectorTab: 'tools', zoom: 1600, panX: 24, panY: 24, canvasWidth: 32, canvasHeight: 32, canUndo: false, canRedo: false });
});
const key = (key: string, code: string, patch = {}) => ({ key, code, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, ...patch });

describe('Shared command gestures and current-state actions', () => {
  it('distinguishes onion skin from Ellipse and physical shifted tool keys', () => {
    expect(studioCommandForKey(key('F3', 'F3'))?.id).toBe('anim-onion-skin');
    expect(studioCommandForKey(key('o', 'KeyO'))?.id).toBe('tool-ellipse');
    expect(studioCommandForKey(key('Ğ', 'KeyG', { shiftKey: true }))?.id).toBe('tool-gradient');
    expect(studioCommandForKey(key('r', 'KeyR', { shiftKey: true }))?.id).toBe('tool-erase-color');
    expect(studioCommandForKey(key('k', 'KeyK', { ctrlKey: true }))).toBeUndefined();
    expect(studioCommandForKey(key('F3', 'F3', { altKey: true }))).toBeUndefined();
  });
  it('supports Ctrl and Cmd grid gestures including a non-US Quote position', () => {
    for (const modifiers of [{ ctrlKey: true }, { metaKey: true }]) {
      expect(studioCommandForKey(key('ı', 'Quote', modifiers))?.id).toBe('view-grid');
      expect(studioCommandForKey(key("'", '', modifiers))?.id).toBe('view-grid');
      expect(studioCommandForKey(key("'", 'Quote', { ...modifiers, shiftKey: true }))).toBeUndefined();
    }
    const before = useStudioStore.getState().showGrid;
    executeStudioCommand('view-grid'); expect(useStudioStore.getState().showGrid).toBe(!before);
  });
  it('fits large artwork below 100 percent using the actual drawing region', () => {
    const viewport = document.createElement('div'); viewport.id = 'main-content'; document.body.append(viewport);
    Object.defineProperties(viewport, { clientWidth: { value: 848 }, clientHeight: { value: 448 } });
    useStudioStore.setState({ canvasWidth: 1024, canvasHeight: 1024 });
    executeStudioCommand('view-fit-screen');
    expect(useStudioStore.getState()).toMatchObject({ zoom: 39, panX: 0, panY: 0 });
    executeStudioCommand('view-zoom-100'); expect(useStudioStore.getState()).toMatchObject({ zoom: 100, panX: 0, panY: 0 });
  });
  it('reads the latest onion state for repeated command execution', () => {
    const command = studioCommandForKey(key('F3', 'F3'))!;
    useStudioStore.getState().setOnionSkin({ enabled: false });
    command.action(); expect(useStudioStore.getState().onionSkin.enabled).toBe(true);
    command.action(); expect(useStudioStore.getState().onionSkin.enabled).toBe(false);
  });
});

describe('Task-aware workspace preferences', () => {
  it('opens Lighting and restores it when session preferences were lost', () => {
    const before = useStudioStore.getState();
    useWorkspaceStore.getState().chooseLayout('lighting');
    expect(useStudioStore.getState().activeInspectorTab).toBe('ai');
    expect(sessionStorage.getItem('pixibun:pixitools:last-domain')).toBe('lighting');
    useStudioStore.getState().setActiveInspectorTab('tools'); sessionStorage.clear();
    useWorkspaceStore.getState().hydrate();
    expect(useStudioStore.getState().activeInspectorTab).toBe('ai');
    expect(sessionStorage.getItem('pixibun:pixitools:last-domain')).toBe('lighting');
    expect(useStudioStore.getState().frames).toBe(before.frames);
    expect(useStudioStore.getState().editRevision).toBe(before.editRevision);
  });
  it('saves the selected task with a custom layout and restores it after another preset', () => {
    useWorkspaceStore.getState().chooseLayout('lighting');
    useStudioStore.getState().setActiveInspectorTab('palette');
    useWorkspaceStore.getState().saveLayout('Color desk');
    const id = useWorkspaceStore.getState().activeLayout;
    useWorkspaceStore.getState().chooseLayout('animation'); expect(useStudioStore.getState().activeInspectorTab).toBe('layers');
    useWorkspaceStore.getState().chooseLayout(id); expect(useStudioStore.getState().activeInspectorTab).toBe('palette');
  });
  it('migrates a legacy Lighting preference and rejects unrecognized tasks and domains', () => {
    localStorage.setItem('pixibun:artist-workspace:v1', JSON.stringify({ layout: WORKSPACE_PRESETS.lighting, activeLayout: 'lighting', inspectorTab: 'unknown', pixiToolsDomain: '<invalid>' }));
    useWorkspaceStore.getState().hydrate();
    expect(useStudioStore.getState().activeInspectorTab).toBe('ai');
    expect(sessionStorage.getItem('pixibun:pixitools:last-domain')).toBe('lighting');
  });
});

describe('Workspace task edge cases', () => {
  it('keeps the requested Lighting task available when session writes are denied', () => {
    const spy = vi.spyOn(sessionStorage, 'setItem').mockImplementation(() => { throw Error('denied'); });
    try {
      useWorkspaceStore.getState().chooseLayout('lighting');
      expect(useWorkspaceStore.getState().pixiToolsDomain).toBe('lighting');
      expect(useStudioStore.getState().activeInspectorTab).toBe('ai');
    } finally { spy.mockRestore(); }
  });
  it('restores Drawing controls when the active named layout is deleted', () => {
    useWorkspaceStore.getState().chooseLayout('lighting'); useWorkspaceStore.getState().saveLayout('Lamp desk');
    useWorkspaceStore.getState().deleteLayout(useWorkspaceStore.getState().activeLayout);
    expect(useWorkspaceStore.getState().activeLayout).toBe('drawing');
    expect(useStudioStore.getState().activeInspectorTab).toBe('tools');
  });
});

describe('Command palette search ownership', () => {
  it('contains empty-result navigation and supports searching again', () => {
    const onClose = vi.fn(); render(<CommandPaletteModal isOpen onClose={onClose} />);
    const input = screen.getByRole('combobox');
    expect(document.activeElement).toBe(input);
    fireEvent.change(input, { target: { value: 'no such command' } });
    for (const key of ['ArrowUp', 'ArrowDown', 'Enter']) fireEvent.keyDown(input, { key });
    expect(onClose).not.toHaveBeenCalled(); expect(input.hasAttribute('aria-activedescendant')).toBe(false);
    fireEvent.change(input, { target: { value: 'Ellipse' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onClose).toHaveBeenCalledOnce(); expect(useStudioStore.getState().tools.activeTool).toBe('ellipse');
  });
  it('explains unavailable history commands without closing or calling them', () => {
    const undo = vi.fn(), onClose = vi.fn(); render(<CommandPaletteModal isOpen onClose={onClose} onUndo={undo} />);
    const input = screen.getByRole('combobox'); fireEvent.change(input, { target: { value: 'Undo' } });
    expect(screen.getByRole('option').getAttribute('aria-disabled')).toBe('true');
    expect(screen.getByRole('option').getAttribute('title')).toBe('No action to undo');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(undo).not.toHaveBeenCalled(); expect(onClose).not.toHaveBeenCalled();
  });
  it('does not execute during IME composition', () => {
    const onClose = vi.fn(); render(<CommandPaletteModal isOpen onClose={onClose} />);
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter', isComposing: true });
    expect(onClose).not.toHaveBeenCalled();
  });
});
