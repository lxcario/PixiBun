import { useStudioStore } from '@/stores/studioStore';
import { getBufferGeneration, getBufferRevision, getOrCreateBuffer, hasBuffer } from '@/lib/engine/bufferRegistry';
import { compositeFrame } from '@/lib/render/compositor';
import { reserveMemory } from '@/lib/safety/memoryBudget';
import { calculateSpriteSheetGeometry, validateExportGeometry } from './spriteSheetPacker';
import { buildAnimationModel, godotSpriteFramesResource } from './animationModel';
import { defaultPaletteSemantics, indexSemanticPixels } from '@/lib/color/paletteSemantics';
import { godotPaletteShader } from './godotPaletteShader';
import { zipBundle, type BundleFile } from './zipBundle';
import { isNormalLayer, hasNeutralNormalLayer } from './normalLayers';

export interface GodotKitOptions { clipId: string | 'all'; indexed: boolean; normals: boolean; pivot: 'center' | 'feet'; signal?: AbortSignal }
const textFile = (name: string, text: string): BundleFile => ({ name, bytes: new TextEncoder().encode(text) });
const canvas = (width: number, height: number) => {
  const result = document.createElement('canvas'); result.width = width; result.height = height;
  if (!result.getContext('2d')) throw new Error('Game kit canvas is unavailable.');
  return result;
};
const png = (source: HTMLCanvasElement, signal?: AbortSignal): Promise<Uint8Array> => new Promise((resolve, reject) => {
  let settled = false;
  const finish = (error?: Error) => {
    if (settled) return false;
    settled = true; clearTimeout(timer); signal?.removeEventListener('abort', abort); if (error) reject(error);
    return true;
  };
  const abort = () => finish(new DOMException('Game kit cancelled.', 'AbortError'));
  const timer = setTimeout(() => finish(new Error('PNG encoding timed out. Choose a smaller export.')), 30_000);
  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) { abort(); return; }
  try { source.toBlob(blob => {
    if (settled) return;
    if (!blob) { finish(new Error('PNG encoding failed.')); return; }
    void blob.arrayBuffer().then(bytes => { if (finish()) resolve(new Uint8Array(bytes)); }, error => finish(error));
  }, 'image/png'); } catch (error) { finish(error instanceof Error ? error : new Error('PNG encoding failed.')); }
});
export function godotKitSourceKey(): string {
  const s = useStudioStore.getState();
  return JSON.stringify([s.currentProjectId, s.projectName, s.editRevision, s.bufferVersion, s.canvasWidth, s.canvasHeight, s.loopMode, s.clips,
    s.currentPaletteId, s.palettes, s.paletteCycleSpeedMultiplier, s.frames.map(f => [f.id, f.durationMs, f.layers.map(l =>
      [l.id, l.visible, l.opacity, l.blendMode, l.tag, l.effect?.kind, getBufferGeneration(l.id), getBufferRevision(l.id)])])]);
}

