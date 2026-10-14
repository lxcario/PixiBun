import { describe, expect, it } from 'vitest';
import { parseKeymap, playbackKey, pointerIntent, rightClickOpensToolsPopup, strokeUsesSecondary } from '@/lib/input/keymap';
import { shortcutsForKeymap } from '@/config/shortcuts';
import { parsePreferences } from '@/stores/preferencesStore';

// Audit v1.14.1: adopt the common pixel-art keymap and keep the original keys as "PixiBun classic".

const press = (button: number, mods: { alt?: boolean; shift?: boolean } = {}) =>
  ({ button, altKey: !!mods.alt, shiftKey: !!mods.shift });

describe('standard keymap', () => {
  it('pans with held Space or the middle button', () => {
    expect(pointerIntent('standard', press(0), 'pen', true).kind).toBe('pan');
    expect(pointerIntent('standard', press(1), 'select-box', false).kind).toBe('pan');
    expect(pointerIntent('standard', press(0, { alt: true }), 'pen', false).kind).not.toBe('pan');
  });

  it('picks colors with Alt, right button into the secondary slot', () => {
    expect(pointerIntent('standard', press(0, { alt: true }), 'pen', false)).toEqual({ kind: 'sample', secondary: false, lineFromLast: false });
    expect(pointerIntent('standard', press(2, { alt: true }), 'bucket', false)).toEqual({ kind: 'sample', secondary: true, lineFromLast: false });
    expect(pointerIntent('standard', press(2), 'eyedropper', false)).toEqual({ kind: 'sample', secondary: true, lineFromLast: false });
  });

  it('keeps Alt as selection subtraction for selection tools', () => {
    expect(pointerIntent('standard', press(0, { alt: true }), 'select-box', false).kind).toBe('draw');
  });

  it('draws a line from the last pixel on Shift-click with the brush tools', () => {
    for (const tool of ['pen', 'eraser', 'dither']) {
      expect(pointerIntent('standard', press(0, { shift: true }), tool, false)).toEqual({ kind: 'draw', secondary: false, lineFromLast: true });
    }
    expect(pointerIntent('standard', press(0, { shift: true }), 'bucket', false).lineFromLast).toBe(false);
  });

  it('paints the secondary color with the right button, and Shift no longer switches color', () => {
    for (const tool of ['pen', 'eraser', 'dither', 'bucket', 'line', 'isometric-line', 'rectangle', 'ellipse', 'curve']) {
      expect(pointerIntent('standard', press(2), tool, false)).toEqual({ kind: 'draw', secondary: true, lineFromLast: false });
    }
    for (const tool of ['select-box', 'gradient', 'normal-chisel', 'color-replace']) {
      expect(pointerIntent('standard', press(2), tool, false).kind).toBe('ignore');
    }
    expect(strokeUsesSecondary('standard', false, { shiftKey: true }, 'pen')).toBe(false);
    expect(strokeUsesSecondary('standard', true, { shiftKey: false }, 'pen')).toBe(true);
  });

  it('plays with Enter and keeps right-click on the artwork for painting', () => {
    expect(playbackKey('standard')).toBe('Enter');
    expect(rightClickOpensToolsPopup('standard', true)).toBe(false);
    expect(rightClickOpensToolsPopup('standard', false)).toBe(true);
  });
});

describe('PixiBun classic keymap', () => {
  it('keeps Alt-drag pan, Shift secondary color, right-click popup and Space playback', () => {
    expect(pointerIntent('classic', press(0, { alt: true }), 'pen', false).kind).toBe('pan');
    expect(pointerIntent('classic', press(0, { alt: true }), 'select-lasso', false).kind).toBe('draw');
    expect(pointerIntent('classic', press(1), 'pen', false).kind).toBe('pan');
    expect(pointerIntent('classic', press(0), 'pen', true).kind).toBe('draw');
    expect(pointerIntent('classic', press(2), 'pen', false).kind).toBe('ignore');
    expect(pointerIntent('classic', press(0, { shift: true }), 'pen', false)).toEqual({ kind: 'draw', secondary: true, lineFromLast: false });
    expect(strokeUsesSecondary('classic', false, { shiftKey: true }, 'pen')).toBe(true);
    expect(strokeUsesSecondary('classic', false, { shiftKey: false }, 'pen')).toBe(false);
    expect(playbackKey('classic')).toBe(' ');
    expect(rightClickOpensToolsPopup('classic', true)).toBe(true);
  });
});

describe('keymap preference and shortcut list', () => {
  it('defaults to standard and keeps a saved classic choice', () => {
    expect(parseKeymap(undefined)).toBe('standard');
    expect(parseKeymap('nonsense')).toBe('standard');
    expect(parsePreferences(null).keymap).toBe('standard');
    expect(parsePreferences(JSON.stringify({ keymap: 'classic' })).keymap).toBe('classic');
  });

  it('lists the keys for the chosen keymap only', () => {
    const play = (keymap: 'standard' | 'classic') =>
      shortcutsForKeymap(keymap).filter(entry => entry.description === 'Play / Pause Animation').map(entry => entry.key);
    expect(play('standard')).toEqual(['Enter']);
    expect(play('classic')).toEqual(['Space']);
    const pan = (keymap: 'standard' | 'classic') =>
      shortcutsForKeymap(keymap).filter(entry => entry.description === 'Pan Canvas Viewport').map(entry => entry.key);
    expect(pan('standard')).toEqual(['Space / Middle + Drag']);
    expect(pan('classic')).toEqual(['Middle / Alt + Drag']);
  });
});
