import type { AnimationClip } from '@/types/animation';

/** A duplicate belongs to clips containing its source; later clips keep their members. */
export function clipsAfterFrameDuplication(clips: AnimationClip[], sourceIndex: number): AnimationClip[] {
  return clips.map(clip => {
    const startFrame = clip.startFrame + (sourceIndex < clip.startFrame ? 1 : 0);
    const endFrame = clip.endFrame + (sourceIndex <= clip.endFrame ? 1 : 0);
    return { ...clip, startFrame, endFrame, fromFrame: startFrame, toFrame: endFrame };
  });
}

export function clipsAfterFrameReorder(clips: AnimationClip[], from: number, to: number):
  { ok: true; clips: AnimationClip[] } | { ok: false; clipName: string } {
  const destination = (index: number) => index === from ? to
    : from < to && index > from && index <= to ? index - 1
    : from > to && index >= to && index < from ? index + 1 : index;
  const result: AnimationClip[] = [];
  for (const clip of clips) {
    const members = Array.from({ length: clip.endFrame - clip.startFrame + 1 }, (_, offset) => destination(clip.startFrame + offset));
    const startFrame = Math.min(...members), endFrame = Math.max(...members);
    // The portable clip model is contiguous. Refuse moves that cannot preserve membership.
    if (endFrame - startFrame + 1 !== members.length) return { ok: false, clipName: clip.name };
    result.push({ ...clip, startFrame, endFrame, fromFrame: startFrame, toFrame: endFrame });
  }
  return { ok: true, clips: result };
}
