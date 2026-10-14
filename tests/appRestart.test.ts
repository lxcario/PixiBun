// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { prepareAppRestart, registerRestartPreparation } from '@/lib/system/appRestart';

describe('saving before an explicit app restart', () => {
  it('waits for the active studio save to finish', async () => {
    let finish!: () => void;
    const save = vi.fn(() => new Promise<void>(resolve => { finish = resolve; }));
    const unregister = registerRestartPreparation(save);
    let ready = false;
    const pending = prepareAppRestart().then(() => { ready = true; });
    expect(save).toHaveBeenCalledTimes(1); expect(ready).toBe(false);
    finish(); await pending; expect(ready).toBe(true); unregister();
  });
  it('propagates save failure so the page stays open', async () => {
    const unregister = registerRestartPreparation(async () => { throw new Error('Storage unavailable'); });
    await expect(prepareAppRestart()).rejects.toThrow('Storage unavailable'); unregister();
  });
  it('does not unregister a newer studio when an older instance unmounts', async () => {
    const old = registerRestartPreparation(async () => {});
    const save = vi.fn(async () => {}); const current = registerRestartPreparation(save);
    old(); await prepareAppRestart(); expect(save).toHaveBeenCalledTimes(1); current();
  });
});
