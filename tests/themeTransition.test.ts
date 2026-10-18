// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { switchColorScheme } from '@/lib/theme/themeTransition';
import { useThemeStore } from '@/stores/themeStore';

// The Day/Night switch spreads the new sky from the switch with a small sparkle
// burst. It no longer flies a large sun or moon into the page or spins a
// viewport-sized glowing ring (18 October: they looked random and were costly).

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  Object.assign(document, {
    startViewTransition: (update: () => void) => {
      update();
      return { ready: Promise.resolve(), finished: Promise.resolve() };
    },
  });
  useThemeStore.setState({ colorScheme: 'dark' });
});

afterEach(() => {
  document.querySelectorAll('.theme-sky').forEach((sky) => sky.remove());
  delete (document as unknown as { startViewTransition?: unknown }).startViewTransition;
  vi.unstubAllGlobals();
});

it('switches the scheme and shows only a sparkle burst at the switch', () => {
  switchColorScheme('light', { x: 120, y: 30 });
  expect(useThemeStore.getState().colorScheme).toBe('light');
  const sky = document.querySelector<HTMLElement>('.theme-sky');
  expect(sky?.classList.contains('theme-sky--day')).toBe(true);
  expect(sky?.style.getPropertyValue('--sky-x')).toBe('120px');
  expect(sky?.querySelectorAll('.theme-sky__burst i')).toHaveLength(10);
  expect(sky?.querySelector('.theme-sky__body, .theme-sky__ring, svg')).toBeNull();
});
