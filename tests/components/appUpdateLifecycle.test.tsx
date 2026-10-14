// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { ServiceWorkerRegistrar } from '@/components/system/ServiceWorkerRegistrar';
import { prepareAppRestart, reloadAppPage } from '@/lib/system/appRestart';

vi.mock('@/lib/system/appRestart', () => ({ prepareAppRestart: vi.fn(async () => {}), reloadAppPage: vi.fn() }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
function installWorker() {
  const events = new Map<string, (event: unknown) => void>();
  const postMessage = vi.fn();
  const waiting = { state: 'installed', postMessage, addEventListener: vi.fn() };
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: {
    controller: { postMessage: vi.fn() },
    register: vi.fn(async () => ({ waiting, installing: null, addEventListener: vi.fn() })),
    addEventListener: (name: string, callback: (event: unknown) => void) => events.set(name, callback),
  } });
  return { events, postMessage };
}
describe('explicit update restart', () => {
  it('saves before activation and reloads only after controller change', async () => {
    const { events, postMessage } = installWorker(); render(<ServiceWorkerRegistrar />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Restart to update' })).toBeDefined());
    events.get('controllerchange')?.({}); expect(reloadAppPage).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Restart to update' }));
    await waitFor(() => expect(postMessage).toHaveBeenCalledWith({ type: 'APPLY_UPDATE' }));
    expect(prepareAppRestart).toHaveBeenCalledTimes(1); expect(reloadAppPage).not.toHaveBeenCalled();
    events.get('controllerchange')?.({});
    await waitFor(() => expect(reloadAppPage).toHaveBeenCalledTimes(1));
    expect(prepareAppRestart).toHaveBeenCalledTimes(2);
  });
  it('keeps the page and worker unchanged when artwork cannot save', async () => {
    const { postMessage } = installWorker(); vi.mocked(prepareAppRestart).mockRejectedValueOnce(new Error('Storage unavailable'));
    render(<ServiceWorkerRegistrar />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Restart to update' })).toBeDefined());
    fireEvent.click(screen.getByRole('button', { name: 'Restart to update' }));
    await waitFor(() => expect(screen.getByText('Storage unavailable')).toBeDefined());
    expect(postMessage).not.toHaveBeenCalled(); expect(reloadAppPage).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Restart to update' }).hasAttribute('disabled')).toBe(false);
  });
});
