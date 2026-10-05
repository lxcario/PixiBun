import type { ColorPalette } from '@/types/palette';

export interface ArtistPalette extends ColorPalette { source: string; category: 'General' | 'Limited' }
// Colors and creator credits checked against the linked palette records, 4 October 2026.
export const ARTIST_PALETTES: ArtistPalette[] = [
  { id: 'sweetie-16', name: 'Sweetie 16', author: 'GrafxKid', category: 'General', source: 'https://lospec.com/palette-list/sweetie-16',
    colors: ['#1a1c2c', '#5d275d', '#b13e53', '#ef7d57', '#ffcd75', '#a7f070', '#38b764', '#257179', '#29366f', '#3b5dc9', '#41a6f6', '#73eff7', '#f4f4f4', '#94b0c2', '#566c86', '#333c57'] },
  { id: 'dawnbringer-16', name: 'DawnBringer 16', author: 'DawnBringer', category: 'General', source: 'https://lospec.com/palette-list/dawnbringer-16',
    colors: ['#140c1c', '#442434', '#30346d', '#4e4a4e', '#854c30', '#346524', '#d04648', '#757161', '#597dce', '#d27d2c', '#8595a1', '#6daa2c', '#d2aa99', '#6dc2ca', '#dad45e', '#deeed6'] },
  { id: 'endesga-16', name: 'Endesga 16', author: 'ENDESGA', category: 'General', source: 'https://lospec.com/palette-list/endesga-16',
    colors: ['#e4a672', '#b86f50', '#743f39', '#3f2832', '#9e2835', '#e53b44', '#fb922b', '#ffe762', '#63c64d', '#327345', '#193d3f', '#4f6781', '#afbfd2', '#ffffff', '#2ce8f4', '#0484d1'] },
  { id: '1bit-monitor-glow', name: '1bit Monitor Glow', author: 'Polyducks', category: 'Limited', source: 'https://lospec.com/palette-list/1bit-monitor-glow', colors: ['#222323', '#f0f6f0'] },
];
export function samePaletteColors(a: string[], b: string[]) { return a.length === b.length && a.every((color, i) => color.toLowerCase() === b[i].toLowerCase()); }
