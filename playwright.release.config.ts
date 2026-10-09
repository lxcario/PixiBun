import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

const rollbackDirectory = process.env.PIXIBUN_ROLLBACK_DIRECTORY;
if (!rollbackDirectory) throw new Error('Set PIXIBUN_ROLLBACK_DIRECTORY to the preserved compatible application build.');
export default defineConfig({
  testDir: './tests/release', timeout: 120_000, expect: { timeout: 10_000 }, workers: 1, retries: 0,
  outputDir: 'artifacts/l09-repeatability-2026-10-09/two-build-results', reporter: [['list']],
  use: { screenshot: 'only-on-failure', trace: 'retain-on-failure', colorScheme: 'dark' },
  projects: [{ name: 'chromium', use: devices['Desktop Chrome'] }, { name: 'firefox', use: devices['Desktop Firefox'] }, { name: 'webkit', use: devices['Desktop Safari'] }],
  webServer: [
    { command: `node node_modules/next/dist/bin/next start "${path.resolve(rollbackDirectory)}" -p 3162`, url: 'http://localhost:3162', reuseExistingServer: false, timeout: 60_000 },
    { command: 'node node_modules/next/dist/bin/next start -p 3163', url: 'http://localhost:3163', reuseExistingServer: false, timeout: 60_000 },
  ],
});
