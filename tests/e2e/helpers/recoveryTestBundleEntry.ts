/**
 * recoveryTestBundleEntry.ts
 *
 * Test-only entry point for Playwright Chromium E2E verification.
 * Re-exports the genuine production recovery orchestrator and Dexie DB instance
 * so they can be bundled into a test-isolated script tag for native Chromium execution.
 *
 * This file is NEVER referenced or imported by application production bundles.
 */

export { prepareRecoveryPlan, commitRecoveredProject } from '@/lib/recovery/recoveryOrchestrator';
export { db } from '@/lib/storage/db';
