import { createHash, randomUUID } from 'node:crypto';
import type { PixiBunController } from '../controller';
import type { NibbliMemory } from '../memory';
import { readCanvas, readProject, rasterDifference, VisionMismatch, type Raster } from '../vision';
import { ArtistBoundaryError, ARTIST_LIMITS } from './protocol';

export const HANDS_LIMITS = Object.freeze({ editsPerPlan: 4, totalEdits: 12, milliseconds: 600_000, replyBytes: 32_768 });
export interface HandsLayer { id: string; name: string; locked: boolean; visible: boolean; metadata: Record<string, unknown>; raster: Raster }
export interface HandsProject { metadata: Record<string, unknown>; frames: { id: string; metadata: Record<string, unknown>; layers: HandsLayer[] }[] }
export interface HandsObservation { id: string; project: HandsProject; composite: Raster; screenshotBase64: string }
interface HandsEditBase { frameId: string; layerId: string;
  rect: { x: number; y: number; width: number; height: number };
  reason: string; expectedChange: string; protectedLayerIds: string[] }
export interface HandsTranslation extends HandsEditBase { op: 'move-selection' | 'copy-selection'; delta: { x: number; y: number } }
export interface HandsFlip extends HandsEditBase { op: 'flip-selection'; axis: 'horizontal' | 'vertical' }
export interface HandsRotation extends HandsEditBase { op: 'rotate-selection'; degrees: 90 | 180 | 270; pivot: { x: number; y: number } }
export type HandsEdit = HandsTranslation | HandsFlip | HandsRotation;
export const HANDS_ACTION_COST = Object.freeze({ 'move-selection': 12, 'copy-selection': 16, 'flip-selection': 12, 'rotate-selection': 16 });
export interface HandsPlan { protocol: 1; observationId: string; edits: HandsEdit[] }
const requireValue = (ok: unknown, message: string): void => { if (!ok) throw new ArtistBoundaryError(message); };
const object = (v: unknown): Record<string, unknown> => { requireValue(v && typeof v === 'object' && !Array.isArray(v), 'Expected an object'); return v as Record<string, unknown>; };
const keys = (v: Record<string, unknown>, expected: string[]) => {
  const actual = Object.keys(v).sort(), wanted = [...expected].sort();
  requireValue(actual.length === wanted.length && actual.every((key, i) => key === wanted[i]), 'Unknown or missing fields');
};
const text = (v: unknown) => requireValue(typeof v === 'string' && v.trim().length > 0 && v.length <= 2000, 'Missing action explanation');
function stable(v: unknown): string {
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.entries(v).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => JSON.stringify(k) + ':' + stable(x)).join(',') + '}';
  return JSON.stringify(v);
}
export const handsSignature = (project: HandsProject) => createHash('sha256').update(stable(project)).digest('hex');

/** Downloaded PNGs and metadata, without production serializer or raster engine imports. */
export function readHandsProject(bytes: Buffer): HandsProject {
  requireValue(bytes.length <= 1_000_000, 'Hands project exceeds the observation limit');
  const raw = object(JSON.parse(bytes.toString('utf8')));
  requireValue(raw.width === 32 && raw.height === 32 && Array.isArray(raw.frames) && raw.frames.length > 0 && raw.frames.length <= 8
    && raw.frames.every(f => Array.isArray(object(f).layers) && (object(f).layers as unknown[]).length > 0 && (object(f).layers as unknown[]).length <= 16), 'Hands currently requires a bounded 32×32 project');
  const decoded = readProject(bytes);
  requireValue(decoded.width === 32 && decoded.height === 32 && decoded.frames.length <= 8, 'Hands currently requires a bounded 32×32 project');
  const { frames: rawFrames, updatedAt: _updatedAt, ...metadata } = raw;
  void _updatedAt;
  const identities = new Set<string>();
  const identity = (id: unknown) => { requireValue(typeof id === 'string' && /^[a-zA-Z0-9-]{1,120}$/.test(id) && !identities.has(id), 'Invalid or duplicate project identity'); identities.add(id as string); return id as string; };
  const frames = (rawFrames as unknown[]).map((value, fi) => {
    const frame = object(value), { layers: rawLayers, ...frameMetadata } = frame;
    const id = identity(frame.id);
    requireValue(Array.isArray(rawLayers) && rawLayers.length > 0 && rawLayers.length <= 16, 'Invalid layer count');
    const layers = (rawLayers as unknown[]).map((value, li) => {
      const layer = object(value), { pngBase64: _png, ...layerMetadata } = layer; void _png;
      requireValue(typeof layer.name === 'string' && typeof layer.locked === 'boolean' && typeof layer.visible === 'boolean', 'Invalid layer metadata');
      return { id: identity(layer.id), name: layer.name as string, locked: layer.locked as boolean, visible: layer.visible as boolean,
        metadata: layerMetadata, raster: decoded.frames[fi].layers[li].raster };
    });
    return { id, metadata: frameMetadata, layers };
  });
  return { metadata, frames };
}

