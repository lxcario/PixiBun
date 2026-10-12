import type { PixelPoint } from '../geometry';
import type { Raster } from '../vision';

export const ARTIST_PROTOCOL = 1;
export const GHOST_GOAL = Object.freeze({ id: 'three-color-ghost-32', width: 32, height: 32, colors: 3,
  description: 'Create a readable small ghost with a deliberate silhouette, two eyes and exactly three opaque RGB colors on a transparent 32×32 canvas. Choose the coordinates and palette yourself.' });
export const ARTIST_LIMITS = Object.freeze({ corrections: 3, modelCalls: 8, actions: 160,
  actionsPerPlan: 64, points: 2048, pointsPerStroke: 128, requestBytes: 600_000,
  responseBytes: 32_768, tokens: 40_000, milliseconds: 600_000, usd: 0 });
const strictObject = (properties: Record<string, unknown>) => ({ type: 'object', additionalProperties: false, required: Object.keys(properties), properties });
const explanation = { type: 'string', minLength: 1, maxLength: 2000 };
const hex = { type: 'string', pattern: '^#[0-9a-fA-F]{6}$' };
const common = { protocol: { const: ARTIST_PROTOCOL }, goalId: { const: GHOST_GOAL.id } };
const score = { type: 'integer', minimum: 1, maximum: 5 };
/** Provider-neutral knowledge travels with every request; runtime validation remains authoritative. */
export const ARTIST_SPEC = Object.freeze({
  instructions: [
    'Choose your own coordinates and palette from the goal. Return only the requested plan or critique object.',
    'Plans use real one-pixel UI tools. Pen/eraser segments must be horizontal, vertical or 45 degrees; a bucket has one point. Explicitly select tool and color before painting.',
    'Critique the supplied actual screenshot and native pixels. Explain visual shortcomings; at most three corrections, with the original palette.',
    'Functional checks are independent. Never change tests, expectations, product state or evidence to make a check pass. Art scores are opinions, not approval.',
  ],
  planSchema: strictObject({ ...common, rationale: explanation,
    palette: { type: 'array', minItems: 3, maxItems: 3, uniqueItems: true, items: hex },
    commands: { type: 'array', minItems: 1, maxItems: ARTIST_LIMITS.actionsPerPlan, items: { anyOf: [
      strictObject({ op: { const: 'tool' }, tool: { enum: ['pen', 'bucket', 'eraser'] } }),
      strictObject({ op: { const: 'color' }, hex }),
      strictObject({ op: { const: 'stroke' }, points: { type: 'array', minItems: 1, maxItems: ARTIST_LIMITS.pointsPerStroke,
        items: strictObject({ x: { type: 'integer', minimum: 0, maximum: 31 }, y: { type: 'integer', minimum: 0, maximum: 31 } }) } }),
    ] } },
  }),
  critiqueSchema: strictObject({ ...common, decision: { enum: ['accept', 'correct'] },
    planning: strictObject({ meetsGoal: { type: 'boolean' }, explanation }),
    artistic: strictObject({ silhouette: score, eyes: score, palette: score, explanation }),
  }),
});
export type ArtistTool = 'pen' | 'bucket' | 'eraser';
export type ArtistCommand = { op: 'tool'; tool: ArtistTool } | { op: 'color'; hex: string }
  | { op: 'stroke'; points: PixelPoint[] };
export interface ArtistPlan { protocol: 1; goalId: string; rationale: string; palette: string[]; commands: ArtistCommand[] }
export interface ArtistCritique { protocol: 1; goalId: string; decision: 'accept' | 'correct';
  planning: { meetsGoal: boolean; explanation: string };
  artistic: { silhouette: number; eyes: number; palette: number; explanation: string } }
export interface ArtistObservation { raster: Raster; screenshotBase64: string; nativePngBase64: string;
  functional: { opaquePixels: number; colors: string[]; transparentPixels: number; partialAlphaPixels: number } }
export interface ArtistRequest { protocol: 1; id: string; phase: 'plan' | 'critique'; round: number;
  goal: typeof GHOST_GOAL; limits: typeof ARTIST_LIMITS; specification: typeof ARTIST_SPEC; palette: string[] | null;
  observation: ArtistObservation | null; previousCritique: ArtistCritique | null }
