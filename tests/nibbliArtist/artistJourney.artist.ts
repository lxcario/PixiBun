import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { PixiBunController } from '../../scripts/nibbli/controller';
import { NibbliMemory } from '../../scripts/nibbli/memory';
import { ConversationAdapter, MockArtistAdapter } from '../../scripts/nibbli/artist/adapters';
import { runArtist } from '../../scripts/nibbli/artist/loop';
import { ArtistBoundaryError } from '../../scripts/nibbli/artist/protocol';

const mode = process.env.NIBBLI_ARTIST_MODE;
test('Artist follows goal, plans, observes, critiques, corrects and verifies native save/export', async ({ page }, info) => {
  const root = process.env.NIBBLI_ARTIST_ROOT!;
  const candidate = JSON.parse(await readFile(path.join(root, 'candidate.json'), 'utf8'));
  const memory = await NibbliMemory.create(root, { ...candidate, browser: info.project.name, role: 'artist', journey: 'bounded-artist-v0.1' });
  await page.addInitScript(() => Object.defineProperty(window, 'showSaveFilePicker', { value: undefined, configurable: true }));
  const adapter = mode === 'conversation' ? new ConversationAdapter(path.join(root, 'inbox')) : new MockArtistAdapter();
  let finished = false;
  try {
    const result = await runArtist(new PixiBunController(page, memory), memory, adapter);
    expect(result.functional.colors).toHaveLength(3); expect(result.functional.corrections).toBeLessThanOrEqual(3);
    if (mode === 'mock') { expect(result.functional.corrections).toBe(1); expect(result.usage.calls).toBe(4); expect(result.artistic.verdict).toBe('not-evaluated-mock'); }
    await memory.finish('passed', result); finished = true;
  } catch (error) {
    await memory.event('artist-failed', { message: String(error), failureOwner: 'unknown',
      failureCategory: error instanceof ArtistBoundaryError ? 'boundary' : 'execution',
      review: 'Retain inputs and expectations; product/test/usage/adapter attribution needs evidence.' });
    throw error;
  } finally { if (!finished) await memory.finish('failed'); }
});
if (mode === 'mock') test('Artist stops after three corrections and retains the unsuccessful drawing', async ({ page }, info) => {
  const root = process.env.NIBBLI_ARTIST_ROOT!;
  const memory = await NibbliMemory.create(root, { browser: info.project.name, role: 'artist', journey: 'correction-limit-fixture', expectedRefusal: true });
  try {
    await expect(runArtist(new PixiBunController(page, memory), memory, new MockArtistAdapter(true))).rejects.toThrow('Correction limit reached');
    const events = await NibbliMemory.readEvents(memory.directory);
    expect(events.filter(event => event.kind === 'artist-plan-validated')).toHaveLength(4);
    expect(events.filter(event => event.kind === 'artist-critique')).toHaveLength(4);
    await memory.event('expected-refusal', { verdict: 'passed', drawingAccepted: false, reason: 'Correction limit reached' });
    await memory.finish('passed', { functional: { boundary: 'Three corrections then stop; unsuccessful drawing preserved' }, artistic: { verdict: 'not-evaluated-mock' } });
  } catch (error) { await memory.finish('failed', { error: String(error) }); throw error; }
});
