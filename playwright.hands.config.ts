import { defineConfig } from '@playwright/test';
import artist from './playwright.artist.config';
// Same profile, recording, deadlines and zero-retry policy as Artist. Separate evidence/scope.
export default defineConfig({ ...artist, testDir: './tests/nibbliHands', testMatch: '**/*.hands.ts' });
