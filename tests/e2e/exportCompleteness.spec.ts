import { test } from '@playwright/test';
import { verifyManualNormalKit, verifyUniqueTileBundle, verifyTileEdgeRefusal, verifyWelcomeBenchGif, verifySvgApproximation, verifyAmbiguousNormals, verifyPendingTileEdit } from '../helpers/exportCompletenessWorkflows';
const capture = (page: import('@playwright/test').Page, info: import('@playwright/test').TestInfo) => async (name: string) => { await page.screenshot({ path: info.outputPath(name), animations: 'disabled' }); };
test('manual normals preserve both atlases', async ({ page }, info) => { await verifyManualNormalKit(page, info, capture(page, info)); });
test('unique tile bundles reconstruct pixels and refuse stale results', async ({ page }, info) => { await verifyUniqueTileBundle(page, info, capture(page, info)); });
test('tile slicing refuses partial edge cells', async ({ page }) => { await verifyTileEdgeRefusal(page); });
test('welcome bench saves a real transparent hop GIF', async ({ page }, info) => { await verifyWelcomeBenchGif(page, info, capture(page, info)); });
test('SVG wording and actual XML agree', async ({ page }, info) => { await verifySvgApproximation(page, info, capture(page, info)); });

test('ambiguous normal sources refuse a kit download', async ({ page }) => { await verifyAmbiguousNormals(page); });
test('editing during tile encoding discards the pending result', async ({ page }) => { await verifyPendingTileEdit(page); });
