import { useStudioStore } from '@/stores/studioStore';
import { createEntry, getBufferGeneration, getBufferRevision, hasBuffer, replaceAllBuffers, snapshotBuffers } from '@/lib/engine/bufferRegistry';
import { pushStructuralHistoryStep } from '@/lib/engine/structuralHistory';
import { validateWorkspaceStructure } from '@/lib/project/workspaceEnvelopeGuard';
import { createId } from '@/lib/engine/id';
import { reserveMemory } from '@/lib/safety/memoryBudget';
import { parseResearchSettings, researchBytes, type ResearchSettings, type ResearchRecipe } from './recipes';
import { runResearch, type ResearchInput, type ResearchOutput } from './algorithms';
import type { Layer } from '@/types/canvas';
export interface ResearchPreview {
  key: string; name: string; width: number; height: number;
  frames: { index: number; sourceId: string; replacedId: string; before: Uint8ClampedArray; result: ResearchOutput; recipe: ResearchRecipe }[];
  dispose: () => void;
}
export function researchWorkspaceKey(): string {
  const s = useStudioStore.getState();
  return JSON.stringify([s.currentProjectId, s.canvasWidth, s.canvasHeight, s.editRevision, s.bufferVersion, s.activeFrameIndex, s.activeLayerId, s.activeClipId, s.clips,
    s.frames.map(f => [f.id, f.layers.map(l => [l.id, l.name, l.visible, l.locked, l.opacity, l.blendMode, l.tag, getBufferGeneration(l.id), getBufferRevision(l.id)])])]);
}
async function hash(data: Uint8ClampedArray): Promise<string> {
  const bytes = new Uint8Array(data).buffer;
  const digest = await crypto.subtle.digest('SHA-256', bytes); return Array.from(new Uint8Array(digest), v => v.toString(16).padStart(2, '0')).join('');
}
function pixels(layerId: string, width: number, height: number): Uint8ClampedArray {
  if (!hasBuffer(layerId)) throw new Error('The source layer has no stored pixels. Select painted artwork.');
  const entry = snapshotBuffers().get(layerId)!;
  if (entry.canvas.width !== width || entry.canvas.height !== height) throw new Error('Source dimensions changed. Create a fresh preview.');
  return entry.ctx.getImageData(0, 0, width, height).data;
}
let busy = false;
export async function runResearchWorker(inputs: ResearchInput[], signal?: AbortSignal): Promise<ResearchOutput[]> {
  if (signal?.aborted) throw new Error('Preview cancelled.');
  if (!inputs.length || inputs.length > 16 || inputs.reduce((p, i) => p + i.width * i.height, 0) > 262144) throw new Error('Preview supports up to 16 frames and 262,144 source pixels.');
  if (busy) throw new Error('Another research preview is running. Cancel it before retrying.');
  if (typeof Worker === 'undefined') {
    if (inputs.reduce((p, i) => p + i.width * i.height, 0) > 4096) throw new Error('This preview requires a worker.');
    return inputs.map(runResearch);
  }
  busy = true;
  try {
    return await new Promise((resolve, reject) => {
      let worker: Worker | undefined, settled = false;
      const finish = (results?: ResearchOutput[], error?: Error) => {
        if (settled) return; settled = true; clearTimeout(timer); signal?.removeEventListener('abort', abort);
        if (worker) { worker.onmessage = null; worker.onerror = null; worker.terminate(); }
        if (error) reject(error); else resolve(results!);
      };
      const abort = () => finish(undefined, new Error('Preview cancelled.'));
      const timer = setTimeout(() => finish(undefined, new Error('Preview exceeded its 30-second deadline. Reduce the scope.')), 30000);
      signal?.addEventListener('abort', abort, { once: true });
      try {
        worker = new Worker(new URL('../../workers/research.worker.ts', import.meta.url), { type: 'module' });
        worker.onmessage = (event: MessageEvent<{ error?: string; results?: ResearchOutput[] }>) => {
          const results = event.data?.results;
          if (event.data?.error) { finish(undefined, new Error(event.data.error)); return; }
          if (!Array.isArray(results) || results.length !== inputs.length || results.some((r, i) => !r || !(r.data instanceof Uint8ClampedArray) || r.data.length !== inputs[i].data.length ||
            !Array.isArray(r.notes) || r.notes.length > 8 || r.notes.some(n => typeof n !== 'string' || n.length > 512) ||
            [r.specular, r.shadow].some(data => data && (!(data instanceof Uint8ClampedArray) || data.length !== r.data.length)) ||
            (r.map && (!Array.isArray(r.map) || r.map.length > 16 || r.map.some(t => !Number.isInteger(t) || t < 0 || t >= 16))) ||
            (r.seams && (!Array.isArray(r.seams) || r.seams.length > 32 || r.seams.some(s => !Number.isInteger(s.cell) || s.cell < 0 || s.cell >= 16 || !['east', 'south'].includes(s.side) || !Number.isInteger(s.mismatches) || s.mismatches < 0 || s.mismatches > 64))))) {
            finish(undefined, new Error('Preview worker returned invalid pixels or diagnostics.')); return;
          }
          if (results.some((r, i) => {
            const settings = inputs[i].settings;
            if (settings.kind === 'light') return !r.specular || !r.shadow;
            if (settings.kind !== 'scene') return false;
            const count = inputs[i].width * inputs[i].height / settings.tileSize ** 2;
            return !r.map || r.map.length !== count || r.map.some(t => t >= settings.tiles.length) ||
              !Number.isInteger(r.repeats) || r.repeats! < 0 || r.repeats! >= count || r.seams?.some(s => s.cell >= count || s.mismatches > settings.tileSize);
          })) { finish(undefined, new Error('Preview worker returned invalid workflow diagnostics.')); return; }
          finish(results);
        };
        worker.onerror = () => finish(undefined, new Error('Preview worker failed. Source artwork is unchanged.'));
        if (signal?.aborted) { abort(); return; }
        // Retain originals for comparison. Transfer only owned copies.
        const copies = inputs.map(i => ({ ...i, data: i.data.slice(), normal: i.normal?.slice() }));
        worker.postMessage(copies, copies.flatMap(i => [i.data.buffer, ...(i.normal ? [i.normal.buffer] : [])]));
      } catch (error) { finish(undefined, error as Error); }
    });
  } finally { busy = false; }
}
export async function createResearchPreview(settings: ResearchSettings, name: string, allClip: boolean, signal?: AbortSignal): Promise<ResearchPreview> {
  const s = useStudioStore.getState(), width = s.canvasWidth, height = s.canvasHeight;
  settings = parseResearchSettings(settings, width, height);
  if (!name.trim() || name.length > 64) throw new Error('Name the recipe using at most 64 characters.');
  if (signal?.aborted) throw new Error('Preview cancelled.');
  const selected = s.frames[s.activeFrameIndex]?.layers.find(l => l.id === s.activeLayerId);
  if (!selected) throw new Error('Select a source layer.');
  const sourceId = selected.research?.source.layerId;
  const original = sourceId ? s.frames[s.activeFrameIndex].layers.find(l => l.id === sourceId) : selected;
  if (!original || original.research || original.effect || original.tag === 'normal-map') throw new Error('Select an original color layer; nested recipes and normal-map sources are unsupported.');
  const clip = s.clips.find(c => c.id === s.activeClipId);
  const indices = allClip && settings.kind === 'light' ? Array.from({ length: (clip?.endFrame ?? s.frames.length - 1) - (clip?.startFrame ?? 0) + 1 }, (_, i) => i + (clip?.startFrame ?? 0)) : [s.activeFrameIndex];
  if (!indices.length || indices.length > 16 || width * height * indices.length > 262144) throw new Error('Preview supports up to 16 frames and 262,144 source pixels.');
  const key = researchWorkspaceKey(), dispose = reserveMemory(width * height * indices.length * 128 + 65536, 'Research preview');
  const check = () => { if (signal?.aborted) throw new Error('Preview cancelled.'); if (key !== researchWorkspaceKey()) throw new Error('Artwork or layer settings changed. Create a fresh preview.'); };
  try {
    const inputs: ResearchInput[] = [], frames: ResearchPreview['frames'] = [];
    for (const index of indices) {
      check(); const frame = s.frames[index]; if (!frame) throw new Error('The selected clip has invalid bounds.');
      const matches = index === s.activeFrameIndex ? [original] : frame.layers.filter(l => l.name === original.name && !l.research && !l.effect && l.tag !== 'normal-map');
      if (matches.length !== 1) throw new Error(`Frame ${index + 1} needs exactly one original layer named ${original.name}.`);
      const source = matches[0]; if (source.locked || source.opacity !== 1 || source.blendMode !== 'source-over') throw new Error(`Frame ${index + 1} needs an unlocked source at full opacity with normal blending.`);
      const normals = settings.kind === 'light' ? frame.layers.filter(l => l.tag === 'normal-map') : [];
      if (normals.length > 1 || normals.some(l => l.opacity !== 1 || l.blendMode !== 'source-over')) throw new Error(`Frame ${index + 1} needs at most one neutral normal-map layer.`);
      const data = pixels(source.id, width, height), normal = normals[0] ? pixels(normals[0].id, width, height) : undefined;
      const recipe: ResearchRecipe = { version: 1, name, width, height, settings: structuredClone(settings), source: { frameId: frame.id, layerId: source.id, sha256: await hash(data),
        ...(normal ? { normalLayerId: normals[0].id, normalSha256: await hash(normal) } : {}) } };
      check(); inputs.push({ width, height, data, normal, settings });
      const replaced = frame.layers.find(l => l.research?.source.layerId === source.id && l.id === selected.id);
      frames.push({ index, sourceId: source.id, replacedId: replaced?.id ?? source.id, before: data, recipe, result: { data: new Uint8ClampedArray(), notes: [] } });
    }
    const results = await runResearchWorker(inputs, signal); check();
    frames.forEach((f, i) => { f.result = results[i]; });
    return { key, name, width, height, frames, dispose };
  } catch (error) { dispose(); throw error; }
}
export function applyResearchPreview(preview: ResearchPreview): void {
  if (preview.key !== researchWorkspaceKey()) throw new Error('Artwork changed. Create a fresh preview.');
  const s = useStudioStore.getState(), next = structuredClone(s.frames), entries = snapshotBuffers(), added: Layer[] = [];
  for (const frame of preview.frames) {
    if (frame.result.data.length !== preview.width * preview.height * 4) throw new Error('Invalid preview pixels.');
    const layer: Layer = { id: createId('research'), name: preview.name, visible: true, locked: false, opacity: 1, blendMode: 'source-over', research: structuredClone(frame.recipe) };
    next[frame.index].layers.forEach(l => { if (l.id === frame.sourceId || l.id === frame.replacedId || l.research?.source.layerId === frame.sourceId) l.visible = false; });
    next[frame.index].layers.unshift(layer); added.push(layer);
  }
  const capacity = validateWorkspaceStructure(preview.width, preview.height, next); if (!capacity.ok) throw new Error(capacity.reason || 'Workspace layer capacity reached.');
  const release = reserveMemory(preview.width * preview.height * added.length * 8, 'Research layer staging');
  try {
    preview.frames.forEach((f, i) => { const entry = createEntry(preview.width, preview.height, 1, true); entry.ctx.putImageData(new ImageData(f.result.data.slice(), preview.width, preview.height), 0, 0); entries.set(added[i].id, entry); });
    if (!pushStructuralHistoryStep(`Apply ${preview.name}`, { opKind: 'add-layer', affectedLayerIds: [], addedLayerCount: added.length, redoBufferCount: added.length, addedMetadataBytes: added.reduce((n, l) => n + researchBytes(l.research), 0) })) throw new Error('Undo memory refused this edit. Source artwork is unchanged.');
    replaceAllBuffers(entries);
    const position = Math.max(0, preview.frames.findIndex(f => f.index === s.activeFrameIndex));
    useStudioStore.setState({ frames: next, activeFrameIndex: preview.frames[position].index, activeLayerId: added[position].id, bufferVersion: s.bufferVersion + 1, editRevision: s.editRevision + 1, isDirty: true });
    preview.dispose();
  } finally { release(); }
}
export async function researchSourceStatus(recipe: ResearchRecipe): Promise<'current' | 'stale' | 'missing'> {
  const s = useStudioStore.getState(), frame = s.frames.find(f => f.id === recipe.source.frameId);
  if (!frame?.layers.some(l => l.id === recipe.source.layerId) || !hasBuffer(recipe.source.layerId) || (recipe.source.normalLayerId && !frame.layers.some(l => l.id === recipe.source.normalLayerId))) return 'missing';
  if (s.canvasWidth !== recipe.width || s.canvasHeight !== recipe.height) return 'stale';
  if (recipe.settings.kind === 'light') {
    const normals = frame.layers.filter(l => l.tag === 'normal-map');
    if (normals.length !== (recipe.source.normalLayerId ? 1 : 0) || normals.some(l => l.id !== recipe.source.normalLayerId || l.opacity !== 1 || l.blendMode !== 'source-over')) return 'stale';
  }
  try {
    const source = await hash(pixels(recipe.source.layerId, recipe.width, recipe.height));
    const normal = recipe.source.normalLayerId ? await hash(pixels(recipe.source.normalLayerId, recipe.width, recipe.height)) : undefined;
    return source === recipe.source.sha256 && normal === recipe.source.normalSha256 ? 'current' : 'stale';
  } catch { return 'missing'; }
}
