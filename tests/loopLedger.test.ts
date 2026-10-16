import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  LEDGER_JSON_PATH,
  LEDGER_MARKDOWN_PATH,
  LoopLedgerError,
  REPO_URL,
  loopLedgerProblems,
  orderedEntries,
  parseLoopLedger,
  renderLoopLedgerMarkdown,
  summarizeLoopLedger,
} from '../src/lib/verified/loopLedger.mjs';
import { sampleLedger } from './fixtures/loopLedgerSample';

const withEntry = (patch: Record<string, unknown>) => {
  const ledger = sampleLedger();
  return { ...ledger, entries: [{ ...ledger.entries[0], ...patch }] };
};

describe('committed loop ledger', () => {
  const committed = JSON.parse(fs.readFileSync(LEDGER_JSON_PATH, 'utf8'));

  it('passes its own schema', () => {
    expect(loopLedgerProblems(committed)).toEqual([]);
  });

  it('has an up-to-date Markdown twin', () => {
    expect(fs.readFileSync(LEDGER_MARKDOWN_PATH, 'utf8').replace(/\r\n/g, '\n')).toBe(renderLoopLedgerMarkdown(parseLoopLedger(committed)));
  });

  it('only links runs on testsprite.com and PRs in this repository', () => {
    for (const entry of committed.entries) {
      expect(new URL(entry.testspriteRunUrl).hostname).toMatch(/(^|\.)testsprite\.com$/);
      expect(entry.prUrl.startsWith(`${REPO_URL}/pull/`)).toBe(true);
    }
  });
});

describe('loop ledger schema', () => {
  it('accepts a well-formed ledger', () => {
    expect(loopLedgerProblems(sampleLedger())).toEqual([]);
    expect(parseLoopLedger(sampleLedger()).entries).toHaveLength(3);
  });

  it('rejects non-objects and wrong versions', () => {
    expect(loopLedgerProblems(null)).toEqual(['ledger: must be a JSON object']);
    expect(loopLedgerProblems([])).toEqual(['ledger: must be a JSON object']);
    expect(loopLedgerProblems({ ...sampleLedger(), schemaVersion: 2 })).toContain('ledger: schemaVersion must be 1');
  });

  it('rejects missing and unknown fields', () => {
    const { suiteCases: _omit, ...rest } = sampleLedger();
    expect(loopLedgerProblems(rest)).toContain('ledger: missing "suiteCases"');
    expect(loopLedgerProblems({ ...sampleLedger(), extra: true })).toContain('ledger: unknown field "extra"');
    expect(loopLedgerProblems(withEntry({ stars: 5 }))).toContain('entries[0]: unknown field "stars"');
  });

  it('rejects impossible dates and counts', () => {
    expect(loopLedgerProblems({ ...sampleLedger(), updated: '2026-02-30' })).toContain('ledger: updated must be a YYYY-MM-DD date');
    expect(loopLedgerProblems({ ...sampleLedger(), suiteCases: -1 })).toContain('ledger: suiteCases must be null or a whole number');
    expect(loopLedgerProblems({ ...sampleLedger(), suiteCases: 2.5 })).toContain('ledger: suiteCases must be null or a whole number');
    expect(loopLedgerProblems(withEntry({ checkedOn: '2026-10-19' }))).toContain("entries[0]: checkedOn is after the ledger's updated date");
  });

  it('rejects links that are not TestSprite runs or this repository’s PRs', () => {
    expect(loopLedgerProblems(withEntry({ testspriteRunUrl: 'http://www.testsprite.com/run' }))).toContain('entries[0]: testspriteRunUrl must be an https testsprite.com link');
    expect(loopLedgerProblems(withEntry({ testspriteRunUrl: 'https://testsprite.com.evil.example/run' }))).toContain('entries[0]: testspriteRunUrl must be an https testsprite.com link');
    expect(loopLedgerProblems(withEntry({ testspriteRunUrl: 'not a url' }))).toContain('entries[0]: testspriteRunUrl must be an https testsprite.com link');
    expect(loopLedgerProblems(withEntry({ prUrl: `${REPO_URL}/pull/99` }))).toContain(`entries[0]: prUrl must be ${REPO_URL}/pull/3`);
    expect(loopLedgerProblems({ ...sampleLedger(), testspriteProjectUrl: 'https://example.com' })).toContain('ledger: testspriteProjectUrl must be null or an https testsprite.com link');
  });

  it('rejects duplicate PRs, bad titles, verdicts and commits', () => {
    const ledger = sampleLedger();
    expect(loopLedgerProblems({ ...ledger, entries: [ledger.entries[0], ledger.entries[0]] })).toContain('entries[1]: PR #3 is listed twice');
    expect(loopLedgerProblems(withEntry({ pr: 0, prUrl: `${REPO_URL}/pull/0` }))).toContain('entries[0]: pr must be a positive whole number');
    expect(loopLedgerProblems(withEntry({ title: ' ' }))).toContain('entries[0]: title must be non-empty text without outer spaces');
    expect(loopLedgerProblems(withEntry({ verdict: 'green' }))).toContain('entries[0]: verdict must be one of passed, failed, pending');
    expect(loopLedgerProblems(withEntry({ failures: [{ case: 'x', cause: 'test-fix', note: 'y' }], fixCommit: 'ABCDEF1' }))).toContain('entries[0]: fixCommit must be null or a 7–40 character lowercase commit hash');
  });

  it('checks each recorded failure', () => {
    const problems = loopLedgerProblems(withEntry({ failures: [{ case: '', cause: 'flaky', note: '' }, 'oops'], verdict: 'failed' }));
    expect(problems).toEqual(expect.arrayContaining([
      'entries[0].failures[0]: case must be non-empty text',
      'entries[0].failures[0]: cause must be one of product-bug, test-fix, environment',
      'entries[0].failures[0]: note must say what went wrong',
      'entries[0].failures[1]: must be an object',
    ]));
  });

  it('enforces the loop: fixes need failures, red-to-green needs the fix, failed needs a failure', () => {
    expect(loopLedgerProblems(withEntry({ fixCommit: 'abcdef1' }))).toContain('entries[0]: a fixCommit needs at least one recorded failure');
    expect(loopLedgerProblems(withEntry({ failures: [{ case: 'x', cause: 'product-bug', note: 'y' }] }))).toContain('entries[0]: a red run that ended green needs the fixCommit that turned it green');
    expect(loopLedgerProblems(withEntry({ verdict: 'failed' }))).toContain('entries[0]: a failed verdict needs at least one recorded failure');
    expect(loopLedgerProblems(withEntry({ failures: [{ case: 'x', cause: 'product-bug', note: 'y' }], verdict: 'pending' }))).toEqual([]);
  });

  it('throws every problem at once from parseLoopLedger', () => {
    try {
      parseLoopLedger({ ...sampleLedger(), schemaVersion: 0, updated: 'soon' });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(LoopLedgerError);
      expect((error as LoopLedgerError).problems).toHaveLength(2);
      expect((error as Error).message).toContain('updated must be a YYYY-MM-DD date');
    }
  });
});

