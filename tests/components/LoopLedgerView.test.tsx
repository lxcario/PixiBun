// @vitest-environment happy-dom
import React from 'react';
import fs from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { LEDGER_MARKDOWN_URL, LoopLedgerView, README_SECTION_URL } from '@/components/verified/LoopLedgerView';
import { REPO_URL, parseLoopLedger } from '@/lib/verified/loopLedger.mjs';
import { sampleLedger } from '../fixtures/loopLedgerSample';
import { parseVerificationStories } from '@/lib/verified/verificationStories.mjs';

afterEach(cleanup);

const committed = parseLoopLedger(JSON.parse(fs.readFileSync('docs/testsprite/loop-ledger.json', 'utf8')));

describe('LoopLedgerView', () => {
  it('explains the five-step loop', () => {
    render(<LoopLedgerView ledger={committed} />);
    expect(screen.getByRole('heading', { level: 1, name: 'A little desk. Promises we can check.' })).toBeTruthy();
    const steps = within(screen.getByTestId('verified-loop-steps')).getAllByRole('heading', { level: 3 }).map(h => h.textContent);
    expect(steps).toEqual(['Pull request', 'Preview', 'TestSprite check', 'Fix', 'Green']);
  });

  it('shows a friendly empty state and zero counts for an empty ledger', () => {
    render(<LoopLedgerView ledger={{ ...sampleLedger(), testspriteProjectUrl: null, suiteCases: null, entries: [] }} />);
    expect(screen.getByTestId('loop-ledger-empty').textContent).toContain('Rows are added only for real runs');
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.getByTestId('verified-suite-cases').textContent).toContain('Not counted yet.');
    expect(screen.getByTestId('verified-prs-checked').textContent).toContain('0');
    expect(screen.getByTestId('verified-bugs-caught').textContent).toContain('0');
    expect(screen.queryByRole('link', { name: 'TestSprite project' })).toBeNull();
  });

  it('renders the committed ledger without throwing', () => {
    render(<LoopLedgerView ledger={committed} />);
    expect(screen.getByTestId('verified-prs-checked').textContent).toContain(String(committed.entries.length));
    if (committed.entries.length === 0) expect(screen.getByTestId('loop-ledger-empty')).toBeTruthy();
    else expect(screen.getAllByTestId('loop-ledger-row')).toHaveLength(committed.entries.length);
  });

  it('keeps supporting cloud passes out of automatic PR counts and retains pending repairs', () => {
    const evidence = parseVerificationStories(JSON.parse(fs.readFileSync('docs/testsprite/verification-stories.json', 'utf8')));
    // Exercise a pending repair even after every committed story has a preview follow-up.
    evidence.stories[0] = { ...evidence.stories[0], status: 'local-passed', followUpUrl: null };
    render(<LoopLedgerView ledger={{ ...committed, entries: [] }} evidence={evidence} />);
    expect(screen.getByTestId('verification-automation-status').textContent).toContain('blocked by billing');
    expect(screen.getAllByTestId('verification-story')).toHaveLength(evidence.stories.length);
    expect(screen.getAllByTestId('verification-supporting-check')).toHaveLength(evidence.checks.length);
    expect(screen.getByRole('link', { name: 'Draw this little heart →' }).getAttribute('href')).toMatch(/^\/studio\?replay=1_16x16_/);
    expect(screen.getByTestId('verified-prs-checked').textContent).toContain('0');
    expect(screen.getAllByText('Local repair passed · deployment and cloud rerun pending').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'Original cloud failure' })).toHaveLength(evidence.stories.length);
  });

  it('lists each PR newest first with its run, failures, fix and verdict', () => {
    render(<LoopLedgerView ledger={sampleLedger()} />);
    const table = screen.getByRole('table', { name: 'Pull requests checked by TestSprite, newest first' });
    const rows = within(table).getAllByTestId('loop-ledger-row');
    expect(rows.map(row => within(row).getByRole('rowheader').querySelector('a')?.textContent)).toEqual(['#5', '#4', '#3']);

    const [fixed, failed, green] = rows;
    expect(within(fixed).getByRole('link', { name: 'TestSprite run for pull request 5' }).getAttribute('href')).toBe('https://www.testsprite.com/dashboard/runs/five');
    expect(fixed.textContent).toContain('Absurd size is refused (product-bug): A 99999 px width opened a blank Studio | no warning');
    expect(within(fixed).getByRole('link', { name: 'Fixing commit abcdef1' }).getAttribute('href')).toBe(`${REPO_URL}/commit/abcdef1234567`);
    expect(fixed.textContent).toContain('Passed');
    expect(failed.textContent).toContain('Failed');
    expect(within(failed).getByLabelText('No fixing commit')).toBeTruthy();
    expect(green.textContent).toContain('Nothing; green on the first run');

    expect(screen.getByTestId('verified-suite-cases').textContent).toContain('24');
    expect(screen.getByTestId('verified-bugs-caught').textContent).toContain('1');
  });

  it('links the README section, the Markdown ledger, the repository and the project', () => {
    render(<LoopLedgerView ledger={sampleLedger()} />);
    const nav = screen.getByRole('navigation', { name: 'More about testing' });
    const hrefs = within(nav).getAllByRole('link').map(link => link.getAttribute('href'));
    expect(hrefs).toEqual([README_SECTION_URL, LEDGER_MARKDOWN_URL, REPO_URL, 'https://www.testsprite.com/dashboard/projects/sample', '/pledge']);
    expect(LEDGER_MARKDOWN_URL).toBe(`${REPO_URL}/blob/main/docs/testsprite/loop-ledger.md`);
  });
});
