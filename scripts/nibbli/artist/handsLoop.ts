import { randomUUID } from 'node:crypto';
import type { PixiBunController } from '../controller';
import type { NibbliMemory } from '../memory';
import { readCanvas, readNativePng, verifyRaster } from '../vision';
import { ArtistBudget, ArtistBoundaryError, ARTIST_LIMITS, type AdapterReply, type Usage } from './protocol';
import { HANDS_LIMITS, HANDS_ACTION_COST, executeHandsPlan, observeHands, readHandsProject, validateHandsPlan, verifyHandsProject, type HandsObservation, type HandsEdit, type HandsTranslation, type HandsFlip, type HandsRotation } from './hands';

const strict = (properties: Record<string, unknown>) => ({ type: 'object', additionalProperties: false, required: Object.keys(properties), properties });
const explanation = { type: 'string', minLength: 1, maxLength: 2000 }, integer = { type: 'integer', minimum: 0, maximum: 31 };
const editFields = { frameId: { type: 'string' }, layerId: { type: 'string' },
  rect: strict({ x: integer, y: integer, width: { type: 'integer', minimum: 2, maximum: 32 }, height: { type: 'integer', minimum: 2, maximum: 32 } }),
  reason: explanation, expectedChange: explanation, protectedLayerIds: { type: 'array', uniqueItems: true, items: { type: 'string' } } };
export const HANDS_SPEC = Object.freeze({
  instructions: [
    'Inspect the supplied screenshot, composite and independently decoded layer pixels. Propose edits only for an observed problem or the supplied goal.',
    'Every edit names its stable frame/layer identities, reason, expectedChange and all other protectedLayerIds. Keep artwork outside source/destination identical.',
    'Only lossless integer rectangular movement/copying into empty space, an in-place horizontal/vertical flip, or an exact 90/180/270 degree clockwise rotation on the same frame/layer is supported. Rotation requires an explicit bounded half-pixel pivot, grid-aligned output and an empty destination outside the source. Copies preserve their source and require a disjoint destination. Flips/rotations must change visible artwork. No free-angle rotation, scaling, script, state write or lock override.',
    'The entire batch is validated before editing. Bind the observationId; stale plans stop rather than silently replaying. Functional expectations cannot be changed by critique.',
    'Explain artistic quality separately. At most three correction plans and zero runner dollars. Do not claim mock scores as artistic evidence.',
  ],
  planSchema: strict({ protocol: { const: 1 }, observationId: { type: 'string' }, edits: { type: 'array', minItems: 1, maxItems: 4,
    items: { oneOf: [strict({ op: { enum: ['move-selection', 'copy-selection'] }, ...editFields,
      delta: strict({ x: { type: 'integer', minimum: -31, maximum: 31 }, y: { type: 'integer', minimum: -31, maximum: 31 } }) }),
      strict({ op: { const: 'flip-selection' }, ...editFields, axis: { enum: ['horizontal', 'vertical'] } }),
      strict({ op: { const: 'rotate-selection' }, ...editFields, degrees: { enum:[90,180,270] },
        pivot:strict({x:{type:'number',minimum:0,maximum:32,multipleOf:0.5},y:{type:'number',minimum:0,maximum:32,multipleOf:0.5}}) })] } } }),
  critiqueSchema: strict({ protocol: { const: 1 }, observationId: { type: 'string' }, decision: { enum: ['accept', 'correct'] },
    planning: strict({ meetsGoal: { type: 'boolean' }, explanation }), artistic: strict({ score: { type: 'integer', minimum: 1, maximum: 5 }, explanation }) }),
});
export interface HandsRequest { id: string; phase: 'plan' | 'critique'; round: number; protocol: 1;
  goal: { description: string }; specification: typeof HANDS_SPEC; limits: typeof ARTIST_LIMITS & { editsPerPlan: number; totalEdits: number };
  observation: HandsObservation; previousCritique: unknown }
export interface HandsAdapter { id: string; mode: 'conversation' | 'mock' | 'model'; quote(request: HandsRequest): Usage;
  respond(request: HandsRequest, signal: AbortSignal): Promise<AdapterReply> }
