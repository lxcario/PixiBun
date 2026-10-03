import { db } from '@/lib/storage/db';
import { createId } from '@/lib/engine/id';
import type { DiagnosticEntry, DiagnosticsSettings } from '@/types/diagnostics';
import { APP_VERSION } from '@/config/version';
import { getBufferRegistryUsage } from '@/lib/engine/bufferRegistry';
import { getMemoryBudgetUsage } from '@/lib/safety/memoryBudget';

const SETTINGS_KEY = 'pixibun-diagnostics';
const MAX_DIAGNOSTICS_ENTRIES = 200;
const MAX_DETAIL_LENGTH = 2048;

// Per-tab admission: twenty-event burst, sixty events/minute, ten-second duplicate window.
const recentEvents = new Map<string, number>();
let tokens = 20, lastRefill = Date.now();
let storageWrites: Promise<void> = Promise.resolve();
let pendingWrites = 0;
let relayQueue: DiagnosticEntry[] = [];
let relayTimer: ReturnType<typeof setTimeout> | undefined;
function cancelRelay() {
  if (relayTimer !== undefined) clearTimeout(relayTimer);
  relayTimer = undefined; relayQueue = [];
}
function queueRelay(entry: DiagnosticEntry) {
  const settings = getDiagnosticsSettings();
  if (!settings.enabled || !settings.relayOptIn) return;
  if (relayQueue.length < 10) relayQueue.push(entry);
  if (relayTimer !== undefined) return;
  relayTimer = setTimeout(() => {
    relayTimer = undefined;
    const batch = relayQueue; relayQueue = [];
    const current = getDiagnosticsSettings();
    if (current.enabled && current.relayOptIn && batch.length) void relayDiagnostics(batch);
  }, 5000);
}

let memorySettings: DiagnosticsSettings = { enabled: true, relayOptIn: false };

function getSafeStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // blocked or unavailable
  }
  return null;
}

export function getDiagnosticsSettings(): DiagnosticsSettings {
  const storage = getSafeStorage();
  if (storage) {
    try {
      const raw = storage.getItem(SETTINGS_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        const settings = typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
          ? parsed as Record<string, unknown> : {};
        memorySettings = {
          enabled: typeof settings.enabled === 'boolean' ? settings.enabled : true,
          relayOptIn: settings.relayOptIn === true,
        };
        return memorySettings;
      }
      memorySettings = { enabled: true, relayOptIn: false };
    } catch {
      // Invalid persisted consent must never inherit a previous opt-in.
      memorySettings = { enabled: true, relayOptIn: false };
    }
  }
  return memorySettings;
}

export function setDiagnosticsSettings(
  partial: Partial<DiagnosticsSettings>
): DiagnosticsSettings {
  const current = getDiagnosticsSettings();
  const updated: DiagnosticsSettings = {
    enabled: typeof partial.enabled === 'boolean' ? partial.enabled : current.enabled,
    relayOptIn: partial.relayOptIn === undefined ? current.relayOptIn : partial.relayOptIn === true,
  };
  memorySettings = updated;
  if (!updated.enabled || !updated.relayOptIn) cancelRelay();
  const storage = getSafeStorage();
  if (storage) {
    try {
      storage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error('Failed to save diagnostics settings:', err);
    }
  }
  return updated;
}

