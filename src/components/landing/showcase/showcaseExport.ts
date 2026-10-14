import { drawBun, type BunPose } from '@/lib/art/bunSprite';
import { godotSpriteFramesResource, type ExportAnimationModel } from '@/lib/export/animationModel';
import { zipBundle } from '@/lib/export/zipBundle';

export type ShowcaseExportFormat = 'godot' | 'unity' | 'phaser' | 'apng' | 'gif';
export const SHOWCASE_FRAME_WIDTH = 20;
export const SHOWCASE_FRAME_HEIGHT = 22;
export const SHOWCASE_DURATIONS = [125, 125, 250, 125];
const POSES: Array<[number, BunPose]> = [[0, 'idle'], [-2, 'happy'], [-3, 'happy'], [-1, 'blink']];
export function createShowcaseFrames(): HTMLCanvasElement[] {
  return POSES.map(([lift, pose]) => {
    const canvas = document.createElement('canvas');
    canvas.width = SHOWCASE_FRAME_WIDTH; canvas.height = SHOWCASE_FRAME_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not draw the animation. Please try again.');
    drawBun(ctx, 2, 4 + lift, pose);
    return canvas;
  });
}
export function showcaseExportCode(format: ShowcaseExportFormat): string {
  const rects = POSES.map((_, i) => ({ x: i * SHOWCASE_FRAME_WIDTH, y: 0, w: SHOWCASE_FRAME_WIDTH, h: SHOWCASE_FRAME_HEIGHT }));
  if (format === 'godot') {
    const model: ExportAnimationModel = {
      frames: POSES.map((_, i) => ({ id: 'bun_' + i, sourceIndex: i, durationMs: SHOWCASE_DURATIONS[i] })),
      clips: [{ id: 'hop', name: 'hop', sourceName: 'hop', frames: [0, 1, 2, 3], loop: true }],
    };
    return godotSpriteFramesResource(model, rects, 'bun_hop.png');
  }
  if (format === 'apng' || format === 'gif') return `bun_hop.${format}\n\n4 hand-drawn frames · 20 × 22 pixels\nFrame holds: ${SHOWCASE_DURATIONS.join(', ')} ms\nLoop: repeat\n\nDownload the actual animation below.`;
  const frames = rects.map((frame, i) => ({ filename: 'bun_' + i, frame, rotated: false, trimmed: false,
    spriteSourceSize: { x: 0, y: 0, w: frame.w, h: frame.h }, sourceSize: { w: frame.w, h: frame.h }, duration: SHOWCASE_DURATIONS[i] }));
  return JSON.stringify(format === 'phaser'
    ? { textures: [{ image: 'bun_hop.png', size: { w: 80, h: 22 }, frames }], animations: [{ key: 'hop', frames: frames.map(f => ({ key: 'bun', frame: f.filename, duration: f.duration })), frameRate: 8, repeat: -1 }] }
    : { frames, meta: { app: 'PixiBun', image: 'bun_hop.png', format: 'RGBA8888', size: { w: 80, h: 22 }, scale: '1' } }, null, 2);
}
export async function createShowcaseDownload(format: ShowcaseExportFormat): Promise<{ blob: Blob; filename: string }> {
  const frames = createShowcaseFrames();
  if (format === 'apng') {
    const { exportAnimationToApngAsync } = await import('@/lib/export/apngEncoder');
    return { blob: await exportAnimationToApngAsync(frames, { durationsMs: SHOWCASE_DURATIONS, loopCount: 0 }), filename: 'bun_hop.apng' };
  }
  if (format === 'gif') {
    const { createAnimatedGifBlobAsync } = await import('@/lib/export/gifEncoder');
    return { blob: await createAnimatedGifBlobAsync(frames, 8, 1, undefined, undefined, SHOWCASE_DURATIONS.map(ms => Math.round(ms / 10)), true), filename: 'bun_hop.gif' };
  }
  const sheet = document.createElement('canvas'); sheet.width = 80; sheet.height = 22;
  const ctx = sheet.getContext('2d');
  if (!ctx) throw new Error('Could not draw the sprite sheet. Please try again.');
  frames.forEach((frame, i) => ctx.drawImage(frame, i * SHOWCASE_FRAME_WIDTH, 0));
  const png = await new Promise<Blob>((resolve, reject) => sheet.toBlob(blob => blob ? resolve(blob) : reject(new Error('Could not encode the sprite sheet.')), 'image/png'));
  const metadataName = format === 'godot' ? 'bun_spriteframes.tres' : 'bun_atlas.json';
  const instructions = format === 'godot'
    ? 'Place all three files in your Godot project root. Assign bun_spriteframes.tres to an AnimatedSprite2D and play hop.'
    : format === 'phaser'
      ? "Load bun_hop.png and bun_atlas.json with this.load.multiatlas('bun', 'bun_atlas.json'); create the hop animation from the JSON animations entry."
      : 'Import bun_hop.png into Unity as Sprite (2D and UI), Multiple, Point filtering, no compression. Slice into 20 × 22 cells. bun_atlas.json contains exact cell rectangles and millisecond frame holds for your atlas importer.';
  const encode = (value: string) => new TextEncoder().encode(value);
  return { blob: zipBundle([
    { name: 'bun_hop.png', bytes: new Uint8Array(await png.arrayBuffer()) },
    { name: metadataName, bytes: encode(showcaseExportCode(format)) },
    { name: 'README.txt', bytes: encode(instructions) },
  ]), filename: 'bun_' + format + '_kit.zip' };
}
