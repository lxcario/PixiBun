import { useStudioStore } from '@/stores/studioStore';
import { getOrCreateBuffer, touchBuffer } from '@/lib/engine/bufferRegistry';

export interface AltPalette {
  id: string;
  name: string;
  tag: string;
  swatch: string;
  outline: string;
  fill: string;
  shade: string;
  highlight: string;
  glint: string;
  feature: string;
  blush: string;
}

export interface BuildingStep {
  step: number;
  label: string;
  description: string;
  hasDimensions?: boolean;
  dimensionW?: number;
  dimensionH?: number;
  grid16: string[];
}

export interface JumpKeyframe {
  frame: number;
  label: string;
  heightPx: number;
  principle: string;
  explanation: string;
  holdMs: number;
  squashFactor: number;
  grid16: string[];
}

export interface TeachingCharacter {
  id: 'bun' | 'slime';
  name: string;
  tagline: string;
  defaultPaletteId: string;
  buildingSteps: BuildingStep[];
  jumpFrames: JumpKeyframe[];
}

export const ALT_COLOURS: AltPalette[] = [
  {
    id: 'wisteria',
    name: 'Wisteria Lavender',
    tag: 'Classic PixiBun',
    swatch: '#c792df',
    outline: '#3a2e4c',
    fill: '#f2ecf7',
    shade: '#cdbfdf',
    highlight: '#faf6fc',
    glint: '#ffffff',
    feature: '#3a2e4c',
    blush: '#e08ca6',
  },
  {
    id: 'amber',
    name: 'Lamp Amber',
    tag: 'Honey Glow',
    swatch: '#f0be7c',
    outline: '#3c2410',
    fill: '#fdeed4',
    shade: '#e0ad65',
    highlight: '#fff8eb',
    glint: '#ffffff',
    feature: '#3c2410',
    blush: '#ea7f38',
  },
  {
    id: 'peach',
    name: 'Peachy Rose',
    tag: 'Sweet Strawberry',
    swatch: '#f29bb2',
    outline: '#3e1a26',
    fill: '#fce7ee',
    shade: '#e69bb1',
    highlight: '#fff3f7',
    glint: '#ffffff',
    feature: '#3e1a26',
    blush: '#e64e79',
  },
  {
    id: 'matcha',
    name: 'Matcha Moss',
    tag: 'Fresh Sprout',
    swatch: '#57c728',
    outline: '#152b11',
    fill: '#57c728',
    shade: '#2d7c13',
    highlight: '#aef069',
    glint: '#ffffff',
    feature: '#152b11',
    blush: '#f0be7c',
  },
  {
    id: 'celestine',
    name: 'Celestine Sky',
    tag: 'Frost Crystal',
    swatch: '#7cbbee',
    outline: '#1a273e',
    fill: '#e2f0fc',
    shade: '#9ec7ee',
    highlight: '#f1f8fe',
    glint: '#ffffff',
    feature: '#1a273e',
    blush: '#f29bb2',
  },
  {
    id: 'amethyst',
    name: 'Royal Amethyst',
    tag: 'Deep Velvet',
    swatch: '#a86fd4',
    outline: '#29153a',
    fill: '#ebd9fa',
    shade: '#b78ee0',
    highlight: '#f6ecff',
    glint: '#ffffff',
    feature: '#29153a',
    blush: '#f0be7c',
  },
  {
    id: 'sakura',
    name: 'Sakura Bloom',
    tag: 'Cherry Blossom',
    swatch: '#f7a8d8',
    outline: '#3c182c',
    fill: '#fdedf6',
    shade: '#e3a1c8',
    highlight: '#fff7fc',
    glint: '#ffffff',
    feature: '#3c182c',
    blush: '#e08ca6',
  },
  {
    id: 'obsidian',
    name: 'Obsidian Slate',
    tag: 'Midnight Velvet',
    swatch: '#5c526d',
    outline: '#140c1e',
    fill: '#413552',
    shade: '#2c223a',
    highlight: '#695a7e',
    glint: '#ffffff',
    feature: '#ede8f4',
    blush: '#f0be7c',
  },
];
export const BUN_BUILDING_STEPS: BuildingStep[] = [
  {
    "step": 1,
    "label": "1. Silhouette & Bounds",
    "description": "16\u00d716 bounding box establishing overall character mass and ear silhouette.",
    "hasDimensions": true,
    "dimensionW": 16,
    "dimensionH": 16,
    "grid16": [
      "...oo......oo...",
      "..oooo....oooo..",
      "..oooo....oooo..",
      "..oooo....oooo..",
      "..oooooooooooo..",
      ".oooooooooooooo.",
      "oooooooooooooooo",
      "oooooooooooooooo",
      "oooooooooooooooo",
      "oooooooooooooooo",
      "oooooooooooooooo",
      ".oooooooooooooo.",
      ".oooooooooooooo.",
      ".oooooooooooooo.",
      "..oooooooooooo..",
      "................"
    ]
  },
  {
    "step": 2,
    "label": "2. Closed Outline",
    "description": "Crisp 1px outer stroke with zero perimeter leaks for clean flood fills.",
    "grid16": [
      "...oo......oo...",
      "..o..o....o..o..",
      "..o..o....o..o..",
      "..o..o....o..o..",
      "..o..oooooo..o..",
      ".o............o.",
      "o..............o",
      "o..............o",
      "o..............o",
      "o..............o",
      "o..............o",
      ".o............o.",
      ".o............o.",
      ".o............o.",
      "..oooooooooooo..",
      "................"
    ]
  },
  {
    "step": 3,
    "label": "3. Facial Features",
    "description": "Placing eye positions, ear cavities, and rosy cheeks on the face plane.",
    "grid16": [
      "...oo......oo...",
      "..ofro....ofro..",
      "..ofro....ofro..",
      "..ofro....ofro..",
      "..o..oooooo..o..",
      ".o............o.",
      "o..............o",
      "o....e....e....o",
      "o....e....e....o",
      "o..rr......rr..o",
      "o..............o",
      ".o............o.",
      ".o............o.",
      ".o............o.",
      "..oooooooooooo..",
      "................"
    ]
  },
  {
    "step": 4,
    "label": "4. Base Color Fill",
    "description": "Warm, solid base fill poured inside the closed outer lineart.",
    "grid16": [
      "...oo......oo...",
      "..ofro....ofro..",
      "..ofro....ofro..",
      "..ofro....ofro..",
      "..offfoooofffo..",
      ".offffffffffffo.",
      "offffffffffffffo",
      "offffeffffeffffo",
      "offffeffffeffffo",
      "offrrffffffrrffo",
      "offffffffffffffo",
      ".offffffffffffo.",
      ".offffffffffffo.",
      ".offffffffffffo.",
      "..oooooooooooo..",
      "................"
    ]
  },
  {
    "step": 5,
    "label": "5. Core Shading",
    "description": "Under-chin drop shadow and bottom rim occlusion grounding the sphere.",
    "grid16": [
      "...oo......oo...",
      "..ofro....ofro..",
      "..ofro....ofro..",
      "..ofro....ofro..",
      "..offfoooofffo..",
      ".offffffffffffo.",
      "offffffffffffffo",
      "offffeffffeffffo",
      "offffeffffeffffo",
      "offrrffffffrrffo",
      "offffffffffffffo",
      ".offffffffffffo.",
      ".osssssssssssso.",
      ".osssssssssssso.",
      "..oooooooooooo..",
      "................"
    ]
  },
  {
    "step": 6,
    "label": "6. Volumetric Highlights",
    "description": "Top-down lamplit warmth on forehead, ear tips, and soft tummy chest.",
    "grid16": [
      "...oo......oo...",
      "..ofro....ofro..",
      "..ofro....ofro..",
      "..ofro....ofro..",
      "..offfoooofffo..",
      ".ohhhhhhhhhhhho.",
      "offffffffffffffo",
      "offffeffffeffffo",
      "offffeffffeffffo",
      "offrrffffffrrffo",
      "offffffffffffffo",
      ".offfhhhhhhfffo.",
      ".osssssssssssso.",
      ".osssssssssssso.",
      "..oooooooooooo..",
      "................"
    ]
  },
  {
    "step": 7,
    "label": "7. Specular Glint & Polish",
    "description": "Pure white gleam in the eyes and forehead creating lively, breathing eyes.",
    "grid16": [
      "...oo......oo...",
      "..ofro....ofro..",
      "..ofro....ofro..",
      "..ofro....ofro..",
      "..offfoooofffo..",
      ".oghhhhhhhhhhho.",
      "offffffffffffffo",
      "offffeffffeffffo",
      "offffeffffeffffo",
      "offrrffffffrrffo",
      "offffffffffffffo",
      ".offfhhhhhhfffo.",
      ".osssssssssssso.",
      ".osssssssssssso.",
      "..oooooooooooo..",
      "................"
    ]
  }
];