/** Deliberately conservative: lossless integer translations into empty space, not resampling or overwriting. */
export function predictHandsMove(before: Raster, edit: HandsTranslation): Raster {
  const { rect: r, delta: d } = edit;
  requireValue(before.width === 32 && before.height === 32 && before.data.length === 4096
    && before.data.every(v => Number.isInteger(v) && v >= 0 && v <= 255), 'Invalid observed raster');
  requireValue([r.x, r.y, r.width, r.height, d.x, d.y].every(Number.isInteger) && r.width >= 2 && r.height >= 2
    && r.x >= 0 && r.y >= 0 && r.x + r.width <= 32 && r.y + r.height <= 32
    && r.x + d.x >= 0 && r.y + d.y >= 0 && r.x + r.width + d.x <= 32 && r.y + r.height + d.y <= 32
    && Math.abs(d.x) + Math.abs(d.y) >= 1 && Math.abs(d.x) + Math.abs(d.y) <= 32, 'Selection or destination outside bounded canvas');
  const result = structuredClone(before), at = (x: number, y: number) => (y * 32 + x) * 4;
  let opaque = 0;
  for (let y = r.y; y < r.y + r.height; y++) for (let x = r.x; x < r.x + r.width; x++) {
    const pixel = before.data.slice(at(x, y), at(x, y) + 4);
    requireValue(pixel[3] === 255 || pixel.every(v => v === 0), 'Selection contains unqualified alpha or hidden RGB');
    opaque += pixel[3] === 255 ? 1 : 0;
    const tx = x + d.x, ty = y + d.y, overlapsSource = tx >= r.x && tx < r.x + r.width && ty >= r.y && ty < r.y + r.height;
    requireValue(overlapsSource || before.data.slice(at(tx, ty), at(tx, ty) + 4).every(v => v === 0), 'Destination would overwrite protected pixels');
    result.data.splice(at(x, y), 4, 0, 0, 0, 0);
  }
  requireValue(opaque > 0, 'Selection has no artwork');
  for (let y = r.y; y < r.y + r.height; y++) for (let x = r.x; x < r.x + r.width; x++) {
    const pixel = before.data.slice(at(x, y), at(x, y) + 4);
    if (pixel[3]) result.data.splice(at(x + d.x, y + d.y), 4, ...pixel);
  }
  return result;
}

/** A copy preserves the complete source rectangle; overlapping destinations are not admitted. */
export function predictHandsCopy(before: Raster, edit: HandsTranslation): Raster {
  const { rect: r, delta: d } = edit;
  requireValue(!(r.x + d.x < r.x + r.width && r.x + d.x + r.width > r.x
    && r.y + d.y < r.y + r.height && r.y + d.y + r.height > r.y), 'Copy source and destination must not overlap');
  const result = predictHandsMove(before, edit);
  for (let y = r.y; y < r.y + r.height; y++) for (let x = r.x; x < r.x + r.width; x++) {
    const at = (y * 32 + x) * 4; result.data.splice(at, 4, ...before.data.slice(at, at + 4));
  }
  return result;
}

