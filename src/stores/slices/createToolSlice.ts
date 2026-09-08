import { ToolSlice, StudioSliceCreator } from './types';
import { ColorPalette } from '@/types/palette';
import { createId } from '@/lib/engine/id';
import { generateOklchRamp } from '@/lib/color/rampGenerator';

// Built-in Curated Palettes
export const PRESET_PALETTES: ColorPalette[] = [
  {
    id: 'alabaster-wisteria-8',
    name: 'Alabaster & Wisteria (Active Theme)',
    colors: [
      '#DDDFDF', '#DDDDDF', '#D0C4DF', '#DCABDF',
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
  }
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
    shapeFilled: false,
    symmetryHorizontal: false,
    symmetryVertical: false,
    symmetryGroup: 'none',
    lightAzimuth: 315,
    lightElevation: 45,
    lightRadius: 64,
    lightBrightness: 1.15,
    materialPreset: 'matte',
    formType: 'auto',
    minecraftSkinMode: 'auto',
    cavityStrength: 1.0,
    ditherModulation: 0.0,
    curveTightness: 0.5,
    isoAngleSnap: true,
    opticalPreset: 'gemstone',
    translucencyDepth: 8,
    fresnelPower: 3.5,
    anisoAngle: 90,
    anisoFlow: 'vertical',
    opticalCelTones: 3,
    chiselAzimuth: 315,
    chiselIncline: 45,
    chiselWidth: 4,
    chiselRidgeMode: false,
    rivetRadius: 6,
    rivetFlatten: 0.5,
    rivetInvert: false,
    normalBlendMode: 'rnm',
  },

  primaryColor: '#3A2E4C',
  secondaryColor: '#C792DF',
  palettes: PRESET_PALETTES,
  currentPaletteId: 'alabaster-wisteria-8',
  customRamps: [],
  isPaletteCycling: false,
  paletteCycleSpeedMultiplier: 1.0,
  recentColors: (() => {
    // Module-scope JSON.parse of user-controlled localStorage: a corrupted
    // value here would throw during store creation and crash the entire
    // studio on load, so it must be defensively guarded.
    if (typeof window === 'undefined' || !window.localStorage) return [];
    try {
      const parsed: unknown = JSON.parse(window.localStorage.getItem('pixibun_recent_colors') || '[]');
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((c): c is string => typeof c === 'string');
    } catch {
      return [];
    }
  })(),

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
      state.tools.lightBrightness = Math.max(0.4, Math.min(2.5, brightness));
    });
  },

  setMaterialPreset: preset => {
    set(state => {
      state.tools.materialPreset = preset;
    });
  },

  setMinecraftSkinMode: mode => {
    set(state => {
      state.tools.minecraftSkinMode = mode;
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

  setOpticalPreset: preset => {
    set(state => {
      state.tools.opticalPreset = preset;
    });
  },

  setTranslucencyDepth: depth => {
    set(state => {
      state.tools.translucencyDepth = Math.max(1, Math.min(32, depth));
    });
  },

  setFresnelPower: power => {
    set(state => {
      state.tools.fresnelPower = Math.max(1, Math.min(8, power));
    });
  },

  setAnisoAngle: angle => {
    set(state => {
      state.tools.anisoAngle = ((angle % 180) + 180) % 180;
    });
  },

  setAnisoFlow: flow => {
    set(state => {
      state.tools.anisoFlow = flow;
    });
  },

  setOpticalCelTones: tones => {
    set(state => {
      state.tools.opticalCelTones = tones;
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

  setRivetRadius: radius => {
    set(state => {
      state.tools.rivetRadius = Math.max(1, Math.min(32, radius));
    });
  },

  setRivetFlatten: flatten => {
    set(state => {
      state.tools.rivetFlatten = Math.max(0.1, Math.min(1.0, flatten));
    });
  },

  setRivetInvert: invert => {
    set(state => {
      state.tools.rivetInvert = invert;
    });
  },

  setNormalBlendMode: mode => {
    set(state => {
      state.tools.normalBlendMode = mode;
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
    set(state => {
      const pal = state.palettes.find(p => p.id === paletteId);
      if (pal) {
        if (!pal.cycleTracks) pal.cycleTracks = [];
        pal.cycleTracks.push(track);
      }
    });
  },

  updatePaletteCycleTrack: (paletteId, trackId, updates) => {
    set(state => {
      const pal = state.palettes.find(p => p.id === paletteId);
      if (pal?.cycleTracks) {
        const trk = pal.cycleTracks.find(t => t.id === trackId);
        if (trk) {
          Object.assign(trk, updates);
        }
      }
    });
  },

  deletePaletteCycleTrack: (paletteId, trackId) => {
    set(state => {
      const pal = state.palettes.find(p => p.id === paletteId);
      if (pal?.cycleTracks) {
        pal.cycleTracks = pal.cycleTracks.filter(t => t.id !== trackId);
      }
    });
  },

  setPrimaryColor: color => {
    set(state => {
      state.primaryColor = color;
    });
    get().addRecentColor(color);
  },

  setSecondaryColor: color => {
    set(state => {
      state.secondaryColor = color;
    });
    get().addRecentColor(color);
  },

  addRecentColor: color => {
    set(state => {
      const hex = color.toUpperCase();
      state.recentColors = state.recentColors.filter((c: string) => c !== hex);
      state.recentColors.unshift(hex);
      if (state.recentColors.length > 8) {
        state.recentColors.pop();
      }
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('pixibun_recent_colors', JSON.stringify(state.recentColors));
      }
    });
  },

  swapColors: () => {
    set(state => {
      const temp = state.primaryColor;
      state.primaryColor = state.secondaryColor;
      state.secondaryColor = temp;
    });
  },

  selectPalette: id => {
    set(state => {
      state.currentPaletteId = id;
    });
  },

  addCustomColorToPalette: (paletteId, color) => {
    set(state => {
      const pal = state.palettes.find(p => p.id === paletteId);
      if (pal && !pal.colors.includes(color)) {
        pal.colors.push(color);
      }
    });
  },

  setCustomRamps: ramps => {
    set(state => {
      state.customRamps = ramps;
    });
  },

  addExtractedPalette: (name, colors) => {
    set(state => {
      const newPalette: ColorPalette = {
        id: createId('palette'),
        name,
        colors: colors.length > 0 ? colors : ['#3A2E4C', '#C792DF', '#DCABDF', '#DDDFDF'],
      };
      state.palettes.push(newPalette);
      state.currentPaletteId = newPalette.id;
    });
  },

  generateAndAddRamp: baseColor => {
    set(state => {
      const rampColors = generateOklchRamp(baseColor);
      const activePal = state.palettes.find(p => p.id === state.currentPaletteId);
      if (activePal) {
        for (const color of rampColors) {
          if (!activePal.colors.includes(color)) {
            activePal.colors.push(color);
          }
        }
      }
    });
  },
});
