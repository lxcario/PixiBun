// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { diagnosticReason } from '@/lib/diagnostics/reason';

const mocks = vi.hoisted(() => ({ capture: vi.fn(), put: vi.fn(), count: vi.fn() }));
vi.mock('@/lib/storage/db', () => ({ db: { diagnostics: { put: mocks.put, count: mocks.count } } }));
vi.mock('@/lib/diagnostics/vitals', () => ({ initWebVitals: vi.fn() }));

beforeEach(() => { vi.useFakeTimers(); vi.resetModules(); window.localStorage.clear();
  vi.stubGlobal('indexedDB', {}); mocks.put.mockResolvedValue(undefined); mocks.count.mockResolvedValue(0);
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true })); });
afterEach(() => { cleanup(); vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe('bounded diagnostics capture', () => {
  it('deduplicates before storage and caps a distinct-event burst', async () => {
    const { captureDiagnostic } = await import('@/lib/diagnostics/capture');
    const same = await Promise.all(Array.from({ length: 1000 }, () => captureDiagnostic({ kind: 'error', message: 'loop' })));
    expect(same.filter(Boolean)).toHaveLength(1);
    const distinct = await Promise.all(Array.from({ length: 1000 }, (_, i) => captureDiagnostic({ kind: 'error', message: `error ${i}` })));
    expect(distinct.filter(Boolean)).toHaveLength(19);
    expect(mocks.put).toHaveBeenCalledTimes(20);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(await captureDiagnostic({ kind: 'error', message: 'loop' })).not.toBeNull();
  });
  it('sends one small delayed batch only with current consent', async () => {
    const { captureDiagnostic, setDiagnosticsSettings } = await import('@/lib/diagnostics/capture');
    setDiagnosticsSettings({ relayOptIn: true });
    for (let i = 0; i < 4; i++) await captureDiagnostic({ kind: 'error', message: `batch ${i}` });
    expect(fetch).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(5000);
    expect(fetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
    expect(body.events).toHaveLength(4);
    await captureDiagnostic({ kind: 'error', message: 'revoked' });
    setDiagnosticsSettings({ relayOptIn: false });
    await vi.advanceTimersByTimeAsync(5000);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('bounds queued writes when IndexedDB stalls and does not inherit removed consent', async () => {
    const { captureDiagnostic, setDiagnosticsSettings, getDiagnosticsSettings } = await import('@/lib/diagnostics/capture');
    setDiagnosticsSettings({ relayOptIn: true }); localStorage.clear();
    expect(getDiagnosticsSettings().relayOptIn).toBe(false);
    let resume!: () => void;
    const stalled = new Promise<void>(resolve => { resume = resolve; });
    mocks.put.mockImplementation(() => stalled);
    const pending = Array.from({ length: 20 }, (_, i) => captureDiagnostic({ kind: 'error', message: `stalled ${i}` }));
    await vi.advanceTimersByTimeAsync(60_000);
    expect(await captureDiagnostic({ kind: 'error', message: 'overflow after refill' })).toBeNull();
    expect(mocks.put).toHaveBeenCalledTimes(1);
    resume(); await Promise.all(pending);
    expect(mocks.put).toHaveBeenCalledTimes(20);
  });
  it('rechecks persisted consent before sending even when storage changes outside this tab', async () => {
    const { captureDiagnostic, setDiagnosticsSettings } = await import('@/lib/diagnostics/capture');
    setDiagnosticsSettings({ relayOptIn: true });
    await captureDiagnostic({ kind: 'error', message: 'other tab' });
    localStorage.setItem('pixibun-diagnostics', '{"enabled":true,"relayOptIn":false}');
    await vi.advanceTimersByTimeAsync(5000);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('captures circular, BigInt and throwing-accessor rejection reasons through the actual listener', async () => {
    const { DiagnosticsProvider } = await import('@/components/system/DiagnosticsProvider');
    render(<DiagnosticsProvider />);
    const circular: Record<string, unknown> = { value: 1n }; circular.self = circular;
    const reason = Object.defineProperty(circular, 'stack', { get() { throw new Error('getter'); }, enumerable: true });
    const event = new Event('unhandledrejection'); Object.defineProperty(event, 'reason', { value: reason });
    expect(() => window.dispatchEvent(event)).not.toThrow();
    await vi.runAllTicks();
    expect(mocks.put).toHaveBeenCalledWith(expect.objectContaining({ kind: 'unhandled-rejection', detail: expect.stringContaining('[circular]') }));
    expect(diagnosticReason(reason).detail).toContain('1n');
    expect(diagnosticReason(new Proxy({}, { ownKeys() { throw new Error('proxy'); } })).detail).toContain('unreadable');
  });
});
