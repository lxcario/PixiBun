import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { PixiBunController } from '../../scripts/nibbli/controller';
import { NibbliMemory } from '../../scripts/nibbli/memory';
import { ControllerInputError } from '../../scripts/nibbli/geometry';
import { readCanvas, readProject, readNativePng, verifyRaster, type Raster } from '../../scripts/nibbli/vision';

const dark = '#24203c', body = '#f3eef7', eyes = '#c67de0';
const rgba = (hex: string) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16), 255];
const blank = (): Raster => ({ width: 32, height: 32, data: new Array<number>(32 * 32 * 4).fill(0) });
const stamp = (raster: Raster, x: number, y: number, color: number[]) => raster.data.splice((y * 32 + x) * 4, 4, ...color);
function outline() {
  const result = blank();
  for (let x = 10; x <= 21; x++) for (const y of [7, 22]) stamp(result, x, y, rgba(dark));
  for (let y = 7; y <= 22; y++) for (const x of [10, 21]) stamp(result, x, y, rgba(dark));
  return result;
}
function filled() {
  const result = outline();
  for (let y = 8; y <= 21; y++) for (let x = 11; x <= 20; x++) stamp(result, x, y, rgba(body));
  return result;
}

test('Nibbli Tester draws a ghost, proves fill/Undo, edits a layer and verifies saved files', async ({ page }, info) => {
  const root = process.env.NIBBLI_RUN_ROOT!;
  const candidate = JSON.parse(await readFile(`${root}/candidate.json`, 'utf8'));
  const memory = await NibbliMemory.create(root, { ...candidate, browser: info.project.name,
    journey: 'ghost-core-v1', role: 'tester', artisticQuality: 'Not evaluated by these functional assertions.' });
  const controller = new PixiBunController(page, memory);
  let verdict: 'passed' | 'failed' = 'failed';
  try {
    await memory.event('environment-profile', { projectExport: 'browser-download fallback',
      capabilityFixture: 'File System Access save picker unavailable', nativeOsPickerQualified: false });
    // Select the existing download path; drawing, serialization and files stay native.
    await page.addInitScript(() => {
      Object.defineProperty(window, 'showSaveFilePicker', { value: undefined, configurable: true });
    });
    await controller.open();
    await verifyRaster(memory, 'New project is empty', await readCanvas(page), blank());
    await controller.tool('pen'); await controller.color(dark);
    for (const [start, end] of [
      [{ x: 10, y: 7 }, { x: 21, y: 7 }], [{ x: 21, y: 7 }, { x: 21, y: 22 }],
      [{ x: 21, y: 22 }, { x: 10, y: 22 }], [{ x: 10, y: 22 }, { x: 10, y: 7 }],
    ]) await controller.stroke([start, end]);
    await verifyRaster(memory, 'Pen produced the independently specified closed outline', await readCanvas(page), outline());
    await controller.color(body); await controller.tool('bucket'); await controller.stroke([{ x: 16, y: 13 }]);
    const fillEvidence = await verifyRaster(memory, 'Fill colors only the enclosed body', await readCanvas(page), filled());
    await controller.undo();
    const undoEvidence = await verifyRaster(memory, 'Undo restores every pre-fill byte', await readCanvas(page), outline());
    await controller.redo(); await verifyRaster(memory, 'Redo restores the filled body', await readCanvas(page), filled());
    await controller.layer('Ghost eyes'); await controller.tool('pen'); await controller.color(eyes);
    await controller.stroke([{ x: 13, y: 12 }]); await controller.stroke([{ x: 18, y: 12 }]);
    const ghost = filled(); stamp(ghost, 13, 12, rgba(eyes)); stamp(ghost, 18, 12, rgba(eyes));
    await verifyRaster(memory, 'Eyes are on the added layer', await readCanvas(page), ghost);
    await controller.tool('eraser'); await controller.stroke([{ x: 13, y: 12 }]);
    const erased = filled(); stamp(erased, 18, 12, rgba(eyes));
    await verifyRaster(memory, 'Eraser reveals the intact body underneath', await readCanvas(page), erased);
    await controller.undo(); await verifyRaster(memory, 'Undo restores the eye', await readCanvas(page), ghost);
    await controller.redo(); await verifyRaster(memory, 'Redo erases only that eye', await readCanvas(page), erased);
    await controller.undo(); await controller.save(); await controller.reload();
    await verifyRaster(memory, 'Saved reload preserves every composite byte', await readCanvas(page), ghost);
    const project = readProject(await controller.export('project'));
    expect(project.frames).toHaveLength(1); expect(project.frames[0].layers).toHaveLength(2);
    const eyeLayer = project.frames[0].layers.find(layer => layer.name === 'Ghost eyes');
    expect(eyeLayer).toBeDefined();
    const expectedEyes = blank(); stamp(expectedEyes, 13, 12, rgba(eyes)); stamp(expectedEyes, 18, 12, rgba(eyes));
    await verifyRaster(memory, 'Project backup preserves separate eye pixels', eyeLayer!.raster, expectedEyes);
    await verifyRaster(memory, 'Project backup preserves the body layer', project.frames[0].layers.find(layer => layer.name !== 'Ghost eyes')!.raster, filled());
    const png = readNativePng(await controller.export('png'));
    await verifyRaster(memory, 'Downloaded PNG matches the independently specified ghost', png, ghost);
    await memory.event('runtime-verification', { errors: controller.runtimeErrors });
    expect(controller.runtimeErrors).toEqual([]);
    await memory.observation('The UI-driven closed outline supports bounded fill and exact Undo. This is a candidate strategy, not learned artistic ability.', [fillEvidence, undoEvidence]);
    verdict = 'passed';
  } catch (error) {
    await memory.event('journey-failed', { message: String(error), failureOwner: 'unknown', review: 'Investigate retained UI, pixels and downloaded files before changing expectations.' });
    throw error;
  } finally {
    await memory.finish(verdict, { runtimeErrors: controller.runtimeErrors });
    await info.attach('Nibbli report', { path: `${memory.directory}/report.html`, contentType: 'text/html' });
  }
});

