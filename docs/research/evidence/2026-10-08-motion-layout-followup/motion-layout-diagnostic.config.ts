import { defineConfig } from '@playwright/test';
import base from '../playwright.production.config';
export default defineConfig({ ...base, testDir: '.', testMatch: 'motion-layout-diagnostic.spec.ts', outputDir: '../artifacts/motion-layout-before', use: { ...base.use, baseURL: 'http://localhost:3282' }, webServer: { cwd: process.cwd(), command: 'node node_modules/next/dist/bin/next start -p 3282', url: 'http://localhost:3282', reuseExistingServer: false, timeout: 60000 } });
