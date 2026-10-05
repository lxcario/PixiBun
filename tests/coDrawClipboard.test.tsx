// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { CoDrawModal } from '@/components/modals/CoDrawModal';
import { coDrawBridge } from '@/lib/sync/coDrawBridge';

vi.mock('@/components/ui/ModalWrapper', () => ({ ModalWrapper: ({ isOpen, children }: { isOpen: boolean; children: React.ReactNode }) => isOpen ? <div>{children}</div> : null }));
vi.mock('@/lib/sync/coDrawBridge', () => ({ coDrawBridge: {
  getRole: vi.fn(() => 'host'), getSession: vi.fn(() => null), getConnectionState: vi.fn(() => 'idle'),
  startHost: vi.fn(async () => 'invite-fixture'), disconnect: vi.fn(),
} }));

beforeEach(() => { vi.clearAllMocks(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });
async function host() {
  const props = { isOpen: true, onClose: vi.fn(), onJoinGuest: vi.fn(async () => 'answer-fixture') };
  const view = render(<CoDrawModal {...props} />);
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Generate Invite Code' })); });
  await screen.findByRole('textbox', { name: 'Generated invite code' });
  return { ...view, props };
}
function clipboard(writeText?: (text: string) => Promise<void>) {
  vi.spyOn(navigator, 'clipboard', 'get').mockReturnValue(writeText ? { writeText } as Clipboard : undefined as unknown as Clipboard);
}
it('shows pending, waits for success and expires success feedback', async () => {
  let finish!: () => void; const write = vi.fn(() => new Promise<void>(resolve => { finish = resolve; })); clipboard(write);
  await host(); vi.useFakeTimers(); fireEvent.click(screen.getByRole('button', { name: /^Copy$/ }));
  expect(write).toHaveBeenCalledWith('invite-fixture'); expect(screen.queryByText('Copied!')).toBeNull();
  expect((screen.getByRole('button', { name: 'Copying…' }) as HTMLButtonElement).disabled).toBe(true);
  await act(async () => { finish(); }); expect(screen.getByRole('status').textContent).toBe('Invite code copied.');
  act(() => { vi.advanceTimersByTime(2000); }); expect(screen.queryByRole('status')).toBeNull();
  expect(screen.getByRole('button', { name: /^Copy$/ })).toBeTruthy();
});
it.each(['denied', 'unavailable'])('offers a selected manual fallback when clipboard is %s and allows retry', async reason => {
  const write = vi.fn(async () => { throw new DOMException('denied', 'NotAllowedError'); }); clipboard(reason === 'denied' ? write : undefined);
  await host(); fireEvent.click(screen.getByRole('button', { name: /^Copy$/ }));
  expect((await screen.findByRole('alert')).textContent).toContain('copy it manually');
  const field = screen.getByRole('textbox', { name: 'Generated invite code' }) as HTMLTextAreaElement;
  expect(document.activeElement).toBe(field); expect(field.selectionStart).toBe(0); expect(field.selectionEnd).toBe(field.value.length);
  expect(screen.queryByText('Copied!')).toBeNull();
  clipboard(vi.fn(async () => {})); fireEvent.click(screen.getByRole('button', { name: /^Copy$/ }));
  expect((await screen.findByRole('status')).textContent).toBe('Invite code copied.'); expect(screen.queryByRole('alert')).toBeNull();
});
it('does not let a late invite copy mark a different tab or reopened modal copied', async () => {
  let finish!: () => void; clipboard(() => new Promise<void>(resolve => { finish = resolve; }));
  const view = await host(); fireEvent.click(screen.getByRole('button', { name: /^Copy$/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Join Session' })); await act(async () => { finish(); });
  expect(screen.queryByRole('status')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Host Session' })); fireEvent.click(screen.getByRole('button', { name: /^Copy$/ }));
  view.rerender(<CoDrawModal {...view.props} isOpen={false} />); view.rerender(<CoDrawModal {...view.props} />);
  await act(async () => { finish(); }); expect(screen.queryByText('Copied!')).toBeNull();
  expect(screen.getByRole('button', { name: /^Copy$/ })).toBeTruthy();
});
it('copies the guest answer rather than an earlier invite and clears feedback on unmount', async () => {
  const write = vi.fn(async () => {}); clipboard(write); const view = await host();
  fireEvent.click(screen.getByRole('button', { name: 'Join Session' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Host invite code input' }), { target: { value: 'host-token' } });
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Save My Drawing & Join Separately' })); });
  await screen.findByRole('textbox', { name: 'Generated answer token' }); vi.useFakeTimers();
  fireEvent.click(screen.getByRole('button', { name: /^Copy$/ }));
  await act(async () => {}); expect(write).toHaveBeenCalledWith('answer-fixture');
  expect(screen.getByRole('status').textContent).toBe('Answer token copied.');
  view.unmount(); expect(vi.getTimerCount()).toBe(0); expect(coDrawBridge.disconnect).not.toHaveBeenCalled();
});
