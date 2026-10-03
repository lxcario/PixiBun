import { describe, expect, it, vi } from 'vitest';
import { getBuildVersion } from '../scripts/getBuildVersion.mjs';
import { buildServiceWorkerScript } from '@/app/sw.js/route';

const firstCommit = 'a'.repeat(40);
const secondCommit = 'b'.repeat(40);
const missingGit = () => { throw new Error('Git unavailable'); };
const defaults = { env: { NODE_ENV: 'production' }, packageVersion: '1.14.1', readCommit: missingGit };

describe('Service-worker build identity', () => {
  it('honors an explicit release identity without consulting Git', () => {
    const readCommit = vi.fn(missingGit);
    expect(getBuildVersion({ ...defaults, env: { SW_CACHE_VERSION: 'release-20261003-build-2' }, readCommit }))
      .toBe('release-20261003-build-2');
    expect(readCommit).not.toHaveBeenCalled();
  });

  it('uses the provider commit instead of the runner checkout identity', () => {
    const readCommit = vi.fn(() => secondCommit);
    expect(getBuildVersion({ ...defaults, env: { VERCEL_GIT_COMMIT_SHA: firstCommit }, readCommit }))
      .toBe(`v1.14.1-${firstCommit}`);
    expect(readCommit).not.toHaveBeenCalled();
  });

  it('uses full Git identity when deployment metadata is absent', () => {
    expect(getBuildVersion({ ...defaults, readCommit: () => secondCommit })).toBe(`v1.14.1-${secondCommit}`);
  });

  it('produces different cache buckets and scripts for two Git-less deployment commits', () => {
    const versions = [firstCommit, secondCommit].map(commit => getBuildVersion({
      ...defaults, env: { NODE_ENV: 'production', VERCEL_GIT_COMMIT_SHA: commit },
    }));
    const scripts = versions.map(version => buildServiceWorkerScript(version));
    expect(versions[0]).not.toBe(versions[1]);
    expect(scripts[0]).not.toBe(scripts[1]);
    expect(scripts[0]).toContain(`const CACHE_NAME = 'pixibun-v1.14.1-${firstCommit}';`);
    expect(scripts[1]).toContain(`const CACHE_NAME = 'pixibun-v1.14.1-${secondCommit}';`);
  });

  it('refuses unidentified production builds instead of silently reusing local', () => {
    expect(() => getBuildVersion(defaults)).toThrow('Cannot determine a production build identity');
    expect(() => getBuildVersion({ ...defaults, readCommit: () => 'local' })).toThrow('production build identity');
  });

  it('allows development without Git using a fresh session identity', () => {
    const versions = [() => 'session-1', () => 'session-2'].map(developmentId => getBuildVersion({
      ...defaults, env: { NODE_ENV: 'development' }, developmentId,
    }));
    expect(versions).toEqual(['v1.14.1-development-session-1', 'v1.14.1-development-session-2']);
  });

  it.each(["bad';self.skipWaiting();//", 'tag with spaces', 'x'.repeat(193)])('rejects unsafe override %s', value => {
    expect(() => getBuildVersion({ ...defaults, env: { SW_CACHE_VERSION: value } })).toThrow('SW_CACHE_VERSION');
  });

  it('rejects malformed deployment metadata rather than hiding it with a Git fallback', () => {
    expect(() => getBuildVersion({ ...defaults, env: { VERCEL_GIT_COMMIT_SHA: 'not-a-commit' }, readCommit: () => firstCommit }))
      .toThrow('VERCEL_GIT_COMMIT_SHA');
  });
});
