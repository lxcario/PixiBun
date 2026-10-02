import { test } from '@playwright/test';
import { verifyFreeIso, verifySnappedIso, verifyFloatingPreview } from '../helpers/drawingAndPreviewWorkflows';
test('compiled Iso FREE previews and commits free slopes with brush size, symmetry and undo', async ({ page }) => { await verifyFreeIso(page); });
test('compiled Iso ON retains 2:1 projected strokes', async ({ page }) => { await verifySnappedIso(page); });
test('compiled floating preview has one window and preserves artwork through its controls', async ({ page }) => { await verifyFloatingPreview(page); });
