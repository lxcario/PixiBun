import type { ColorPalette } from '@/types/palette';

/**
 * PixiBun's own cozy palettes, drawn up to match the studio's scene themes and
 * a few comfort-food moods. Each one runs dark to light, then adds accents.
 * Original to PixiBun (no outside credit), so they ship as project presets.
 */
export const COZY_PALETTES: ColorPalette[] = [
  {
    id: 'sakura-night-12',
    name: 'Sakura Night',
    author: 'PixiBun',
    colors: ['#0a0d24', '#1a2253', '#2e3a7a', '#5a63a8', '#3a1d3a', '#7c3062', '#d77ba3', '#f9b6cd', '#8a2419', '#d2412e', '#f2c879', '#fff4dc'],
    cycleTracks: [{ id: 'lantern-flicker', name: 'Lantern flicker', low: 8, high: 10, rate: 6, direction: 'ping-pong', blendShift: true, enabled: true }],
  },
  {
    id: 'cocoa-cabin-12',
    name: 'Cocoa Cabin',
    author: 'PixiBun',
    colors: ['#1a1210', '#3a261e', '#5c3d2c', '#8a5c3e', '#b88458', '#e0b48a', '#f6e6cf', '#ffffff', '#2a3a54', '#5f7f9e', '#a9c4de', '#ffbf6a'],
  },
  {
    id: 'rainy-cafe-10',
    name: 'Rainy Café',
    author: 'PixiBun',
    colors: ['#0b1016', '#1b2530', '#33424f', '#5c6f7e', '#93a7b4', '#d6e0e6', '#6a3e24', '#ffc36b', '#ff6fae', '#6ff2ff'],
  },
  {
    id: 'harvest-moon-12',
    name: 'Harvest Moon',
    author: 'PixiBun',
    colors: ['#1a0f12', '#3e2440', '#6a2a2e', '#a03c1c', '#d0602a', '#ff9f4a', '#ffcf86', '#f6e6c0', '#4a5a1e', '#7a8a2e', '#c8a04a', '#8a5a30'],
  },
  {
    id: 'harbor-light-12',
    name: 'Harbor Light',
    author: 'PixiBun',
    colors: ['#0c1322', '#1d3150', '#2f5a86', '#4f92c0', '#9fd0ef', '#ecf6fb', '#cc4a3c', '#ff8f7a', '#ffd27a', '#e8d9b8', '#9a8466', '#4a3a30'],
    cycleTracks: [{ id: 'sea-shimmer', name: 'Sea shimmer', low: 2, high: 4, rate: 3, direction: 'ping-pong', blendShift: true, enabled: true }],
  },
  {
    id: 'matcha-latte-8',
    name: 'Matcha Latte',
    author: 'PixiBun',
    colors: ['#1f2a1a', '#3d5230', '#6b8a4a', '#a8c47a', '#e2ecc4', '#f8f2e2', '#c9a27a', '#7a5238'],
  },
  {
    id: 'strawberry-milk-8',
    name: 'Strawberry Milk',
    author: 'PixiBun',
    colors: ['#3a1622', '#7a2a44', '#c44a6a', '#f07a96', '#ffb3c4', '#ffe4e8', '#fffaf4', '#8ac46a'],
  },
  {
    id: 'lavender-tea-8',
    name: 'Lavender Tea',
    author: 'PixiBun',
    colors: ['#221a33', '#463863', '#73609c', '#a891cc', '#d4c4ea', '#f6f0fa', '#e8c46a', '#7a9a6a'],
  },
  {
    id: 'peach-sunset-8',
    name: 'Peach Sunset',
    author: 'PixiBun',
    colors: ['#2a1630', '#5a2a4a', '#a03a52', '#e0645a', '#ff9a6a', '#ffc98a', '#fff0c4', '#6a8ac4'],
  },
  {
    id: 'mossy-woods-10',
    name: 'Mossy Woods',
    author: 'PixiBun',
    colors: ['#0f1610', '#1f2e1e', '#344a2c', '#55703e', '#86a052', '#c4d47e', '#f0f2d0', '#6a4a2c', '#a8783e', '#d8a85a'],
  },
];