export const BUN_JUMP_FRAMES: JumpKeyframe[] = [
  {
    "frame": 1,
    "label": "Frame 1: Crouch Anticipation",
    "heightPx": 0,
    "principle": "Anticipation",
    "explanation": "Compressing downward to store spring potential along the floor.",
    "holdMs": 120,
    "squashFactor": 1.25,
    "grid16": [
      "................",
      "................",
      "................",
      "................",
      "...oo......oo...",
      "..ofro....ofro..",
      "..offfoooofffo..",
      ".oghhhhhhhhhhho.",
      "offffffffffffffo",
      "offffeffffeffffo",
      "offrrffffffrrffo",
      "offffffffffffffo",
      "osssssssssssssso",
      "osssssssssssssso",
      "oooooooooooooooo",
      "................"
    ]
  },
  {
    "frame": 2,
    "label": "Frame 2: Explosive Launch",
    "heightPx": 16,
    "principle": "Launch Stretch",
    "explanation": "Exploding upward off the floor with stored spring energy.",
    "holdMs": 50,
    "squashFactor": 0.7,
    "grid16": [
      "....oo....oo....",
      "...ofro..ofro...",
      "...ofro..ofro...",
      "...ofro..ofro...",
      "...ofro..ofro...",
      "..ooffoooooffo..",
      "..oghhhhhhhhho..",
      "..offffffffffo..",
      "..offfeffefffo..",
      "..offfeffefffo..",
      "..offrrffffrffo.",
      "..offffffffffo..",
      "..osssssssssso..",
      "..osssssssssso..",
      "...oooooooooo...",
      "................"
    ]
  },
  {
    "frame": 3,
    "label": "Frame 3: Ascending Flight",
    "heightPx": 24,
    "principle": "Ascent Stretch",
    "explanation": "Rapid ascent bridging ground to sky; ears trailing velocity vector.",
    "holdMs": 60,
    "squashFactor": 0.75,
    "grid16": [
      "................",
      "...oo......oo...",
      "..ofro....ofro..",
      "..ofro....ofro..",
      "..ofro....ofro..",
      "..offfoooofffo..",
      ".oghhhhhhhhhhho.",
      "offffffffffffffo",
      "offffeffffeffffo",
      "offffeffffeffffo",
      "offrrffffffrrffo",
      "offffffffffffffo",
      ".osssssssssssso.",
      ".osssssssssssso.",
      "..oooooooooooo..",
      "................"
    ]
  },
  {
    "frame": 4,
    "label": "Frame 4: Apex Deceleration",
    "heightPx": 30,
    "principle": "Apex Deceleration",
    "explanation": "Decelerating against gravity; vertical velocity nears zero.",
    "holdMs": 80,
    "squashFactor": 0.9,
    "grid16": [
      "...oo......oo...",
      "..ofro....ofro..",
      "..ofro....ofro..",
      "..ofro....ofro..",
      "..offfoooofffo..",
      ".oghhhhhhhhhhho.",
      "offffffffffffffo",
      "offffeffffeffffo",
      "offffeffffeffffo",
      "offrrffffffrrffo",
      "offffffffffffffo",
      ".offfhhhhhhfffo.",
      ".osssssssssssso.",
      ".osssssssssssso.",
      "..oooooooooooo..",
      "................"
    ]
  },
  {
    "frame": 5,
    "label": "Frame 5: Apex Hang & Float",
    "heightPx": 32,
    "principle": "Apex Float",
    "explanation": "Maximum altitude. Zero gravity hang time; buoyant ear float.",
    "holdMs": 160,
    "squashFactor": 1.2,
    "grid16": [
      "................",
      "................",
      "................",
      "..oo........oo..",
      ".ofro......ofro.",
      ".ofroooooooofro.",
      ".oghhhhhhhhhhho.",
      "offffffffffffffo",
      "offffeffffeffffo",
      "offrrffffffrrffo",
      "offffffffffffffo",
      ".osssssssssssso.",
      "..oooooooooooo..",
      "................",
      "................",
      "................"
    ]
  },
  {
    "frame": 6,
    "label": "Frame 6: Crest Fall",
    "heightPx": 30,
    "principle": "Descent Acceleration",
    "explanation": "Beginning gravitational descent; neutral rounded pose.",
    "holdMs": 80,
    "squashFactor": 0.9,
    "grid16": [
      "...oo......oo...",
      "..ofro....ofro..",
      "..ofro....ofro..",
      "..ofro....ofro..",
      "..offfoooofffo..",
      ".oghhhhhhhhhhho.",
      "offffffffffffffo",
      "offffeffffeffffo",
      "offffeffffeffffo",
      "offrrffffffrrffo",
      "offffffffffffffo",
      ".offfhhhhhhfffo.",
      ".osssssssssssso.",
      ".osssssssssssso.",
      "..oooooooooooo..",
      "................"
    ]
  },
  {
    "frame": 7,
    "label": "Frame 7: Accelerated Descent",
    "heightPx": 24,
    "principle": "Gravity Fall",
    "explanation": "Downward acceleration gaining kinetic speed back toward floor.",
    "holdMs": 60,
    "squashFactor": 0.75,
    "grid16": [
      "................",
      "...oo......oo...",
      "..ofro....ofro..",
      "..ofro....ofro..",
      "..ofro....ofro..",
      "..offfoooofffo..",
      ".oghhhhhhhhhhho.",
      "offffffffffffffo",
      "offffeffffeffffo",
      "offffeffffeffffo",
      "offrrffffffrrffo",
      "offffffffffffffo",
      ".osssssssssssso.",
      ".osssssssssssso.",
      "..oooooooooooo..",
      "................"
    ]
  },
  {
    "frame": 8,
    "label": "Frame 8: Terminal Velocity",
    "heightPx": 16,
    "principle": "Terminal Smear",
    "explanation": "Maximum fall speed approaching the floor plane.",
    "holdMs": 50,
    "squashFactor": 0.7,
    "grid16": [
      "....oo....oo....",
      "...ofro..ofro...",
      "...ofro..ofro...",
      "...ofro..ofro...",
      "...ofro..ofro...",
      "..ooffoooooffo..",
      "..oghhhhhhhhho..",
      "..offffffffffo..",
      "..offfeffefffo..",
      "..offfeffefffo..",
      "..offrrffffrffo.",
      "..offffffffffo..",
      "..osssssssssso..",
      "..osssssssssso..",
      "...oooooooooo...",
      "................"
    ]
  },
  {
    "frame": 9,
    "label": "Frame 9: Impact Shock",
    "heightPx": 0,
    "principle": "Ground Contact",
    "explanation": "First contact with floor; neutral rabbit touching ground.",
    "holdMs": 60,
    "squashFactor": 1.0,
    "grid16": [
      "...oo......oo...",
      "..ofro....ofro..",
      "..ofro....ofro..",
      "..ofro....ofro..",
      "..offfoooofffo..",
      ".oghhhhhhhhhhho.",
      "offffffffffffffo",
      "offffeffffeffffo",
      "offffeffffeffffo",
      "offrrffffffrrffo",
      "offffffffffffffo",
      ".offfhhhhhhfffo.",
      ".osssssssssssso.",
      ".osssssssssssso.",
      "..oooooooooooo..",
      "................"
    ]
  },
  {
    "frame": 10,
    "label": "Frame 10: Ground Squash & Settle",
    "heightPx": 0,
    "principle": "Maximum Squash",
    "explanation": "Maximum horizontal splatter and elastic spring back to neutral pose.",
    "holdMs": 120,
    "squashFactor": 1.5,
    "grid16": [
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      ".oo..........oo.",
      "ofroooooooooofro",
      ".oghhhhhhhhhhho.",
      "offffffffffffffo",
      "offffeffffeffffo",
      "offrrffffffrrffo",
      "osssssssssssssso",
      "oooooooooooooooo"
    ]
  }
];

