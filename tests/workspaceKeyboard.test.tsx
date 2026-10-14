// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useStudioKeyboard, type UseStudioKeyboardOptions } from '@/hooks/studio/useStudioKeyboard';
import { useStudioStore } from '@/stores/studioStore';
import { CANONICAL_TOOLS } from '@/config/shortcuts';
import { useStudioClipboard } from '@/hooks/studio/useStudioClipboard';
import { readImportFile } from '@/lib/project/importFile';
import { usePreferencesStore } from '@/stores/preferencesStore';
import { isSpaceHeld } from '@/lib/input/keymap';

vi.mock('@/lib/project/importFile', () => ({ readImportFile: vi.fn(), reportImportError: vi.fn() }));

const options = (): UseStudioKeyboardOptions => ({
  autosaveTimerRef: { current: null }, runAutosave: vi.fn(async () => true), triggerSaveToast: vi.fn(),
  handleSaveDesktopProject: vi.fn(async () => {}), setIsShortcutsOpen: vi.fn(),
  setIsCommandPaletteOpen: vi.fn(), handleUndo: vi.fn(), handleRedo: vi.fn(),
});
function key(init: KeyboardEventInit, target: EventTarget = window) {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
  act(() => { target.dispatchEvent(event); });
  return event;
}
beforeEach(() => {
  const state = useStudioStore.getState();
  state.resetToNewProject(); state.setActiveTool('pen'); state.setCvdLens('none'); state.setIsPlaying(false);
  usePreferencesStore.setState({ keymap: 'standard' });
  vi.clearAllMocks();
});
afterEach(() => { cleanup(); document.body.replaceChildren(); vi.restoreAllMocks(); });

