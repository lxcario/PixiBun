import { test } from '@playwright/test';
import { verifyAdmittedArchive, verifyArchiveOverflow } from '../helpers/recoveryArchiveWorkflows';

test('oversized untouched archive refuses before payload loading and preserves its source', async ({ page, browserName }, info) => {
  // Native Windows WebKit needs extra time to insert the real 10,001-record
  // fixture. The helper bounds the actual export/refusal step to 15 seconds.
  if (browserName === 'webkit') test.setTimeout(240_000);
  await verifyArchiveOverflow(page, info);
});
test('admitted untouched archive downloads and preserves its damaged source', async ({ page }, info) => {
  await verifyAdmittedArchive(page, info);
});