export async function captureDiagnostic(
  entry: Omit<DiagnosticEntry, 'id' | 'timestamp' | 'route' | 'appVersion'> & {
    route?: string;
  }
): Promise<DiagnosticEntry | null> {
  try {
    const settings = getDiagnosticsSettings();
    if (!settings.enabled) {
      return null;
    }

    const route =
      entry.route ||
      (typeof window !== 'undefined' && window.location
        ? window.location.pathname
        : '/');

    const detail = entry.detail
      ? entry.detail.length > MAX_DETAIL_LENGTH
        ? `${entry.detail.slice(0, MAX_DETAIL_LENGTH)}...[truncated]`
        : entry.detail
      : undefined;

    if (pendingWrites >= 20) return null;
    const message = (entry.message || 'Unknown diagnostic event').slice(0, 1024);
    const boundedRoute = route.slice(0, 512), now = Date.now();
    const fingerprint = JSON.stringify([entry.kind, message, detail, boundedRoute]);
    tokens = Math.min(20, tokens + Math.max(0, now - lastRefill) / 1000); lastRefill = now;
    const previous = recentEvents.get(fingerprint);
    if ((previous !== undefined && now - previous < 10_000) || tokens < 1) return null;
    tokens--;
    recentEvents.delete(fingerprint); recentEvents.set(fingerprint, now);
    if (recentEvents.size > 100) recentEvents.delete(recentEvents.keys().next().value!);
    const fullEntry: DiagnosticEntry = {
      id: createId('diag'),
      kind: entry.kind,
      timestamp: Date.now(),
      message,
      detail,
      route: boundedRoute,
      appVersion: APP_VERSION,
    };

    if (
      typeof window !== 'undefined' &&
      typeof indexedDB !== 'undefined' &&
      db?.diagnostics
    ) {
      try {
        pendingWrites++;
        const write = storageWrites.then(async () => {
          await db.diagnostics.put(fullEntry);

          // FIFO Prune to keep at most MAX_DIAGNOSTICS_ENTRIES
          const count = await db.diagnostics.count();
          if (count > MAX_DIAGNOSTICS_ENTRIES) {
            const excess = count - MAX_DIAGNOSTICS_ENTRIES;
            const oldest = await db.diagnostics
              .orderBy('timestamp')
              .limit(excess)
              .primaryKeys();
            await db.diagnostics.bulkDelete(oldest);
          }
        });
        storageWrites = write.catch(() => {});
        await write;
      } catch (storageErr) {
        // IndexedDB storage failed (e.g. quota, private browsing, test env)
        console.warn('Diagnostics storage failed:', storageErr);
      } finally {
        pendingWrites--;
      }
    }

    // Consent is checked again after storage and immediately before a delayed batch sends.
    queueRelay(fullEntry);

    return fullEntry;
  } catch (err) {
    // Diagnostics must NEVER throw or break the app
    console.warn('PixiBun diagnostics capture failed silently:', err);
    return null;
  }
}

export async function getRecentDiagnostics(
  limit = 200
): Promise<DiagnosticEntry[]> {
  try {
    if (typeof window === 'undefined' || !db?.diagnostics) return [];
    return await db.diagnostics
      .orderBy('timestamp')
      .reverse()
      .limit(limit)
      .toArray();
  } catch (err) {
    console.error('Failed to load diagnostics:', err);
    return [];
  }
}

export async function clearDiagnostics(): Promise<void> {
  try {
    if (typeof window !== 'undefined' && db?.diagnostics) {
      await db.diagnostics.clear();
    }
  } catch (err) {
    console.error('Failed to clear diagnostics:', err);
  }
}

export async function exportDiagnosticsFile(): Promise<void> {
  try {
    if (typeof window === 'undefined') return;
    const entries = await getRecentDiagnostics(MAX_DIAGNOSTICS_ENTRIES);
    const settings = getDiagnosticsSettings();
    const payload = {
      app: 'PixiBun Atelier',
      version: APP_VERSION,
      exportedAt: new Date().toISOString(),
      rasterRegistry: getBufferRegistryUsage(),
      memoryBudget: getMemoryBudgetUsage(),
      settings: {
        enabled: settings.enabled,
        relayOptIn: settings.relayOptIn,
      },
      entries,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pixibun-diagnostics-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Failed to export diagnostics file:', err);
  }
}

export async function relayDiagnostics(
  entries: DiagnosticEntry[]
): Promise<boolean> {
  try {
    const res = await fetch('/api/diagnostics/relay', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        app: 'pixibun',
        version: APP_VERSION,
        timestamp: Date.now(),
        events: entries,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