describe('Workspace keyboard ownership', () => {
  it('leaves Undo owned by an open dialog even when the key target is a button', () => {
    const callbacks = options(); renderHook(() => useStudioKeyboard(callbacks));
    const dialog = document.createElement('dialog'); dialog.setAttribute('open', '');
    const button = document.createElement('button'); dialog.append(button); document.body.append(dialog); button.focus();
    const event = key({ key: 'z', code: 'KeyZ', ctrlKey: true }, button);
    expect(callbacks.handleUndo).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it('does not switch tools while typing inside a nested editable element', () => {
    renderHook(() => useStudioKeyboard(options()));
    const editor = document.createElement('div'); editor.setAttribute('contenteditable', 'true');
    const child = document.createElement('span'); editor.append(child); document.body.append(editor); editor.focus();
    key({ key: 'e', code: 'KeyE' }, child);
    expect(useStudioStore.getState().tools.activeTool).toBe('pen');
  });

  it('selects Eyedropper at the physical I position with a Turkish dotless letter', () => {
    renderHook(() => useStudioKeyboard(options()));
    key({ key: 'ı', code: 'KeyI' });
    expect(useStudioStore.getState().tools.activeTool).toBe('eyedropper');
  });

  it.each(CANONICAL_TOOLS)('selects $id using its physical letter with a non-Latin produced character', tool => {
    renderHook(() => useStudioKeyboard(options()));
    const letter = tool.shortcut.replace(/^Shift\s*\+\s*/i, '');
    key({ key: 'ж', code: `Key${letter}`, shiftKey: tool.shortcut.startsWith('Shift') });
    expect(useStudioStore.getState().tools.activeTool).toBe(tool.id);
  });

  it('uses physical codes over conflicting Latin characters and retains key-only fallback', () => {
    renderHook(() => useStudioKeyboard(options()));
    key({ key: 'b', code: 'KeyE' }); expect(useStudioStore.getState().tools.activeTool).toBe('eraser');
    key({ key: 'i' }); expect(useStudioStore.getState().tools.activeTool).toBe('eyedropper');
  });

  it.each(['input', 'textarea', 'select', '[role="textbox"]', '[role="searchbox"]', '[role="slider"]'])('leaves typing owned by %s', selector => {
    renderHook(() => useStudioKeyboard(options()));
    const element = document.createElement(selector.startsWith('[') ? 'div' : selector);
    const role = /role="(.+)"/.exec(selector)?.[1]; if (role) element.setAttribute('role', role);
    element.tabIndex = 0; document.body.append(element); element.focus();
    key({ key: 'e', code: 'KeyE' });
    expect(useStudioStore.getState().tools.activeTool).toBe('pen');
  });

  it('recognizes an editable ancestor through a composed shadow event', () => {
    renderHook(() => useStudioKeyboard(options()));
    const host = document.createElement('div'); host.setAttribute('contenteditable', 'plaintext-only');
    const shadow = host.attachShadow({ mode: 'open' }); const child = document.createElement('span'); shadow.append(child); document.body.append(host);
    key({ key: 'e', code: 'KeyE', composed: true }, child);
    expect(useStudioStore.getState().tools.activeTool).toBe('pen');
  });

  it.each(['dialog', 'alertdialog'])('pauses commands for an ARIA %s, then resumes after it closes', role => {
    const callbacks = options(); renderHook(() => useStudioKeyboard(callbacks));
    const dialog = document.createElement('div'); dialog.setAttribute('role', role); dialog.setAttribute('aria-modal', 'true'); document.body.append(dialog);
    key({ key: 'ы', code: 'KeyS', ctrlKey: true }); key({ key: 'z', code: 'KeyZ', ctrlKey: true });
    expect(callbacks.runAutosave).not.toHaveBeenCalled(); expect(callbacks.handleUndo).not.toHaveBeenCalled();
    dialog.remove(); key({ key: 'я', code: 'KeyZ', ctrlKey: true });
    expect(callbacks.handleUndo).toHaveBeenCalledTimes(1);
  });

  it.each(['isComposing', 'keyCode229', 'AltGraph', 'defaultPrevented', 'Dead', 'Process'])('leaves %s input to its owner', reason => {
    const callbacks = options(); renderHook(() => useStudioKeyboard(callbacks));
    const event = new KeyboardEvent('keydown', { key: ['Dead', 'Process'].includes(reason) ? reason : 'e', code: 'KeyE', isComposing: reason === 'isComposing', cancelable: true });
    if (reason === 'keyCode229') Object.defineProperty(event, 'keyCode', { value: 229 });
    if (reason === 'AltGraph') vi.spyOn(event, 'getModifierState').mockImplementation(name => name === 'AltGraph');
    if (reason === 'defaultPrevented') event.preventDefault();
    act(() => { window.dispatchEvent(event); });
    expect(useStudioStore.getState().tools.activeTool).toBe('pen');
    expect(callbacks.handleUndo).not.toHaveBeenCalled();
  });

  it.each([{ ctrlKey: true }, { metaKey: true }, { altKey: true }, { ctrlKey: true, altKey: true }])('does not run bare tool commands with modifiers %j', modifiers => {
    renderHook(() => useStudioKeyboard(options()));
    key({ key: 'e', code: 'KeyE', ...modifiers }); key({ key: 'p', code: 'KeyP', ...modifiers });
    expect(useStudioStore.getState().tools.activeTool).toBe('pen'); expect(useStudioStore.getState().cvdLens).toBe('none');
  });

  it('runs physical Undo/Redo and Save As while preserving the storage-first save order', async () => {
    const callbacks = options(); const order: string[] = [];
    callbacks.runAutosave = vi.fn(async () => { order.push('storage'); return true; });
    callbacks.handleSaveDesktopProject = vi.fn(async () => { order.push('file'); });
    renderHook(() => useStudioKeyboard(callbacks));
    key({ key: 'я', code: 'KeyZ', ctrlKey: true }); key({ key: 'я', code: 'KeyZ', metaKey: true, shiftKey: true });
    key({ key: 'н', code: 'KeyY', ctrlKey: true });
    expect(callbacks.handleUndo).toHaveBeenCalledTimes(1); expect(callbacks.handleRedo).toHaveBeenCalledTimes(2);
    await act(async () => { key({ key: 'ы', code: 'KeyS', ctrlKey: true, shiftKey: true }); });
    expect(callbacks.handleSaveDesktopProject).toHaveBeenCalledWith(true);
    expect(callbacks.triggerSaveToast).toHaveBeenCalledTimes(1); expect(order).toEqual(['storage', 'file']);
  });

  it('preserves character-based help and punctuation, and native Space activation on controls', () => {
    const callbacks = options(); renderHook(() => useStudioKeyboard(callbacks));
    key({ key: '?', code: 'Slash', shiftKey: true }); expect(callbacks.setIsShortcutsOpen).toHaveBeenCalledTimes(1);
    const button = document.createElement('button'); document.body.append(button); button.focus();
    expect(key({ key: ' ', code: 'Space' }, button).defaultPrevented).toBe(false);
    expect(useStudioStore.getState().isPlaying).toBe(false);
    button.blur();
    usePreferencesStore.setState({ keymap: 'classic' });
    key({ key: ' ', code: 'Space' }); expect(useStudioStore.getState().isPlaying).toBe(true);
    const size = useStudioStore.getState().tools.brushSize;
    key({ key: ']', code: 'BracketRight' }); expect(useStudioStore.getState().tools.brushSize).toBe(size + 1);
  });

  it('standard keymap: Space is held for panning, Enter plays unless a selection is active', () => {
    renderHook(() => useStudioKeyboard(options()));
    key({ key: ' ', code: 'Space' });
    expect(isSpaceHeld()).toBe(true);
    expect(useStudioStore.getState().isPlaying).toBe(false);
    act(() => { window.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', code: 'Space' })); });
    expect(isSpaceHeld()).toBe(false);
    key({ key: 'Enter', code: 'Enter' }); expect(useStudioStore.getState().isPlaying).toBe(true);
    key({ key: 'Enter', code: 'Enter' }); expect(useStudioStore.getState().isPlaying).toBe(false);
    useStudioStore.setState({ selection: { x: 0, y: 0, w: 2, h: 2 } });
    key({ key: 'Enter', code: 'Enter' }); expect(useStudioStore.getState().isPlaying).toBe(false);
  });
});

describe('Workspace image paste ownership', () => {
  function paste(target: EventTarget = window, handled = false) {
    const file = new File(['image'], 'paste.png', { type: 'image/png' });
    const event = new Event('paste', { bubbles: true, cancelable: true, composed: true });
    Object.defineProperty(event, 'clipboardData', { value: { items: [{ type: 'image/png', getAsFile: () => file }] } });
    if (handled) event.preventDefault();
    act(() => { target.dispatchEvent(event); });
    return { event, file };
  }

  it.each(['dialog', 'editor', 'handled'])('does not decode or import an image owned by %s', owner => {
    const open = vi.fn(); renderHook(() => useStudioClipboard(open));
    const element = document.createElement(owner === 'dialog' ? 'dialog' : 'div');
    if (owner === 'dialog') element.setAttribute('open', '');
    if (owner === 'editor') element.setAttribute('contenteditable', 'true');
    document.body.append(element);
    paste(element, owner === 'handled');
    expect(readImportFile).not.toHaveBeenCalled(); expect(open).not.toHaveBeenCalled();
  });

  it('still admits an image paste in the workspace', async () => {
    const payload = { type: 'image' as const, filename: 'paste.png', dataUrl: 'data:image/png;base64,AA==', imgWidth: 1, imgHeight: 1 };
    vi.mocked(readImportFile).mockResolvedValue(payload);
    const open = vi.fn(); renderHook(() => useStudioClipboard(open));
    const { event, file } = paste();
    await act(async () => {});
    expect(event.defaultPrevented).toBe(true); expect(readImportFile).toHaveBeenCalledWith(file); expect(open).toHaveBeenCalledWith(payload);
  });
});
