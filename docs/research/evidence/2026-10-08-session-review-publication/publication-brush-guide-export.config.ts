import { defineConfig } from '@playwright/test';
import base from '../playwright.production.config';
export default defineConfig({ ...base, testDir: '.', testMatch: 'publication-brush-guide-export.spec.ts', outputDir: '../artifacts/publication-brush-guide-export', use: { ...base.use, baseURL: 'http://localhost:3276' }, webServer: { cwd: process.cwd(), command: 'node node_modules/next/dist/bin/next start -p 3276', url: 'http://localhost:3276', reuseExistingServer: false, timeout: 60000 } });
