import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { PixiBunController } from '../../scripts/nibbli/controller';
import { NibbliMemory } from '../../scripts/nibbli/memory';
import { ConversationAdapter } from '../../scripts/nibbli/artist/adapters';
import { HANDS_SPEC, MockHandsAdapter, MockCopyHandsAdapter, runHands, type HandsRequest } from '../../scripts/nibbli/artist/handsLoop';
import { ARTIST_LIMITS } from '../../scripts/nibbli/artist/protocol';
import { executeHandsPlan, handsSignature, observeHands, readHandsProject } from '../../scripts/nibbli/artist/hands';

async function seed(controller: PixiBunController, includeRightEye = true) {
  await controller.open(); await controller.singlePixelBrush(); await controller.color('#29233d');
  await controller.stroke([{ x: 11, y: 8 }, { x: 13, y: 6 }, { x: 18, y: 6 }, { x: 20, y: 8 }, { x: 22, y: 10 }, { x: 22, y: 23 },
    { x: 19, y: 20 }, { x: 16, y: 23 }, { x: 13, y: 20 }, { x: 10, y: 23 }, { x: 10, y: 9 }, { x: 11, y: 8 }]);
  await controller.tool('bucket'); await controller.color('#f4effb'); await controller.stroke([{ x: 16, y: 12 }]);
  await controller.layer('Eyes'); await controller.tool('pen'); await controller.color('#ab76cf');
  await controller.stroke([{ x: 13, y: 12 }, { x: 13, y: 14 }]);
  if (includeRightEye) await controller.stroke([{ x: 19, y: 14 }, { x: 19, y: 16 }]);
  await controller.addFrame(); await controller.stroke([{ x: 2, y: 2 }]); await controller.selectFrame(1);
}
async function setup(page: Page, browser: string, journey: string) {
  const root = process.env.NIBBLI_ARTIST_ROOT!;
  const candidate = JSON.parse(await readFile(path.join(root, 'candidate.json'), 'utf8'));
  const memory = await NibbliMemory.create(root, { ...candidate, browser, role: 'hands', journey });
  await page.addInitScript(() => Object.defineProperty(window, 'showSaveFilePicker', { value: undefined, configurable: true }));
  return { root, memory, controller: new PixiBunController(page, memory) };
}
test('Hands records intent, repairs an eye through real selection, preserves other content, Undo/Redo and saved exports', async ({ page }, info) => {
  const { root, memory, controller } = await setup(page, info.project.name, 'lossless-eye-edit');
  try {
    await seed(controller);
    const adapter = process.env.NIBBLI_ARTIST_MODE === 'conversation' ? new ConversationAdapter(path.join(root, 'inbox')) : new MockHandsAdapter();
    const result = await runHands(controller, memory, adapter, 'Align this small ghost’s eyes without changing their shape, the body or the other frame. Inspect the actual image and explain your editing decision.');
    expect(result.functional.edits).toBeGreaterThan(0); expect(result.functional.corrections).toBeLessThanOrEqual(3);
    const project = readHandsProject(await controller.export('project')), eyes = project.frames[0].layers.find(l => l.name === 'Eyes')!;
    const positions = (x: number) => Array.from({ length: 32 }, (_, y) => y).filter(y => eyes.raster.data[(y * 32 + x) * 4 + 3] === 255);
    // Independent fixture intent is fixed before the planner: the right eye must align with the untouched left eye.
    expect(positions(13)).toEqual([12, 13, 14]); expect(positions(19)).toEqual([12, 13, 14]);
    expect(project.frames).toHaveLength(2); expect(project.frames[0].layers).toHaveLength(2);
    expect(controller.runtimeErrors).toEqual([]); await memory.finish('passed', result);
  } catch (error) { await memory.finish('failed', { error: String(error), review: 'Keep expectations and inspect the retained plan, project and UI evidence.' }); throw error; }
});

