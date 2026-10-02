import { test } from '@playwright/test';
import { verifyManualNormalKit, verifyUniqueTileBundle, verifyTileEdgeRefusal, verifyWelcomeExportNotes, verifySvgApproximation, verifyAmbiguousNormals, verifyPendingTileEdit } from '../helpers/exportCompletenessWorkflows';
test('compiled manual normals preserve both atlases', async ({ page }, info) => { await verifyManualNormalKit(page, info); });
test('compiled unique tile bundles reconstruct pixels and refuse stale results', async ({ page }, info) => { await verifyUniqueTileBundle(page, info); });
test('compiled tile slicing refuses partial edge cells', async ({ page }) => { await verifyTileEdgeRefusal(page); });
test('compiled welcome APNG and GIF downloads are labeled text notes', async ({ page }, info) => { await verifyWelcomeExportNotes(page, info); });
test('compiled SVG wording and actual XML agree', async ({ page }, info) => { await verifySvgApproximation(page, info); });

test('ambiguous normal sources refuse a kit download', async ({ page }) => { await verifyAmbiguousNormals(page); });
test('editing during tile encoding discards the pending result', async ({ page }) => { await verifyPendingTileEdit(page); });
