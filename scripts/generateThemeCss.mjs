import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const THEME_DATA_PATH = 'src/lib/theme/themes.json';
export const THEME_CSS_PATH = 'src/app/themes.generated.css';

const svg = (markup) => `url("data:image/svg+xml,${encodeURIComponent(markup).replace(/'/g, '%27')}")`;
const chevron = (fill) => svg(`<svg xmlns='http://www.w3.org/2000/svg' width='8' height='6' viewBox='0 0 8 6' shape-rendering='crispEdges'><path d='M0 0h8v2H6v2H4v2H4V4H2V2H0z' fill='${fill}'/></svg>`);
const check = (fill) => svg(`<svg xmlns='http://www.w3.org/2000/svg' width='10' height='8' viewBox='0 0 10 8' shape-rendering='crispEdges'><path d='M8 0h2v2H8v2H6v2H4v2H2V6H0V4h2v2h2V4h2V2h2z' fill='${fill}'/></svg>`);

/** Core palette fields, mapped onto the token names the studio already uses. */
const CORE_TOKENS = {
  bg: '--desk-bg',
  surface: '--desk-surface',
  raised: '--desk-surface-raised',
  sunken: '--surface-0',
  elevated: '--surface-3',
  border: '--desk-border',
  borderHi: '--desk-border-highlight',
  borderSubtle: '--border-subtle',
  heading: '--text-heading',
  body: '--text-body',
  muted: '--text-muted',
  accent: '--accent-gold',
  accent2: '--accent-wisteria',
  accent3: '--accent-plum',
  positive: '--accent-sage',
  danger: '--state-danger',
  ink: '--ink',
  hover: '--btn-hover',
  active: '--state-active',
  primary: '--primary-bg',
  primaryFg: '--primary-fg',
  primaryShade: '--primary-shade',
  primaryShine: '--primary-shine',
  frame: '--frame-wood',
  frameLight: '--frame-light',
  frameDark: '--frame-dark',
};

export const PALETTE_FIELDS = Object.keys(CORE_TOKENS);

/** Secondary tokens derived from the core palette, identical for every theme. */
const DERIVED_TOKENS = `
  --btn-bg: var(--desk-surface-raised);
  --btn-border: var(--desk-border);
  --btn-text: var(--text-heading);
  --btn-shadow: var(--ink);
  --focus-ring: 0 0 0 2px var(--accent-gold);
  --surface-1: var(--desk-surface);
  --surface-2: var(--desk-surface-raised);
  --state-hover: var(--btn-hover);
  --state-selected: var(--accent-gold);
  --state-disabled: var(--text-muted);
  --state-success: var(--accent-sage);
  --canvas-well: var(--surface-0);
  --canvas-border: var(--border-subtle);
  --platen-bg: var(--desk-surface-raised);
  --platen-border: var(--desk-border);
  --platen-mark: var(--desk-border-highlight);
  --canvas-shadow: 0 6px 0 var(--shadow-far), 0 0 0 2px var(--ink);
  --studio-bg: var(--desk-bg);
  --surface-base: var(--desk-surface);
  --surface-raised: var(--desk-surface-raised);
  --surface-sunken: var(--surface-0);
  --surface-hover: var(--btn-hover);
  --border-default: var(--desk-border);
  --border-emphasis: var(--desk-border-highlight);
  --accent-creative: var(--accent-gold);
  --accent-navigation: var(--accent-wisteria);
  --accent-positive: var(--accent-sage);
  --control-bg: var(--btn-bg);
  --control-hover: var(--btn-hover);
  --control-active: var(--state-active);
  --control-border: var(--desk-border);
  --shadow-tactile: 0 2px 0 var(--ink);
  --primary-hover: color-mix(in srgb, var(--primary-bg) 78%, #ffffff);
  --glow: color-mix(in srgb, var(--accent-gold) 35%, transparent);
  --menu-hover: color-mix(in srgb, var(--accent-gold) 14%, transparent);
  --shadow-far: color-mix(in srgb, var(--ink) 55%, transparent);
  --danger-bg: color-mix(in srgb, var(--state-danger) 16%, var(--desk-surface));
  --danger-border: color-mix(in srgb, var(--state-danger) 60%, var(--desk-border));
  --danger-fg: var(--state-danger);
  --tool-active-bg: var(--primary-bg);
  --tool-active-fg: var(--primary-fg);
  --tool-active-border: var(--ink);
  --tool-active-shadow: 0 2px 0 var(--ink);
  --tool-active-transform: none;
  --tool-inactive-hover-bg: var(--btn-hover);
  --tool-inactive-hover-fg: var(--accent-gold);
  --timeline-frame-active-bg: var(--state-active);
  --timeline-frame-active-border: var(--accent-gold);
  --timeline-frame-active-shadow: 0 2px 0 var(--ink);
  --timeline-frame-active-fg: var(--accent-gold);
  --timeline-frame-hover-bg: var(--btn-hover);
  --timeline-frame-hover-border: color-mix(in srgb, var(--accent-gold) 60%, transparent);
  --inspector-tab-active-bg: var(--desk-surface-raised);
  --inspector-tab-active-border: var(--accent-gold);
  --inspector-tab-active-fg: var(--accent-gold);
  --color-well-primary-border: var(--accent-gold);
  --color-well-secondary-border: var(--desk-border);
  --moon-ink: var(--ink);
  --moon-glow: var(--glow);
  --moon-card: color-mix(in srgb, var(--desk-surface) 88%, transparent);
  --moon-card-edge: var(--desk-border);
  --moon-card-drop: inset 0 1px 0 color-mix(in srgb, var(--text-heading) 8%, transparent), 0 4px 0 var(--ink), 0 16px 34px var(--shadow-far);
  --frame-glow: color-mix(in srgb, var(--primary-bg) 14%, transparent);
`;

