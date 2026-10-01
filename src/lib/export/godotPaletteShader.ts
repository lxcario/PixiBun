import type { PaletteCycleTrack } from '@/types/palette';
import { paletteCycleTrackError } from '@/lib/color/paletteAdmission';

/** Same base-register overwrite, floor phase and rounded RGB BlendShift as the CPU LUT. */
export function godotPaletteShader(tracks: PaletteCycleTrack[], paletteLength: number, legacyNormalized = false): string {
  if (!Number.isInteger(paletteLength) || paletteLength < 1 || paletteLength > 256 || tracks.length > 64 || tracks.some(t => paletteCycleTrackError(t, paletteLength))) throw new Error('Invalid palette shader settings.');
  const logic = tracks.filter(t => t.enabled && t.rate > 0 && t.high > t.low).map(t => {
    const size = t.high - t.low + 1, period = t.direction === 'ping-pong' ? 2 * (size - 1) : size;
    const rate = Number.isInteger(t.rate) ? `${t.rate}.0` : String(t.rate);
    const clock = t.blendShift ? `elapsed_seconds * ${rate}` : `floor(elapsed_seconds * ${rate})`;
    const phase = t.direction === 'ping-pong' ? `${clock} + k` : `k + ${clock} * ${t.direction === 'reverse' ? '1.0' : '-1.0'}`;
    const offsets = t.direction === 'ping-pong' ? `float a = (step_a < ${size}.0) ? step_a : ${period}.0 - step_a;
        float b = (step_b < ${size}.0) ? step_b : ${period}.0 - step_b;` : 'float a = step_a; float b = step_b;';
    return `if (idx >= ${t.low} && idx <= ${t.high}) {
        float k = float(idx - ${t.low});
        float phase = mod(${phase}, ${period}.0);
        float step_a = floor(phase); float step_b = mod(step_a + 1.0, ${period}.0);
        ${offsets}
        vec3 first = palette_rgb(${t.low}.0 + a);
        vec3 second = palette_rgb(${t.low}.0 + b);
        rgb = ${t.blendShift ? 'floor(mix(first, second, fract(phase)) * 255.0 + 0.5) / 255.0' : 'first'};
    }`;
  }).join('\n    ');
  const generated = `shader_type canvas_item;
// Raw index bytes and source alpha are independent opaque data textures.
uniform sampler2D index_texture : filter_nearest, repeat_disable;
uniform sampler2D alpha_texture : filter_nearest, repeat_disable;
uniform sampler2D palette_texture : filter_nearest, repeat_disable;
uniform float elapsed_seconds = 0.0;
vec3 palette_rgb(float idx) { return texture(palette_texture, vec2((idx + 0.5) / ${paletteLength}.0, 0.5)).rgb; }
void fragment() {
    int idx = int(round(texture(index_texture, UV).r * 255.0));
    vec3 rgb = palette_rgb(float(idx));
    ${logic}
    COLOR = vec4(rgb, texture(alpha_texture, UV).r);
}
`;
  if (!legacyNormalized) return generated;
  // Preserve the standalone export's documented normalized-index contract.
  return generated.replace('uniform sampler2D index_texture : filter_nearest, repeat_disable;\n', '')
    .replace('uniform sampler2D alpha_texture : filter_nearest, repeat_disable;\n', '')
    .replace('uniform float elapsed_seconds = 0.0;\n', '// RED = index / max(1, palette_size - 1), ALPHA = source alpha.\n')
    .replaceAll('elapsed_seconds', 'TIME')
    .replace('texture(index_texture, UV).r * 255.0', `texture(TEXTURE, UV).r * ${Math.max(1, paletteLength - 1)}.0`)
    .replace('texture(alpha_texture, UV).r', 'texture(TEXTURE, UV).a');
}