/** Owns a bounded immutable export; publishes one archive only after every asset succeeds. */
export async function buildGodotKit(options: GodotKitOptions) {
  const s = useStudioStore.getState(), key = godotKitSourceKey();
  const check = () => {
    if (options.signal?.aborted) throw new DOMException('Game kit cancelled.', 'AbortError');
    if (key !== godotKitSourceKey()) throw new Error('Artwork or export metadata changed. Export again.');
  };
  check();
  if (!['center', 'feet'].includes(options.pivot)) throw new Error('Choose a valid sprite anchor.');
  const clip = options.clipId === 'all' ? undefined : s.clips.find(c => c.id === options.clipId);
  if (options.clipId !== 'all' && !clip) throw new Error('The selected clip no longer exists.');
  const first = clip?.startFrame ?? 0, last = clip?.endFrame ?? s.frames.length - 1;
  const frames = s.frames.slice(first, last + 1), sourceIndices = frames.map((_, i) => first + i);
  const animation = buildAnimationModel(frames, clip ? [clip] : s.clips, s.loopMode, sourceIndices);
  const { canvasWidth: width, canvasHeight: height } = s;
  const geometry = calculateSpriteSheetGeometry(frames.length, width, height, { layout: 'grid', scale: 1, padding: 1 });
  const valid = validateExportGeometry(geometry.sheetWidth, geometry.sheetHeight, { maxDimension: 8192, maxPixels: 4_000_000 });
  if (!valid.valid) throw new Error(valid.error);
  const palette = s.palettes.find(p => p.id === s.currentPaletteId);
  if (options.indexed && !palette) throw new Error('Choose a palette for indexed export.');
  const release = reserveMemory(geometry.totalPixels * (options.normals ? 112 : 96) + width * height * 24, 'Godot game kit');
  try {
    const atlas = canvas(geometry.sheetWidth, geometry.sheetHeight), scratch = canvas(width, height);
    const normalAtlas = options.normals ? canvas(atlas.width, atlas.height) : undefined;
    const indexAtlas = options.indexed ? canvas(atlas.width, atlas.height) : undefined;
    const alphaAtlas = options.indexed ? canvas(atlas.width, atlas.height) : undefined;
    const indexData = options.indexed ? new Uint8ClampedArray(geometry.totalPixels * 4) : undefined;
    const alphaData = options.indexed ? new Uint8ClampedArray(geometry.totalPixels * 4) : undefined;
    if (indexData && alphaData) for (let p = 3; p < indexData.length; p += 4) { indexData[p] = 255; alphaData[p] = 255; }
    const rects: { x: number; y: number; w: number; h: number }[] = [];
    let boundPixels = 0;
    for (let i = 0; i < frames.length; i++) {
      check();
      const frame = frames[i], normals = frame.layers.filter(isNormalLayer);
      if (options.normals && !hasNeutralNormalLayer(frame.layers)) {
        throw new Error('Normal export needs exactly one full-opacity Normal Facets or Normal Map layer with Normal blending in every exported frame.');
      }
      if (options.normals && !hasBuffer(normals[0].id)) throw new Error('A normal-map buffer is missing. Restore the project before exporting.');
      const diffuse = options.normals ? { ...frame, layers: frame.layers.filter(l => l.id !== normals[0].id) } : frame;
      const composed = compositeFrame([diffuse], 0, width, height, {}, scratch);
      if (!composed) throw new Error(`Could not render frame ${first + i + 1}.`);
      const rect = { x: 1 + (i % geometry.cols) * (width + 1), y: 1 + Math.floor(i / geometry.cols) * (height + 1), w: width, h: height };
      rects.push(rect); atlas.getContext('2d')!.drawImage(composed, rect.x, rect.y);
      if (normalAtlas) normalAtlas.getContext('2d')!.drawImage(getOrCreateBuffer(normals[0].id, width, height).canvas, rect.x, rect.y);
      if (indexData && alphaData && palette) {
        const map = indexSemanticPixels(composed.getContext('2d')!.getImageData(0, 0, width, height).data, width, height, palette, frame.id);
        boundPixels += map.bound;
        for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
          const source = y * width + x, dest = ((rect.y + y) * atlas.width + rect.x + x) * 4;
          indexData[dest] = map.indices[source]; alphaData[dest] = map.alpha[source];
        }
      }
      await new Promise<void>(resolve => setTimeout(resolve, 0));
    }
    check();
    const files: BundleFile[] = [textFile('sprite_frames.tres', godotSpriteFramesResource(animation, rects, 'atlas.png'))];
    files.push({ name: 'atlas.png', bytes: await png(atlas, options.signal) }); check();
    if (normalAtlas) { files.push({ name: 'normal.png', bytes: await png(normalAtlas, options.signal) }); check(); }
    if (indexAtlas && alphaAtlas && indexData && alphaData && palette) {
      indexAtlas.getContext('2d')!.putImageData(new ImageData(indexData, atlas.width, atlas.height), 0, 0);
      alphaAtlas.getContext('2d')!.putImageData(new ImageData(alphaData, atlas.width, atlas.height), 0, 0);
      files.push({ name: 'indices.png', bytes: await png(indexAtlas, options.signal) }); check();
      files.push({ name: 'alpha.png', bytes: await png(alphaAtlas, options.signal) }); check();
      const lut = canvas(palette.colors.length, 1), colors = new Uint8ClampedArray(palette.colors.length * 4);
      palette.colors.forEach((color, i) => {
        const clean = color.slice(1), hex = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
        colors.set([parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16), 255], i * 4);
      });
      lut.getContext('2d')!.putImageData(new ImageData(colors, palette.colors.length, 1), 0, 0);
      files.push({ name: 'palette.png', bytes: await png(lut, options.signal) }); check();
      files.push(textFile('palette.gdshader', godotPaletteShader(palette.cycleTracks ?? [], palette.colors.length)));
    }
    const semantics = palette ? palette.semantics ?? defaultPaletteSemantics(palette) : undefined;
    const manifest = { format: 'pixibun-godot-kit', version: 1, engine: 'Godot 4.7', projectName: s.projectName,
      width, height, atlasWidth: atlas.width, atlasHeight: atlas.height, rects, animation,
      pivot: { x: 0.5, y: options.pivot === 'feet' ? 1 : 0.5 }, normalConvention: options.normals ? 'X+ Y+ Z+; as stored, no inferred conversion' : null,
      indexed: options.indexed, normals: options.normals, boundPixels,
      palette: palette ? { id: palette.id, entries: semantics!.entries.map((entry, i) => ({ ...entry, color: palette.colors[i] })),
        bindings: semantics!.bindings, tracks: palette.cycleTracks ?? [], speedMultiplier: s.paletteCycleSpeedMultiplier } : null,
      assetSha256: {} as Record<string, string>,
    };
    files.push(textFile('preview.gd', GODOT_PREVIEW));
    files.push(textFile('preview.tscn', '[gd_scene load_steps=2 format=3]\n[ext_resource type="Script" path="res://preview.gd" id="script"]\n[node name="PixiBunPreview" type="Node2D"]\nscript = ExtResource("script")\n'));
    files.push(textFile('project.godot', `config_version=5\n[application]\nconfig/name="PixiBun game kit"\nrun/main_scene="res://preview.tscn"\n[display]\nwindow/size/viewport_width=640\nwindow/size/viewport_height=480\n[rendering]\nrenderer/rendering_method="gl_compatibility"\ntextures/default_filters/use_nearest_mipmap_filter=false\ntextures/canvas_textures/default_texture_filter=0\n`));
    for (const asset of files.filter(f => f.name.endsWith('.png'))) files.push(textFile(`${asset.name}.import`, textureImport(asset.name)));
    files.push(textFile('README.txt', 'Open project.godot with Godot 4.7 and run the main scene. Choose a named clip. Left: original color. Right: game runtime.\nHolds use SpriteFrames relative duration in milliseconds at speed 1000. Ping-pong periods contain each endpoint once.\nTextures are untrimmed, lossless, nearest, without mipmaps or alpha-border changes. Anchors are normalized in manifest.json.\nIndices store raw register bytes in RED; alpha.png stores source alpha in RED, independently. Both data textures are opaque.\nRoles and index bindings are explicit. Non-palette and unresolved duplicate pixels refuse indexed export. No quantization is hidden.\nNormal atlases are exported as stored; Godot expects X+ Y+ Z+. Generated lighting is not inferred or guaranteed.\nGodot itself is not included; its license is available at https://godotengine.org/license/.\nUnity/Phaser metadata remains unverified; this kit targets Godot 4.7 only.\n'));
    for (const file of files) manifest.assetSha256[file.name] = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', file.bytes as Uint8Array<ArrayBuffer>)), n => n.toString(16).padStart(2, '0')).join('');
    check(); files.push(textFile('manifest.json', JSON.stringify(manifest, null, 2)));
    return { blob: zipBundle(files), manifest };
  } finally { release(); }
}