export const SLIME_BUILDING_STEPS: BuildingStep[] = [
  {
    "step": 1,
    "label": "1. 15\u00d715 Silhouette",
    "description": "Establish the circular mass with 15px width and height brackets.",
    "hasDimensions": true,
    "dimensionW": 15,
    "dimensionH": 15,
    "grid16": [
      ".....oooooo.....",
      "...oooooooooo...",
      "..oooooooooooo..",
      ".oooooooooooooo.",
      ".oooooooooooooo.",
      "oooooooooooooooo",
      "oooooooooooooooo",
      "oooooooooooooooo",
      "oooooooooooooooo",
      "oooooooooooooooo",
      ".oooooooooooooo.",
      ".oooooooooooooo.",
      "..oooooooooooo..",
      "...oooooooooo...",
      ".....oooooo.....",
      "................"
    ]
  },
  {
    "step": 2,
    "label": "2. Closed Outline",
    "description": "Continuous circular perimeter line without leaks or breaks.",
    "grid16": [
      ".....oooooo.....",
      "...oo......oo...",
      "..o..........o..",
      ".o............o.",
      ".o............o.",
      "o..............o",
      "o..............o",
      "o..............o",
      "o..............o",
      "o..............o",
      ".o............o.",
      ".o............o.",
      "..o..........o..",
      "...oo......oo...",
      ".....oooooo.....",
      "................"
    ]
  },
  {
    "step": 3,
    "label": "3. Expressive Face",
    "description": "Twin vertical bead eyes giving life to the gelatinous droplet.",
    "grid16": [
      ".....oooooo.....",
      "...oo......oo...",
      "..o..........o..",
      ".o............o.",
      ".o............o.",
      "o..............o",
      "o..............o",
      "o.....e..e.....o",
      "o.....e..e.....o",
      "o..............o",
      ".o............o.",
      ".o............o.",
      "..o..........o..",
      "...oo......oo...",
      ".....oooooo.....",
      "................"
    ]
  },
  {
    "step": 4,
    "label": "4. Flat Base Color",
    "description": "Lush jelly base tone filled solidly inside the outline.",
    "grid16": [
      ".....oooooo.....",
      "...ooffffffoo...",
      "..offffffffffo..",
      ".offffffffffffo.",
      ".offffffffffffo.",
      "offffffffffffffo",
      "offffffffffffffo",
      "offfffeffefffffo",
      "offfffeffefffffo",
      "offffffffffffffo",
      ".offffffffffffo.",
      ".offffffffffffo.",
      "..offffffffffo..",
      "...ooffffffoo...",
      ".....oooooo.....",
      "................"
    ]
  },
  {
    "step": 5,
    "label": "5. Bottom Shade Rim",
    "description": "Cool shadow curvature anchoring weight at the bottom rim.",
    "grid16": [
      ".....oooooo.....",
      "...ooffffffoo...",
      "..offffffffffo..",
      ".offffffffffffo.",
      ".offffffffffffo.",
      "offffffffffffffo",
      "offffffffffffffo",
      "offfffeffefffffo",
      "offfffeffefffffo",
      "offffffffffffffo",
      ".offsssssssssfo.",
      ".osssssssssssso.",
      "..osssssssssso..",
      "...oossssssoo...",
      ".....oooooo.....",
      "................"
    ]
  },
  {
    "step": 6,
    "label": "6. Crest Highlight",
    "description": "Convex dome highlight wrapping the top hemisphere.",
    "grid16": [
      ".....oooooo.....",
      "...oohhhhhhoo...",
      "..ohhhhhhhhhho..",
      ".ohhhhhhhhhhhfo.",
      ".ohfffffffffffo.",
      "offffffffffffffo",
      "offffffffffffffo",
      "offfffeffefffffo",
      "offfffeffefffffo",
      "offffffffffffffo",
      ".offsssssssssfo.",
      ".osssssssssssso.",
      "..osssssssssso..",
      "...oossssssoo...",
      ".....oooooo.....",
      "................"
    ]
  },
  {
    "step": 7,
    "label": "7. Specular Glint",
    "description": "Pure white specular reflections conveying glistening liquid.",
    "grid16": [
      ".....oooooo.....",
      "...oogghhhhoo...",
      "..oghhhhhhhhho..",
      ".oghhhhhhhhhho..",
      ".ohfffffffffffo.",
      "offffffffffffffo",
      "offffffffffffffo",
      "offfffeffefffffo",
      "offfffeffefffffo",
      "offffffffffffffo",
      ".offsssssssssfo.",
      ".osssssssssssso.",
      "..osssssssssso..",
      "...oossssssoo...",
      ".....oooooo.....",
      "................"
    ]
  }
];