function critique(raw: unknown, observationId: string) {
  const v = raw as { protocol: number; observationId: string; decision: string; planning: { meetsGoal: boolean; explanation: string }; artistic: { score: number; explanation: string } };
  const shape = (x: unknown, fields: string[]) => x && typeof x === 'object' && !Array.isArray(x)
    && Object.keys(x).length === fields.length && Object.keys(x).sort().every((key, i) => key === [...fields].sort()[i]);
  const explanation = (x: unknown) => typeof x === 'string' && x.trim().length > 0 && x.length <= 2000;
  if (!shape(v, ['protocol', 'observationId', 'decision', 'planning', 'artistic']) || v.protocol !== 1 || v.observationId !== observationId
    || !['accept', 'correct'].includes(v.decision) || !shape(v.planning, ['meetsGoal', 'explanation']) || !shape(v.artistic, ['score', 'explanation'])
    || typeof v.planning.meetsGoal !== 'boolean' || !explanation(v.planning.explanation) || !explanation(v.artistic.explanation)
    || !Number.isInteger(v.artistic.score) || v.artistic.score < 1 || v.artistic.score > 5 || (v.decision === 'accept' && !v.planning.meetsGoal)) throw new ArtistBoundaryError('Invalid or stale Hands critique');
  return structuredClone(v);
}

/** A planner edits an existing disposable project; it never supplies executable code. */
export async function runHands(controller: PixiBunController, memory: NibbliMemory, adapter: HandsAdapter, goal: string) {
  if (!goal.trim() || goal.length > 2000) throw new ArtistBoundaryError('Invalid Hands goal');
  const budget = new ArtistBudget(0); let round = 0, totalEdits = 0, previousCritique: unknown = null;
  let observation = await observeHands(controller, memory);
  const judgments = [];
  await memory.event('hands-goal', { goal, adapter: { id: adapter.id, mode: adapter.mode }, modelTraining: false });
  const ask = async (phase: HandsRequest['phase']) => {
    const request: HandsRequest = { protocol: 1, id: randomUUID(), phase, round, goal: { description: goal }, specification: HANDS_SPEC,
      limits: { ...ARTIST_LIMITS, editsPerPlan: HANDS_LIMITS.editsPerPlan, totalEdits: HANDS_LIMITS.totalEdits }, observation, previousCritique };
    await memory.artifact(`hands-round-${round}-${phase}-request.json`, JSON.stringify(request));
    const quote = structuredClone(adapter.quote(request)); budget.reserve(request, quote);
    const signal = AbortSignal.timeout(budget.timeRemaining());
    const reply = await Promise.race([adapter.respond(structuredClone(request), signal), new Promise<never>((_, reject) => {
      signal.addEventListener('abort', () => reject(new ArtistBoundaryError('Hands adapter deadline reached')), { once: true });
    })]);
    await memory.artifact(`hands-round-${round}-${phase}-response.json`, JSON.stringify(reply));
    budget.checkTime(); budget.settle(reply, quote);
    await memory.event('hands-adapter-response', { phase, round, provenance: reply.provenance, usage: reply.usage }); return reply;
  };
  for (;;) {
    const reply = await ask('plan'), validated = validateHandsPlan(reply.value, observation);
    totalEdits += validated.plan.edits.length;
    if (totalEdits > HANDS_LIMITS.totalEdits) throw new ArtistBoundaryError('Hands edit budget exhausted');
    // Conservative reservation includes observation/export and save/reload overhead.
    budget.reserveExecution(validated.plan.edits.reduce((n, edit) => n + HANDS_ACTION_COST[edit.op], 8), validated.plan.edits.length * 4);
    const expected = await executeHandsPlan(controller, memory, validated.plan, observation); budget.checkTime();
    observation = await observeHands(controller, memory); await verifyHandsProject(memory, observation.project, expected, `Hands round ${round}`);
    const response = await ask('critique'), judgment = critique(response.value, observation.id); previousCritique = judgment;
    judgments.push({ round, judgment, provenance: response.provenance });
    await memory.event('hands-critique', { round, judgment, advisory: true, provenance: response.provenance,
      artisticQualification: adapter.mode === 'mock' ? 'Not evaluated: deterministic fixture' : 'Agent opinion awaiting human review' });
    if (judgment.decision === 'accept') break;
    if (round >= ARTIST_LIMITS.corrections) throw new ArtistBoundaryError('Hands correction limit reached');
    round++;
  }
  budget.checkTime(); await controller.save(); await controller.reload();
  await verifyHandsProject(memory, readHandsProject(await controller.export('project')), observation.project, 'Hands saved reload: every layer and metadata');
  await verifyRaster(memory, 'Hands exported PNG matches native canvas', readNativePng(await controller.export('png')), await readCanvas(controller.page));
  if (controller.runtimeErrors.length) throw new Error(`Browser errors: ${controller.runtimeErrors.join('; ')}`);
  return { functional: { verdict: 'passed', edits: totalEdits, corrections: round, protectedContent: 'passed', saveReloadAndExports: 'passed' },
    planning: { verdict: 'agent-assessed', judgments }, artistic: { verdict: adapter.mode === 'mock' ? 'not-evaluated-mock' : 'human-review-required', judgments },
    usage: { calls: budget.calls, reservedActions: budget.actions, points: budget.points, ...budget.usage } };
}

