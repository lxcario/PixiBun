import { afterEach, beforeEach, describe, it, expect } from 'vitest';
import { validateProjectFile } from '@/lib/project/schema';
import { PROJECT_FORMAT_ID, PROJECT_FORMAT_VERSION } from '@/types/project';
import { useStudioStore } from '@/stores/studioStore';
import type { PaletteCycleTrack } from '@/types/palette';
import { createBlankProjectFile } from '@/lib/storage/db';

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
  it('round-trips glints masked to authored alpha without discarding their blend or recipe', () => {
    const project = validProjectFixture();
    project.frames[0].layers[0].blendMode = 'source-atop';
    Object.assign(project.frames[0].layers[0], { tag: 'specular', effect: {
      id: 'glint-test', kind: 'specular', version: 1, sourceMode: 'composite-excluding-self',
      params: { glintStyle: 'crisp', lightAzimuth: 315 }, updatedAt: Date.now(),
    } });
    const validated = validateProjectFile(project);
    expect(validated.ok).toBe(true);
    if (!validated.ok) throw new Error(validated.error);
    expect(validated.value.frames[0].layers[0].blendMode).toBe('source-atop');
    expect(validated.value.frames[0].layers[0].effect?.params.glintStyle).toBe('crisp');
  });

  it('keeps retired generator layers and normal artwork readable in saved projects', () => {
    const base = validProjectFixture();
    const effects = [
      { id: 'legacy-optics', kind: 'volumetric-optics', tag: 'optical-output' },
      { id: 'legacy-pattern', kind: 'wfc', tag: 'wfc-synthesis' },
    ] as const;
    const project = {
      ...base,
      frames: [{ ...base.frames[0], layers: [
        ...effects.map(({ id, kind, tag }) => ({
          ...base.frames[0].layers[0], id, tag,
          effect: { id: `${id}-recipe`, kind, version: 1, sourceMode: 'composite-excluding-self', params: {}, updatedAt: 1_700_000_000_000 },
        })),
        { ...base.frames[0].layers[0], id: 'legacy-normal', tag: 'normal' },
        base.frames[0].layers[0],
      ] }],
    };
    const result = validateProjectFile(project);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.frames[0].layers.map((layer) => layer.tag)).toEqual([
        'optical-output', 'wfc-synthesis', 'normal', undefined,
      ]);
      expect(result.value.frames[0].layers.slice(0, 2).map((layer) => layer.effect?.kind)).toEqual([
        'volumetric-optics', 'wfc',
      ]);
    }
  });

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

  it('preserves valid palette cycles and rejects malformed cycles', () => {
    const fixture = validProjectFixture();
    const cycle = {
      id: 'glow', name: 'Glow', low: 0, high: 2, rate: 4,
      direction: 'ping-pong', blendShift: true, enabled: true,
    };
    const withCycle = {
      ...fixture,
      palettes: [{ ...fixture.palettes[0], cycleTracks: [cycle] }],
    };
    const valid = validateProjectFile(withCycle);
    expect(valid.ok).toBe(true);
    if (valid.ok) expect(valid.value.palettes[0].cycleTracks).toEqual([cycle]);

    const invalid = validateProjectFile({
      ...withCycle,
      palettes: [{ ...withCycle.palettes[0], cycleTracks: [{ ...cycle, high: 3 }] }],
    });
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) expect(invalid.error).toMatch(/cycle tracks/i);
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

describe('palette edits stay inside the saved project envelope', () => {
  const initialState = useStudioStore.getState();
  const colors = Array.from({ length: 8 }, (_, index) => `#${index.toString(16).padStart(6, '0')}`);
  const track: PaletteCycleTrack = {
    id: 'cycle', name: 'Cycle', low: 0, high: 3, rate: 4,
    direction: 'forward', blendShift: false, enabled: true,
  };

  beforeEach(() => {
    useStudioStore.setState({
      palettes: [{ id: 'palette', name: 'Test palette', colors: [...colors] }],
      currentPaletteId: 'palette',
      customRamps: [],
      editRevision: 0,
      isDirty: false,
    });
  });

  afterEach(() => useStudioStore.setState(initialState, true));

  it('rejects an imported track outside the palette and an inverted track update', () => {
    useStudioStore.getState().addPaletteCycleTrack('palette', { ...track, high: 15 });
    expect(useStudioStore.getState().palettes[0].cycleTracks).toBeUndefined();
    expect(useStudioStore.getState().editRevision).toBe(0);

    useStudioStore.getState().addPaletteCycleTrack('palette', track);
    expect(useStudioStore.getState().editRevision).toBe(1);
    useStudioStore.getState().updatePaletteCycleTrack('palette', track.id, { low: 4 });
    expect(useStudioStore.getState().palettes[0].cycleTracks?.[0].low).toBe(0);
    expect(useStudioStore.getState().editRevision).toBe(1);
  });

  it('rejects a sixty-fifth cycle track without dirtying the project', () => {
    useStudioStore.setState({
      palettes: [{ id: 'palette', name: 'Test palette', colors: [...colors],
        cycleTracks: Array.from({ length: 64 }, (_, index) => ({ ...track, id: `cycle-${index}` })) }],
    });
    useStudioStore.getState().addPaletteCycleTrack('palette', { ...track, id: 'overflow' });
    expect(useStudioStore.getState().palettes[0].cycleTracks).toHaveLength(64);
    expect(useStudioStore.getState().editRevision).toBe(0);
  });

  it('rejects oversized palette imports and the fifty-first palette', () => {
    const oversizedColors = Array.from({ length: 513 }, (_, index) => `#${index.toString(16).padStart(6, '0')}`);
    useStudioStore.getState().addExtractedPalette('Oversized', oversizedColors);
    expect(useStudioStore.getState().palettes).toHaveLength(1);

    useStudioStore.setState({
      palettes: Array.from({ length: 50 }, (_, index) => ({ id: `palette-${index}`, name: 'Palette', colors: [...colors] })),
    });
    useStudioStore.getState().addExtractedPalette('Extra', colors);
    expect(useStudioStore.getState().palettes).toHaveLength(50);
    expect(useStudioStore.getState().editRevision).toBe(0);
  });

  it('marks valid palette and track edits dirty while refusing color overflow', () => {
    useStudioStore.getState().addCustomColorToPalette('palette', '#ABCDEF');
    expect(useStudioStore.getState().editRevision).toBe(1);
    expect(useStudioStore.getState().isDirty).toBe(true);

    useStudioStore.getState().addPaletteCycleTrack('palette', track);
    useStudioStore.getState().updatePaletteCycleTrack('palette', track.id, { rate: 5 });
    useStudioStore.getState().deletePaletteCycleTrack('palette', track.id);
    expect(useStudioStore.getState().editRevision).toBe(4);

    useStudioStore.getState().setCustomRamps([{ baseColor: '#123456', shades: ['#123456'] }]);
    expect(useStudioStore.getState().editRevision).toBe(5);
    useStudioStore.getState().setCustomRamps([{ baseColor: '#123456', shades: Array(257).fill('#123456') }]);
    expect(useStudioStore.getState().customRamps).toHaveLength(1);
    expect(useStudioStore.getState().editRevision).toBe(5);

    const fullColors = Array.from({ length: 512 }, (_, index) => `#${index.toString(16).padStart(6, '0')}`);
    useStudioStore.setState({ palettes: [{ id: 'palette', name: 'Test palette', colors: fullColors }] });
    useStudioStore.getState().addCustomColorToPalette('palette', '#ABCDEF');
    expect(useStudioStore.getState().palettes[0].colors).toHaveLength(512);
    expect(useStudioStore.getState().editRevision).toBe(5);
  });
});

describe('editor metadata remains admissible after public actions', () => {
  const originalState = useStudioStore.getState();
  beforeEach(() => useStudioStore.getState().resetToNewProject());
  afterEach(() => useStudioStore.setState(originalState, true));

  it('rejects names that would make project or layer metadata unsaveable', () => {
    const initial = useStudioStore.getState();
    const layerId = initial.activeLayerId;
    const revision = initial.editRevision;
    initial.setProjectName('X'.repeat(257));
    initial.renameLayer(layerId, 'L'.repeat(129));
    expect(useStudioStore.getState().projectName).toBe('Untitled Sprite');
    expect(useStudioStore.getState().frames[0].layers[0].name).toBe('Base Layer');
    expect(useStudioStore.getState().editRevision).toBe(revision);

    initial.setProjectName('Valid name');
    initial.renameLayer(layerId, 'Valid layer');
    expect(useStudioStore.getState().editRevision).toBe(revision + 2);
  });

  it('rejects the 101st clip and invalid clip updates', () => {
    useStudioStore.setState({ clips: [] });
    for (let index = 0; index < 100; index++) {
      useStudioStore.getState().addClip(`Clip ${index}`, 0, 0);
    }
    const before = useStudioStore.getState();
    before.addClip('Overflow', 0, 0);
    expect(useStudioStore.getState().clips).toHaveLength(100);
    expect(useStudioStore.getState().editRevision).toBe(before.editRevision);

    const clipId = before.clips[0].id;
    before.updateClip(clipId, { name: 'X'.repeat(129) });
    before.updateClip(clipId, { endFrame: 2 });
    expect(useStudioStore.getState().clips[0].name).toBe('Clip 0');
    expect(useStudioStore.getState().clips[0].endFrame).toBe(0);
    expect(useStudioStore.getState().editRevision).toBe(before.editRevision);
  });

  it('remaps surviving clips and removes a clip when its only frame is deleted', () => {
    const state = useStudioStore.getState();
    state.addFrame();
    state.addFrame();
    state.addClip('Last only', 2, 2);
    state.addClip('Middle through last', 1, 2);
    const lastOnlyId = useStudioStore.getState().clips.find((clip) => clip.name === 'Last only')!.id;
    useStudioStore.getState().deleteFrame(2);

    const after = useStudioStore.getState();
    expect(after.clips.some((clip) => clip.id === lastOnlyId)).toBe(false);
    expect(after.clips.find((clip) => clip.name === 'Middle through last')).toMatchObject({
      startFrame: 1, endFrame: 1, fromFrame: 1, toFrame: 1,
    });
    expect(after.activeClipId).not.toBe(lastOnlyId);

    const candidate = createBlankProjectFile();
    candidate.frames = after.frames.map((frame) => ({
      id: frame.id, durationMs: frame.durationMs,
      layers: frame.layers.map((layer) => ({ ...layer })),
    }));
    candidate.clips = after.clips.map((clip) => ({ ...clip }));
    expect(validateProjectFile(candidate).ok).toBe(true);
  });
});