export const SLIME_JUMP_FRAMES: JumpKeyframe[] = [
  {
    "frame": 1,
    "label": "Frame 1: Gel Compression",
    "heightPx": 0,
    "principle": "Anticipation",
    "explanation": "Flattening into a wide pancake puddle storing elastic energy.",
    "holdMs": 120,
    "squashFactor": 1.4,
    "grid16": [
      "................",
      "................",
      "................",
      "................",
      ".....oooooo.....",
      "...oogghhhhhoo..",
      "..oghhhhhhhhffo.",
      ".ohfffffffffffo.",
      "offffffffffffffo",
      "offfffeffefffffo",
      "offfffeffefffffo",
      "osssssssssssssso",
      "osssssssssssssso",
      "osssssssssssssso",
      "oooooooooooooooo",
      "................"
    ]
  },
  {
    "frame": 2,
    "label": "Frame 2: Upward Surge",
    "heightPx": 16,
    "principle": "Launch Stretch",
    "explanation": "Bursting upward off the floor with stored elastic energy.",
    "holdMs": 50,
    "squashFactor": 0.7,
    "grid16": [
      ".....oooooo.....",
      "....oogghhoo....",
      "...ooghhhhffo...",
      "...ohffffffffo..",
      "...ohffffffffo..",
      "...ohffffffffo..",
      "...offeffefffo..",
      "...offeffefffo..",
      "...offeffefffo..",
      "...offfffffffo..",
      "...offfffffffo..",
      "...offsssssffo..",
      "...ossssssssso..",
      "...ossssssssso..",
      "....oossssoo....",
      ".....oooooo....."
    ]
  },
  {
    "frame": 3,
    "label": "Frame 3: Ascending Sphere",
    "heightPx": 24,
    "principle": "Ascent Stretch",
    "explanation": "High speed rising oval transitioning toward apex.",
    "holdMs": 60,
    "squashFactor": 0.75,
    "grid16": [
      ".....oooooo.....",
      "...oogghhhhoo...",
      "..oghhhhhhhhfo..",
      "..ohffffffffffo.",
      "..ohffffffffffo.",
      "..offfffffffffo.",
      "..offfefffefffo.",
      "..offfefffefffo.",
      "..offfefffefffo.",
      "..offfffffffffo.",
      "..offssssssssfo.",
      "..ossssssssssfo.",
      "..ossssssssssfo.",
      "...oossssssoo...",
      ".....oooooo.....",
      "................"
    ]
  },
  {
    "frame": 4,
    "label": "Frame 4: Apex Deceleration",
    "heightPx": 30,
    "principle": "Apex Deceleration",
    "explanation": "Rounding into neutral sphere as upward velocity slows.",
    "holdMs": 80,
    "squashFactor": 0.9,
    "grid16": [
      ".....oooooo.....",
      "...oogghhhhoo...",
      "..oghhhhhhhhho..",
      ".oghhhhhhhhhho..",
      ".ohfffffffffffo.",
      "offffffffffffffo",
      "offffffffffffffo",
      "offfffeffefffffo",
      "offfffeffefffffo",
      "offffffffffffffo",
      ".offsssssssssfo.",
      ".osssssssssssso.",
      "..osssssssssso..",
      "...oossssssoo...",
      ".....oooooo.....",
      "................"
    ]
  },
  {
    "frame": 5,
    "label": "Frame 5: Apex Hang & Float",
    "heightPx": 32,
    "principle": "Apex Float",
    "explanation": "Peak altitude hang time; horizontal cushion before descent.",
    "holdMs": 160,
    "squashFactor": 1.25,
    "grid16": [
      "................",
      "................",
      "....oooooooo....",
      "..oogghhhhhhhhoo",
      ".oghhhhhhhhhfffo",
      "offffffffffffffo",
      "offfffefffeffffo",
      "offfffefffeffffo",
      "offffffffffffffo",
      ".offsssssssssffo",
      "..ossssssssssso.",
      "....oooooooo....",
      "................",
      "................",
      "................",
      "................"
    ]
  },
  {
    "frame": 6,
    "label": "Frame 6: Crest Fall",
    "heightPx": 30,
    "principle": "Descent Acceleration",
    "explanation": "Beginning downward gravitational drop; neutral sphere.",
    "holdMs": 80,
    "squashFactor": 0.9,
    "grid16": [
      ".....oooooo.....",
      "...oogghhhhoo...",
      "..oghhhhhhhhho..",
      ".oghhhhhhhhhho..",
      ".ohfffffffffffo.",
      "offffffffffffffo",
      "offffffffffffffo",
      "offfffeffefffffo",
      "offfffeffefffffo",
      "offffffffffffffo",
      ".offsssssssssfo.",
      ".osssssssssssso.",
      "..osssssssssso..",
      "...oossssssoo...",
      ".....oooooo.....",
      "................"
    ]
  },
  {
    "frame": 7,
    "label": "Frame 7: Accelerated Drop",
    "heightPx": 24,
    "principle": "Gravity Fall",
    "explanation": "Accelerating downward into terminal velocity.",
    "holdMs": 60,
    "squashFactor": 0.75,
    "grid16": [
      ".....oooooo.....",
      "...oogghhhhoo...",
      "..oghhhhhhhhfo..",
      "..ohffffffffffo.",
      "..ohffffffffffo.",
      "..offfffffffffo.",
      "..offfefffefffo.",
      "..offfefffefffo.",
      "..offfefffefffo.",
      "..offfffffffffo.",
      "..offssssssssfo.",
      "..ossssssssssfo.",
      "..ossssssssssfo.",
      "...oossssssoo...",
      ".....oooooo.....",
      "................"
    ]
  },
  {
    "frame": 8,
    "label": "Frame 8: Terminal Fall",
    "heightPx": 16,
    "principle": "Terminal Smear",
    "explanation": "Maximum fall speed approaching the floor plane.",
    "holdMs": 50,
    "squashFactor": 0.7,
    "grid16": [
      ".....oooooo.....",
      "....oogghhoo....",
      "...ooghhhhffo...",
      "...ohffffffffo..",
      "...ohffffffffo..",
      "...ohffffffffo..",
      "...offeffefffo..",
      "...offeffefffo..",
      "...offeffefffo..",
      "...offfffffffo..",
      "...offfffffffo..",
      "...offsssssffo..",
      "...ossssssssso..",
      "...ossssssssso..",
      "....oossssoo....",
      ".....oooooo....."
    ]
  },
  {
    "frame": 9,
    "label": "Frame 9: Floor Impact",
    "heightPx": 0,
    "principle": "Ground Contact",
    "explanation": "Initial impact with floor plane touching baseline.",
    "holdMs": 60,
    "squashFactor": 1.0,
    "grid16": [
      ".....oooooo.....",
      "...oogghhhhoo...",
      "..oghhhhhhhhho..",
      ".oghhhhhhhhhho..",
      ".ohfffffffffffo.",
      "offffffffffffffo",
      "offffffffffffffo",
      "offfffeffefffffo",
      "offfffeffefffffo",
      "offffffffffffffo",
      ".offsssssssssfo.",
      ".osssssssssssso.",
      "..osssssssssso..",
      "...oossssssoo...",
      ".....oooooo.....",
      "................"
    ]
  },
  {
    "frame": 10,
    "label": "Frame 10: Pancake Splatter Squash",
    "heightPx": 0,
    "principle": "Maximum Squash",
    "explanation": "Extreme horizontal flattening before rebounding to rest.",
    "holdMs": 120,
    "squashFactor": 1.6,
    "grid16": [
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "...oooooooooo...",
      ".oogghhhhhhhhhoo",
      "offffffffffffffo",
      "offfffeffffefffo",
      "osssssssssssssso",
      "oooooooooooooooo",
      "................"
    ]
  }
];