export class MockHandsAdapter implements HandsAdapter {
  readonly id = 'deterministic-hands-fixture'; readonly mode = 'mock' as const;
  quote() { return { tokens: 0, usd: 0 }; }
  async respond(request: HandsRequest): Promise<AdapterReply> {
    const frame = request.observation.project.frames[0], target = frame.layers.find(l => l.name === 'Eyes');
    if (!target) throw new ArtistBoundaryError('Hands fixture has no Eyes layer');
    const value = request.phase === 'plan' ? { protocol: 1, observationId: request.observation.id, edits: [{ op: 'move-selection', frameId: frame.id, layerId: target.id,
      rect: { x: 18, y: 13, width: 3, height: 5 }, delta: { x: 0, y: -2 },
      reason: 'Canned fixture: the right eye is two pixels lower than the left in the observed Eyes layer.',
      expectedChange: 'Move only the right eye up two pixels. Preserve the left eye, body, every other layer and frame metadata.',
      protectedLayerIds: request.observation.project.frames.flatMap(f => f.layers.filter(l => l.id !== target.id).map(l => l.id)) }] }
      : { protocol: 1, observationId: request.observation.id, decision: 'accept', planning: { meetsGoal: true, explanation: 'Fixture edit completed; independent pixel checks remain authoritative.' },
        artistic: { score: 3, explanation: 'Canned fixture score; no artistic assessment or model connected.' } };
    return { value, usage: { tokens: 0, usd: 0 }, provenance: 'Deterministic Hands pipeline fixture; no paid service.' };
  }
}

/** Explicit Copy/Paste fixture; coordinates supplied by tests, never claimed as creative planning. */
export class MockCopyHandsAdapter implements HandsAdapter {
  readonly id = 'deterministic-copy-fixture'; readonly mode = 'mock' as const;
  constructor(private readonly layerName = 'Eyes', private readonly rect: HandsEdit['rect'] = { x: 11, y: 10, width: 5, height: 7 },
    private readonly delta: HandsTranslation['delta'] = { x: 6, y: 0 }) {}
  quote() { return { tokens: 0, usd: 0 }; }
  async respond(request: HandsRequest): Promise<AdapterReply> {
    const frame = request.observation.project.frames[0], layer = frame.layers.find(l => l.name === this.layerName);
    if (!layer) throw new ArtistBoundaryError('Copy fixture has no target layer');
    const value = request.phase === 'plan' ? { protocol: 1, observationId: request.observation.id, edits: [{ op: 'copy-selection', frameId: frame.id, layerId: layer.id,
      rect: this.rect, delta: this.delta, reason: 'Canned fixture: duplicate the observed isolated part through real Copy/Paste instead of repainting it.',
      expectedChange: 'The disjoint empty destination gains an exact RGBA copy; all source pixels, other layers, frames and metadata stay identical.',
      protectedLayerIds: request.observation.project.frames.flatMap(f => f.layers.filter(l => l.id !== layer.id).map(l => l.id)) }] }
      : { protocol: 1, observationId: request.observation.id, decision: 'accept', planning: { meetsGoal: true, explanation: 'Fixture copy completed; independent source/destination checks are authoritative.' },
        artistic: { score: 3, explanation: 'Canned Copy/Paste fixture; no artistic evaluation or model connected.' } };
    return { value, usage: { tokens: 0, usd: 0 }, provenance: 'Deterministic copy fixture; no external model or paid service.' };
  }
}

