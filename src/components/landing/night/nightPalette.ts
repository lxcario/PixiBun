import type { CSSProperties } from 'react';

/**
 * Theme tokens for sections painted as night-time scenes. Those backdrops stay dark in
 * either theme, so their text and controls always use the night palette.
 */
export const NIGHT_VARS = {
  '--text-heading': '#fff3e0',
  '--text-body': '#e9dcf2',
  '--text-muted': '#b9a8cf',
  '--accent-gold': '#ffd285',
  '--accent-plum': '#dcabdf',
  '--accent-wisteria': '#c792df',
  '--desk-surface': '#1d1336',
  '--desk-surface-raised': '#2a1945',
  '--desk-border': '#46306a',
  '--desk-border-highlight': '#5d4486',
  '--btn-bg': '#2a1945',
  '--btn-hover': '#3d2052',
  '--btn-border': '#46306a',
  '--btn-text': '#fff3e0',
  '--btn-shadow': '#0b0714',
} as CSSProperties;
