import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseVerificationStories, STORIES_PATH } from '../src/lib/verified/verificationStories.mjs';

const actual = () => JSON.parse(fs.readFileSync(STORIES_PATH, 'utf8'));

describe('supporting verification evidence', () => {
  it('accepts the retained scoped evidence and preserves local-only disposition', () => {
    const evidence = parseVerificationStories(actual());
    expect(evidence.stories).toHaveLength(2);
    expect(evidence.checks).toHaveLength(8);
    expect(evidence.stories.find(s => s.id === 'a-lock-keeps-its-promise')?.followUpUrl).toBeNull();
  });

  it('requires a different cloud follow-up and actual fix identity for a preview pass', () => {
    const evidence = actual();
    evidence.stories[0].followUpUrl = evidence.stories[0].redUrl;
    evidence.stories[0].fixCommit = null;
    expect(() => parseVerificationStories(evidence)).toThrow(/preview pass needs/);
  });

  it('refuses to turn a local repair into cloud proof', () => {
    const evidence = actual();
    evidence.stories[1].followUpUrl = evidence.stories[0].followUpUrl;
    expect(() => parseVerificationStories(evidence)).toThrow(/local-only repair cannot claim/);
  });

  it.each(['https://testsprite.com.evil.example/execution/id', 'javascript:alert(1)',
    'https://www.testsprite.com/dashboard-v3/o/a/projects/b/execution/c?token=secret'])('rejects misleading or private run URLs: %s', runUrl => {
    const evidence = actual();
    evidence.checks[0].runUrl = runUrl;
    expect(() => parseVerificationStories(evidence)).toThrow(/check needs/);
  });

  it('requires scope, source and code identity for every supporting pass', () => {
    const evidence = actual();
    evidence.checks[0].scope = '';
    evidence.checks[0].sourceCommit = 'main';
    evidence.checks[0].codeVersion = null;
    expect(() => parseVerificationStories(evidence)).toThrow(/check needs/);
  });

  it('rejects missing objects, invalid dates and duplicate identities', () => {
    expect(() => parseVerificationStories(null)).toThrow(/expected an object/);
    const evidence = actual();
    evidence.updated = '2026-02-30';
    evidence.checks[1].id = evidence.checks[0].id;
    expect(() => parseVerificationStories(evidence)).toThrow(/invalid updated date.*duplicate check/);
  });
});