test('Hands copies an eye through real Copy/Paste, preserving the source, other layers and saved history', async ({ page }, info) => {
  const { root, memory, controller } = await setup(page, info.project.name, 'copy-eye');
  try {
    await seed(controller, false);
    const adapter = process.env.NIBBLI_ARTIST_MODE === 'conversation' ? new ConversationAdapter(path.join(root, 'inbox')) : new MockCopyHandsAdapter();
    const result = await runHands(controller, memory, adapter, 'Give this ghost a second matching eye by copying its existing eye. Preserve the source eye, body, other frame and colors; inspect the actual image and explain the copy decision.');
    const project = readHandsProject(await controller.export('project')), eyes = project.frames[0].layers.find(l => l.name === 'Eyes')!;
    const opaque = eyes.raster.data.flatMap((alpha, i) => i % 4 === 3 && alpha ? [{ x: ((i - 3) / 4) % 32, y: Math.floor((i - 3) / 128), rgba: eyes.raster.data.slice(i - 3, i + 1) }] : []);
    expect(opaque).toEqual([12, 13, 14].flatMap(y => [13, 19].map(x => ({ x, y, rgba: [171, 118, 207, 255] }))));
    expect(result.functional).toMatchObject({ verdict: 'passed', edits: 1, protectedContent: 'passed', saveReloadAndExports: 'passed' });
    expect(controller.runtimeErrors).toEqual([]); await memory.finish('passed', result);
  } catch (error) { await memory.finish('failed', { error: String(error), review: 'Keep source-preservation and pixel expectations; inspect retained clipboard/UI evidence.' }); throw error; }
});

