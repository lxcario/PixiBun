import { test } from '@playwright/test';
import { verifyAdmittedArchive, verifyArchiveOverflow } from '../helpers/recoveryArchiveWorkflows';

test('oversized untouched archive refuses before payload loading and preserves its source', async ({ page }, info) => {
  await verifyArchiveOverflow(page, info);
});
test('admitted untouched archive downloads and preserves its damaged source', async ({ page }, info) => {
  await verifyAdmittedArchive(page, info);
});
