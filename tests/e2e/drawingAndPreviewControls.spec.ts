import { test } from '@playwright/test';
import { verifyFreeIso, verifySnappedIso, verifyFloatingPreview } from '../helpers/drawingAndPreviewWorkflows';
test('Iso FREE follows steep, shallow, reversed, cardinal and edge drags with exact preview and undo', async ({ page }, info) => { await verifyFreeIso(page, async name => { await page.screenshot({ path: info.outputPath(name) }); }); });
test('Iso ON retains the established 2:1 projected endpoint and preview', async ({ page }, info) => { await verifySnappedIso(page, async name => { await page.screenshot({ path: info.outputPath(name) }); }); });
test('one floating preview opens, moves, expands, closes and follows undo/redo without painting artwork', async ({ page }, info) => { await verifyFloatingPreview(page, async name => { await page.screenshot({ path: info.outputPath(name) }); }); });
