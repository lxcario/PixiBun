// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { CreatePaletteModal } from '@/components/modals/CreatePaletteModal';
import { useStudioStore } from '@/stores/studioStore';

const initial = useStudioStore.getState();
beforeEach(() => useStudioStore.setState({ ...initial, palettes: [{ id: 'starter', name: 'Starter', colors: ['#FFAA33', '#664422'] }], currentPaletteId: 'starter', primaryColor: '#FFAA33' }, true));
afterEach(() => { cleanup(); useStudioStore.setState(initial, true); });

it('normalizes shorthand colors and refuses unfinished names or hex values', () => {
  const save = vi.fn(() => true), close = vi.fn();
  useStudioStore.setState({ addExtractedPalette: save });
  render(<CreatePaletteModal onClose={close} />);
  const name = screen.getByLabelText('Palette name'), hex = screen.getByLabelText('Hex color');
  const create = screen.getByRole('button', { name: 'Create palette' });
  fireEvent.change(name, { target: { value: ' ' } }); expect(create.hasAttribute('disabled')).toBe(true);
  fireEvent.change(name, { target: { value: ' Campfire ' } });
  fireEvent.change(hex, { target: { value: '#GGGGGG' } }); expect(create.hasAttribute('disabled')).toBe(true);
  fireEvent.change(hex, { target: { value: '#abc' } }); fireEvent.click(create);
  expect(save).toHaveBeenCalledWith('Campfire', ['#AABBCC']); expect(close).toHaveBeenCalledOnce();
});

it('copies into an isolated draft and cancels without changing the source palette', () => {
  const close = vi.fn(); render(<CreatePaletteModal onClose={close} />);
  fireEvent.click(screen.getByRole('button', { name: 'Copy palette' }));
  fireEvent.change(screen.getByLabelText('Hex color'), { target: { value: '#12345680' } });
  fireEvent.click(screen.getByRole('button', { name: 'Move right' }));
  expect(screen.getByRole('button', { name: 'Edit color 2: #12345680' }).getAttribute('aria-pressed')).toBe('true');
  fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(close).toHaveBeenCalledOnce();
  expect(useStudioStore.getState().palettes[0].colors).toEqual(['#FFAA33', '#664422']);
  expect(useStudioStore.getState().currentPaletteId).toBe('starter');
});

it('retains the named draft when history admission refuses creation', () => {
  const close = vi.fn(); useStudioStore.setState({ addExtractedPalette: () => false });
  render(<CreatePaletteModal onClose={close} />);
  fireEvent.change(screen.getByLabelText('Palette name'), { target: { value: 'Keep this draft' } });
  fireEvent.click(screen.getByRole('button', { name: 'Create palette' }));
  expect(screen.getByRole('alert').textContent).toContain('Your draft is still here');
  expect((screen.getByLabelText('Palette name') as HTMLInputElement).value).toBe('Keep this draft');
  expect(close).not.toHaveBeenCalled();
});
