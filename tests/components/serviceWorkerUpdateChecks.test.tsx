// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { ServiceWorkerRegistrar, UPDATE_CHECK_INTERVAL_MS, UPDATE_RECHECK_ON_RETURN_MS } from '@/components/system/ServiceWorkerRegistrar';

let update: ReturnType<typeof vi.fn>;
let visibility: DocumentVisibilityState = 'visible';

beforeEach(() => {
  vi.useFakeTimers();
  update = vi.fn().mockResolvedValue(undefined);
  visibility = 'visible';
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility });
  Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => true });
  Object.defineProperty(globalThis.navigator, 'serviceWorker', {
    configurable: true, writable: true,
    value: {
      controller: {}, addEventListener: vi.fn(), removeEventListener: vi.fn(),
      register: vi.fn().mockResolvedValue({ waiting: null, installing: null, active: {}, update, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
    },
  });
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

const mount = async () => { const view = render(<ServiceWorkerRegistrar />); await act(async () => { await Promise.resolve(); await Promise.resolve(); }); return view; };
const setVisibility = (state: DocumentVisibilityState) => { visibility = state; document.dispatchEvent(new Event('visibilitychange')); };

describe('update checks for long-lived pages', () => {
  it('asks for a new worker every hour', async () => {
    await mount();
    expect(update).not.toHaveBeenCalled();
    await act(async () => { vi.advanceTimersByTime(UPDATE_CHECK_INTERVAL_MS); });
    expect(update).toHaveBeenCalledTimes(1);
    await act(async () => { vi.advanceTimersByTime(UPDATE_CHECK_INTERVAL_MS); });
    expect(update).toHaveBeenCalledTimes(2);
  });
  it('checks on return after a while away, but not after a brief switch', async () => {
    await mount();
    setVisibility('hidden'); vi.advanceTimersByTime(60_000); setVisibility('visible');
    expect(update).not.toHaveBeenCalled();
    setVisibility('hidden'); vi.advanceTimersByTime(UPDATE_RECHECK_ON_RETURN_MS); setVisibility('visible');
    expect(update).toHaveBeenCalledTimes(1);
  });
  it('skips checks while offline and tolerates a failed check', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false });
    await mount();
    await act(async () => { vi.advanceTimersByTime(UPDATE_CHECK_INTERVAL_MS); });
    expect(update).not.toHaveBeenCalled();
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => true });
    update.mockRejectedValueOnce(new Error('Network'));
    await act(async () => { vi.advanceTimersByTime(UPDATE_CHECK_INTERVAL_MS); });
    expect(update).toHaveBeenCalledTimes(1);
  });
  it('stops checking after unmount', async () => {
    const view = await mount();
    view.unmount();
    vi.advanceTimersByTime(UPDATE_CHECK_INTERVAL_MS * 3);
    setVisibility('hidden'); vi.advanceTimersByTime(UPDATE_RECHECK_ON_RETURN_MS); setVisibility('visible');
    expect(update).not.toHaveBeenCalled();
  });
});

describe('first install versus update', () => {
  const installing = () => {
    const listeners: Array<() => void> = [];
    return { state: 'installing', postMessage: vi.fn(), addEventListener: (_: string, listener: () => void) => listeners.push(listener), removeEventListener: vi.fn(), fire(state: string) { this.state = state; listeners.forEach(listener => listener()); } };
  };
  const mountWith = async (worker: ReturnType<typeof installing>, controller: () => unknown) => {
    Object.defineProperty(globalThis.navigator, 'serviceWorker', {
      configurable: true, writable: true,
      value: {
        get controller() { return controller(); }, addEventListener: vi.fn(), removeEventListener: vi.fn(),
        register: vi.fn().mockResolvedValue({ waiting: null, installing: worker, active: null, update, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
      },
    });
    const view = render(<ServiceWorkerRegistrar />);
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    return view;
  };
  it('shows no update banner when a first install reports "installed" after taking control (WebKit)', async () => {
    const worker = installing();
    const view = await mountWith(worker, () => worker);
    await act(async () => { worker.fire('installed'); });
    expect(view.queryByText(/A fresh PixiBun build is ready/i)).toBeNull();
  });
  it('shows the update banner when a new worker installs under another controller', async () => {
    const worker = installing();
    const view = await mountWith(worker, () => ({ id: 'previous build' }));
    await act(async () => { worker.fire('installed'); });
    expect(view.getByText(/A fresh PixiBun build is ready/i)).toBeDefined();
  });
});
