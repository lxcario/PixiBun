import { describe, it, expect } from 'vitest';
import { validateProjectFile } from '@/lib/project/schema';
import { PROJECT_FORMAT_ID, PROJECT_FORMAT_VERSION } from '@/types/project';

function validProjectFixture() {
  return {
    format: PROJECT_FORMAT_ID,
    version: PROJECT_FORMAT_VERSION,
    name: 'Walk Cycle',
    width: 32,
    height: 32,
    fps: 12,
    loopMode: 'repeat',
    onionSkin: {
      enabled: false,
      prevFrames: 1,
      nextFrames: 1,
      prevColor: '#C792DF',
      nextColor: '#DCABDF',
      opacity: 0.45,
    },
    palettes: [
      { id: 'pal-1', name: 'Cozy', colors: ['#3A2E4C', '#C792DF', '#DDDFDF'] },
    ],
    currentPaletteId: 'pal-1',
    customRamps: [],
    clips: [],
    frames: [
      {
        id: 'frame-a',
        durationMs: 100,
        layers: [
          {
            id: 'layer-a',
            name: 'Base',
            visible: true,
            locked: false,
            opacity: 1,
            blendMode: 'source-over',
          },
        ],
      },
    ],
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_000_000,
  };
}

describe('validateProjectFile', () => {
  it('accepts a well-formed project and echoes normalized data', () => {
    const result = validateProjectFile(validProjectFixture());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.frames).toHaveLength(1);
      expect(result.value.frames[0].layers[0].id).toBe('layer-a');
    }
  });

  it('rejects non-objects and wrong formats with readable errors', () => {
    expect(validateProjectFile(null).ok).toBe(false);
    expect(validateProjectFile('nope').ok).toBe(false);
    const wrongFormat = validateProjectFile({ ...validProjectFixture(), format: 'other-app' });
    expect(wrongFormat.ok).toBe(false);
    if (!wrongFormat.ok) expect(wrongFormat.error).toMatch(/not saved by PixiBun/i);
  });

  it('rejects files from newer format versions with an actionable update message', () => {
    const future = validateProjectFile({ ...validProjectFixture(), version: PROJECT_FORMAT_VERSION + 1 });
    expect(future.ok).toBe(false);
    if (!future.ok) {
      expect(future.error).toMatch(/Please update PixiBun/i);
      expect(future.error).toContain(`format v${PROJECT_FORMAT_VERSION + 1}`);
    }
  });

  it('rejects projects without frames', () => {
    const empty = { ...validProjectFixture(), frames: [] };
    const result = validateProjectFile(empty);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/no animation frames/i);
  });

  it('calls out the exact frame when a layer uses an unknown blend mode', () => {
    const fixture = validProjectFixture();
    fixture.frames[0].layers[0].blendMode = 'difference';
    const result = validateProjectFile(fixture);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('Frame 1');
  });

  it('rejects palettes holding non-hex colors', () => {
    const fixture = validProjectFixture();
    fixture.palettes[0].colors.push('purple');
    const result = validateProjectFile(fixture);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/palette/i);
  });

  it('seamlessly migrates legacy v1 files missing customRamps, clips, onionSkin, and layer blendModes', () => {
    const legacyV1 = {
      format: PROJECT_FORMAT_ID,
      version: 1,
      name: 'Legacy V1 Canvas',
      width: 16,
      height: 16,
      fps: 8,
      palettes: [
        { id: 'pal-1', name: 'Retro', colors: ['#3A2E4C', '#F0BE7C'] },
      ],
      currentPaletteId: 'pal-1',
      frames: [
        {
          id: 'frame-1',
          durationMs: 100,
          layers: [
            {
              id: 'layer-1',
              name: 'Layer 1',
              // missing opacity, locked, visible, blendMode
            },
          ],
        },
      ],
      createdAt: 1_680_000_000_000,
      updatedAt: 1_680_000_000_000,
    };

    const result = validateProjectFile(legacyV1);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.version).toBe(PROJECT_FORMAT_VERSION);
      expect(result.value.customRamps).toEqual([]);
      expect(result.value.clips).toEqual([]);
      expect(result.value.onionSkin.enabled).toBe(false);
      expect(result.value.frames[0].layers[0].blendMode).toBe('source-over');
      expect(result.value.frames[0].layers[0].opacity).toBe(1.0);
      expect(result.value.frames[0].layers[0].visible).toBe(true);
      expect(result.value.frames[0].layers[0].locked).toBe(false);
    }
  });

  it('gracefully treats unversioned (version: undefined) files as legacy and migrates them to v2', () => {
    const unversioned = {
      format: PROJECT_FORMAT_ID,
      // version intentionally omitted
      name: 'Unversioned Canvas',
      width: 16,
      height: 16,
      fps: 10,
      palettes: [
        { id: 'pal-1', name: 'Alabaster', colors: ['#3A2E4C', '#EDE8F4'] },
      ],
      currentPaletteId: 'pal-1',
      frames: [
        {
          id: 'f1',
          durationMs: 100,
          layers: [{ id: 'l1', name: 'Layer 1' }],
        },
      ],
      createdAt: 1_670_000_000_000,
      updatedAt: 1_670_000_000_000,
    };

    const result = validateProjectFile(unversioned);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.version).toBe(PROJECT_FORMAT_VERSION);
      expect(result.value.frames[0].layers[0].blendMode).toBe('source-over');
    }
  });

  it('restores loopMode, onionSkin, and customRamps during store hydration', async () => {
    const { useStudioStore } = await import('@/stores/studioStore');
    const store = useStudioStore.getState();

    store.loadProjectState({
      name: 'Hydration Test',
      width: 48,
      height: 48,
      loopMode: 'ping-pong',
      onionSkin: {
        enabled: true,
        prevFrames: 2,
        nextFrames: 2,
        prevColor: '#ff0000',
        nextColor: '#00ff00',
        opacity: 0.8,
      },
      customRamps: [
        { baseColor: '#ff0055', shades: ['#330011', '#ff0055', '#ff99bb'] },
      ],
    }, 'proj-hydration-test');

    const updated = useStudioStore.getState();
    expect(updated.currentProjectId).toBe('proj-hydration-test');
    expect(updated.loopMode).toBe('ping-pong');
    expect(updated.onionSkin.enabled).toBe(true);
    expect(updated.onionSkin.prevFrames).toBe(2);
    expect(updated.onionSkin.prevColor).toBe('#ff0000');
    expect(updated.customRamps).toHaveLength(1);
    expect(updated.customRamps[0].baseColor).toBe('#ff0055');
  });
});

