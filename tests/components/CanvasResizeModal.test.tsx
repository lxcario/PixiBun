// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { CanvasResizeModal } from '@/components/modals/CanvasResizeModal';
import { useStudioStore } from '@/stores/studioStore';

const initial = useStudioStore.getState();
beforeEach(() => useStudioStore.setState({ ...initial, canvasWidth: 16, canvasHeight: 16 }, true));
afterEach(() => { cleanup(); useStudioStore.setState(initial, true); });

// A person selects the field and types one key at a time: the first key replaces the selection,
// and each later key is appended to whatever the field shows at that moment.
const type = (field: HTMLElement, text: string) => {
  const input = field as HTMLInputElement;
  [...text].forEach((key, i) => fireEvent.change(input, { target: { value: (i === 0 ? '' : input.value) + key } }));
};
const value = (label: string) => (screen.getByLabelText(label) as HTMLInputElement).value;

it('lets a size be typed digit by digit and keeps the aspect lock', () => {
  const resize = vi.fn(), close = vi.fn();
  render(<CanvasResizeModal isOpen onClose={close} onResize={resize} />);
  type(screen.getByLabelText('Width (px)'), '24');
  expect(value('Width (px)')).toBe('24');
  expect(value('Height (px)')).toBe('24');
  type(screen.getByLabelText('Height (px)'), '32');
  expect([value('Width (px)'), value('Height (px)')]).toEqual(['32', '32']);
  fireEvent.click(screen.getByRole('button', { name: 'Apply Resize' }));
  expect(resize).toHaveBeenCalledWith(32, 32, 'center', false);
});

it('clamps out-of-range sizes to 4 and 512 once the field is left or Enter is pressed', () => {
  render(<CanvasResizeModal isOpen onClose={vi.fn()} onResize={vi.fn()} />);
  const width = screen.getByLabelText('Width (px)');
  type(width, '0'); fireEvent.blur(width);
  expect([value('Width (px)'), value('Height (px)')]).toEqual(['4', '4']);
  type(width, '513'); fireEvent.keyDown(width, { key: 'Enter' });
  expect([value('Width (px)'), value('Height (px)')]).toEqual(['512', '512']);
  fireEvent.change(width, { target: { value: '' } }); fireEvent.blur(width);
  expect(value('Width (px)')).toBe('512');
});

it('never applies an out-of-range size, even when Apply is pressed mid-typing', () => {
  const resize = vi.fn();
  render(<CanvasResizeModal isOpen onClose={vi.fn()} onResize={resize} />);
  fireEvent.click(screen.getByLabelText('Lock Aspect Ratio', { exact: false }));
  type(screen.getByLabelText('Width (px)'), '900');
  fireEvent.click(screen.getByRole('button', { name: 'Apply Resize' }));
  expect(resize).toHaveBeenCalledWith(512, 16, 'center', false);
});

it('cancels without resizing', () => {
  const resize = vi.fn(), close = vi.fn();
  render(<CanvasResizeModal isOpen onClose={close} onResize={resize} />);
  type(screen.getByLabelText('Width (px)'), '24');
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(close).toHaveBeenCalledOnce(); expect(resize).not.toHaveBeenCalled();
});
