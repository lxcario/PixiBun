/**
 * storageResilience.ts
 *
 * Client-side storage resilience and QuotaExceededError recovery for PixiBun Atelier.
 *
 * Specification References:
 * 1. WHATWG / W3C Storage Living Standard: Section 3 "Quota and Usage"
 *    - Specification of QuotaExceededError DOMException (legacy code 22).
 */

export class StorageResilience {
  /**
   * Identifies whether an error was caused by browser storage exhaustion (QuotaExceededError).
   * Works across Chromium, WebKit (Safari), and Gecko (Firefox).
   */
  public static isQuotaExceeded(err: unknown): boolean {
    if (!err || typeof err !== 'object') return false;

    const e = err as { name?: string; code?: number; message?: string };

    return (
      e.name === 'QuotaExceededError' ||
      e.code === 22 ||
      (typeof e.message === 'string' && /quota/i.test(e.message))
    );
  }

  /**
   * Safely estimates current storage usage and quota via navigator.storage.estimate().
   */
  public static async estimateQuota(): Promise<{
    usageBytes: number;
    quotaBytes: number;
    usagePercent: number;
  }> {
    if (
      typeof navigator !== 'undefined' &&
      navigator.storage &&
      typeof navigator.storage.estimate === 'function'
    ) {
      try {
        const est = await navigator.storage.estimate();
        const usage = est.usage || 0;
        const quota = est.quota || 1;
        return {
          usageBytes: usage,
          quotaBytes: quota,
          usagePercent: (usage / quota) * 100,
        };
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
  public static async pruneVolatileCaches(dbInstance: any): Promise<number> {
    let evictedCount = 0;
    try {
      if (dbInstance && dbInstance.diagnostics && typeof dbInstance.diagnostics.clear === 'function') {
        const count = await dbInstance.diagnostics.count();
        await dbInstance.diagnostics.clear();
        evictedCount += count;
      }
    } catch (e) {
      console.warn('[StorageResilience] Failed to prune volatile caches:', e);
    }
    return evictedCount;
  }
}
