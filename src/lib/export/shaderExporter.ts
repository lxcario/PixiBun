/**
 * shaderExporter.ts
 * Standalone Godot 4 & Unity URP 2D Palette Cycling Shader Exporter & Frame Unroller
 * 
 * Generates hardware shaders with point-filtering, ping-pong oscillation, and sub-step BlendShift,
 * and generates unrolled animation frames using harmonic rational retuning for seamless APNG/GIF loops.
 */

import { godotPaletteShader } from './godotPaletteShader';

import {
  PaletteCycleTrack,
  updateLivePaletteLUT32,
  retuneTracksForSeamlessLoop,
  hexToRgb,
  buildCycleRegisterMask,
} from '@/lib/color/paletteCycling';

/**
 * Generates a standalone Godot 4 CanvasItem shader (.gdshader) for palette cycling.
 */
export function generateGodot4Shader(
  tracks: PaletteCycleTrack[],
  paletteLength: number = 256
): string {
  return godotPaletteShader(tracks, paletteLength, true);
}

/**
 * Generates a Unity URP 2D HLSL Shader for palette cycling.
 */
export function generateUnityUrpShader(
  tracks: PaletteCycleTrack[],
  paletteLength: number = 256
): string {
  const activeTracks = tracks.filter((t) => t.enabled && t.rate > 0 && t.high > t.low);

  let trackLogic = '';
  activeTracks.forEach((track, idx) => {
    const S = track.high - track.low + 1;
    const isPingPong = track.direction === 'ping-pong';
    const M = isPingPong ? 2 * (S - 1) : S;
    const speed = track.rate.toFixed(3);
    const low = track.low;
    const high = track.high;

    if (isPingPong) {
      trackLogic += `
                // Track ${idx}: Ping-Pong [${low}..${high}]
                if (color_idx >= ${low} && color_idx <= ${high}) {
                    float rel_idx = float(color_idx - ${low});
                    float p = fmod(_Time.y * ${speed} + rel_idx, ${M.toFixed(1)});
                    if (p < 0.0) p += ${M.toFixed(1)};
                    float offset = (p < ${S.toFixed(1)}) ? p : (${M.toFixed(1)} - p);
                    final_idx = float(${low}) + offset;
                }`;
    } else {
      const dirSign = track.direction === 'reverse' ? '1.0' : '-1.0';
      trackLogic += `
                // Track ${idx}: ${track.direction === 'reverse' ? 'Reverse' : 'Forward'} [${low}..${high}]
                if (color_idx >= ${low} && color_idx <= ${high}) {
                    float rel_idx = float(color_idx - ${low});
                    float shift = fmod(rel_idx + (${dirSign} * _Time.y * ${speed}), ${S.toFixed(1)});
                    if (shift < 0.0) shift += ${S.toFixed(1)};
                    final_idx = float(${low}) + shift;
                }`;
    }
  });

  return `// RED = index / max(1, palette_size - 1), ALPHA = source alpha.
Shader "PixiBun/PaletteCycling2D"
{
    Properties
    {
        _MainTex ("Indexed Sprite Texture", 2D) = "white" {}
        _PaletteTex ("Palette LUT Texture", 2D) = "white" {}
        _PaletteSize ("Palette Size", Float) = ${paletteLength.toFixed(1)}
    }
    SubShader
    {
        Tags { "RenderType"="Transparent" "Queue"="Transparent" "RenderPipeline"="UniversalPipeline" }
        Blend SrcAlpha OneMinusSrcAlpha
        Cull Off
        ZWrite Off

        Pass
        {
            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"

            struct Attributes
            {
                float4 positionOS   : POSITION;
                float2 uv           : TEXCOORD0;
                float4 color        : COLOR;
            };

            struct Varyings
            {
                float4 positionHCS  : SV_POSITION;
                float2 uv           : TEXCOORD0;
                float4 color        : COLOR;
            };

            TEXTURE2D(_MainTex);
            SAMPLER(sampler_MainTex);

            TEXTURE2D(_PaletteTex);
            SAMPLER(sampler_PaletteTex);

            CBUFFER_START(UnityPerMaterial)
                float _PaletteSize;
            CBUFFER_END

            Varyings vert(Attributes input)
            {
                Varyings output;
                output.positionHCS = TransformObjectToHClip(input.positionOS.xyz);
                output.uv = input.uv;
                output.color = input.color;
                return output;
            }

            half4 frag(Varyings input) : SV_Target
            {
                half4 sprite = SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, input.uv);
                if (sprite.a == 0.0) return half4(0, 0, 0, 0);

                int color_idx = (int)round(sprite.r * (_PaletteSize - 1.0));
                float final_idx = (float)color_idx;
${trackLogic || '                // No active tracks'}

                float u = (final_idx + 0.5) / _PaletteSize;
                half4 pal = SAMPLE_TEXTURE2D(_PaletteTex, sampler_PaletteTex, float2(u, 0.5));
                return half4(pal.rgb, sprite.a * input.color.a);
            }
            ENDHLSL
        }
    }
}
`;
}