export const TEACHING_CHARACTERS: Record<'bun' | 'slime', TeachingCharacter> = {
  bun: {
    id: 'bun',
    name: 'Bun',
    tagline: 'PixiBun Mascot (Cozy Rabbit)',
    defaultPaletteId: 'wisteria',
    buildingSteps: BUN_BUILDING_STEPS,
    jumpFrames: BUN_JUMP_FRAMES,
  },
  slime: {
    id: 'slime',
    name: 'Gel Slime',
    tagline: 'Classic Atelier Creature',
    defaultPaletteId: 'matcha',
    buildingSteps: SLIME_BUILDING_STEPS,
    jumpFrames: SLIME_JUMP_FRAMES,
  },
};

export function resolvePixelColor(char: string, palette: AltPalette): string | null {
  switch (char) {
    case 'o': return palette.outline;
    case 'f': return palette.fill;
    case 's': return palette.shade;
    case 'h': return palette.highlight;
    case 'g': return palette.glint;
    case 'e': return palette.feature;
    case 'r': return palette.blush;
    case '.': case ' ': default: return null;
  }
}

export function loadTeachingAnimationIntoPlayground(char: TeachingCharacter, palette: AltPalette): void {
  const studio = useStudioStore.getState();
  if (studio.canvasWidth !== 16 || studio.canvasHeight !== 16) {
    studio.setCanvasSize(16, 16);
  }
  studio.setFps(10);

  let freshFrames = useStudioStore.getState().frames;
  while (freshFrames.length < char.jumpFrames.length) {
    useStudioStore.getState().addFrame();
    freshFrames = useStudioStore.getState().frames;
  }
  while (freshFrames.length > char.jumpFrames.length) {
    useStudioStore.getState().deleteFrame(freshFrames.length - 1);
    freshFrames = useStudioStore.getState().frames;
  }

  const state = useStudioStore.getState();
  char.jumpFrames.forEach((frameDef, fIdx) => {
    state.setFrameDuration(fIdx, frameDef.holdMs, true);
    const targetFrame = state.frames[fIdx];
    if (!targetFrame || !targetFrame.layers[0]) return;
    const layerId = targetFrame.layers[0].id;
    const buf = getOrCreateBuffer(layerId, 16, 16);
    const ctx = buf.ctx;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, 16, 16);
    frameDef.grid16.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const color = resolvePixelColor(row[x], palette);
        if (color) {
          ctx.fillStyle = color;
          ctx.fillRect(x, y, 1, 1);
        }
      }
    });
    touchBuffer(layerId);
  });

  state.bumpBufferVersion();
  state.setActiveFrame(0);
}