/** Independent integer permutation; no product transform, canvas or resampling code. */
export function predictHandsFlip(before: Raster, edit: HandsFlip): Raster {
  const r = edit.rect;
  requireValue(edit.axis === 'horizontal' || edit.axis === 'vertical', 'Unsupported flip axis');
  requireValue(before.width === 32 && before.height === 32 && before.data.length === 4096
    && before.data.every(v => Number.isInteger(v) && v >= 0 && v <= 255), 'Invalid observed raster');
  requireValue([r.x, r.y, r.width, r.height].every(Number.isInteger) && r.width >= 2 && r.height >= 2
    && r.x >= 0 && r.y >= 0 && r.x + r.width <= 32 && r.y + r.height <= 32, 'Selection outside bounded canvas');
  const result = structuredClone(before); let opaque = 0;
  for (let y = 0; y < r.height; y++) for (let x = 0; x < r.width; x++) {
    const from = ((r.y + y) * 32 + r.x + x) * 4, pixel = before.data.slice(from, from + 4);
    requireValue(pixel[3] === 255 || pixel.every(v => v === 0), 'Selection contains unqualified alpha or hidden RGB');
    opaque += pixel[3] === 255 ? 1 : 0;
    const tx = r.x + (edit.axis === 'horizontal' ? r.width - 1 - x : x);
    const ty = r.y + (edit.axis === 'vertical' ? r.height - 1 - y : y);
    result.data.splice((ty * 32 + tx) * 4, 4, ...pixel);
  }
  requireValue(opaque > 0, 'Selection has no artwork');
  requireValue(!rasterDifference(result, before).equal, 'Flip would not change the observed artwork');
  return result;
}

/** Whole-batch preflight returns detached values and all intermediate expected projects. */
export function handsRotationBounds(edit: HandsRotation) {
  const r=edit.rect,p=edit.pivot;
  requireValue([90,180,270].includes(edit.degrees), 'Only exact quarter-turn rotation is admitted');
  requireValue([r.x,r.y,r.width,r.height].every(Number.isInteger) && r.width>=2 && r.height>=2
    && r.x>=0 && r.y>=0 && r.x+r.width<=32 && r.y+r.height<=32, 'Selection outside bounded canvas');
  requireValue([p.x,p.y].every(v=>Number.isFinite(v) && Number.isInteger(v*2) && v>=0 && v<=32), 'Pivot must lie on bounded half-pixel coordinates');
  const turn=(x:number,y:number)=>{
    const dx=x-p.x,dy=y-p.y;
    return edit.degrees===90 ? {x:p.x-dy,y:p.y+dx} : edit.degrees===180 ? {x:p.x-dx,y:p.y-dy} : {x:p.x+dy,y:p.y-dx};
  };
  const corners=[[r.x,r.y],[r.x+r.width,r.y],[r.x,r.y+r.height],[r.x+r.width,r.y+r.height]].map(([x,y])=>turn(x,y));
  requireValue(corners.every(v=>Number.isInteger(v.x)&&Number.isInteger(v.y)), 'Rotation does not align to the integer pixel grid');
  const x=Math.min(...corners.map(v=>v.x)),y=Math.min(...corners.map(v=>v.y));
  const width=Math.max(...corners.map(v=>v.x))-x,height=Math.max(...corners.map(v=>v.y))-y;
  requireValue(x>=0&&y>=0&&x+width<=32&&y+height<=32, 'Rotated destination outside bounded canvas');
  return { x,y,width,height,turn };
}

/** Scalar pixel-center permutation. No trigonometry, product bounding helper or rotation engine. */
export function predictHandsRotation(before: Raster, edit: HandsRotation): Raster {
  const r=edit.rect,b=handsRotationBounds(edit),at=(x:number,y:number)=>(y*32+x)*4;
  requireValue(before.width===32&&before.height===32&&before.data.length===4096&&before.data.every(v=>Number.isInteger(v)&&v>=0&&v<=255), 'Invalid observed raster');
  const inSource=(x:number,y:number)=>x>=r.x&&x<r.x+r.width&&y>=r.y&&y<r.y+r.height;
  for(let y=b.y;y<b.y+b.height;y++)for(let x=b.x;x<b.x+b.width;x++)requireValue(inSource(x,y)||before.data.slice(at(x,y),at(x,y)+4).every(v=>v===0),'Rotated destination would overwrite protected pixels');
  const result=structuredClone(before);let opaque=0;
  for(let y=r.y;y<r.y+r.height;y++)for(let x=r.x;x<r.x+r.width;x++){
    const pixel=before.data.slice(at(x,y),at(x,y)+4);
    requireValue(pixel[3]===255||pixel.every(v=>v===0),'Selection contains unqualified alpha or hidden RGB');opaque+=pixel[3]===255?1:0;
    result.data.splice(at(x,y),4,0,0,0,0);
  }
  requireValue(opaque>0,'Selection has no artwork');
  for(let y=r.y;y<r.y+r.height;y++)for(let x=r.x;x<r.x+r.width;x++){
    const point=b.turn(x+0.5,y+0.5),tx=point.x-0.5,ty=point.y-0.5;
    requireValue(Number.isInteger(tx)&&Number.isInteger(ty),'Rotation does not preserve pixel centers');
    result.data.splice(at(tx,ty),4,...before.data.slice(at(x,y),at(x,y)+4));
  }
  requireValue(!rasterDifference(result,before).equal,'Rotation would not change the observed artwork');
  return result;
}

