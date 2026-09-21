// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getDiagnosticsSettings,
  setDiagnosticsSettings,
  captureDiagnostic,
} from '@/lib/diagnostics/capture';
import { APP_VERSION } from '@/config/version';
import packageJson from '../package.json';
import packageLockJson from '../package-lock.json';

describe('diagnostics capture & settings', () => {
  beforeEach(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    );
  });

  afterEach(() => {
    setDiagnosticsSettings({ enabled: true, relayOptIn: false });
    vi.restoreAllMocks();
  });

  it('enforces version equality across APP_VERSION, package.json, and package-lock.json', () => {
    expect(APP_VERSION).toBe('1.14.1');
    expect(APP_VERSION).toBe(packageJson.version);
    expect(APP_VERSION).toBe(packageLockJson.version);
  });

  it('provides default settings with local capture enabled and relay disabled', () => {
    const settings = getDiagnosticsSettings();
    expect(settings.enabled).toBe(true);
    expect(settings.relayOptIn).toBe(false);
  });

  it('persists updated settings to localStorage', () => {
    setDiagnosticsSettings({ relayOptIn: true });
    const updated = getDiagnosticsSettings();
    expect(updated.relayOptIn).toBe(true);
  });

  it('captures diagnostic entry and truncates oversized detail stack', async () => {
    const hugeStack = 'A'.repeat(5000);
    const entry = await captureDiagnostic({
      kind: 'error',
      message: 'Test simulated error',
      detail: hugeStack,
      route: '/studio',
    });

    expect(entry).not.toBeNull();
    if (entry) {
      expect(entry.id.startsWith('diag-')).toBe(true);
      expect(entry.kind).toBe('error');
      expect(entry.message).toBe('Test simulated error');
      expect(entry.detail?.length).toBeLessThanOrEqual(2048 + '...[truncated]'.length);
      expect(entry.detail?.endsWith('...[truncated]')).toBe(true);
      expect(entry.route).toBe('/studio');
      expect(entry.appVersion).toBe(APP_VERSION);
    }
  });

  it('returns null when diagnostics capture is disabled in settings', async () => {
    setDiagnosticsSettings({ enabled: false });
    const entry = await captureDiagnostic({
      kind: 'unhandled-rejection',
      message: 'Promise failed',
    });
    expect(entry).toBeNull();
  });
});
