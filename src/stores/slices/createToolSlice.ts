import { ToolSlice, StudioSliceCreator } from './types';
import { ColorPalette } from '@/types/palette';
import { createId } from '@/lib/engine/id';
import { generateOklchRamp } from '@/lib/color/rampGenerator';
import {
  MAX_PALETTE_COLORS,
  MAX_PALETTE_CYCLE_TRACKS,
  MAX_PROJECT_PALETTES,
  customRampsError,
  paletteCycleTrackError,
  paletteEntryError,
} from '@/lib/color/paletteAdmission';
import { studioEvents } from '@/lib/events/studioEvents';
import { estimatePaletteBytes, parsePaletteSemantics } from '@/lib/color/paletteSemantics';
import { pushStructuralHistoryStep } from '@/lib/engine/structuralHistory';
import { COZY_PALETTES } from '@/config/cozyPalettes';

// A picker drag sets the color on every pointer move. Remember only the color
// the artist settles on, so one drag adds one recent color, not eight shades of it.
const RECENT_COLOR_SETTLE_MS = 450;
let pendingRecentColor: ReturnType<typeof setTimeout> | null = null;

function rememberWhenSettled(color: string, remember: (color: string) => void): void {
  if (pendingRecentColor !== null) clearTimeout(pendingRecentColor);
  pendingRecentColor = setTimeout(() => {
    pendingRecentColor = null;
    remember(color);
  }, RECENT_COLOR_SETTLE_MS);
}

function rejectPaletteEdit(message: string): void {
  studioEvents.emit('pixibun:toast', { type: 'error', message });
}

// Built-in Curated Palettes
export const PRESET_PALETTES: ColorPalette[] = [
  {
    id: 'alabaster-wisteria-8',
    name: 'Alabaster & Wisteria (Active Theme)',
    colors: [
      '#DDDFDF', '#D0C4DF', '#DCABDF',
      '#C792DF', '#A86EC6', '#6A5880', '#3A2E4C'
    ],
    cycleTracks: [
      {
        id: 'wisteria-pulse',
        name: 'Wisteria Shimmer',
        low: 2,
        high: 6,
        rate: 4,
        direction: 'ping-pong',
        blendShift: true,
        enabled: true,
      },
    ],
  },
  {
    id: 'cozy-hearth-16',
    name: 'Cozy Hearth 16',
    colors: [
      '#161210', '#2c241e', '#3e332a', '#57473a',
      '#782216', '#ab3324', '#de4b39', '#f27463',
      '#9c6307', '#c98314', '#f5a623', '#f8be66',
      '#3b672c', '#6eb257', '#8cd075', '#f7efe6'
    ],
    cycleTracks: [
      {
        id: 'hearth-fire',
        name: 'Ember Cascade',
        low: 4,
        high: 7,
        rate: 8,
        direction: 'forward',
        blendShift: true,
        enabled: true,
      },
      {
        id: 'gold-glow',
        name: 'Gold Glow',
        low: 8,
        high: 11,
        rate: 5,
        direction: 'ping-pong',
        blendShift: true,
        enabled: false,
      },
    ],
  },
  {
    id: 'pico-8',
    name: 'Pico-8',
    colors: [
      '#000000', '#1D2B53', '#7E2553', '#008751',
      '#AB5236', '#5F574F', '#C2C3C7', '#FFF1E8',
      '#FF004D', '#FFA300', '#FFEC27', '#00E436',
      '#29ADFF', '#83769C', '#FF77A8', '#FFCCAA'
    ]
  },
  {
    id: 'endesga-32',
    name: 'Endesga 32 (EDG32)',
    colors: [
      '#be4a2f', '#d77643', '#ead4aa', '#e4a672', '#b86f56', '#733e39', '#3e2731', '#261726',
      '#a22633', '#e43b44', '#f77622', '#feae34', '#fee761', '#63c74d', '#3e8948', '#265c42',
      '#193c3e', '#124e89', '#0099db', '#2ce8f5', '#ffffff', '#c0cbdc', '#8b9bb4', '#5a6988',
      '#3a4466', '#262b44', '#181425', '#ff0044', '#68386c', '#b55088', '#f6757a', '#e8b796'
    ]
  },
  ...COZY_PALETTES,
];

