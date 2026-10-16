import { REPO_URL } from '../../src/lib/verified/loopLedger.mjs';
import type { LoopLedger } from '../../src/lib/verified/loopLedger.mjs';

// Fixture only; the committed ledger must never contain invented runs.
export function sampleLedger(): LoopLedger {
  return {
    schemaVersion: 1,
    updated: '2026-10-18',
    testspriteProjectUrl: 'https://www.testsprite.com/dashboard/projects/sample',
    suiteCases: 24,
    entries: [
      {
        pr: 3,
        title: 'Canvas readout',
        prUrl: `${REPO_URL}/pull/3`,
        checkedOn: '2026-10-17',
        testspriteRunUrl: 'https://www.testsprite.com/dashboard/runs/three',
        failures: [],
        fixCommit: null,
        verdict: 'passed',
      },
      {
        pr: 5,
        title: 'Refuse absurd canvas sizes',
        prUrl: `${REPO_URL}/pull/5`,
        checkedOn: '2026-10-18',
        testspriteRunUrl: 'https://www.testsprite.com/dashboard/runs/five',
        failures: [
          { case: 'Absurd size is refused', cause: 'product-bug', note: 'A 99999 px width opened a blank Studio | no warning' },
          { case: 'Layer count after undo', cause: 'test-fix', note: 'Case read the wrong panel' },
        ],
        fixCommit: 'abcdef1234567',
        verdict: 'passed',
      },
      {
        pr: 4,
        title: 'Labs deep link',
        prUrl: `${REPO_URL}/pull/4`,
        checkedOn: '2026-10-17',
        testspriteRunUrl: 'https://testsprite.com/runs/four',
        failures: [{ case: 'Labs toggle', cause: 'environment', note: 'Preview was behind Vercel login' }],
        fixCommit: null,
        verdict: 'failed',
      },
    ],
  };
}
