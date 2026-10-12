import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { PixiBunController } from '../../scripts/nibbli/controller';
import { NibbliMemory } from '../../scripts/nibbli/memory';
import { observePlayback, readCanvas, readNativePng, readProject, verifyRaster, type Raster } from '../../scripts/nibbli/vision';

// Reviewed golden sprite, separate from the controller's stroke instructions below.
const rows = [
  '.....DDDD.....', '...DDBBBBDD...', '..DBBBBBBBBD..', '.DBBBBBBBBBBD.',
  'DBBBBBBBBBBBBD', 'DBBBBBBBBBBBBD', 'DBBBEEBBBEEBBD', 'DBBBEEBBBEEBBD',
  'DBBBBBBBBBBBBD', 'DBBBBBBBBBBBBD', 'DBBBBBBBBBBBBD', 'DBBBBBBBBBBBBD',
  'DBBBBBBBBBBBBD', 'DBBBDDBBDDBBBD', 'DBBD..DD..DBBD', 'DDD........DDD',
];
const colors = { D: [36, 32, 60, 255], B: [243, 238, 247, 255], E: [198, 125, 224, 255] };
const offsets = [0, -2, -1, 1], durations = [160, 120, 180, 220];
const blank = (): Raster => ({ width: 32, height: 32, data: new Array<number>(4096).fill(0) });
function reference(offset: number, outlinedOnly = false): Raster {
  const raster = blank();
  rows.forEach((row, y) => Array.from(row).forEach((letter, x) => {
    if (letter === '.' || (outlinedOnly && letter !== 'D')) return;
    raster.data.splice(((y + 7 + offset) * 32 + x + 9) * 4, 4, ...colors[letter as keyof typeof colors]);
  }));
  return raster;
}
const poses = offsets.map(offset => reference(offset));

async function draw(controller: PixiBunController, memory: NibbliMemory, page: Page, frame: number) {
  const offset = offsets[frame];
  await controller.tool('pen'); await controller.color('#24203c');
  const segments = [
    [14, 7, 17, 7], [12, 8, 13, 8], [18, 8, 19, 8], [11, 9, 11, 9], [20, 9, 20, 9],
    [10, 10, 10, 10], [21, 10, 21, 10], [9, 11, 9, 21], [22, 11, 22, 21],
    [13, 20, 14, 20], [17, 20, 18, 20], [12, 21, 12, 21], [15, 21, 16, 21], [19, 21, 19, 21],
    [9, 22, 11, 22], [20, 22, 22, 22],
  ];
  for (const [x1, y1, x2, y2] of segments) await controller.stroke([{ x: x1, y: y1 + offset }, { x: x2, y: y2 + offset }]);
  await verifyRaster(memory, `Frame ${frame + 1}: rounded closed outline`, await readCanvas(page), reference(offset, true));
  await controller.color('#f3eef7'); await controller.tool('bucket'); await controller.stroke([{ x: 16, y: 12 + offset }]);
  await controller.tool('pen'); await controller.color('#c67de0');
  for (const y of [13, 14]) for (const x of [13, 18]) await controller.stroke([{ x, y: y + offset }, { x: x + 1, y: y + offset }]);
  await verifyRaster(memory, `Frame ${frame + 1}: independently specified pose`, await readCanvas(page), poses[frame]);
  await controller.frameDuration(durations[frame]);
}

async function checkFrames(controller: PixiBunController, memory: NibbliMemory, label: string) {
  await expect(controller.page.getByRole('button', { name: /^Select frame \d+\./ })).toHaveCount(4);
  for (let frame = 0; frame < 4; frame++) {
    await controller.selectFrame(frame + 1);
    await expect(controller.page.getByRole('spinbutton', { name: 'Active frame duration in milliseconds', exact: true })).toHaveValue(String(durations[frame]));
    await verifyRaster(memory, `${label} frame ${frame + 1}: exact ordered RGBA`, await readCanvas(controller.page), poses[frame]);
  }
}