export const createToolSlice: StudioSliceCreator<ToolSlice> = (set, get) => ({
  tools: {
    activeTool: 'pen',
    brushSize: 1,
    pixelPerfect: true,
    ditherMatrix: '2x2',
    ditherDensity: 0.5,
    bucketContiguous: true,
    bucketTolerance: 0,
    fillTolerance: 0,
    fillEnclosedSpecks: false,
    eraseColorTolerance: 24,
    eraseColorContiguous: false,
    eraseColorFamily: true,
    eraseColorAllFrames: false,
    shapeFilled: false,
    symmetryHorizontal: false,
    symmetryVertical: false,
    symmetryGroup: 'none',
    lightAzimuth: 315,
    lightElevation: 45,
    lightRadius: 64,
    lightBrightness: 1.15,
    glintStyle: 'soft',
    sourceShadingRemoval: 0,
    materialPreset: 'matte',
    formType: 'auto',
    minecraftSkinMode: 'auto',
    shadingBands: 2,
    cavityStrength: 1.0,
    ditherModulation: 0.0,
    curveTightness: 0.5,
    isoAngleSnap: true,
    chiselAzimuth: 315,
    chiselIncline: 45,
    chiselWidth: 4,
    chiselRidgeMode: false,
    normalBlendMode: 'rnm',
    rotationAlgorithm: 'rotsprite',
  },

  primaryColor: '#3A2E4C',
  secondaryColor: '#C792DF',
  palettes: PRESET_PALETTES,
  currentPaletteId: 'alabaster-wisteria-8',
  customRamps: [],
  isPaletteCycling: false,
  paletteCycleSpeedMultiplier: 1.0,
  recentColors: [],

  setActiveTool: tool => {
    set(state => {
      state.tools.activeTool = tool;
    });
  },

  setBrushSize: size => {
    set(state => {
      state.tools.brushSize = Math.max(1, Math.min(32, size));
    });
  },

  setPixelPerfect: enabled => {
    set(state => {
      state.tools.pixelPerfect = enabled;
    });
  },

  setDitherMatrix: matrix => {
    set(state => {
      state.tools.ditherMatrix = matrix;
    });
  },

  setDitherDensity: density => {
    set(state => {
      state.tools.ditherDensity = Math.max(0.05, Math.min(0.95, density));
    });
  },

  setBucketContiguous: enabled => {
    set(state => {
      state.tools.bucketContiguous = enabled;
    });
  },

  setBucketTolerance: tolerance => {
    set(state => {
      state.tools.bucketTolerance = Math.max(0, Math.min(255, tolerance));
    });
  },

  setFillTolerance: tolerance => {
    set(state => {
      state.tools.fillTolerance = Math.max(0, Math.min(255, tolerance));
    });
  },

  setFillEnclosedSpecks: enabled => {
    set(state => {
      state.tools.fillEnclosedSpecks = enabled;
    });
  },

  setEraseColorTolerance: tolerance => {
    set(state => {
      state.tools.eraseColorTolerance = Math.max(0, Math.min(255, tolerance));
    });
  },

  setEraseColorContiguous: enabled => {
    set(state => {
      state.tools.eraseColorContiguous = enabled;
      if (enabled) state.tools.eraseColorAllFrames = false;
    });
  },

  setEraseColorFamily: enabled => {
    set(state => {
      state.tools.eraseColorFamily = enabled;
      if (enabled) state.tools.eraseColorContiguous = false;
    });
  },

  setEraseColorAllFrames: enabled => {
    set(state => {
      state.tools.eraseColorAllFrames = enabled;
      if (enabled) state.tools.eraseColorContiguous = false;
    });
  },

  setShapeFilled: filled => {
    set(state => {
      state.tools.shapeFilled = filled;
    });
  },

  toggleSymmetryH: () => {
    set(state => {
      state.tools.symmetryHorizontal = !state.tools.symmetryHorizontal;
    });
  },

  toggleSymmetryV: () => {
    set(state => {
      state.tools.symmetryVertical = !state.tools.symmetryVertical;
    });
  },

  setSymmetryGroup: group => {
    set(state => {
      state.tools.symmetryGroup = group;
    });
  },

  setLightAzimuth: azimuth => {
    set(state => {
      state.tools.lightAzimuth = ((azimuth % 360) + 360) % 360;
    });
  },

  setLightElevation: elevation => {
    set(state => {
      state.tools.lightElevation = Math.max(0, Math.min(90, elevation));
    });
  },

  setLightRadius: radius => {
    set(state => {
      state.tools.lightRadius = Math.max(16, Math.min(256, radius));
    });
  },

  setLightBrightness: brightness => {
    set(state => {
      state.tools.lightBrightness = Math.max(0.3, Math.min(2.5, brightness));
    });
  },

  setSourceShadingRemoval: amount => {
    set(state => {
      state.tools.sourceShadingRemoval = Math.max(0, Math.min(1, amount));
    });
  },

  setMaterialPreset: preset => {
    set(state => {
      state.tools.materialPreset = preset;
    });
  },

  setFormType: formType => {
    set(state => {
      state.tools.formType = formType;
    });
  },

  setMinecraftSkinMode: mode => {
    set(state => {
      state.tools.minecraftSkinMode = mode;
    });
  },

  setGlintStyle: style => {
    set(state => { state.tools.glintStyle = style; });
  },

  setShadingBands: bands => {
    set(state => {
      state.tools.shadingBands = bands;
    });
  },

  setCavityStrength: strength => {
    set(state => {
      state.tools.cavityStrength = Math.max(0, Math.min(2, strength));
    });
  },

  setDitherModulation: mod => {
    set(state => {
      state.tools.ditherModulation = Math.max(0, Math.min(1, mod));
    });
  },

  setCurveTightness: tightness => {
    set(state => {
      state.tools.curveTightness = Math.max(0, Math.min(1, tightness));
    });
  },

  setIsoAngleSnap: snap => {
    set(state => {
      state.tools.isoAngleSnap = snap;
    });
  },

  setChiselAzimuth: azimuth => {
    set(state => {
      state.tools.chiselAzimuth = ((azimuth % 360) + 360) % 360;
    });
  },

  setChiselIncline: incline => {
    set(state => {
      state.tools.chiselIncline = Math.max(15, Math.min(75, incline));
    });
  },

  setChiselWidth: width => {
    set(state => {
      state.tools.chiselWidth = Math.max(1, Math.min(32, width));
    });
  },

  setChiselRidgeMode: ridge => {
    set(state => {
      state.tools.chiselRidgeMode = ridge;
    });
  },

  setNormalBlendMode: mode => {
    set(state => {
      state.tools.normalBlendMode = mode;
    });
  },

  setRotationAlgorithm: algorithm => {
    set(state => {
      state.tools.rotationAlgorithm = algorithm;
    });
  },

  togglePaletteCycling: () => {
    set(state => {
      state.isPaletteCycling = !state.isPaletteCycling;
    });
  },

  setPaletteCycling: cycling => {
    set(state => {
      state.isPaletteCycling = cycling;
    });
  },

  setPaletteCycleSpeedMultiplier: mult => {
    set(state => {
      state.paletteCycleSpeedMultiplier = Math.max(0.1, Math.min(10, mult));
    });
  },

  addPaletteCycleTrack: (paletteId, track) => {
    const palette = get().palettes.find((p) => p.id === paletteId);
    if (!palette) return;
    const error = paletteCycleTrackError(track, palette.colors.length);
    if (error || (palette.cycleTracks?.length ?? 0) >= MAX_PALETTE_CYCLE_TRACKS ||
        palette.cycleTracks?.some((existing) => existing.id === track.id)) {
      rejectPaletteEdit(error ?? `A palette can have at most ${MAX_PALETTE_CYCLE_TRACKS} unique cycle tracks.`);
      return;
    }
    if (!pushStructuralHistoryStep('Add palette cycle track', { includePalettes: true })) return;
    set(state => {
      const pal = state.palettes.find(p => p.id === paletteId);
      if (pal) {
        if (!pal.cycleTracks) pal.cycleTracks = [];
        pal.cycleTracks.push(track);
      }
    });
    get().setDirty(true);
  },

  updatePaletteCycleTrack: (paletteId, trackId, updates) => {
    const palette = get().palettes.find((p) => p.id === paletteId);
    const current = palette?.cycleTracks?.find((track) => track.id === trackId);
    if (!palette || !current) return;
    const candidate = { ...current, ...updates };
    const error = paletteCycleTrackError(candidate, palette.colors.length);
    if (error || palette.cycleTracks?.some((track) => track !== current && track.id === candidate.id)) {
      rejectPaletteEdit(error ?? 'Cycle track identifiers must be unique.');
      return;
    }
    if (Object.entries(updates).every(([key, value]) => current[key as keyof typeof current] === value)) return;
    if (!pushStructuralHistoryStep('Edit palette cycle track', { includePalettes: true })) return;
    set(state => {
      const pal = state.palettes.find(p => p.id === paletteId);
      if (pal?.cycleTracks) {
        const trk = pal.cycleTracks.find(t => t.id === trackId);
        if (trk) {
          Object.assign(trk, updates);
        }
      }
    });
    get().setDirty(true);
  },

  deletePaletteCycleTrack: (paletteId, trackId) => {
    if (!get().palettes.find((p) => p.id === paletteId)?.cycleTracks?.some((track) => track.id === trackId)) return;
    if (!pushStructuralHistoryStep('Remove palette cycle track', { includePalettes: true })) return;
    set(state => {
      const pal = state.palettes.find(p => p.id === paletteId);
      if (pal?.cycleTracks) {
        pal.cycleTracks = pal.cycleTracks.filter(t => t.id !== trackId);
      }
    });
    get().setDirty(true);
  },

  setPaletteSemantics: (paletteId, input) => {
    const palette = get().palettes.find(p => p.id === paletteId);
    if (!palette) return;
    const semantics = parsePaletteSemantics(input, palette.colors.length);
    if (!semantics) { rejectPaletteEdit('Palette roles or bindings are invalid or exceed their limits.'); return; }
    if (JSON.stringify(semantics) === JSON.stringify(palette.semantics)) return;
    const growth = Math.max(0, JSON.stringify(semantics).length * 2 - JSON.stringify(palette.semantics ?? {}).length * 2);
    if (!pushStructuralHistoryStep('Edit palette roles and index bindings', { includePalettes: true, addedMetadataBytes: growth })) return;
    set(state => { state.palettes.find(p => p.id === paletteId)!.semantics = semantics; });
    get().setDirty(true);
  },

  setPrimaryColor: color => {
    set(state => {
      state.primaryColor = color;
    });
    rememberWhenSettled(color, get().addRecentColor);
  },

  setSecondaryColor: color => {
    set(state => {
      state.secondaryColor = color;
    });
    rememberWhenSettled(color, get().addRecentColor);
  },

  addRecentColor: color => {
    set(state => {
      const hex = color.toUpperCase();
      state.recentColors = state.recentColors.filter((c: string) => c !== hex);
      state.recentColors.unshift(hex);
      if (state.recentColors.length > 8) {
        state.recentColors.pop();
      }
    });
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      window.localStorage.setItem('pixibun_recent_colors', JSON.stringify(get().recentColors));
    } catch {
      // Storage full or blocked: the list still works for this session.
    }
  },

  loadRecentColors: () => {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const parsed: unknown = JSON.parse(window.localStorage.getItem('pixibun_recent_colors') || '[]');
      if (!Array.isArray(parsed)) return;
      // Stored values are untrusted: keep at most eight distinct #RRGGBB colors.
      const valid = [...new Set(parsed.filter((c): c is string => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c))
        .map(c => c.toUpperCase()))].slice(0, 8);
      set(state => {
        state.recentColors = valid;
      });
    } catch {
      // ignore corrupted storage
    }
  },

  swapColors: () => {
    set(state => {
      const temp = state.primaryColor;
      state.primaryColor = state.secondaryColor;
      state.secondaryColor = temp;
    });
  },

  selectPalette: id => {
    if (id === get().currentPaletteId) return;
    if (!get().palettes.some((palette) => palette.id === id)) {
      rejectPaletteEdit('That palette is unavailable.');
      return;
    }
    set(state => {
      state.currentPaletteId = id;
    });
    get().setDirty(true);
  },

  addCustomColorToPalette: (paletteId, color) => {
    const palette = get().palettes.find((p) => p.id === paletteId);
    if (!palette || palette.colors.includes(color)) return;
    const error = paletteEntryError(palette.name, [...palette.colors, color]);
    if (error) {
      rejectPaletteEdit(error);
      return;
    }
    set(state => {
      const pal = state.palettes.find(p => p.id === paletteId);
      if (pal && !pal.colors.includes(color)) {
        pal.colors.push(color);
      }
    });
    get().setDirty(true);
  },

  setCustomRamps: ramps => {
    const error = customRampsError(ramps);
    if (error) {
      rejectPaletteEdit(error);
      return;
    }
    set(state => {
      state.customRamps = ramps.map((ramp) => ({ baseColor: ramp.baseColor, shades: [...ramp.shades] }));
    });
    get().setDirty(true);
  },

  removePaletteColor: (paletteId, index) => {
    const palette = get().palettes.find(p => p.id === paletteId);
    if (!palette || !Number.isInteger(index) || index < 0 || index >= palette.colors.length) return false;
    if (palette.colors.length <= 1) { rejectPaletteEdit('Keep at least one color in your palette.'); return false; }
    if (!pushStructuralHistoryStep('Remove palette color', { includePalettes: true })) return false;
    set(state => {
      const target = state.palettes.find(p => p.id === paletteId)!;
      target.colors.splice(index, 1);
      if (target.semantics) {
        const removed = target.semantics.entries.splice(index, 1)[0]?.id;
        target.semantics.bindings = target.semantics.bindings.filter(b => b.entryId !== removed);
      }
      target.cycleTracks = target.cycleTracks?.flatMap(track => {
        if (index > track.high) return [track];
        if (index < track.low) return [{ ...track, low: track.low - 1, high: track.high - 1 }];
        return track.high > track.low ? [{ ...track, high: track.high - 1 }] : [];
      });
    });
    get().setDirty(true);
    return true;
  },

  addExtractedPalette: (name, colors) => {
    if (get().palettes.length >= MAX_PROJECT_PALETTES) {
      rejectPaletteEdit(`A project can have at most ${MAX_PROJECT_PALETTES} palettes.`);
      return false;
    }
    const nextColors = colors.length > 0 ? colors : ['#3A2E4C', '#C792DF', '#DCABDF', '#DDDFDF'];
    const error = paletteEntryError(name, nextColors);
    if (error) {
      rejectPaletteEdit(error);
      return false;
    }
    const newPalette: ColorPalette = { id: createId('palette'), name, colors: [...nextColors] };
    if (!pushStructuralHistoryStep('Add palette', { includePalettes: true, addedMetadataBytes: estimatePaletteBytes(newPalette) })) return false;
    set(state => {
      state.palettes.push(newPalette);
      state.currentPaletteId = newPalette.id;
    });
    get().setDirty(true);
    return true;
  },

  generateAndAddRamp: baseColor => {
    const palette = get().palettes.find((p) => p.id === get().currentPaletteId);
    if (!palette) return;
    const rampColors = generateOklchRamp(baseColor);
    const newColors = rampColors.filter((color) => !palette.colors.includes(color));
    if (newColors.length === 0) return;
    if (palette.colors.length + newColors.length > MAX_PALETTE_COLORS) {
      rejectPaletteEdit(`A palette can have at most ${MAX_PALETTE_COLORS} colors.`);
      return;
    }
    if (palette.semantics && palette.colors.length + newColors.length > 256) {
      rejectPaletteEdit('A palette with index bindings can have at most 256 registers.'); return;
    }
    if (!pushStructuralHistoryStep('Add palette ramp', { includePalettes: true })) return;
    set(state => {
      const activePal = state.palettes.find(p => p.id === state.currentPaletteId);
      if (activePal) {
        for (const color of rampColors) {
          if (!activePal.colors.includes(color)) {
            activePal.colors.push(color);
            activePal.semantics?.entries.push({ id: createId('register'), role: '' });
          }
        }
      }
    });
    get().setDirty(true);
  },
});