function textureImport(name: string): string {
  return `[remap]\nimporter="texture"\ntype="CompressedTexture2D"\n[deps]\nsource_file="res://${name}"\n[params]\ncompress/mode=0\ncompress/normal_map=0\nmipmaps/generate=false\nprocess/fix_alpha_border=false\nprocess/premult_alpha=false\nprocess/normal_map_invert_y=false\n`;
}

export const GODOT_PREVIEW = `extends Node2D
var data: Dictionary
var player: AnimatedSprite2D
var reference: AnimatedSprite2D
var palette_material: ShaderMaterial
var elapsed_seconds := 0.0
var runtime_light: PointLight2D

func _ready():
    data = JSON.parse_string(FileAccess.get_file_as_string("res://manifest.json"))
    var frames: SpriteFrames = load("res://sprite_frames.tres")
    reference = AnimatedSprite2D.new()
    reference.sprite_frames = frames
    reference.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
    reference.centered = false
    reference.offset = -Vector2(data.width * data.pivot.x, data.height * data.pivot.y)
    reference.position = Vector2(180, 280)
    var display_scale: float = min(8.0, 200.0 / max(data.width, data.height))
    reference.scale = Vector2.ONE * display_scale
    add_child(reference)
    player = reference.duplicate()
    player.position = Vector2(460, 280)
    player.sprite_frames = frames.duplicate(true)
    add_child(player)
    if data.normals:
        var normal_atlas: Texture2D = load("res://normal.png")
        for animation in player.sprite_frames.get_animation_names():
            for i in player.sprite_frames.get_frame_count(animation):
                var diffuse: AtlasTexture = player.sprite_frames.get_frame_texture(animation, i)
                var pair := CanvasTexture.new()
                pair.diffuse_texture = diffuse.atlas
                pair.normal_texture = normal_atlas
                pair.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
                # AtlasTexture must wrap CanvasTexture so its draw call preserves atlas UVs.
                var combined := AtlasTexture.new()
                combined.atlas = pair
                combined.region = diffuse.region
                combined.filter_clip = true
                player.sprite_frames.set_frame(animation, i, combined, player.sprite_frames.get_frame_duration(animation, i))
    if data.indexed:
        palette_material = ShaderMaterial.new()
        palette_material.shader = load("res://palette.gdshader")
        palette_material.set_shader_parameter("index_texture", load("res://indices.png"))
        palette_material.set_shader_parameter("alpha_texture", load("res://alpha.png"))
        palette_material.set_shader_parameter("palette_texture", load("res://palette.png"))
        player.material = palette_material
    var choices := OptionButton.new()
    choices.position = Vector2(20, 20)
    for clip in data.animation.clips:
        choices.add_item(clip.name)
    choices.item_selected.connect(func(i): play_clip(data.animation.clips[i].name))
    add_child(choices)
    var title := Label.new()
    title.text = "Original                         Godot runtime"
    title.position = Vector2(100, 70)
    add_child(title)
    if data.indexed:
        var cycle := CheckButton.new()
        cycle.text = "Runtime palette"
        cycle.button_pressed = true
        cycle.position = Vector2(20, 400)
        cycle.toggled.connect(func(enabled): player.material = palette_material if enabled else null)
        add_child(cycle)
    if data.normals:
        runtime_light = PointLight2D.new()
        var light_image := Image.create(256, 256, false, Image.FORMAT_RGBA8)
        light_image.fill(Color.WHITE)
        runtime_light.texture = ImageTexture.create_from_image(light_image)
        runtime_light.position = Vector2(440, 240)
        runtime_light.energy = 0.7
        runtime_light.enabled = false
        add_child(runtime_light)
        var light_toggle := CheckButton.new()
        light_toggle.text = "Normal-map light"
        light_toggle.position = Vector2(250, 400)
        light_toggle.toggled.connect(func(enabled): runtime_light.enabled = enabled)
        add_child(light_toggle)
    player.frame_changed.connect(func(): reference.set_frame_and_progress(player.frame, player.frame_progress))
    play_clip(data.animation.clips[0].name)

func play_clip(animation: String):
    player.stop()
    reference.animation = animation
    player.animation = animation
    player.set_frame_and_progress(0, 0.0)
    reference.set_frame_and_progress(0, 0.0)
    player.play(animation)

func _process(delta: float):
    elapsed_seconds += delta
    if palette_material:
        palette_material.set_shader_parameter("elapsed_seconds", elapsed_seconds * data.palette.speedMultiplier)
`;