test('Nibbli retains its refused attempt and attributable correction without weakening expectations', async ({ page }, info) => {
  const memory = await NibbliMemory.create(process.env.NIBBLI_RUN_ROOT!, { browser: info.project.name, journey: 'controller-correction-v1' });
  const controller = new PixiBunController(page, memory);
  let verdict: 'passed' | 'failed' = 'failed';
  try {
    await controller.open(); await controller.tool('pen'); await controller.color(dark);
    await expect(controller.stroke([{ x: 4, y: 4 }, { x: 32, y: 4 }])).rejects.toBeInstanceOf(ControllerInputError);
    await verifyRaster(memory, 'Invalid gesture did not partly paint', await readCanvas(page), blank());
    const events = await NibbliMemory.readEvents(memory.directory);
    const failure = events.find(event => event.kind === 'action-failed');
    expect(failure?.failureOwner).toBe('controller');
    await controller.stroke([{ x: 4, y: 4 }], failure!.id);
    const expected = blank(); stamp(expected, 4, 4, rgba(dark));
    const evidence = await verifyRaster(memory, 'Corrected input paints exactly one intended pixel', await readCanvas(page), expected);
    await memory.observation('An out-of-bounds plan was refused before mouse-down; an in-bounds correction succeeded.', [failure!.id, evidence], failure!.id);
    expect((await NibbliMemory.readEvents(memory.directory)).filter(event => event.kind === 'action-failed')).toHaveLength(1);
    verdict = 'passed';
  } catch (error) {
    await memory.event('journey-failed', { message: String(error), failureOwner: 'unknown' });
    throw error;
  } finally { await memory.finish(verdict); }
});