test('Hands copies an asymmetric three-color motif at 800 percent zoom without changing transparent holes or other frames', async ({ page }, info) => {
  const { memory, controller } = await setup(page, info.project.name, 'copy-motif-800');
  try {
    await controller.open(); await controller.singlePixelBrush(); await controller.color('#29233d'); await controller.stroke([{ x: 0, y: 0 }]);
    await controller.layer('Motif'); await controller.stroke([{ x: 4, y: 5 }, { x: 7, y: 5 }, { x: 7, y: 8 }]);
    await controller.color('#f4effb'); await controller.stroke([{ x: 5, y: 6 }, { x: 5, y: 7 }]);
    await controller.color('#ab76cf'); await controller.stroke([{ x: 6, y: 7 }]);
    await controller.addFrame(); await controller.stroke([{ x: 2, y: 2 }]); await controller.selectFrame(1);
    await page.getByRole('button', { name: /^Zoom \d+ percent\. Choose zoom level$/ }).click();
    await page.getByRole('group', { name: 'Zoom levels', exact: true }).getByRole('button', { name: '800%', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Zoom 800 percent. Choose zoom level', exact: true })).toBeVisible();
    const before = await observeHands(controller, memory), source = before.project.frames[0].layers.find(l => l.name === 'Motif')!.raster;
    const result = await runHands(controller, memory, new MockCopyHandsAdapter('Motif', { x: 3, y: 4, width: 7, height: 7 }, { x: 16, y: 8 }), 'Copy the asymmetric motif to the empty lower-right area. Keep the original colors, transparent holes, original motif and all other content.');
    const project = readHandsProject(await controller.export('project')), actual = project.frames[0].layers.find(l => l.name === 'Motif')!.raster;
    const pixel = (data: number[], x: number, y: number) => data.slice((y * 32 + x) * 4, (y * 32 + x) * 4 + 4);
    for (let y = 4; y < 11; y++) for (let x = 3; x < 10; x++) {
      expect(pixel(actual.data, x, y)).toEqual(pixel(source.data, x, y));
      expect(pixel(actual.data, x + 16, y + 8)).toEqual(pixel(source.data, x, y));
    }
    expect(actual.data.filter((_, i) => i % 4 === 3 && actual.data[i] === 255)).toHaveLength(source.data.filter((_, i) => i % 4 === 3 && source.data[i] === 255).length * 2);
    expect(project.frames[1]).toEqual(before.project.frames[1]); expect(controller.runtimeErrors).toEqual([]); await memory.finish('passed', result);
  } catch (error) { await memory.finish('failed', { error: String(error), review: 'Preserve asymmetric/alpha/source expectations and recorded geometry.' }); throw error; }
});

test('Hands refuses occupied and overlapping copies, including an invalid late batch, before altering any artwork', async ({ page }, info) => {
  const { memory, controller } = await setup(page, info.project.name, 'copy-refusals');
  try {
    await seed(controller); const observation = await observeHands(controller, memory);
    const request: HandsRequest = { protocol: 1, id: 'copy-refusal-fixture', phase: 'plan', round: 0, observation, goal: { description: 'Copy refusals' }, previousCritique: null,
      specification: HANDS_SPEC, limits: { ...ARTIST_LIMITS, editsPerPlan: 4, totalEdits: 12 } };
    const raw = (await new MockCopyHandsAdapter().respond(request)).value as { protocol: number; observationId: string; edits: Record<string, unknown>[] };
    await expect(executeHandsPlan(controller, memory, raw, observation)).rejects.toThrow('overwrite');
    const valid = { ...raw.edits[0], delta: { x: 0, y: 10 } }, overlapping = { ...raw.edits[0], delta: { x: 1, y: 0 } };
    await expect(executeHandsPlan(controller, memory, { ...raw, edits: [valid, overlapping] }, observation)).rejects.toThrow('overlap');
    if (await page.getByRole('dialog').isVisible()) await page.keyboard.press('Escape');
    await expect(controller.copySelection({ x: 11, y: 10, width: 5, height: 7 }, { x: 1, y: 0 })).rejects.toThrow('overlap');
    const targetId = observation.project.frames[0].layers.find(l => l.name === 'Eyes')!.id;
    await controller.selectLayer(targetId);
    await controller.action('cancel-pasted-copy-regression', { source: { x: 11, y: 10, width: 5, height: 7 }, expected: 'Discard the floating copy without writing pixels or committing history.' }, async () => {
      const box = await page.getByTestId('main-composite-canvas').boundingBox(); if (!box) throw new Error('Missing canvas geometry');
      const sx = box.width / 32, sy = box.height / 32;
      await controller.tool('select-box');
      await page.mouse.move(box.x + 11.5 * sx, box.y + 10.5 * sy); await page.mouse.down();
      try { await page.mouse.move(box.x + 15.5 * sx, box.y + 16.5 * sy, { steps: 2 }); } finally { await page.mouse.up(); }
      const gizmo = page.getByTestId('selection-transform-gizmo'); await expect(gizmo).toBeVisible();
      await page.locator('#main-content').focus(); await page.keyboard.press('ControlOrMeta+c'); await page.keyboard.press('Escape');
      await expect(gizmo).toBeHidden(); await page.keyboard.press('ControlOrMeta+v'); await expect(gizmo).toBeVisible();
      const body = page.getByTestId('gizmo-translate-body'); await expect(body).toHaveCSS('width', `${5 * sx}px`);
      const gripBox = await body.boundingBox(); if (!gripBox) throw new Error('Missing pasted-copy grip');
      const grip = { x: gripBox.x + gripBox.width * 0.3, y: gripBox.y + gripBox.height * 0.3 };
      expect(await page.evaluate(p => Boolean(document.elementFromPoint(p.x, p.y)?.closest('[data-testid="gizmo-translate-body"]')), grip)).toBe(true);
      await page.mouse.move(grip.x, grip.y); await page.mouse.down();
      try { await page.mouse.move(grip.x + 5 * sx, grip.y, { steps: 2 }); } finally { await page.mouse.up(); }
      await page.getByTestId('gizmo-cancel-btn').click(); await expect(gizmo).toBeHidden();
    });
    expect(handsSignature(readHandsProject(await controller.export('project')))).toBe(handsSignature(observation.project));
    expect((await NibbliMemory.readEvents(memory.directory)).filter(e => e.kind === 'hands-edit-intent')).toHaveLength(0);
    expect(controller.runtimeErrors).toEqual([]); await memory.event('expected-refusal', { verdict: 'passed', occupiedCopy: true, overlappingCopy: true, lateBatchInvalid: true, cancelledPastedCopyPreservesProject: true, artworkChanged: false });
    await memory.finish('passed', { functional: { verdict: 'passed', artworkChanged: false }, artistic: { verdict: 'not-evaluated' } });
  } catch (error) { await memory.finish('failed', { error: String(error) }); throw error; }
});
test('Hands rejects locked, stale and invalid late-batch actions before changing artwork', async ({ page }, info) => {
  const { memory, controller } = await setup(page, info.project.name, 'hands-refusal-boundaries');
  try {
    await seed(controller); const observation = await observeHands(controller, memory);
    const adapter = new MockHandsAdapter();
    const request: HandsRequest = { protocol: 1, id: 'refusal-fixture', observation, phase: 'plan', round: 0, goal: { description: 'Refusal fixture' },
      specification: HANDS_SPEC, limits: { ...ARTIST_LIMITS, editsPerPlan: 4, totalEdits: 12 }, previousCritique: null };
    const raw = (await adapter.respond(request)).value as { protocol: number; observationId: string; edits: Record<string, unknown>[] };
    const before = handsSignature(observation.project);
    await expect(executeHandsPlan(controller, memory, { ...raw, observationId: 'stale' }, observation)).rejects.toThrow('Stale');
    await expect(executeHandsPlan(controller, memory, { ...raw, edits: [...raw.edits, { ...raw.edits[0], delta: { x: 0, y: -32 } }] }, observation)).rejects.toThrow('outside');
    expect(handsSignature(readHandsProject(await controller.export('project')))).toBe(before);
    if (await page.getByRole('dialog').isVisible()) await page.keyboard.press('Escape');
    const targetId = observation.project.frames[0].layers.find(l => l.name === 'Eyes')!.id;
    await controller.selectLayer(targetId); await controller.tool('pen'); await controller.stroke([{ x: 2, y: 3 }]);
    const changed = readHandsProject(await controller.export('project'));
    await expect(executeHandsPlan(controller, memory, raw, observation)).rejects.toThrow('Workspace changed');
    expect(handsSignature(readHandsProject(await controller.export('project')))).toBe(handsSignature(changed));
    if (await page.getByRole('dialog').isVisible()) await page.keyboard.press('Escape');
    await expect(controller.moveSelection({ x: 18, y: 14, width: 2, height: 2 }, { x: 0, y: -2 })).rejects.toThrow('handle');
    expect(handsSignature(readHandsProject(await controller.export('project')))).toBe(handsSignature(changed));
    if (await page.getByRole('dialog').isVisible()) await page.keyboard.press('Escape');
    await page.locator('#main-content').focus(); await page.keyboard.press('Escape');
    await expect(page.getByTestId('selection-transform-gizmo')).toBeHidden();
    await page.getByTestId('tab-layers').click(); await page.getByRole('button', { name: 'Lock layer Eyes', exact: true }).click();
    const locked = await observeHands(controller, memory), lockedPlan = (await adapter.respond({ ...request, observation: locked })).value;
    await expect(executeHandsPlan(controller, memory, lockedPlan, locked)).rejects.toThrow('locked');
    await expect(controller.selectLayer(targetId)).rejects.toThrow('locked');
    await expect(controller.moveSelection({ x: 18, y: 13, width: 3, height: 5 }, { x: 0, y: -2 })).rejects.toThrow('locked');
    expect(handsSignature(readHandsProject(await controller.export('project')))).toBe(handsSignature(locked.project));
    const events = await NibbliMemory.readEvents(memory.directory);
    expect(events.filter(e => e.kind === 'hands-edit-intent')).toHaveLength(0);
    expect(controller.runtimeErrors).toEqual([]);
    await memory.event('expected-refusal', { verdict: 'passed', locked: true, stale: true, workspaceChanged: true, ambiguousHandle: true, lateBatchInvalid: true, artworkChangedByRejectedActions: false });
    await memory.finish('passed', { functional: { verdict: 'passed', artworkChanged: false }, artistic: { verdict: 'not-evaluated' } });
  } catch (error) { await memory.finish('failed', { error: String(error) }); throw error; }
});
