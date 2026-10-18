import themeData from './themes.json';

export type ThemeLayout = 'scene' | 'flat';

export interface ThemePalette {
  bg: string; surface: string; raised: string; sunken: string; elevated: string;
  border: string; borderHi: string; borderSubtle: string;
  heading: string; body: string; muted: string;
  accent: string; accent2: string; accent3: string; positive: string; danger: string;
  ink: string; hover: string; active: string;
  primary: string; primaryFg: string; primaryShade: string; primaryShine: string;
  frame: string; frameLight: string; frameDark: string;
}

export interface StudioThemeDefinition {
  id: string;
  /** Name shown to people; ids stay stable because they are saved in localStorage. */
  name: string;
  blurb: string;
  dayBlurb: string;
  /** Scene themes float the panels over an animated backdrop; flat themes are plain and quiet. */
  layout: ThemeLayout;
  controlBorderWidth?: number;
  night: ThemePalette;
  day: ThemePalette;
}

export const STUDIO_THEMES: readonly StudioThemeDefinition[] = themeData.themes as StudioThemeDefinition[];
export const DEFAULT_THEME_ID: string = themeData.defaultTheme;

const BY_ID = new Map(STUDIO_THEMES.map(theme => [theme.id, theme]));

export function isThemeId(value: unknown): value is string {
  return typeof value === 'string' && BY_ID.has(value);
}

export function getStudioTheme(id: string): StudioThemeDefinition {
  return BY_ID.get(id) ?? BY_ID.get(DEFAULT_THEME_ID)!;
}

export function isSceneTheme(id: string): boolean {
  return getStudioTheme(id).layout === 'scene';
}
