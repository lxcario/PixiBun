import { test } from '@playwright/test';
import { verifyDetailWorkflow, verifyLightWorkflow, verifySceneWorkflow, verifyResearchKeyboardWorkflow, verifyOutlinedArtworkWorkflow } from '../helpers/researchWorkflows';

test('compiled simplification protects details and persists source provenance', async ({ page }) => { await verifyDetailWorkflow(page); });
test('compiled shared light previews normal maps and restores all poses in one undo', async ({ page }) => { await verifyLightWorkflow(page); });
test('compiled scene constraints and pinned path recipes reproduce after saving', async ({ page }) => { await verifySceneWorkflow(page); });
test('compiled research tabs, scene selection and stale-preview recovery support the keyboard', async ({ page }) => { await verifyResearchKeyboardWorkflow(page); });
test('compiled outlined artwork retains its fill and lights directionally without a Normal layer', async ({ page }) => { await verifyOutlinedArtworkWorkflow(page); });
