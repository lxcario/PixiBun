// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { PaletteCycleColors } from '@/components/layout/inspector/PaletteCycleColors';
import type { PaletteCycleTrack } from '@/types/palette';

const colors = ['#080808', '#664422', '#C43C18', '#D88000', '#FF8C00', '#FFB833'];
const track: PaletteCycleTrack = { id: 'fire', low: 0, high: 5, rate: 6, direction: 'forward', enabled: true, blendShift: false };
afterEach(cleanup);

it('lets an artist choose the fire range by swatch and shows both endpoints', () => {
  const change = vi.fn();
  const view = render(<PaletteCycleColors colors={colors} track={track} onChange={change} />);
  fireEvent.click(screen.getByRole('button', { name: 'First color 2: #C43C18' }));
  expect(change).toHaveBeenCalledWith({ low: 2, high: 5 });
  view.rerender(<PaletteCycleColors colors={colors} track={{ ...track, low: 2 }} onChange={change} />);
  expect(screen.getByRole('button', { name: 'First color 2: #C43C18' }).getAttribute('aria-pressed')).toBe('true');
  expect(screen.getByRole('button', { name: 'Last color 5: #FFB833' }).getAttribute('aria-pressed')).toBe('true');
  expect(screen.getByLabelText('Colors that will animate').children).toHaveLength(4);
});

it('keeps endpoints ordered when the new first or last crosses the other endpoint', () => {
  const change = vi.fn();
  render(<PaletteCycleColors colors={colors} track={{ ...track, low: 2, high: 3 }} onChange={change} />);
  fireEvent.click(screen.getByRole('button', { name: 'First color 5: #FFB833' }));
  expect(change).toHaveBeenLastCalledWith({ low: 5, high: 5 });
  fireEvent.click(screen.getByRole('button', { name: 'Last color 1: #664422' }));
  expect(change).toHaveBeenLastCalledWith({ low: 1, high: 1 });
});