export function validateHandsPlan(raw: unknown, observation: HandsObservation) {
  requireValue(Buffer.byteLength(JSON.stringify(raw)) <= HANDS_LIMITS.replyBytes, 'Hands plan exceeds reply budget');
  const value = object(raw); keys(value, ['protocol', 'observationId', 'edits']);
  requireValue(value.protocol === 1 && value.observationId === observation.id, 'Stale or mismatched Hands observation');
  requireValue(Array.isArray(value.edits) && value.edits.length > 0 && value.edits.length <= HANDS_LIMITS.editsPerPlan, 'Invalid Hands edit count');
  const expected = structuredClone(observation.project), edits: HandsEdit[] = [], checkpoints: HandsProject[] = [];
  const layerIds = expected.frames.flatMap(f => f.layers.map(l => l.id));
  let executionActions = 8;
  for (const input of value.edits as unknown[]) {
    const edit = object(input);
    requireValue(edit.op === 'move-selection' || edit.op === 'copy-selection' || edit.op === 'flip-selection' || edit.op === 'rotate-selection', 'Unsupported Hands operation');
    keys(edit, ['op', 'frameId', 'layerId', 'rect', ...(edit.op === 'rotate-selection' ? ['degrees','pivot'] : [edit.op === 'flip-selection' ? 'axis' : 'delta']), 'reason', 'expectedChange', 'protectedLayerIds']);
    text(edit.reason); text(edit.expectedChange);
    executionActions += HANDS_ACTION_COST[edit.op as HandsEdit['op']];
    requireValue(executionActions <= ARTIST_LIMITS.actionsPerPlan, 'Hands per-plan action budget exceeded');
    const rect = object(edit.rect); keys(rect, ['x', 'y', 'width', 'height']);
    if (edit.op === 'rotate-selection') { const pivot=object(edit.pivot); keys(pivot,['x','y']); }
    else if (edit.op !== 'flip-selection') { const delta = object(edit.delta); keys(delta, ['x', 'y']); }
    const frame = expected.frames.find(f => f.id === edit.frameId), layer = frame?.layers.find(l => l.id === edit.layerId);
    requireValue(layer && !layer.locked && layer.visible, 'Target layer is unavailable, locked or hidden');
    requireValue(layer!.metadata.opacity === 1 && layer!.metadata.blendMode === 'source-over' && !layer!.metadata.effect && !layer!.metadata.research, 'Target layer recipe or blending is unqualified');
    if(edit.op==='rotate-selection')requireValue(layer!.metadata.tag!=='normal'&&layer!.metadata.tag!=='normal-map','Tangent-space normal rotation needs a separately qualified vector oracle');
    const protectedIds = edit.protectedLayerIds;
    requireValue(Array.isArray(protectedIds) && protectedIds.every(v => typeof v === 'string' && layerIds.includes(v))
      && new Set(protectedIds).size === protectedIds.length
      && [...protectedIds].sort().join() === layerIds.filter(id => id !== layer!.id).sort().join(), 'Every other layer must be explicitly protected');
    const command = structuredClone(edit) as unknown as HandsEdit;
    layer!.raster = command.op === 'rotate-selection' ? predictHandsRotation(layer!.raster,command) : command.op === 'flip-selection' ? predictHandsFlip(layer!.raster, command)
      : command.op === 'copy-selection' ? predictHandsCopy(layer!.raster, command) : predictHandsMove(layer!.raster, command);
    edits.push(command); checkpoints.push(structuredClone(expected));
  }
  return { plan: { protocol: 1, observationId: observation.id, edits } as HandsPlan, checkpoints };
}

