import { findStarterTemplate, TEMPLATE_PALETTE } from '@/lib/art/starterTemplates';
import { createBlankProjectFile } from '@/lib/storage/db';
import { useStudioStore } from '@/stores/studioStore';
import { createEntry, getBufferGeneration, getBufferRevision, replaceAllBuffers } from '@/lib/engine/bufferRegistry';
import { beginWorkspaceJob, workspaceJobKey } from '@/lib/engine/workspaceJob';
import { commitWorkspace } from '@/lib/engine/workspaceTransaction';
import { studioEvents } from '@/lib/events/studioEvents';
import { isPracticeActive } from './practiceSession';
import { coDrawBridge } from '@/lib/sync/coDrawBridge';
import type { SaveResult } from '@/types/project';
import type { StarterTemplate } from '@/types/landing';
import { postcard, postcardRgba, type Postcard } from '@/lib/postcards/scenes';

/** Open supplied starter artwork as a separate document after preserving the old one. */
export async function openStarterWorkspace(templateId: string, checkpoint: () => Promise<SaveResult>, signal?: AbortSignal): Promise<boolean> {
  const template = findStarterTemplate(templateId);
  if (!template) return false;
  return openWelcomeWorkspace(template, template.width, checkpoint, signal);
}

/** Open a Living Postcard: its scene, its palette with cycle tracks, cycling switched on. */
export async function openPostcardWorkspace(postcardId: string, checkpoint: () => Promise<SaveResult>, signal?: AbortSignal): Promise<boolean> {
  const card = postcard(postcardId);
  if (!card) return false;
  const opened = await openWelcomeWorkspace(undefined, card.width, checkpoint, signal, card);
  if (opened) useStudioStore.getState().setPaletteCycling(true);
  return opened;
}

export async function openBlankWorkspace(size: number, checkpoint: () => Promise<SaveResult>, signal?: AbortSignal): Promise<boolean> {
  if (![16, 24, 32, 48].includes(size)) throw new RangeError('Choose a blank canvas size offered on the welcome page.');
  return openWelcomeWorkspace(undefined, size, checkpoint, signal);
}

async function openWelcomeWorkspace(template: StarterTemplate | undefined, size: number, checkpoint: () => Promise<SaveResult>, signal?: AbortSignal, card?: Postcard): Promise<boolean> {
  const available = () => !isPracticeActive() && coDrawBridge.getRole() === null &&
    !useStudioStore.getState().hasFloatingSelection && !useStudioStore.getState().motionPart;
  if (!available()) throw new Error('Finish the current motion or floating selection and close Co-Draw before opening a new drawing.');
  const layerIds = useStudioStore.getState().frames.flatMap(frame => frame.layers.map(layer => layer.id));
  const existingIds = layerIds.filter(id => (getBufferGeneration(id) ?? 0) > 0);
  const blankIds = layerIds.filter(id => !existingIds.includes(id));
  // Serialization may allocate an untouched blank buffer at revision 1. Painting
  // touches its revision; replacement/publication also changes bufferVersion.
  const job = beginWorkspaceJob(layerIds, signal, () => JSON.stringify([workspaceJobKey(existingIds),
    useStudioStore.getState().bufferVersion, blankIds.map(id => Math.max(0, getBufferRevision(id) - 1)), available()]));
  try {
    const saved = await checkpoint();
    job.check();
    if (!saved.ok || useStudioStore.getState().isDirty) throw new Error('The current drawing could not be saved. Export a backup before opening a new drawing.');
    const width = card?.width ?? size, height = card?.height ?? size;
    const file = createBlankProjectFile(card?.name ?? template?.name ?? 'Untitled Sprite', width, height);
    if (template) file.palettes[0].colors = [...new Set(Object.values(TEMPLATE_PALETTE))];
    if (card) {
      file.palettes[0] = { ...file.palettes[0], name: `${card.name} cycle`, colors: [...card.palette], cycleTracks: card.tracks.map(track => ({ ...track })) };
      file.fps = 12;
    }
    const layerId = file.frames[0].layers[0].id;
    const entry = createEntry(width, height);
    if (card) entry.ctx.putImageData(new ImageData(postcardRgba(card), width, height), 0, 0);
    if (template) for (let y = 0; y < template.height; y++) for (let x = 0; x < template.width; x++) {
      const color = TEMPLATE_PALETTE[template.rows[y][x]];
      if (color) { entry.ctx.fillStyle = color; entry.ctx.fillRect(x, y, 1, 1); }
    }
    job.check();
    commitWorkspace(() => {
      replaceAllBuffers(new Map([[layerId, entry]]));
      useStudioStore.getState().loadProjectState(file);
      useStudioStore.getState().bumpBufferVersion();
      useStudioStore.getState().setSaveStatus('idle');
      useStudioStore.getState().setDirty(true);
      studioEvents.emit('pixibun:history-clear');
    });
    return true;
  } finally { job.dispose(); }
}