export interface Usage { tokens: number; usd: number }
export interface AdapterReply { value: unknown; usage: Usage; provenance: string }
/** Only the adapter contacts a provider. No provider name, model ID or credential is part of the controller. */
export interface ArtistAdapter { id: string; mode: 'conversation' | 'mock' | 'model';
  quote(request: ArtistRequest): Usage; respond(request: ArtistRequest, signal: AbortSignal): Promise<AdapterReply> }
export class ArtistBoundaryError extends Error { constructor(message: string) { super(message); this.name = 'ArtistBoundaryError'; } }
function requireValue(ok: unknown, message: string): asserts ok { if (!ok) throw new ArtistBoundaryError(message); }
function object(value: unknown): Record<string, unknown> { requireValue(value && typeof value === 'object' && !Array.isArray(value), 'Expected an object'); return value as Record<string, unknown>; }
function keys(value: Record<string, unknown>, expected: string[]) { requireValue(Object.keys(value).sort().join() === [...expected].sort().join(), 'Unknown or missing fields'); }
function text(value: unknown, max = 2000): asserts value is string { requireValue(typeof value === 'string' && value.trim().length > 0 && value.length <= max, 'Invalid explanation'); }
function color(value: unknown): asserts value is string { requireValue(typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value), 'Invalid RGB color'); }
function envelope(value: Record<string, unknown>) { requireValue(value.protocol === ARTIST_PROTOCOL && value.goalId === GHOST_GOAL.id, 'Wrong protocol or goal'); }
export function validatePlan(raw: unknown, palette?: string[]): ArtistPlan {
  const plan = object(raw); keys(plan, ['protocol', 'goalId', 'rationale', 'palette', 'commands']); envelope(plan); text(plan.rationale);
  requireValue(Array.isArray(plan.palette) && plan.palette.length === 3, 'Exactly three palette colors required');
  plan.palette.forEach(color); const colors = (plan.palette as string[]).map(hex => hex.toLowerCase());
  requireValue(new Set(colors).size === 3, 'Palette colors must be distinct');
  if (palette) requireValue(JSON.stringify(colors) === JSON.stringify(palette), 'Corrections cannot change the palette');
  requireValue(Array.isArray(plan.commands) && plan.commands.length > 0 && plan.commands.length <= ARTIST_LIMITS.actionsPerPlan, 'Invalid action count');
  const commands: ArtistCommand[] = [];
  for (const rawCommand of plan.commands) {
    const command = object(rawCommand);
    switch (command.op) {
      case 'tool': keys(command, ['op', 'tool']); requireValue(typeof command.tool === 'string' && ['pen', 'bucket', 'eraser'].includes(command.tool), 'Unsupported tool');
        commands.push({ op: 'tool', tool: command.tool as ArtistTool }); break;
      case 'color': keys(command, ['op', 'hex']); color(command.hex); requireValue(colors.includes(command.hex.toLowerCase()), 'Color outside palette');
        commands.push({ op: 'color', hex: command.hex.toLowerCase() }); break;
      case 'stroke': keys(command, ['op', 'points']); requireValue(Array.isArray(command.points) && command.points.length > 0 && command.points.length <= ARTIST_LIMITS.pointsPerStroke, 'Invalid stroke length');
        commands.push({ op: 'stroke', points: command.points.map(rawPoint => { const point = object(rawPoint); keys(point, ['x', 'y']);
          requireValue(Number.isInteger(point.x) && Number.isInteger(point.y) && Number(point.x) >= 0 && Number(point.x) < 32 && Number(point.y) >= 0 && Number(point.y) < 32, 'Point outside 32×32 canvas');
          return { x: Number(point.x), y: Number(point.y) }; }) }); break;
      default: throw new ArtistBoundaryError('Unsupported action');
    }
  }
  // Return a fresh value: adapters cannot mutate a plan after validation.
  return { protocol: 1, goalId: GHOST_GOAL.id, rationale: plan.rationale as string, palette: colors, commands };
}
export function validateCritique(raw: unknown): ArtistCritique {
  const value = object(raw); keys(value, ['protocol', 'goalId', 'decision', 'planning', 'artistic']); envelope(value);
  requireValue(value.decision === 'accept' || value.decision === 'correct', 'Invalid critique decision');
  const planning = object(value.planning), artistic = object(value.artistic);
  keys(planning, ['meetsGoal', 'explanation']); keys(artistic, ['silhouette', 'eyes', 'palette', 'explanation']);
  requireValue(typeof planning.meetsGoal === 'boolean', 'Missing planning assessment'); text(planning.explanation); text(artistic.explanation);
  for (const key of ['silhouette', 'eyes', 'palette']) requireValue(Number.isInteger(artistic[key]) && Number(artistic[key]) >= 1 && Number(artistic[key]) <= 5, 'Art scores must be 1–5');
  requireValue(value.decision !== 'accept' || planning.meetsGoal, 'Accept requires goal compliance');
  return structuredClone(value) as unknown as ArtistCritique;
}
export function measureRaster(raster: Raster): ArtistObservation['functional'] {
  requireValue(raster.width === 32 && raster.height === 32 && raster.data.length === 4096, 'Wrong observed dimensions');
  const colors = new Set<string>(); let opaquePixels = 0, transparentPixels = 0, partialAlphaPixels = 0;
  for (let at = 0; at < raster.data.length; at += 4) {
    const rgba = raster.data.slice(at, at + 4); requireValue(rgba.every(v => Number.isInteger(v) && v >= 0 && v <= 255), 'Invalid pixel bytes');
    if (rgba[3] === 255) { opaquePixels++; colors.add('#' + rgba.slice(0, 3).map(v => v.toString(16).padStart(2, '0')).join('')); }
    else if (rgba[3] === 0) transparentPixels++; else partialAlphaPixels++;
  }
  return { opaquePixels, transparentPixels, partialAlphaPixels, colors: [...colors].sort() };
}
/** Reservations are upper bounds supplied by a trusted adapter, checked before each request. */
export class ArtistBudget {
  calls = 0; actions = 0; points = 0; usage: Usage = { tokens: 0, usd: 0 };
  private started = Date.now();
  constructor(private readonly usdLimit = 0) { requireValue(Number.isFinite(usdLimit) && usdLimit >= 0, 'Invalid cost budget'); }
  timeRemaining() { return Math.max(0, ARTIST_LIMITS.milliseconds - (Date.now() - this.started)); }
  checkTime() { requireValue(this.timeRemaining() > 0, 'Artist session time exhausted'); }
  reserve(request: unknown, quote: Usage) {
    this.checkTime(); requireValue(this.calls < ARTIST_LIMITS.modelCalls, 'Model call limit reached');
    requireValue(Buffer.byteLength(JSON.stringify(request)) <= ARTIST_LIMITS.requestBytes, 'Model request too large');
    this.validateUsage(quote);
    requireValue(this.usage.tokens + quote.tokens <= ARTIST_LIMITS.tokens && this.usage.usd + quote.usd <= this.usdLimit, 'Model cost/token budget exhausted');
    this.calls++;
  }
  settle(reply: AdapterReply, quote: Usage) {
    this.validateUsage(reply.usage); text(reply.provenance, 1000);
    requireValue(reply.usage.tokens <= quote.tokens && reply.usage.usd <= quote.usd, 'Adapter exceeded its reserved upper bound');
    this.usage.tokens += reply.usage.tokens; this.usage.usd += reply.usage.usd;
    requireValue(Buffer.byteLength(JSON.stringify(reply.value)) <= ARTIST_LIMITS.responseBytes, 'Model response too large');
  }
  private validateUsage(usage: Usage) { requireValue(usage && Number.isInteger(usage.tokens) && usage.tokens >= 0 && Number.isFinite(usage.usd) && usage.usd >= 0, 'Invalid adapter usage'); }
  reservePlan(plan: ArtistPlan) {
    const points = plan.commands.reduce((count, c) => count + (c.op === 'stroke' ? c.points.length : 0), 0);
    this.reserveExecution(plan.commands.length, points);
  }
  reserveExecution(actions: number, points: number) {
    this.checkTime();
    requireValue(Number.isInteger(actions) && actions > 0 && Number.isInteger(points) && points >= 0, 'Invalid execution reservation');
    requireValue(this.actions + actions <= ARTIST_LIMITS.actions && this.points + points <= ARTIST_LIMITS.points, 'Execution budget exhausted');
    this.actions += actions; this.points += points;
  }
}