/** Lossless mirror fixture. Its canned opinion is never artistic qualification. */
export class MockFlipHandsAdapter implements HandsAdapter {
  readonly id = 'deterministic-flip-fixture'; readonly mode = 'mock' as const;
  constructor(private readonly axis: HandsFlip['axis'], private readonly rect: HandsEdit['rect'], private readonly layerName = 'Motif') {}
  quote() { return { tokens: 0, usd: 0 }; }
  async respond(request: HandsRequest): Promise<AdapterReply> {
    const frame = request.observation.project.frames[0], layer = frame.layers.find(l => l.name === this.layerName);
    if (!layer) throw new ArtistBoundaryError('Flip fixture has no target layer');
    const value = request.phase === 'plan' ? { protocol: 1, observationId: request.observation.id, edits: [{ op: 'flip-selection', frameId: frame.id, layerId: layer.id,
      rect: this.rect, axis: this.axis, reason: `Canned fixture: mirror the observed asymmetric motif ${this.axis} through the real selection HUD.`,
      expectedChange: 'Only the selected rectangle is mirrored, including transparent holes. Every outside pixel, other layer, frame and metadata stays identical.',
      protectedLayerIds: request.observation.project.frames.flatMap(f => f.layers.filter(l => l.id !== layer.id).map(l => l.id)) }] }
      : { protocol: 1, observationId: request.observation.id, decision: 'accept', planning: { meetsGoal: true, explanation: 'Fixture mirror completed; independent whole-project expectations are authoritative.' },
        artistic: { score: 3, explanation: 'Canned Flip fixture; no artistic evaluation or model connected.' } };
    return { value, usage: { tokens: 0, usd: 0 }, provenance: 'Deterministic flip fixture; no external model or paid service.' };
  }
}

/** Exact rotation fixture. Planner coordinates are test data, not artistic evidence. */
export class MockRotationHandsAdapter implements HandsAdapter {
  readonly id='deterministic-rotation-fixture';readonly mode='mock' as const;
  constructor(private readonly degrees:HandsRotation['degrees'],private readonly rect:HandsEdit['rect'],private readonly pivot:HandsRotation['pivot']){}
  quote(){return {tokens:0,usd:0};}
  async respond(request:HandsRequest):Promise<AdapterReply>{
    const frame=request.observation.project.frames[0],layer=frame.layers.find(l=>l.name==='Motif');
    if(!layer)throw new ArtistBoundaryError('Rotation fixture has no Motif layer');
    const value=request.phase==='plan'?{protocol:1,observationId:request.observation.id,edits:[{op:'rotate-selection',degrees:this.degrees,rect:this.rect,pivot:this.pivot,frameId:frame.id,layerId:layer.id,
      reason:`Canned fixture: rotate the observed asymmetric motif ${this.degrees} degrees clockwise around the explicit pivot with real HUD controls.`,
      expectedChange:'Exact RGBA quarter-turn permutation and grid-aligned bounds. All target pixels outside source/destination, other layers, frames and metadata stay identical.',
      protectedLayerIds:request.observation.project.frames.flatMap(f=>f.layers.filter(l=>l.id!==layer.id).map(l=>l.id))}]}:
      {protocol:1,observationId:request.observation.id,decision:'accept',planning:{meetsGoal:true,explanation:'Fixture rotation completed; independent project/pixel checks remain authoritative.'},artistic:{score:3,explanation:'Deterministic quarter-turn fixture; no artistic or model qualification.'}};
    return {value,usage:{tokens:0,usd:0},provenance:'Deterministic quarter-turn fixture; no paid service or external model.'};
  }
}