test('Nibbli Motion Journey: Floating Ghost preserves four poses, timing and exported animation', async ({ page }, info) => {
  // More UI gestures and captures than the core journey; its existing timeout stays unchanged.
  test.setTimeout(720_000);
  const root = process.env.NIBBLI_RUN_ROOT!;
  const candidate = JSON.parse(await readFile(`${root}/candidate.json`, 'utf8'));
  const memory = await NibbliMemory.create(root, { ...candidate, browser: info.project.name, journey: 'floating-ghost-v1', role: 'tester' });
  const controller = new PixiBunController(page, memory);
  const artistic = { status: 'human-review-required', autonomousPlanning: false,
    description: 'Scripted rounded ghost with scalloped feet, two eyes and four vertical poses.',
    observations: 'Three-color reference; rigid vertical translation. No pose deformation, easing or autonomous aesthetic judgment.',
    rubric: ['Silhouette readability', 'Palette and contrast', 'Motion continuity', 'Timing appeal'],
    grade: 'No artistic pass/fail is inferred from functional assertions.' };
  let verdict: 'passed' | 'failed' = 'failed';
  let previewPage: Page | undefined;
  let previewController: PixiBunController | undefined;
  try {
    await memory.event('environment-profile', { projectExport: 'browser-download fallback', nativeOsPickerQualified: false });
    await page.context().addInitScript(() => Object.defineProperty(window, 'showSaveFilePicker', { value: undefined, configurable: true }));
    await memory.artifact('reference-poses.json', JSON.stringify({ offsets, durations, poses }));
    await controller.open(); await controller.previewSettings();
    for (let frame = 0; frame < 4; frame++) {
      if (frame > 0) await controller.addFrame();
      await verifyRaster(memory, `New frame ${frame + 1} starts empty`, await readCanvas(page), blank());
      await draw(controller, memory, page, frame);
    }
    await checkFrames(controller, memory, 'Before save');
    await controller.save(); await controller.reload();
    await checkFrames(controller, memory, 'Saved reload');
    const project = readProject(await controller.export('project'));
    expect([project.width, project.height]).toEqual([32, 32]);
    expect(project.frames.map(frame => frame.durationMs)).toEqual(durations);
    for (let frame = 0; frame < 4; frame++) {
      expect(project.frames[frame].layers).toHaveLength(1);
      await verifyRaster(memory, `Downloaded project frame ${frame + 1}`, project.frames[frame].layers[0].raster, poses[frame]);
    }
    await expect(page.locator('iframe')).toHaveCount(0);
    const sheet = await controller.spriteSheet();
    const png = readNativePng(sheet.png.bytes);
    const expectedSheet: Raster = { width: 128, height: 32, data: [] };
    for (let y = 0; y < 32; y++) for (const pose of poses) expectedSheet.data.push(...pose.data.slice(y * 128, (y + 1) * 128));
    await verifyRaster(memory, 'Downloaded horizontal sprite sheet: exact ordered tiles', png, expectedSheet);
    const metadata = JSON.parse(sheet.json.bytes.toString('utf8'));
    expect(metadata.frames.map((frame: { filename: string; duration: number; frame: unknown }) => ({ filename: frame.filename, duration: frame.duration, rect: frame.frame })))
      .toEqual(durations.map((duration, frame) => ({ filename: `frame_${String(frame).padStart(3, '0')}.png`, duration, rect: { x: frame * 32, y: 0, w: 32, h: 32 } })));
    expect(metadata.meta).toMatchObject({ image: sheet.png.filename, format: 'RGBA8888', size: { w: 128, h: 32 }, scale: '1' });
    expect(metadata.meta.animations.find((clip: { id: string }) => clip.id === '__all__')).toMatchObject({ frames: [0, 1, 2, 3], loop: true });
    const godot = sheet.tres.bytes.toString('utf8');
    expect(godot).toContain(`path="res://${sheet.png.filename}"`);
    expect(godot).toContain('"name": &"All frames", "loop": 1');
    for (let frame = 0; frame < 4; frame++) {
      expect(godot).toContain(`region = Rect2(${frame * 32}, 0, 32, 32)`);
      expect(godot).toContain(`{"duration": ${durations[frame]}.0, "texture": SubResource("frame_${frame}")}`);
    }
    expect(godot).toContain(`"name": &"All frames", "loop": 1, "speed": 1000.0, "frames": [${durations.map((duration, frame) => `{"duration": ${duration}.0, "texture": SubResource("frame_${frame}")}`).join(', ')}]`);
    await expect(page.locator('iframe')).toHaveCount(0);
    const filesEvidence = await memory.event('file-verification', { verdict: 'passed', formats: ['pixibun', 'native PNG', 'TexturePacker JSON', 'Godot SpriteFrames'], durations, order: [0, 1, 2, 3], downloadFramesReleased: true });

    // A separate page shares only this disposable context's saved IndexedDB project.
    // Playwright records this short real UI session, not an animation synthesized from fixtures.
    previewPage = await page.context().newPage();
    previewController = new PixiBunController(previewPage, memory, 'preview');
    await previewController.resume();
    await checkFrames(previewController, memory, 'Independent preview-page reload');
    await previewController.previewSettings(); await previewController.selectFrame(1);
    await previewController.playing(true);
    const playback = await observePlayback(previewPage, poses);
    await memory.artifact('playback-observation.json', JSON.stringify(playback, null, 2));
    const playbackEvidence = await memory.event('playback-observation', { ...playback, expectedCycle: [0, 1, 2, 3, 0] });
    expect(playback.unmatchedSamples).toBe(0);
    const observed = playback.transitions.map(transition => transition.frame);
    expect(observed.length).toBeGreaterThanOrEqual(9);
    for (let index = 1; index < observed.length; index++) expect(observed[index]).toBe((observed[index - 1] + 1) % 4);
    await previewController.playing(false);
    const video = previewPage.video();
    if (!video) throw new Error('Native preview recording is unavailable.');
    await previewPage.close();
    const videoBytes = await readFile(await video.path());
    expect(videoBytes.length).toBeGreaterThan(0);
    await memory.artifact('preview.webm', videoBytes);
    await memory.event('preview-video', { file: 'preview.webm', bytes: videoBytes.length, source: 'Playwright native recording of the restored project and actual timeline playback' });
    const errors = [...controller.runtimeErrors, ...previewController.runtimeErrors];
    await memory.event('runtime-verification', { errors }); expect(errors).toEqual([]);
    await memory.observation('Four UI-authored poses survived saved reload and native exports; the renderer played their repeating order. Timing observations are separate from exact stored durations.', [filesEvidence, playbackEvidence]);
    verdict = 'passed';
  } catch (error) {
    await memory.event('journey-failed', { message: String(error), failureOwner: 'unknown', review: 'Preserve the fixture and investigate UI actions, native pixels and files before proposing a separate repair.' });
    throw error;
  } finally {
    if (previewPage && !previewPage.isClosed()) await previewPage.close();
    await memory.finish(verdict, { runtimeErrors: [...controller.runtimeErrors, ...(previewController?.runtimeErrors ?? [])],
      functional: { verdict, frames: 4, durations, expectedOffsets: offsets, formats: ['pixibun', 'sprite sheet PNG', 'JSON', 'Godot'],
      scope: 'Frozen local browser-download candidate; not release qualification or OS picker coverage.' }, artistic });
    await info.attach('Nibbli motion report', { path: `${memory.directory}/report.html`, contentType: 'text/html' });
  }
});
