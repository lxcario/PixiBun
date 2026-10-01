import type { AnimationFrame, TagLoopMode } from '@/types/canvas';
import type { AnimationClip, LoopMode } from '@/types/animation';
import { ANIMATION_TIMING_LIMITS } from '@/lib/project/animationTiming';

/** One period, with each ping-pong endpoint held once. Shared by editor and export. */
export function playbackOrder(first: number, last: number, direction: TagLoopMode = 'forward', loop: LoopMode = 'repeat'): number[] {
  const order = Array.from({ length: Math.max(0, last - first + 1) }, (_, i) => first + i);
  if (direction === 'reverse') order.reverse();
  return direction === 'ping-pong' || loop === 'ping-pong' ? [...order, ...order.slice(1, -1).reverse()] : order;
}

export interface ExportAnimationModel {
  frames: { id: string; sourceIndex: number; durationMs: number }[];
  clips: { id: string; name: string; sourceName: string; frames: number[]; loop: boolean }[];
}

export function buildAnimationModel(frames: AnimationFrame[], clips: AnimationClip[], loopMode: LoopMode,
  sourceIndices = frames.map((_, i) => i)): ExportAnimationModel {
  if (!frames.length || frames.length > 500 || clips.length > 500 || sourceIndices.length !== frames.length || sourceIndices.some(i => !Number.isInteger(i) || i < 0 || i > 499) || new Set(sourceIndices).size !== frames.length ||
      new Set(frames.map(f => f.id)).size !== frames.length || !['repeat', 'once', 'ping-pong'].includes(loopMode) ||
      frames.some(f => typeof f.id !== 'string' || !f.id.length || f.id.length > 256) ||
      frames.some(f => !Number.isInteger(f.durationMs) || f.durationMs < ANIMATION_TIMING_LIMITS.durationMinMs || f.durationMs > ANIMATION_TIMING_LIMITS.durationMaxMs)) {
    throw new Error('Animation export requires valid frames and hold durations.');
  }
  const positions = new Map(sourceIndices.map((index, i) => [index, i]));
  const names = new Set<string>();
  const uniqueName = (input: string) => {
    const base = input.trim() || 'Animation'; let name = base, suffix = 2;
    while (names.has(name)) name = `${base} (${suffix++})`;
    names.add(name); return name;
  };
  const model: ExportAnimationModel = {
    frames: frames.map((f, i) => ({ id: f.id, sourceIndex: sourceIndices[i], durationMs: f.durationMs })),
    clips: [{ id: '__all__', sourceName: 'All frames', name: uniqueName('All frames'),
      frames: playbackOrder(0, frames.length - 1, 'forward', loopMode), loop: loopMode !== 'once' }],
  };
  for (const clip of clips) {
    if (typeof clip.name !== 'string' || clip.name.length > 256 || !Number.isInteger(clip.startFrame) || clip.startFrame < 0 || !Number.isInteger(clip.endFrame) || clip.endFrame < clip.startFrame ||
        clip.endFrame - clip.startFrame >= 500 || (clip.loopMode && !['forward', 'reverse', 'ping-pong'].includes(clip.loopMode))) {
      throw new Error('A clip has invalid export bounds or direction.');
    }
    const sequence = playbackOrder(clip.startFrame, clip.endFrame, clip.loopMode, loopMode);
    // Scoped sheets contain only complete clips, never silently shortened animations.
    if (!sequence.every(index => positions.has(index))) continue;
    model.clips.push({ id: clip.id, sourceName: clip.name, name: uniqueName(clip.name),
      frames: sequence.map(index => positions.get(index)!), loop: loopMode !== 'once' });
  }
  return model;
}

export interface AtlasRect { x: number; y: number; w: number; h: number }
export function godotSpriteFramesResource(model: ExportAnimationModel, rects: AtlasRect[], textureFilename: string): string {
  const resources = rects.map((r, i) => `[sub_resource type="AtlasTexture" id="frame_${i}"]\natlas = ExtResource("atlas")\nregion = Rect2(${r.x}, ${r.y}, ${r.w}, ${r.h})\nfilter_clip = true`).join('\n\n');
  const animations = model.clips.map(clip => `{"name": &${JSON.stringify(clip.name)}, "loop": ${clip.loop ? 1 : 0}, "speed": 1000.0, "frames": [${clip.frames.map(i =>
    `{"duration": ${model.frames[i].durationMs}.0, "texture": SubResource("frame_${i}")}`).join(', ')}]}`).join(',\n');
  return `[gd_resource type="SpriteFrames" load_steps=${rects.length + 2} format=3]\n\n[ext_resource type="Texture2D" path="res://${textureFilename}" id="atlas"]\n\n${resources}\n\n[resource]\nanimations = [${animations}]\n`;
}
