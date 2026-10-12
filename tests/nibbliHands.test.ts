import { describe, expect, it } from 'vitest';
import { handsSignature, predictHandsMove, validateHandsPlan, type HandsEdit, type HandsObservation } from '../scripts/nibbli/artist/hands';
import { ArtistBudget } from '../scripts/nibbli/artist/protocol';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { readExperiences } from '../scripts/nibbli/experience.mjs';

function fixture() {
  const raster = { width: 32, height: 32, data: Array<number>(4096).fill(0) };
  for (const [x, y] of [[13, 12], [13, 13], [13, 14], [19, 14], [19, 15], [19, 16]]) raster.data.splice((y * 32 + x) * 4, 4, 171, 118, 207, 255);
  const body = structuredClone(raster); body.data.fill(0); body.data.splice((8 * 32 + 15) * 4, 4, 244, 239, 251, 255);
  const layer = (id: string, pixels = body) => ({ id, name: id, locked: false, visible: true, metadata: { id, name: id, locked: false, visible: true, opacity: 1, blendMode: 'source-over' }, raster: structuredClone(pixels) });
  const observation: HandsObservation = { id: 'observed-1', composite: structuredClone(body), screenshotBase64: 'fixture',
    project: { metadata: { width: 32, height: 32 }, frames: [{ id: 'frame-1', metadata: { id: 'frame-1', durationMs: 100 }, layers: [layer('eyes', raster), layer('body')] },
      { id: 'frame-2', metadata: { id: 'frame-2', durationMs: 150 }, layers: [layer('protected-frame')] }] } };
  const edit: HandsEdit = { op: 'move-selection', frameId: 'frame-1', layerId: 'eyes', rect: { x: 18, y: 13, width: 3, height: 5 }, delta: { x: 0, y: -2 },
    reason: 'The right eye is two pixels low in the observed layer.', expectedChange: 'Raise the right eye while preserving the left eye and body.', protectedLayerIds: ['body', 'protected-frame'] };
  return { observation, edit, raw: { protocol: 1, observationId: observation.id, edits: [edit] } };
}
describe('Hands lossless edit and intent boundaries', () => {
  it('moves overlapping source/destination from the original pixels, preserving every other layer and frame', () => {
    const { observation, raw } = fixture(), before = structuredClone(observation), { checkpoints } = validateHandsPlan(raw, observation);
    const after = checkpoints[0], eyes = after.frames[0].layers[0].raster;
    const positions = (x: number) => Array.from({ length: 32 }, (_, y) => y).filter(y => eyes.data[(y * 32 + x) * 4 + 3] === 255);
    expect(positions(19)).toEqual([12, 13, 14]); expect(positions(13)).toEqual([12, 13, 14]);
    expect(after.frames[0].layers[1]).toEqual(observation.project.frames[0].layers[1]); expect(after.frames[1]).toEqual(observation.project.frames[1]);
    expect(after.metadata).toEqual(observation.project.metadata); expect(observation).toEqual(before);
  });
  it('detaches admitted plans and expectations from later planner mutation', () => {
    const { observation, raw } = fixture(), validated = validateHandsPlan(raw, observation), signature = handsSignature(validated.checkpoints[0]);
    raw.edits[0].delta.y = 20; raw.edits[0].protectedLayerIds.length = 0; observation.project.frames[0].layers[0].raster.data.fill(255);
    expect(validated.plan.edits[0]).toMatchObject({ op: 'move-selection', delta: { y: -2 } }); expect(validated.plan.edits[0].protectedLayerIds).toHaveLength(2);
    expect(handsSignature(validated.checkpoints[0])).toBe(signature);
  });
  it.each(['locked', 'hidden', 'recipe', 'opacity', 'blend'] as const)('refuses an unqualified %s target', reason => {
    const { observation, raw } = fixture(), layer = observation.project.frames[0].layers[0];
    if (reason === 'locked') layer.locked = true;
    if (reason === 'hidden') layer.visible = false;
    if (reason === 'recipe') layer.metadata.effect = { kind: 'photometric' };
    if (reason === 'opacity') layer.metadata.opacity = 0.5;
    if (reason === 'blend') layer.metadata.blendMode = 'multiply';
    expect(() => validateHandsPlan(raw, observation)).toThrow();
  });
  it.each(['stale', 'extraField', 'reason', 'expectation', 'omittedProtection', 'inventedProtection', 'joinedProtection', 'duplicateProtection', 'unsupported', 'fractional', 'outside', 'noMove', 'lateInvalid', 'tooMany'] as const)('rejects %s before changing any observed artwork', reason => {
    const { observation, raw } = fixture(), input = structuredClone(raw) as Record<string, unknown>, edits = input.edits as Record<string, unknown>[], edit = edits[0];
    if (reason === 'stale') input.observationId = 'old';
    if (reason === 'extraField') edit.code = 'run something';
    if (reason === 'reason') edit.reason = '';
    if (reason === 'expectation') edit.expectedChange = ' ';
    if (reason === 'omittedProtection') edit.protectedLayerIds = ['body'];
    if (reason === 'inventedProtection') edit.protectedLayerIds = ['body', 'invented'];
    if (reason === 'joinedProtection') edit.protectedLayerIds = ['body,protected-frame'];
    if (reason === 'duplicateProtection') edit.protectedLayerIds = ['body', 'body', 'protected-frame'];
    if (reason === 'unsupported') edit.op = 'rotate';
    if (reason === 'fractional') edit.delta = { x: 0.5, y: -2 };
    if (reason === 'outside') edit.delta = { x: 0, y: -32 };
    if (reason === 'noMove') edit.delta = { x: 0, y: 0 };
    if (reason === 'lateInvalid') edits.push({ ...edit, delta: { x: 0, y: -32 } });
    if (reason === 'tooMany') input.edits = Array(5).fill(edit);
    const before = handsSignature(observation.project); expect(() => validateHandsPlan(input, observation)).toThrow();
    expect(handsSignature(observation.project)).toBe(before);
  });
  it.each(['occupied', 'partialAlpha', 'hiddenRgb', 'empty'] as const)('refuses %s raster operations', kind => {
    const { observation, edit } = fixture(), raster = observation.project.frames[0].layers[0].raster;
    if (kind === 'occupied') raster.data.splice((11 * 32 + 18) * 4, 4, 10, 20, 30, 255);
    if (kind === 'partialAlpha') raster.data[(14 * 32 + 19) * 4 + 3] = 128;
    if (kind === 'hiddenRgb') raster.data[(13 * 32 + 18) * 4] = 1;
    if (kind === 'empty') raster.data.fill(0);
    expect(() => predictHandsMove(raster, edit)).toThrow();
  });
  it('counts Hands reservations against existing action and point limits without increasing them', () => {
    const budget = new ArtistBudget(); budget.reserveExecution(56, 16); budget.reserveExecution(56, 16);
    expect(() => budget.reserveExecution(56, 16)).toThrow('budget'); expect(budget.actions).toBe(112);
    expect(() => budget.reserveExecution(-1, 0)).toThrow('Invalid'); expect(() => budget.reserveExecution(1, 0.5)).toThrow('Invalid');
  });
  it('exposes Hands intent and pixel failures while retaining an incomplete journal byte for byte', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'nibbli-hands-memory-'));
    if (!path.resolve(root).startsWith(path.resolve(os.tmpdir()) + path.sep)) throw new Error('Unexpected test cleanup target');
    try {
      const folder = path.join(root, 'artifacts/nibbli/hands-runs/run-1/attempt-1'); await mkdir(folder, { recursive: true });
      const journal = [
        JSON.stringify({ id: '1', kind: 'hands-edit-intent', reason: 'Right eye is low', expectedChange: 'Raise only that eye', protectedLayerIds: ['body'] }),
        JSON.stringify({ id: '2', kind: 'hands-verification', verdict: 'failed', metadataAndAllLayerPixelsEqual: false }),
        '{interrupted-line',
      ].join('\n');
      await writeFile(path.join(folder, 'events.jsonl'), journal);
      const result = await readExperiences(root);
      expect(result.experiences).toHaveLength(1); expect(result.experiences[0].outcome.verdict).toBe('incomplete');
      expect(result.experiences[0].observations).toEqual(expect.arrayContaining([
        expect.objectContaining({ kind: 'hands-edit-intent', protectedLayerIds: ['body'] }),
        expect.objectContaining({ kind: 'hands-verification', verdict: 'failed' }),
        expect.objectContaining({ journal: 'unparseable-line', status: 'incomplete', originalLine: '{interrupted-line' }),
      ]));
      expect(await readFile(path.join(folder, 'events.jsonl'), 'utf8')).toBe(journal);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
