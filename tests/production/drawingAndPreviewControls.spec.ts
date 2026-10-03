import { test } from '@playwright/test';
import { verifyFreeIso, verifySnappedIso, verifyFloatingPreview } from '../helpers/drawingAndPreviewWorkflows';
test('compiled Iso FREE preserves steep, shallow and reversed slopes through preview and undo', async ({ page }) => { await verifyFreeIso(page, undefined, 'diagonal'); });
test('compiled Iso FREE preserves cardinal and edge slopes through preview and undo', async ({ page }) => { await verifyFreeIso(page, undefined, 'cardinal-edge'); });
test('compiled Iso FREE preserves thick mirrored pixels through preview, undo and redo', async ({ page }) => { await verifyFreeIso(page, undefined, 'mirrored'); });
test('compiled Iso ON retains 2:1 projected strokes', async ({ page }) => { await verifySnappedIso(page); });
test('compiled floating preview has one window and preserves artwork through its controls', async ({ page }) => { await verifyFloatingPreview(page); });