export async function observeHands(controller: PixiBunController, memory: NibbliMemory): Promise<HandsObservation> {
  if (await controller.page.getByTestId('selection-transform-gizmo').isVisible()) throw new ArtistBoundaryError('Commit or cancel the existing selection before observing Hands');
  if (await controller.page.getByTestId('curve-adjustment-gizmo').isVisible()) throw new ArtistBoundaryError('Finish the pending curve before observing Hands');
  if ((await controller.page.getByTestId('bottom-timeline').locator('[data-tutorial="play-button"]').innerText()).trim() !== 'Play') throw new ArtistBoundaryError('Pause playback before observing Hands');
  const project = readHandsProject(await controller.export('project'));
  if (await controller.page.getByRole('dialog').isVisible()) await controller.page.keyboard.press('Escape');
  const id = randomUUID(), screenshot = await controller.page.screenshot(), composite = await readCanvas(controller.page);
  await memory.artifact(`hands-${id}-screen.png`, screenshot); await memory.artifact(`hands-${id}-project.json`, JSON.stringify(project));
  await memory.event('hands-observation', { observationId: id, signature: handsSignature(project), screenshot: `hands-${id}-screen.png`, project: `hands-${id}-project.json` });
  return { id, project, composite, screenshotBase64: screenshot.toString('base64') };
}

export async function verifyHandsProject(memory: NibbliMemory, actual: HandsProject, expected: HandsProject, label: string) {
  const equal = handsSignature(actual) === handsSignature(expected);
  const differences = expected.frames.flatMap((f, fi) => f.layers.map((l, li) => ({ frameId: f.id, layerId: l.id,
    difference: actual.frames[fi]?.layers[li] ? rasterDifference(actual.frames[fi].layers[li].raster, l.raster) : { equal: false, missing: true } })));
  await memory.event('hands-verification', { label, verdict: equal ? 'passed' : 'failed', differences,
    metadataAndAllLayerPixelsEqual: equal, failureOwner: equal ? undefined : 'unknown' });
  if (!equal) throw new VisionMismatch('Hands metadata or layer pixels differ from the pre-execution expectation');
}

export async function executeHandsPlan(controller: PixiBunController, memory: NibbliMemory, raw: unknown, observation: HandsObservation) {
  // No selection, layer or artwork mutation until the entire plan has passed.
  const validated = validateHandsPlan(raw, observation), started = Date.now();
  const fresh = readHandsProject(await controller.export('project'));
  if (handsSignature(fresh) !== handsSignature(observation.project)) throw new ArtistBoundaryError('Workspace changed after the Hands observation');
  if (await controller.page.getByRole('dialog').isVisible()) await controller.page.keyboard.press('Escape');
  await memory.event('hands-plan-validated', { plan: validated.plan, signature: handsSignature(fresh) });
  for (let i = 0; i < validated.plan.edits.length; i++) {
    if (Date.now() - started >= HANDS_LIMITS.milliseconds) throw new ArtistBoundaryError('Hands execution deadline reached');
    const edit = validated.plan.edits[i];
    await memory.event('hands-edit-intent', { index: i, ...edit, expectedProjectSignature: handsSignature(validated.checkpoints[i]),
      invariant: 'All other layers/frames/metadata and target pixels outside source/destination remain identical.' });
    await controller.selectFrame(observation.project.frames.findIndex(f => f.id === edit.frameId) + 1);
    await controller.selectLayer(edit.layerId);
    if (edit.op === 'copy-selection') await controller.copySelection(edit.rect, edit.delta);
    else if (edit.op === 'flip-selection') await controller.flipSelection(edit.rect, edit.axis);
    else if (edit.op === 'rotate-selection') await controller.rotateSelection(edit.rect,edit.degrees,edit.pivot);
    else await controller.moveSelection(edit.rect, edit.delta);
    const actual = readHandsProject(await controller.export('project'));
    await verifyHandsProject(memory, actual, validated.checkpoints[i], `Hands edit ${i}: target and protected content`);
    if (await controller.page.getByRole('dialog').isVisible()) await controller.page.keyboard.press('Escape');
    await controller.undo();
    await verifyHandsProject(memory, readHandsProject(await controller.export('project')), i ? validated.checkpoints[i - 1] : observation.project, `Hands edit ${i}: Undo restores all layers`);
    if (await controller.page.getByRole('dialog').isVisible()) await controller.page.keyboard.press('Escape');
    await controller.redo();
    await verifyHandsProject(memory, readHandsProject(await controller.export('project')), validated.checkpoints[i], `Hands edit ${i}: Redo restores the exact ${edit.op}`);
    if (await controller.page.getByRole('dialog').isVisible()) await controller.page.keyboard.press('Escape');
  }
  return validated.checkpoints.at(-1)!;
}