function block(selector, scheme, palette, theme) {
  const lines = [`  color-scheme: ${scheme};`];
  for (const [field, token] of Object.entries(CORE_TOKENS)) lines.push(`  ${token}: ${palette[field]};`);
  lines.push(`  --control-border-w: ${theme.controlBorderWidth ?? 2}px;`);
  lines.push(`  --moon-chevron: ${chevron(palette.accent)};`);
  lines.push(`  --moon-check: ${check(palette.primaryFg)};`);
  return `${selector} {\n${lines.join('\n')}\n}`;
}

export function validateThemeData(data) {
  const ids = new Set();
  for (const theme of data.themes) {
    if (!/^[a-z][a-z0-9-]{0,31}$/.test(theme.id) || ids.has(theme.id)) throw new Error(`Invalid or duplicate theme id: ${theme.id}`);
    ids.add(theme.id);
    if (theme.layout !== 'scene' && theme.layout !== 'flat') throw new Error(`${theme.id}: layout must be scene or flat`);
    for (const mode of ['night', 'day']) {
      for (const field of PALETTE_FIELDS) {
        if (!/^#[0-9a-f]{6}$/.test(theme[mode]?.[field] ?? '')) throw new Error(`${theme.id}.${mode}.${field} must be a lowercase #rrggbb color`);
      }
    }
  }
  if (!ids.has(data.defaultTheme)) throw new Error('defaultTheme must name a theme');
}

export function buildThemeCss(data) {
  validateThemeData(data);
  const out = [`/* GENERATED by scripts/generateThemeCss.mjs from ${THEME_DATA_PATH}. Do not edit; run npm run themes:css. */`];
  for (const theme of data.themes) {
    out.push(`/* ${theme.name}: ${theme.blurb} / ${theme.dayBlurb} */`);
    out.push(block(`html[data-studio-theme="${theme.id}"]`, 'dark', theme.night, theme));
    out.push(block(`html[data-studio-theme="${theme.id}"][data-color-scheme="light"]`, 'light', theme.day, theme));
  }
  out.push(`/* Tokens every theme derives from its core palette */\nhtml[data-studio-theme][data-color-scheme] {${DERIVED_TOKENS}}`);
  return out.join('\n\n') + '\n';
}

export function readThemeData(root = process.cwd()) {
  return JSON.parse(readFileSync(path.join(root, THEME_DATA_PATH), 'utf8'));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  writeFileSync(THEME_CSS_PATH, buildThemeCss(readThemeData()));
  console.log(`Wrote ${THEME_CSS_PATH}.`);
}
