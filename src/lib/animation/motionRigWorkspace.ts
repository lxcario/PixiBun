import { useStudioStore } from '@/stores/studioStore';
import { snapshotBuffers } from '@/lib/engine/bufferRegistry';
import { createId } from '@/lib/engine/id';
import { commitWorkspace } from '@/lib/engine/workspaceTransaction';
import { pushStructuralHistoryStep } from '@/lib/engine/structuralHistory';
import { reserveMemory } from '@/lib/safety/memoryBudget';
import { coDrawBridge } from '@/lib/sync/coDrawBridge';
import { isNormalLayer } from '@/lib/export/normalLayers';
import { captureMotionPart, resolveMotionSource, type MotionPart } from './pixiMotion';
import { MOTION_RIG_LIMITS, parseMotionRigs, motionRigBytes, type MotionRig } from './motionRigDocument';
import type { StudioState } from '@/stores/slices/types';

const hash = async (image: ImageData) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', image.data)), b => b.toString(16).padStart(2, '0')).join('');
type Result = { ok: true } | { ok: false; reason: string };
const failure = (error: unknown): Result => ({ ok: false, reason: error instanceof Error ? error.message : 'The motion rig could not be opened.' });

function selectionRuns(part: MotionPart): MotionRig['part']['maskRuns'] {
  if (!part.mask) return null;
  const runs: [number, number][] = [];
  const { x, y, w, h } = part.bounds;
  for (let i = 0; i < w * h; i++) {
    if (part.mask[(y + Math.floor(i / w)) * part.sourceVersion.canvasWidth + x + i % w] !== 1) continue;
    const last = runs.at(-1);
    if (last && last[0] + last[1] === i) last[1]++;
    else runs.push([i, 1]);
    if (runs.length > MOTION_RIG_LIMITS.maskRuns) throw new Error('This selection is too complex to save as a motion rig. Use a simpler selection.');
  }
  return runs;
}

export async function saveMotionRig(name: string): Promise<Result> {
  if (coDrawBridge.getRole() !== null) return { ok: false, reason: 'Close co-draw before editing motion rigs.' };
  const state = useStudioStore.getState(), part = state.motionPart;
  if (!part) return { ok: false, reason: 'Capture a motion part first.' };
  const source = resolveMotionSource(part, state);
  if (!source.ok) return source;
  let release: (() => void) | undefined;
  try {
    const existing = state.motionRigs.find(r => r.part.id === part.id);
    const maskRuns = selectionRuns(part);
    release = reserveMemory(state.canvasWidth * state.canvasHeight * 8, 'Motion source fingerprint');
    const sourceSha256 = await hash(source.entry.ctx.getImageData(0, 0, state.canvasWidth, state.canvasHeight));
    if (useStudioStore.getState() !== state || coDrawBridge.getRole() !== null || !resolveMotionSource(part).ok) throw new Error('The workspace changed while saving the rig. Try again.');
    const rig: MotionRig = { version: 1, id: existing?.id ?? createId('motion-rig'), name: name.trim(), part: {
      id: part.id, sourceFrameId: part.sourceFrameId, sourceLayerId: part.sourceLayerId,
      width: state.canvasWidth, height: state.canvasHeight, sourceSha256,
      bounds: { ...part.bounds }, pivot: { ...part.pivot }, startPose: { ...part.startPose }, endPose: { ...part.endPose },
      frameCount: part.frameCount, easing: part.easing, maskRuns,
    } };
    const rigs = existing ? state.motionRigs.map(r => r.id === existing.id ? rig : r) : [...state.motionRigs, rig];
    const validated = parseMotionRigs(rigs);
    if (!validated) throw new Error('The rig exceeds the supported name, pose, selection or library limits.');
    commitWorkspace(() => {
      if (!pushStructuralHistoryStep('Save motion rig', { addedMetadataBytes: motionRigBytes([rig]) })) throw new Error('The rig could not fit in Undo memory.');
      useStudioStore.setState({ motionRigs: validated, isDirty: true, editRevision: state.editRevision + 1 });
    });
    return { ok: true };
  } catch (error) { return failure(error); }
  finally { release?.(); }
}