export interface PaletteIndexMap { indices: Uint8Array; alpha: Uint8Array }

/** RGB nearest match; equal-distance/duplicate colors choose the first register.
 * Alpha is independent of index, preserving all 256 registers and partial opacity. */
export function buildCanvasPaletteIndexMap(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  paletteHex: string[]
): PaletteIndexMap {
  if (paletteHex.length < 1 || paletteHex.length > 256) {
    throw new RangeError('Palette cycling requires between 1 and 256 colors.');
  }
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  const numPixels = width * height;
  const indexMap = new Uint8Array(numPixels);
  const alpha = new Uint8Array(numPixels);

  // Pre-parse palette RGBs
  const paletteRgbs = paletteHex.map((hex) => hexToRgb(hex));

  for (let i = 0; i < numPixels; i++) {
    const pIdx = i * 4;
    const a = data[pIdx + 3];
    alpha[i] = a;
    if (a === 0) continue;

    const r = data[pIdx];
    const g = data[pIdx + 1];
    const b = data[pIdx + 2];

    // Nearest color search in palette
    let bestDist = Infinity;
    let bestIdx = 0;

    for (let k = 0; k < paletteRgbs.length; k++) {
      const pr = paletteRgbs[k][0];
      const pg = paletteRgbs[k][1];
      const pb = paletteRgbs[k][2];
      const dist = (r - pr) * (r - pr) + (g - pg) * (g - pg) + (b - pb) * (b - pb);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = k;
        if (dist === 0) break;
      }
    }

    indexMap[i] = bestIdx;
  }

  return { indices: indexMap, alpha };
}


/**
 * Unrolls a cycling animation into a sequence of HTMLCanvasElement frames,
 * directly consumable by APNG, GIF, and video encoders.
 */
export function generateLoopAnimationCanvases(
  sourceCanvas: HTMLCanvasElement,
  basePaletteHex: string[],
  tracks: PaletteCycleTrack[],
  targetDurationSec: number = 2.0,
  fps: number = 30
): HTMLCanvasElement[] {
  const width = sourceCanvas.width;
  const height = sourceCanvas.height;
  const ctx = sourceCanvas.getContext('2d');
  if (!ctx) return [];

  const indexMap = buildCanvasPaletteIndexMap(ctx, width, height, basePaletteHex);
  const retunedTracks = retuneTracksForSeamlessLoop(tracks, targetDurationSec);
  const cyclingRegisters = buildCycleRegisterMask(retunedTracks, basePaletteHex.length);
  const sourceData = ctx.getImageData(0, 0, width, height);
  const source32 = new Uint32Array(sourceData.data.buffer);

  const totalFrames = Math.max(1, Math.round(targetDurationSec * fps));
  const canvases: HTMLCanvasElement[] = [];
  const lut32 = new Uint32Array(basePaletteHex.length);

  try {
    for (let f = 0; f < totalFrames; f++) {
      const elapsedSec = f / fps;
      updateLivePaletteLUT32(basePaletteHex, retunedTracks, elapsedSec, lut32);

      const frameCanvas = document.createElement('canvas');
      frameCanvas.width = width;
      frameCanvas.height = height;
      canvases.push(frameCanvas);
      const fCtx = frameCanvas.getContext('2d');
      if (!fCtx) throw new Error(`Palette cycle frame ${f + 1} could not be rendered.`);

      const frameData = fCtx.createImageData(width, height);
      const data32 = new Uint32Array(frameData.data.buffer);

      for (let i = 0; i < width * height; i++) {
        const palIdx = indexMap.indices[i];
        if (indexMap.alpha[i] === 0 || !cyclingRegisters[palIdx]) {
          data32[i] = source32[i];
        } else {
          data32[i] = ((lut32[palIdx] ?? 0) & 0x00ffffff) | (indexMap.alpha[i] << 24);
        }
      }

      fCtx.putImageData(frameData, 0, 0);
    }

    return canvases;
  } catch (error) {
    for (const canvas of canvases) { canvas.width = 0; canvas.height = 0; }
    throw error;
  }
}
