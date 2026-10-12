import { randomUUID } from 'node:crypto';
import type { PixiBunController } from '../controller';
import { readCanvas, readNativePng, readProject, verifyRaster, type Raster } from '../vision';
import { NibbliMemory } from '../memory';
import { ArtistBoundaryError, ArtistBudget, ARTIST_LIMITS, ARTIST_SPEC, GHOST_GOAL, measureRaster, validateCritique, validatePlan,
  type ArtistAdapter, type ArtistCritique, type ArtistObservation, type ArtistPlan, type ArtistRequest, type ArtistTool } from './protocol';

/** Independent specification of the three qualified one-pixel tools; no production raster imports. */
export function predictPlan(before: Raster, plan: ArtistPlan): Raster {
  const result = structuredClone(before); let tool: ArtistTool | null = null, rgba: number[] | null = null;
  const index = (x: number, y: number) => (y * 32 + x) * 4;
  const stamp = (x: number, y: number) => result.data.splice(index(x, y), 4, ...(tool === 'eraser' ? [0, 0, 0, 0] : rgba!));
  for (const command of plan.commands) {
    if (command.op === 'tool') { tool = command.tool; continue; }
    if (command.op === 'color') { rgba = [1, 3, 5].map(at => parseInt(command.hex.slice(at, at + 2), 16)).concat(255); continue; }
    if (!tool || (tool !== 'eraser' && !rgba)) throw new ArtistBoundaryError('Each plan must explicitly choose tool and color before painting');
    if (tool === 'bucket') {
      if (command.points.length !== 1) throw new ArtistBoundaryError('Bucket requires exactly one point');
      const start = command.points[0], old = result.data.slice(index(start.x, start.y), index(start.x, start.y) + 4);
      const queue = [start], seen = new Set<number>();
      for (let cursor = 0; cursor < queue.length; cursor++) {
        const { x, y } = queue[cursor], at = index(x, y);
        if (x < 0 || y < 0 || x >= 32 || y >= 32 || seen.has(at)) continue;
        seen.add(at); if (result.data.slice(at, at + 4).some((v, c) => v !== old[c])) continue;
        stamp(x, y); queue.push({ x: x - 1, y }, { x: x + 1, y }, { x, y: y - 1 }, { x, y: y + 1 });
      }
      continue;
    }
    stamp(command.points[0].x, command.points[0].y);
    for (let cursor = 1; cursor < command.points.length; cursor++) {
      const start = command.points[cursor - 1], end = command.points[cursor];
      const dx = end.x - start.x, dy = end.y - start.y;
      if (dx && dy && Math.abs(dx) !== Math.abs(dy)) throw new ArtistBoundaryError('v0.1 strokes support horizontal, vertical and 45-degree segments only');
      const length = Math.max(Math.abs(dx), Math.abs(dy));
      for (let step = 1; step <= length; step++) stamp(start.x + Math.sign(dx) * step, start.y + Math.sign(dy) * step);
    }
  }
  return result;
}
export async function runArtist(controller: PixiBunController, memory: NibbliMemory, adapter: ArtistAdapter, options: { maxUsd?: number } = {}) {
  const budget = new ArtistBudget(options.maxUsd ?? 0); let round = 0, palette: string[] | null = null;
  let observation: ArtistObservation | null = null, critique: ArtistCritique | null = null, correctionOf: string | undefined;
  const judgments: { round: number; critique: ArtistCritique; source: string }[] = [];
  await memory.event('artist-goal', { goal: GHOST_GOAL, adapter: { id: adapter.id, mode: adapter.mode }, limits: ARTIST_LIMITS,
    autonomousModelConnected: adapter.mode === 'model', modelTraining: false, maxUsd: options.maxUsd ?? 0 });
  const ask = async (phase: ArtistRequest['phase']) => {
    const request: ArtistRequest = { protocol: 1, id: randomUUID(), phase, round, goal: GHOST_GOAL, limits: ARTIST_LIMITS, specification: ARTIST_SPEC, palette,
      observation, previousCritique: critique };
    await memory.artifact(`round-${round}-${phase}-request.json`, JSON.stringify(request));
    const quote = structuredClone(adapter.quote(request)); budget.reserve(request, quote);
    await memory.event('adapter-request', { id: request.id, phase, round, quote });
    const signal = AbortSignal.timeout(budget.timeRemaining());
    const reply = await Promise.race([adapter.respond(structuredClone(request), signal), new Promise<never>((_, reject) => {
      signal.addEventListener('abort', () => reject(new ArtistBoundaryError('Adapter deadline reached')), { once: true });
    })]);
    await memory.artifact(`round-${round}-${phase}-response.json`, JSON.stringify(reply));
    budget.checkTime(); budget.settle(reply, quote);
    await memory.event('adapter-response', { id: request.id, phase, round, provenance: reply.provenance, usage: reply.usage });
    return reply;
  };
  await controller.open();
  await controller.singlePixelBrush();
  let raster = await readCanvas(controller.page);
  if (raster.data.some(Boolean)) throw new ArtistBoundaryError('Artist requires a new, empty project in a disposable browser context');
  for (;;) {
    const reply = await ask('plan');
    const plan = validatePlan(reply.value, palette ?? undefined);
    // Predict and validate ALL commands before the first real UI edit in this batch.
    const expected = predictPlan(raster, plan); budget.reservePlan(plan); palette ??= plan.palette;
    const planEvent = await memory.event('artist-plan-validated', { round, plan, correctionOf });
    for (const command of plan.commands) {
      budget.checkTime();
      if (command.op === 'tool') await controller.tool(command.tool);
      else if (command.op === 'color') await controller.color(command.hex);
      else await controller.stroke(command.points, correctionOf);
    }
    raster = await readCanvas(controller.page);
    await verifyRaster(memory, `Artist round ${round}: exact independent tool result`, raster, expected);
    const screenshot = await controller.page.screenshot();
    const native = Buffer.from(await controller.page.getByTestId('main-composite-canvas').evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL('image/png').split(',')[1]), 'base64');
    await verifyRaster(memory, `Artist round ${round}: independently decoded native PNG`, readNativePng(native), raster);
    await memory.artifact(`round-${round}-screen.png`, screenshot); await memory.artifact(`round-${round}-native.png`, native);
    observation = { raster, screenshotBase64: screenshot.toString('base64'), nativePngBase64: native.toString('base64'), functional: measureRaster(raster) };
    await memory.event('artist-observation', { round, functional: observation.functional, evidence: [planEvent],
      screenshot: `round-${round}-screen.png`, raster: `round-${round}-native.png` });
    const assessment = await ask('critique'); critique = validateCritique(assessment.value);
    judgments.push({ round, critique, source: assessment.provenance });
    correctionOf = await memory.event('artist-critique', { round, critique, advisory: true, source: assessment.provenance,
      artisticQualification: adapter.mode === 'mock' ? 'Mock opinion; not an artistic assessment' : 'Model/agent opinion; human approval remains separate' });
    if (critique.decision === 'accept') break;
    if (round >= ARTIST_LIMITS.corrections) throw new ArtistBoundaryError('Correction limit reached; retain the unsuccessful attempt');
    round++;
  }
  const functional = measureRaster(raster);
  if (functional.colors.length !== 3 || functional.partialAlphaPixels || !functional.opaquePixels || !functional.transparentPixels
    || functional.colors.some(hex => !palette!.includes(hex))) throw new ArtistBoundaryError('Independent goal constraints failed; critique cannot override them');
  await controller.save(); await controller.reload();
  await verifyRaster(memory, 'Artist saved reload preserves all RGBA bytes', await readCanvas(controller.page), raster);
  const project = readProject(await controller.export('project'));
  if (project.frames.length !== 1 || project.frames[0].layers.length !== 1) throw new ArtistBoundaryError('Unexpected project structure');
  await verifyRaster(memory, 'Artist project contains the exact independent layer pixels', project.frames[0].layers[0].raster, raster);
  await verifyRaster(memory, 'Artist exported PNG matches the live canvas', readNativePng(await controller.export('png')), raster);
  if (controller.runtimeErrors.length) throw new Error(`Browser errors: ${controller.runtimeErrors.join('; ')}`);
  return { functional: { verdict: 'passed', ...functional, corrections: round, saveReload: 'passed', projectAndPng: 'passed' },
    planning: { source: adapter.mode, judgments, verdict: 'agent-assessed' },
    artistic: { verdict: adapter.mode === 'mock' ? 'not-evaluated-mock' : 'human-review-required', judgments },
    usage: { calls: budget.calls, actions: budget.actions, points: budget.points, ...budget.usage } };
}
