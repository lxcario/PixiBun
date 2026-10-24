import type { Locator } from '@playwright/test';

/**
 * Waits for a surface's finite animations (bloom, fades, unfolds) to finish, so a
 * measurement or accessibility scan reads it at rest. Infinite animations, such as
 * a twinkle, are not waited for.
 */
export async function settleAnimations(target: Locator): Promise<void> {
  await target.evaluate(element => Promise.all(element.getAnimations({ subtree: true })
    .filter(animation => animation.effect?.getComputedTiming().endTime !== Infinity)
    .map(animation => animation.finished.catch(() => undefined))));
}
