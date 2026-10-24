// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { CROSSFADE_MS, TIME_CHANGE_MS, switchColorScheme, toggleColorScheme } from '@/lib/theme/themeTransition';
import { useThemeStore } from '@/stores/themeStore';

// Day/Night crossfades the page while the homepage hero changes time inside its
// painting (the moon sets as the sun rises). Nothing is laid over the page: no
// widening circle (until 23 October), no flying sun or spinning ring (until 18 October).

let started = 0;

beforeEach(() => {
  started = 0;
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  Object.assign(document, {
    startViewTransition: (update: () => void) => {
      started++;
      update();
      return { ready: Promise.resolve(), finished: Promise.resolve() };
    },
  });
  useThemeStore.setState({ colorScheme: 'dark' });
});

afterEach(async () => {
  await Promise.resolve();
  delete (document as unknown as { startViewTransition?: unknown }).startViewTransition;
  vi.unstubAllGlobals();
});

it('crossfades to Day without laying anything over the page', () => {
  switchColorScheme('light');
  expect(useThemeStore.getState().colorScheme).toBe('light');
  expect(started).toBe(1);
  expect(document.documentElement.dataset.themeSwitch).toBe('to-day');
  expect(document.documentElement.style.getPropertyValue('--theme-ms')).toBe(`${CROSSFADE_MS}ms`);
  expect(document.querySelector('.theme-sky, .theme-eclipse')).toBeNull();
});

it('toggles back to Night, and the hero takes a little longer than the page', async () => {
  useThemeStore.setState({ colorScheme: 'light' });
  toggleColorScheme();
  expect(useThemeStore.getState().colorScheme).toBe('dark');
  expect(document.documentElement.dataset.themeSwitch).toBe('to-night');
  expect(TIME_CHANGE_MS).toBeGreaterThan(CROSSFADE_MS);
});

it('switches instantly for reduced motion', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
  switchColorScheme('light');
  expect(useThemeStore.getState().colorScheme).toBe('light');
  expect(started).toBe(0);
});
