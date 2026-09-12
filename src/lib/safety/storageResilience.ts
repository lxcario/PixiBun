/**
 * storageResilience.ts
 *
 * Client-side storage resilience and QuotaExceededError recovery for PixiBun Atelier.
 *
 * Specification References:
 * 1. WHATWG / W3C Storage Living Standard: Section 3 "Quota and Usage"
 *    - Specification of QuotaExceededError DOMException (legacy code 22).
 */

export interface VolatileDiagnosticsDb {
  diagnostics?: {
    count(): Promise<number>;
    clear(): Promise<void>;
  };
}

export interface StorageEstimateResult {
  usageBytes: number;
  quotaBytes: number;
  usagePercent: number;
}

export class StorageResilience {
  /**
   * Defensive detector for IndexedDB QuotaExceededError across all major browsers.
   * Handles Chromium (name: 'QuotaExceededError'), WebKit/Safari (code: 22 / DOMException),
   * and Firefox storage exhaustion variants.
   */
  public static isQuotaExceeded(err: unknown): boolean {
    if (!err || typeof err !== 'object') return false;

    const error = err as { name?: string; code?: number; message?: string };

    if (error.name === 'QuotaExceededError') return true;
    if (error.code === 22) return true; // Legacy DOMException.QUOTA_EXCEEDED_ERR
    if (typeof error.message === 'string' && error.message.toLowerCase().includes('quota')) return true;

    return false;
  }

  /**
   * Queries the browser StorageManager estimate defensively.
   * Returns safe fallbacks if the API is unsupported or rejects.
   */
  public static async queryStorageEstimate(): Promise<StorageEstimateResult> {
    if (typeof navigator !== 'undefined' && navigator.storage && typeof navigator.storage.estimate === 'function') {
      try {
        const estimate = await navigator.storage.estimate();
        const usageBytes = estimate.usage ?? 0;
        const quotaBytes = estimate.quota ?? 0;
        const usagePercent = quotaBytes > 0 ? (usageBytes / quotaBytes) * 100 : 0;
        return { usageBytes, quotaBytes, usagePercent };
      } catch {
        // Ignore estimation errors
      }
    }

    return { usageBytes: 0, quotaBytes: 0, usagePercent: 0 };
  }

  /**
   * Emergency cache eviction of non-critical telemetry and diagnostics tables.
   * Protects core project data and active layer buffers from being purged.
   */
  public static async pruneVolatileCaches(
    dbInstance: VolatileDiagnosticsDb | Record<string, unknown> | null | undefined
  ): Promise<number> {
    let evictedCount = 0;
    try {
      const candidate = dbInstance as VolatileDiagnosticsDb | undefined;
      if (candidate?.diagnostics && typeof candidate.diagnostics.clear === 'function') {
        const count = await candidate.diagnostics.count();
        await candidate.diagnostics.clear();
        evictedCount += count;
      }
    } catch (e) {
      console.warn('[StorageResilience] Failed to prune volatile caches:', e);
    }
    return evictedCount;
  }
}