describe('loop ledger summary and Markdown', () => {
  it('counts product bugs only and red-to-green PRs', () => {
    expect(summarizeLoopLedger(sampleLedger())).toEqual({ suiteCases: 24, prsChecked: 3, bugsCaught: 1, redToGreen: 1 });
    expect(summarizeLoopLedger({ ...sampleLedger(), suiteCases: null, entries: [] })).toEqual({ suiteCases: null, prsChecked: 0, bugsCaught: 0, redToGreen: 0 });
  });

  it('orders newest PR first without mutating the ledger', () => {
    const ledger = sampleLedger();
    expect(orderedEntries(ledger).map(entry => entry.pr)).toEqual([5, 4, 3]);
    expect(ledger.entries.map(entry => entry.pr)).toEqual([3, 5, 4]);
  });

  it('renders an honest empty state', () => {
    const markdown = renderLoopLedgerMarkdown({ ...sampleLedger(), testspriteProjectUrl: null, suiteCases: null, entries: [] });
    expect(markdown).toContain('- TestSprite project: not linked yet');
    expect(markdown).toContain('- Cases in the suite: not counted yet');
    expect(markdown).toContain('No pull request has been checked yet.');
    expect(markdown).not.toContain('| PR |');
  });

  it('renders one escaped table row per PR', () => {
    const markdown = renderLoopLedgerMarkdown(sampleLedger());
    const rows = markdown.split('\n').filter(line => line.startsWith('| [#'));
    expect(rows).toHaveLength(3);
    expect(rows[0]).toContain(`[#5](${REPO_URL}/pull/5) Refuse absurd canvas sizes`);
    expect(rows[0]).toContain('blank Studio \\| no warning');
    expect(rows[0]).toContain(`[\`abcdef1\`](${REPO_URL}/commit/abcdef1234567)`);
    expect(rows[2]).toContain('Nothing; green on the first run');
    expect(markdown).toContain('- Bugs caught (product bugs only): 1');
  });
});