export interface GodotPreflightReport {
  ready: string[];
  attention: string[];
  optional: string[];
}

export function inspectGodotKitPreflight(options: { indexed: boolean; normals: boolean }): GodotPreflightReport {
  const s = useStudioStore.getState();
  const ready: string[] = [];
  const attention: string[] = [];
  const optional: string[] = [];

  const { canvasWidth: width, canvasHeight: height, frames, clips, currentPaletteId, palettes } = s;
  const geometry = calculateSpriteSheetGeometry(frames.length, width, height, { layout: 'grid', scale: 1, padding: 1 });

  // 1. Geometry
  if (geometry.totalPixels <= 4_000_000) {
    ready.push(`Atlas layout: ${geometry.sheetWidth}×${geometry.sheetHeight} px across ${frames.length} frame${frames.length === 1 ? '' : 's'}.`);
  } else {
    attention.push(`Atlas exceeds 4M pixel limit (${geometry.totalPixels.toLocaleString()} px). Reduce frame count or canvas size.`);
  }

  // 2. Palette & Indexing
  const palette = palettes.find(p => p.id === currentPaletteId);
  if (options.indexed) {
    if (!palette) {
      attention.push('Choose a valid palette before exporting an indexed kit.');
    } else {
      const colorCounts = new Map<string, number>();
      palette.colors.forEach(c => {
        const norm = c.toLowerCase();
        colorCounts.set(norm, (colorCounts.get(norm) ?? 0) + 1);
      });
      const duplicates = [...colorCounts.entries()].filter(([_, count]) => count > 1);
      if (duplicates.length > 0) {
        attention.push(`${duplicates.length} duplicate color value(s) in palette registers. Unassigned duplicate pixels will require bindings in Palette → Roles.`);
      } else {
        ready.push(`Indexed palette: ${palette.colors.length} unique registers ready for palette cycling.`);
      }
    }
  } else {
    ready.push('Full-color RGBA diffuse atlas (lossless nearest filtering).');
    optional.push('Enable indexed export if you want runtime shader palette swapping in Godot.');
  }

  // 3. Normal Maps
  if (options.normals) {
    const invalidFrames: number[] = [];
    frames.forEach((f, idx) => {
      if (!hasNeutralNormalLayer(f.layers)) {
        invalidFrames.push(idx + 1);
      }
    });
    if (invalidFrames.length === 0) {
      ready.push(`Normal maps: Verified neutral normal layer on all ${frames.length} frames.`);
    } else {
      attention.push(`Normal export requires exactly one 100% opacity normal layer per frame. Missing or invalid on frame(s): ${invalidFrames.slice(0, 5).join(', ')}${invalidFrames.length > 5 ? '…' : ''}.`);
    }
  } else {
    optional.push('Add Normal Facets or Normal Map layers and enable normal atlas for dynamic 2.5D lighting in Godot.');
  }

  // 4. Animation Clips
  if (clips.length > 0) {
    ready.push(`Clips: ${clips.length} named animation clip(s) with exact frame hold durations.`);
  } else {
    optional.push('No named clips defined. A default clip for all frames will be generated for SpriteFrames.');
  }

  return { ready, attention, optional };
}