export function motionRigSourceReason(rig: MotionRig, state: Pick<StudioState, 'canvasWidth' | 'canvasHeight' | 'frames'> = useStudioStore.getState()): string | null {
  if (rig.part.width !== state.canvasWidth || rig.part.height !== state.canvasHeight) return 'The canvas size changed. Capture and save a new rig.';
  const layer = state.frames.find(f => f.id === rig.part.sourceFrameId)?.layers.find(l => l.id === rig.part.sourceLayerId);
  if (!layer) return 'The saved source frame or layer is missing. Capture and save a new rig.';
  if (isNormalLayer(layer)) return 'Motion parts currently support color artwork. Use layer rotation for normal maps.';
  if (layer.locked) return 'Unlock the source layer before opening this rig.';
  const entry = snapshotBuffers().get(layer.id);
  if (!entry || entry.canvas.width !== state.canvasWidth || entry.canvas.height !== state.canvasHeight) return 'The saved artwork is unavailable.';
  return null;
}

export async function openMotionRig(id: string): Promise<Result> {
  if (coDrawBridge.getRole() !== null) return { ok: false, reason: 'Close co-draw before editing motion rigs.' };
  const state = useStudioStore.getState(), rig = state.motionRigs.find(r => r.id === id);
  if (!rig || !parseMotionRigs([rig])) return { ok: false, reason: 'This motion rig is missing or unsupported.' };
  if (state.motionPart) return { ok: false, reason: 'Cancel the current part before opening a saved rig.' };
  if (state.hasFloatingSelection) return { ok: false, reason: 'Commit or cancel the floating selection before opening a rig.' };
  const reason = motionRigSourceReason(rig, state);
  if (reason) return { ok: false, reason };
  let release: (() => void) | undefined;
  try {
    const entry = snapshotBuffers().get(rig.part.sourceLayerId)!;
    const generation = entry.generation, revision = entry.contentRevision;
    release = reserveMemory(state.canvasWidth * state.canvasHeight * 20, 'Opening saved motion rig');
    const sourceSha256 = await hash(entry.ctx.getImageData(0, 0, state.canvasWidth, state.canvasHeight));
    const live = snapshotBuffers().get(rig.part.sourceLayerId);
    if (useStudioStore.getState() !== state || coDrawBridge.getRole() !== null || live !== entry || live.generation !== generation || live.contentRevision !== revision) throw new Error('The workspace changed while opening the rig. Try again.');
    if (sourceSha256 !== rig.part.sourceSha256) throw new Error('The saved source artwork changed. Capture and save a new rig.');
    const p = rig.part;
    let mask: Uint8Array | null = null;
    if (p.maskRuns) {
      mask = new Uint8Array(state.canvasWidth * state.canvasHeight);
      for (const [start, length] of p.maskRuns) for (let i = start; i < start + length; i++) mask[(p.bounds.y + Math.floor(i / p.bounds.w)) * state.canvasWidth + p.bounds.x + i % p.bounds.w] = 1;
    }
    const part = captureMotionPart({ canvasWidth: state.canvasWidth, canvasHeight: state.canvasHeight,
      activeFrameIndex: state.frames.findIndex(f => f.id === p.sourceFrameId), activeLayerId: p.sourceLayerId,
      frames: state.frames, selection: p.bounds, selectionMask: mask, layerCanvas: entry.canvas });
    if (!part) throw new Error('The saved selection has no visible artwork.');
    commitWorkspace(() => useStudioStore.setState({
      motionPart: { ...part, id: p.id, pivot: { ...p.pivot }, startPose: { ...p.startPose }, endPose: { ...p.endPose }, frameCount: p.frameCount, easing: p.easing },
      motionActivePose: 'end', motionPreviewIndex: null,
      motionHistory: null,
      activeFrameIndex: part.sourceFrameIndex, activeLayerId: p.sourceLayerId, isPlaying: false,
      selection: null, selectionMask: null,
    }));
    return { ok: true };
  } catch (error) { return failure(error); }
  finally { release?.(); }
}

export function deleteMotionRig(id: string): Result {
  if (coDrawBridge.getRole() !== null) return { ok: false, reason: 'Close co-draw before editing motion rigs.' };
  const state = useStudioStore.getState();
  if (!state.motionRigs.some(r => r.id === id)) return { ok: false, reason: 'This motion rig no longer exists.' };
  try {
    commitWorkspace(() => {
      if (!pushStructuralHistoryStep('Delete motion rig')) throw new Error('The rig could not fit in Undo memory.');
      useStudioStore.setState({ motionRigs: state.motionRigs.filter(r => r.id !== id), isDirty: true, editRevision: state.editRevision + 1 });
    });
    return { ok: true };
  } catch (error) { return failure(error); }
}
