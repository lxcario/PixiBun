import { describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ArtistBudget, ARTIST_LIMITS, ARTIST_SPEC, GHOST_GOAL, validateCritique, validatePlan, measureRaster, type ArtistRequest } from '../scripts/nibbli/artist/protocol';
import { predictPlan } from '../scripts/nibbli/artist/loop';
import { ConversationAdapter, MockArtistAdapter } from '../scripts/nibbli/artist/adapters';
import { readExperiences } from '../scripts/nibbli/experience.mjs';
const request = (): ArtistRequest => ({ protocol: 1, id: 'test', phase: 'plan', round: 0, goal: GHOST_GOAL, limits: ARTIST_LIMITS, specification: ARTIST_SPEC,
  observation: null, previousCritique: null, palette: null });
const blank = () => ({ width: 32, height: 32, data: new Array<number>(4096).fill(0) });
async function fixture() { return validatePlan((await new MockArtistAdapter().respond(request())).value); }
describe('Nibbli Artist trust and execution boundaries', () => {
  it('reads Tester and Artist failure/correction memory, including interrupted journals, without changing files', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'artist-memory-'));
    try {
      for (const family of ['runs', 'artist-runs']) {
        const folder = path.join(root, 'artifacts/nibbli', family, 'sample', 'attempt-test');
        await mkdir(folder, { recursive: true });
        await writeFile(path.join(folder, 'events.jsonl'), JSON.stringify({ kind: family === 'runs' ? 'journey-failed' : 'artist-critique', id: '1' }) + '\n{"interrupted":');
      }
      const before = await readFile(path.join(root, 'artifacts/nibbli/artist-runs/sample/attempt-test/events.jsonl'));
      const result = await readExperiences(root);
      expect(result.experiences).toHaveLength(2);
      expect(result.experiences.every(run => run.outcome.verdict === 'incomplete')).toBe(true);
      expect(result.experiences[1].observations).toContainEqual(expect.objectContaining({ kind: 'artist-critique' }));
      expect(result.experiences[1].observations).toContainEqual(expect.objectContaining({ journal: 'unparseable-line', status: 'incomplete' }));
      expect(await readFile(path.join(root, 'artifacts/nibbli/artist-runs/sample/attempt-test/events.jsonl'))).toEqual(before);
    } finally { await rm(root, { recursive: true, force: true }); }
  });
  it('rejects unknown capabilities, extra fields and invalid late coordinates before execution', async () => {
    const plan = await fixture();
    for (const command of [{ op: 'eval', code: 'window.store.setState()' }, { op: 'stroke', points: [{ x: 1, y: 1 }, { x: 32, y: 0 }] },
      { op: 'stroke', points: [{ x: 2.5, y: 1 }] }, { op: 'color', hex: '#ffffff' }, { op: 'tool', tool: 'curve' },
      { op: 'tool', tool: ['pen'] }, { op: 'tool', tool: { name: 'pen' } }, { op: 'tool', tool: null }, { op: 'tool', tool: 'pen', hidden: true }]) {
      expect(() => validatePlan({ ...plan, commands: [...plan.commands, command] })).toThrow();
    }
    expect(() => validatePlan({ ...plan, commands: new Array(65).fill(plan.commands[0]) })).toThrow('action count');
  });
  it('copies validated commands and fixes the three-color palette across corrections', async () => {
    const plan = await fixture(), copied = validatePlan(plan);
    plan.palette[0] = '#ffffff'; expect(copied.palette[0]).toBe('#29233d');
    expect(() => validatePlan(plan, copied.palette)).toThrow('palette');
  });
  it('preflights tool/color selection, bucket gesture shape and unqualified line slopes', async () => {
    const plan = await fixture();
    expect(() => predictPlan(blank(), { ...plan, commands: [{ op: 'stroke', points: [{ x: 1, y: 1 }] }] })).toThrow('explicitly');
    expect(() => predictPlan(blank(), { ...plan, commands: [{ op: 'tool', tool: 'bucket' }, { op: 'color', hex: plan.palette[0] },
      { op: 'stroke', points: [{ x: 1, y: 1 }, { x: 2, y: 1 }] }] })).toThrow('exactly one');
    expect(() => predictPlan(blank(), { ...plan, commands: [{ op: 'tool', tool: 'pen' }, { op: 'color', hex: plan.palette[0] },
      { op: 'stroke', points: [{ x: 1, y: 1 }, { x: 3, y: 2 }] }] })).toThrow('45-degree');
  });
  it('independently predicts a closed fill and symmetric correction without flooding the transparent background', async () => {
    const adapter = new MockArtistAdapter(), plan = await fixture(), initial = predictPlan(blank(), plan);
    expect(initial.data.slice(0, 4)).toEqual([0, 0, 0, 0]);
    expect(initial.data.slice((12 * 32 + 16) * 4, (12 * 32 + 16) * 4 + 4)).toEqual([244, 239, 251, 255]);
    const correction = validatePlan((await adapter.respond({ ...request(), round: 1 })).value, plan.palette);
    const final = predictPlan(initial, correction), at = (x: number, y: number) => final.data.slice((y * 32 + x) * 4, (y * 32 + x) * 4 + 4);
    expect(at(13, 13)).toEqual([171, 118, 207, 255]); expect(at(19, 13)).toEqual(at(13, 13));
    expect(measureRaster(final).colors).toHaveLength(3);
  });
  it('reserves cost before model calls and rejects over-reported usage and excessive requests', () => {
    const budget = new ArtistBudget(); expect(() => budget.reserve(request(), { tokens: 1, usd: .01 })).toThrow('budget');
    expect(budget.calls).toBe(0); budget.reserve(request(), { tokens: 10, usd: 0 });
    expect(() => budget.settle({ value: {}, usage: { tokens: 11, usd: 0 }, provenance: 'test' }, { tokens: 10, usd: 0 })).toThrow('upper bound');
    const bounded = new ArtistBudget(); for (let i = 0; i < 8; i++) bounded.reserve(request(), { tokens: 0, usd: 0 });
    expect(() => bounded.reserve(request(), { tokens: 0, usd: 0 })).toThrow('call limit');
    expect(() => new ArtistBudget().reserve({ ...request(), id: 'x'.repeat(600001) }, { tokens: 0, usd: 0 })).toThrow('too large');
  });
  it('limits total execution and refuses invalid artistic scores or contradictory acceptance', async () => {
    const budget = new ArtistBudget(), plan = await fixture();
    for (let i = 0; i < 17; i++) budget.reservePlan(plan);
    expect(() => budget.reservePlan(plan)).toThrow('Execution budget');
    const raw = (await new MockArtistAdapter().respond({ ...request(), phase: 'critique', round: 1 })).value as Record<string, unknown>;
    expect(() => validateCritique({ ...raw, planning: { meetsGoal: false, explanation: 'Incomplete' } })).toThrow('compliance');
    expect(() => validateCritique({ ...raw, artistic: { silhouette: 6, eyes: 5, palette: 5, explanation: 'Over score' } })).toThrow('1–5');
  });
  it('binds conversation replies to a fresh request ID and rejects script-like extra fields', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'artist-bridge-'));
    try {
      const adapter = new ConversationAdapter(root), signal = AbortSignal.timeout(2000);
      const response = adapter.respond(request(), signal);
      await writeFile(path.join(root, '0-plan-test.reply.json'), JSON.stringify({ requestId: 'wrong', value: {} }), { flag: 'wx' });
      await expect(response).rejects.toThrow('does not match');
      expect(JSON.parse(await readFile(path.join(root, '0-plan-test.request.json'), 'utf8')).goal).toEqual(GHOST_GOAL);
    } finally { await rm(root, { recursive: true, force: true }); }
  });
});
