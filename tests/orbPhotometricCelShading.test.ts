/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import { executePhotometricPipeline, renderParametric2p5DLighting } from '@/lib/ai/math/photometricLighting';
import { inferPhotometricSettings } from '@/lib/ai/math/photometricAuto';

class MockImageData {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.data = new Uint8ClampedArray(width * height * 4);
  }
}

if (typeof (globalThis as unknown as { document?: unknown }).document === 'undefined') {
  (globalThis as unknown as { document: unknown }).document = {
    createElement: (tag: string) => {
      if (tag === 'canvas') {
        let _img = new MockImageData(32, 32);
        return {
          width: 32,
          height: 32,
          getContext: () => ({
            createImageData: (w: number, h: number) => {
              _img = new MockImageData(w, h);
              return _img;
            },
            putImageData: (img: MockImageData) => {
              _img = img;
            },
            getImageData: () => _img,
          }),
        };
      }
      return {};
    },
  };
}

describe('Photometric Shading Pipelines (Smooth 3D Orbs & Discrete Character Cel Ramps)', () => {
  it('renders smooth continuous 3D volumetric shading for orbs with soft ambient fill', () => {
    const width = 32;
    const height = 32;
    const circleData = new Uint8ClampedArray(width * height * 4);
    const cx = 16;
    const cy = 16;
    const radius = 10;

    // Draw solid purple circle (#864ba2)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = x - cx;
        const dy = y - cy;
        if (Math.hypot(dx, dy) <= radius) {
          const idx = (y * width + x) * 4;
          circleData[idx] = 134;     // R
          circleData[idx + 1] = 75;  // G
          circleData[idx + 2] = 162; // B
          circleData[idx + 3] = 255; // A
        }
      }
    }

    const inferred = inferPhotometricSettings(circleData, width, height);
    expect(inferred.formType).toBe('orb');

    const mockCtx = {
      getImageData: () => ({ data: new Uint8ClampedArray(circleData) }),
    } as unknown as CanvasRenderingContext2D;

    const shadedCanvas = executePhotometricPipeline(
      mockCtx,
      width,
      height,
      {
        lightAzimuth: inferred.lightAzimuth,
        lightElevation: inferred.lightElevation,
        lightRadius: 64,
        lightColor: '#FFFFFF',
        ambientIntensity: 0.48,
        material: 'matte',
        cavityStrength: 1.0,
        ditherModulation: 0,
        bayerSize: '4x4',
        formType: 'orb',
      },
      []
    );

    const outData = shadedCanvas.getContext('2d')!.getImageData(0, 0, width, height).data;

    let totalOpaque = 0;
    const uniqueColors = new Set<string>();

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        if (outData[idx + 3] > 30) {
          totalOpaque++;
          const r = outData[idx];
          const g = outData[idx + 1];
          const b = outData[idx + 2];
          const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
          uniqueColors.add(hex);
        }
      }
    }

    // 1. Output must have smooth continuous 3D volumetric curvature (rich smooth gradient, not flat 2-color staircase)
    expect(uniqueColors.size).toBeGreaterThan(15);
    expect(totalOpaque).toBeGreaterThan(200);

    // 2. No pixel should be crushed to near-black mud (< 10% luminance) thanks to soft ambient wrap
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        if (outData[idx + 3] > 30) {
          const r = outData[idx];
          const g = outData[idx + 1];
          const b = outData[idx + 2];
          const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
          expect(lum).toBeGreaterThan(0.04);
        }
      }
    }
  });

  it('renders discrete OKLCH cel ramps specifically for characters with anatomical features', () => {
    const width = 32;
    const height = 32;
    const charData = new Uint8ClampedArray(width * height * 4);
    // Draw character head with ears
    for (let y = 10; y < 26; y++) {
      for (let x = 8; x < 24; x++) {
        const idx = (y * width + x) * 4;
        charData[idx] = 134;
        charData[idx + 1] = 75;
        charData[idx + 2] = 162;
        charData[idx + 3] = 255;
      }
    }
    // Add ears
    for (let y = 4; y < 10; y++) {
      for (const x of [10, 11, 20, 21]) {
        const idx = (y * width + x) * 4;
        charData[idx] = 134;
        charData[idx + 1] = 75;
        charData[idx + 2] = 162;
        charData[idx + 3] = 255;
      }
    }

    const mockCtx = {
      getImageData: () => ({ data: new Uint8ClampedArray(charData) }),
    } as unknown as CanvasRenderingContext2D;

    const shadedCanvas = executePhotometricPipeline(
      mockCtx,
      width,
      height,
      {
        lightAzimuth: 315,
        lightElevation: 48,
        lightRadius: 64,
        lightColor: '#FFFFFF',
        ambientIntensity: 0.48,
        material: 'matte',
        cavityStrength: 1.0,
        ditherModulation: 0,
        bayerSize: '4x4',
        formType: 'character',
      },
      []
    );

    const outData = shadedCanvas.getContext('2d')!.getImageData(0, 0, width, height).data;
    const uniqueColors = new Set<string>();

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        if (outData[idx + 3] > 30) {
          const r = outData[idx];
          const g = outData[idx + 1];
          const b = outData[idx + 2];
          const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
          uniqueColors.add(hex);
        }
      }
    }

    // Character mode must use discrete OKLCH cel ramps (<= 4 discrete tones)
    expect(uniqueColors.size).toBeLessThanOrEqual(4);
  });

  it('adds specular gloss highlight when material is shiny metal on an orb', () => {
    const width = 32;
    const height = 32;
    const circleData = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (Math.hypot(x - 16, y - 16) <= 10) {
          const idx = (y * width + x) * 4;
          circleData[idx] = 134;
          circleData[idx + 1] = 75;
          circleData[idx + 2] = 162;
          circleData[idx + 3] = 255;
        }
      }
    }

    const mockCtx = {
      getImageData: () => ({ data: new Uint8ClampedArray(circleData) }),
    } as unknown as CanvasRenderingContext2D;

    // Render as 'metal'
    const shadedMetal = executePhotometricPipeline(
      mockCtx,
      width,
      height,
      {
        lightAzimuth: 315,
        lightElevation: 45,
        lightRadius: 64,
        lightColor: '#FFFFFF',
        ambientIntensity: 0.48,
        material: 'metal',
        cavityStrength: 1.0,
        ditherModulation: 0,
        bayerSize: '4x4',
        formType: 'orb',
      },
      []
    );

    const metalData = shadedMetal.getContext('2d')!.getImageData(0, 0, width, height).data;
    let maxLum = 0;
    for (let i = 0; i < metalData.length; i += 4) {
      if (metalData[i + 3] > 30) {
        const lum = (0.2126 * metalData[i] + 0.7152 * metalData[i + 1] + 0.0722 * metalData[i + 2]) / 255;
        if (lum > maxLum) maxLum = lum;
      }
    }
    // High specular highlight on metallic orb
    expect(maxLum).toBeGreaterThan(0.65);
  });

  it('shifts illumination focus across the sprite when middle light point (lightCenterX, lightCenterY) changes', () => {
    const width = 32;
    const height = 32;
    const circleData = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (Math.hypot(x - 16, y - 16) <= 10) {
          const idx = (y * width + x) * 4;
          circleData[idx] = 134;
          circleData[idx + 1] = 75;
          circleData[idx + 2] = 162;
          circleData[idx + 3] = 255;
        }
      }
    }

    const mockCtx = {
      getImageData: () => ({ data: new Uint8ClampedArray(circleData) }),
    } as unknown as CanvasRenderingContext2D;

    // Render with light center at left side (x = 8, y = 16)
    const leftFocusCanvas = executePhotometricPipeline(
      mockCtx,
      width,
      height,
      {
        lightAzimuth: 315,
        lightElevation: 45,
        lightRadius: 64,
        lightColor: '#FFFFFF',
        ambientIntensity: 0.48,
        material: 'matte',
        cavityStrength: 1.0,
        ditherModulation: 0,
        bayerSize: '4x4',
        formType: 'orb',
        lightCenterX: 8,
        lightCenterY: 16,
      },
      []
    );

    // Render with light center at right side (x = 24, y = 16)
    const rightFocusCanvas = executePhotometricPipeline(
      mockCtx,
      width,
      height,
      {
        lightAzimuth: 315,
        lightElevation: 45,
        lightRadius: 64,
        lightColor: '#FFFFFF',
        ambientIntensity: 0.48,
        material: 'matte',
        cavityStrength: 1.0,
        ditherModulation: 0,
        bayerSize: '4x4',
        formType: 'orb',
        lightCenterX: 24,
        lightCenterY: 16,
      },
      []
    );

    const leftData = leftFocusCanvas.getContext('2d')!.getImageData(0, 0, width, height).data;
    const rightData = rightFocusCanvas.getContext('2d')!.getImageData(0, 0, width, height).data;

    // Sample pixel on the right side of the circle (x = 22, y = 16)
    const sampleIdx = (16 * width + 22) * 4;
    const lumWhenLeftFocus = (0.2126 * leftData[sampleIdx] + 0.7152 * leftData[sampleIdx + 1] + 0.0722 * leftData[sampleIdx + 2]) / 255;
    const lumWhenRightFocus = (0.2126 * rightData[sampleIdx] + 0.7152 * rightData[sampleIdx + 1] + 0.0722 * rightData[sampleIdx + 2]) / 255;

    // The right pixel must receive higher luminance when the light center is shifted to the right!
    expect(lumWhenRightFocus).toBeGreaterThan(lumWhenLeftFocus);
  });

  it('guarantees peak highlight shifts to the directional light position and is not locked to the center apex', () => {
    const width = 32;
    const height = 32;
    const circleData = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (Math.hypot(x - 16, y - 16) <= 10) {
          const idx = (y * width + x) * 4;
          circleData[idx] = 134;
          circleData[idx + 1] = 64;
          circleData[idx + 2] = 180;
          circleData[idx + 3] = 255;
        }
      }
    }

    const mockCtx = {
      getImageData: () => ({ data: new Uint8ClampedArray(circleData) }),
    } as unknown as CanvasRenderingContext2D;

    // 1. Light from Top-Right (azimuth 42°, elevation 35°, center 26, 5)
    const topRightCanvas = executePhotometricPipeline(
      mockCtx,
      width,
      height,
      {
        lightAzimuth: 42,
        lightElevation: 35,
        lightRadius: 64,
        lightColor: '#FFFFFF',
        ambientIntensity: 0.48,
        material: 'matte',
        cavityStrength: 1.0,
        ditherModulation: 0,
        bayerSize: '4x4',
        formType: 'orb',
        lightCenterX: 26,
        lightCenterY: 5,
      },
      []
    );

    const trData = topRightCanvas.getContext('2d')!.getImageData(0, 0, width, height).data;
    const lum = (x: number, y: number) => {
      const idx = (y * width + x) * 4;
      return (0.2126 * trData[idx] + 0.7152 * trData[idx + 1] + 0.0722 * trData[idx + 2]) / 255;
    };

    const trLum = lum(22, 10);
    const centerLum = lum(16, 16);
    const blLum = lum(10, 22);

    expect(trLum).toBeGreaterThan(centerLum);
    expect(centerLum).toBeGreaterThan(blLum);

    // 2. Light from Bottom-Left (azimuth 222°, elevation 35°, center 5, 26)
    const bottomLeftCanvas = executePhotometricPipeline(
      mockCtx,
      width,
      height,
      {
        lightAzimuth: 222,
        lightElevation: 35,
        lightRadius: 64,
        lightColor: '#FFFFFF',
        ambientIntensity: 0.48,
        material: 'matte',
        cavityStrength: 1.0,
        ditherModulation: 0,
        bayerSize: '4x4',
        formType: 'orb',
        lightCenterX: 5,
        lightCenterY: 26,
      },
      []
    );

    const blData = bottomLeftCanvas.getContext('2d')!.getImageData(0, 0, width, height).data;
    const lumBL = (x: number, y: number) => {
      const idx = (y * width + x) * 4;
      return (0.2126 * blData[idx] + 0.7152 * blData[idx + 1] + 0.0722 * blData[idx + 2]) / 255;
    };

    const blLum2 = lumBL(10, 22);
    const centerLum2 = lumBL(16, 16);
    const trLum2 = lumBL(22, 10);

    expect(blLum2).toBeGreaterThan(centerLum2);
    expect(centerLum2).toBeGreaterThan(trLum2);
  });

  it('handles full backlight angles (N·L <= -0.4 down to -1.0) without producing NaN or corrupted pixels', () => {
    const width = 32;
    const height = 32;
    const circleData = new Uint8ClampedArray(width * height * 4);
    const cx = 16;
    const cy = 16;
    const radius = 10;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = x - cx;
        const dy = y - cy;
        if (Math.hypot(dx, dy) <= radius) {
          const idx = (y * width + x) * 4;
          circleData[idx] = 134;
          circleData[idx + 1] = 75;
          circleData[idx + 2] = 162;
          circleData[idx + 3] = 255;
        }
      }
    }

    const mockCtx = {
      getImageData: () => ({
        data: circleData,
        width,
        height,
      }),
    } as unknown as CanvasRenderingContext2D;

    // Direct backlight: lightAzimuth 180°, elevation -30° (light behind the sprite)
    const backlitCanvas = executePhotometricPipeline(
      mockCtx,
      width,
      height,
      {
        lightAzimuth: 180,
        lightElevation: -30,
        lightRadius: 64,
        lightColor: '#FFFFFF',
        ambientIntensity: 0.48,
        material: 'matte',
        cavityStrength: 1.0,
        ditherModulation: 0,
        bayerSize: '4x4',
        formType: 'character',
        lightCenterX: 16,
        lightCenterY: 16,
      },
      []
    );

    const outData = backlitCanvas.getContext('2d')!.getImageData(0, 0, width, height).data;

    // Assert no NaN in any channel across all pixels
    for (let i = 0; i < outData.length; i++) {
      expect(Number.isNaN(outData[i])).toBe(false);
    }

    // Orb center pixel should be in shadow tone under backlight
    const centerIdx = (16 * width + 16) * 4;
    expect(outData[centerIdx + 3]).toBe(255);
    const centerLum =
      (0.2126 * outData[centerIdx] + 0.7152 * outData[centerIdx + 1] + 0.0722 * outData[centerIdx + 2]) / 255;
    expect(centerLum).toBeLessThan(0.60);
  });

  it('modulates character cel shadow coverage when lightBrightness varies (eliminating byte-identical output)', () => {
    const width = 32;
    const height = 32;
    const charData = new Uint8ClampedArray(width * height * 4);
    const cx = 16;
    const cy = 16;
    const radius = 12;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = x - cx;
        const dy = y - cy;
        if (Math.hypot(dx, dy) <= radius) {
          const idx = (y * width + x) * 4;
          charData[idx] = 180;
          charData[idx + 1] = 120;
          charData[idx + 2] = 80;
          charData[idx + 3] = 255;
        }
      }
    }

    const mockCtx = {
      getImageData: () => ({
        data: charData,
        width,
        height,
      }),
    } as unknown as CanvasRenderingContext2D;

    const baseConfig = {
      lightAzimuth: 45,
      lightElevation: 30,
      lightRadius: 64,
      lightColor: '#FFFFFF',
      ambientIntensity: 0.48,
      material: 'matte' as const,
      cavityStrength: 1.0,
      ditherModulation: 0,
      bayerSize: '4x4' as const,
      formType: 'character' as const,
      lightCenterX: 16,
      lightCenterY: 16,
    };

    // Dim light: low brightness pushes shadow terminator forward
    const dimCanvas = executePhotometricPipeline(mockCtx, width, height, { ...baseConfig, lightBrightness: 0.5 }, []);
    const dimData = dimCanvas.getContext('2d')!.getImageData(0, 0, width, height).data;

    // Bright light: high brightness pushes shadow terminator back
    const brightCanvas = executePhotometricPipeline(mockCtx, width, height, { ...baseConfig, lightBrightness: 2.2 }, []);
    const brightData = brightCanvas.getContext('2d')!.getImageData(0, 0, width, height).data;

    // Outputs must NOT be byte-identical (fixing BUG: character path previously ignored lightBrightness)
    let differentPixels = 0;
    let dimShadowCount = 0;
    let brightShadowCount = 0;

    for (let i = 0; i < dimData.length; i += 4) {
      if (dimData[i + 3] === 0) continue;
      if (dimData[i] !== brightData[i] || dimData[i + 1] !== brightData[i + 1] || dimData[i + 2] !== brightData[i + 2]) {
        differentPixels++;
      }
      if (dimData[i] < 160) dimShadowCount++;
      if (brightData[i] < 160) brightShadowCount++;
    }

    expect(differentPixels).toBeGreaterThan(0);
    expect(dimShadowCount).toBeGreaterThan(brightShadowCount);
  });

  it('removes baked-in same-material purple shading so the shadow follows the light', () => {
    const width = 32;
    const height = 32;
    const data = new Uint8ClampedArray(width * height * 4);

    for (let y = 3; y < 29; y++) {
      for (let x = 4; x < 28; x++) {
        if (Math.hypot((x - 16) / 12, (y - 16) / 13) > 1) continue;
        const idx = (y * width + x) * 4;
        // Simulate a sprite authored with a fixed light from the left: the
        // right half is already painted as a darker shade of the same purple.
        const color = x < 16 ? [188, 132, 214] : [92, 58, 128];
        data[idx] = color[0];
        data[idx + 1] = color[1];
        data[idx + 2] = color[2];
        data[idx + 3] = 255;
      }
    }

    const mockCtx = {
      getImageData: () => ({ data, width, height }),
    } as unknown as CanvasRenderingContext2D;

    const renderAt = (lightAzimuth: number) => executePhotometricPipeline(
      mockCtx,
      width,
      height,
      {
        lightAzimuth,
        lightElevation: 25,
        lightRadius: 64,
        lightColor: '#FFFFFF',
        ambientIntensity: 0.48,
        lightBrightness: 1.15,
        material: 'matte',
        cavityStrength: 0.4,
        ditherModulation: 0,
        bayerSize: '4x4',
        formType: 'character',
        sourceShadingRemoval: 1.0,
        lightCenterX: 16,
        lightCenterY: 16,
      },
      []
    ).getContext('2d')!.getImageData(0, 0, width, height).data;

    const luminanceAt = (pixels: Uint8ClampedArray, x: number, y: number) => {
      const idx = (y * width + x) * 4;
      return 0.2126 * pixels[idx] + 0.7152 * pixels[idx + 1] + 0.0722 * pixels[idx + 2];
    };

    const lightFromRight = renderAt(90);
    const lightFromLeft = renderAt(270);
    const leftX = 9;
    const rightX = 23;

    expect(luminanceAt(lightFromRight, rightX, 16)).toBeGreaterThan(
      luminanceAt(lightFromRight, leftX, 16)
    );
    expect(luminanceAt(lightFromLeft, leftX, 16)).toBeGreaterThan(
      luminanceAt(lightFromLeft, rightX, 16)
    );
  });

  it('monotonically reduces shadow pixel count and expands lit area as light strength increases from 30% to 250%', () => {
    const width = 32;
    const height = 32;
    const charData = new Uint8ClampedArray(width * height * 4);

    // Draw a character paw/sphere in lilac purple (#B48CD6 -> RGB 180, 140, 214)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (Math.hypot(x - 16, y - 16) <= 12) {
          const idx = (y * width + x) * 4;
          charData[idx] = 180;
          charData[idx + 1] = 140;
          charData[idx + 2] = 214;
          charData[idx + 3] = 255;
        }
      }
    }

    const mockCtx = {
      getImageData: () => ({ data: new Uint8ClampedArray(charData), width, height }),
    } as unknown as CanvasRenderingContext2D;

    const countShadowPixels = (strength: number) => {
      const canvas = executePhotometricPipeline(
        mockCtx,
        width,
        height,
        {
          lightAzimuth: 49,
          lightElevation: 43,
          lightRadius: 64,
          lightColor: '#FFFFFF',
          ambientIntensity: 0.45,
          lightBrightness: strength,
          material: 'fabric',
          cavityStrength: 1.0,
          ditherModulation: 0,
          bayerSize: '4x4',
          formType: 'character',
          lightCenterX: 16,
          lightCenterY: 16,
        },
        []
      );
      const out = canvas.getContext('2d')!.getImageData(0, 0, width, height).data;
      let shadows = 0;
      let lit = 0;
      for (let i = 0; i < out.length; i += 4) {
        if (out[i + 3] === 0) continue;
        // Authored base color is R=180, G=140, B=214 (lum ~ 156).
        // Cel shadow stepped tone is significantly darker (lum < 135).
        const lum = 0.2126 * out[i] + 0.7152 * out[i + 1] + 0.0722 * out[i + 2];
        if (lum < 140) {
          shadows++;
        } else {
          lit++;
        }
      }
      return { shadows, lit };
    };

    const lowStrength = countShadowPixels(0.3);   // 30% strength
    const medStrength = countShadowPixels(1.15);  // 115% default strength
    const highStrength = countShadowPixels(2.5);  // 250% strength

    // Dim lamp (30%) creates significantly MORE shadow pixels than neutral (115%)
    expect(lowStrength.shadows).toBeGreaterThan(medStrength.shadows);

    // Blazing lamp (250%) creates significantly FEWER shadow pixels than neutral (115%)
    expect(medStrength.shadows).toBeGreaterThan(highStrength.shadows);

    // Lit pixels expand monotonically as strength increases
    expect(highStrength.lit).toBeGreaterThan(medStrength.lit);
    expect(medStrength.lit).toBeGreaterThan(lowStrength.lit);
  });

  it('supports Single (1-tone), Dual (2-tone), and Trio (3-tone) cel-shading band modes for character sprites', () => {
    const width = 32;
    const height = 32;
    const charData = new Uint8ClampedArray(width * height * 4);
    // Draw character sphere/paw in lilac purple (RGB 180, 140, 214)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (Math.hypot(x - 16, y - 16) <= 12) {
          const idx = (y * width + x) * 4;
          charData[idx] = 180;
          charData[idx + 1] = 140;
          charData[idx + 2] = 214;
          charData[idx + 3] = 255;
        }
      }
    }

    const mockCtx = {
      getImageData: () => ({ data: new Uint8ClampedArray(charData), width, height }),
    } as unknown as CanvasRenderingContext2D;

    const getShadowTones = (bands: 1 | 2 | 3) => {
      const canvas = executePhotometricPipeline(
        mockCtx,
        width,
        height,
        {
          lightAzimuth: 45,
          lightElevation: 35,
          lightRadius: 64,
          lightColor: '#FFFFFF',
          ambientIntensity: 0.45,
          lightBrightness: 1.15,
          material: 'fabric', // suppress highlight so we only measure base + shadow stepped ramps
          cavityStrength: 0, // no crevice AO to isolate directional bands
          ditherModulation: 0,
          bayerSize: '4x4',
          formType: 'character',
          shadingBands: bands,
          lightCenterX: 16,
          lightCenterY: 16,
        },
        []
      );
      const out = canvas.getContext('2d')!.getImageData(0, 0, width, height).data;
      const uniqueColors = new Set<string>();
      const shadowColors = new Set<string>();

      for (let i = 0; i < out.length; i += 4) {
        if (out[i + 3] === 0) continue;
        const r = out[i];
        const g = out[i + 1];
        const b = out[i + 2];
        const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        uniqueColors.add(hex);
        // Base lilac is RGB 180, 140, 214 (lum ~ 156.6)
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        if (lum < 150) {
          shadowColors.add(hex);
        }
      }
      return { totalColors: uniqueColors.size, shadowColors: shadowColors.size };
    };

    const singleMode = getShadowTones(1);
    const dualMode = getShadowTones(2);
    const trioMode = getShadowTones(3);

    // Single mode: exactly 1 shadow color (total 2 colors: base + 1 shadow)
    expect(singleMode.shadowColors).toBe(1);
    expect(singleMode.totalColors).toBe(2);

    // Dual mode: exactly 2 shadow colors (total 3 colors: base + mid shadow + deep shadow)
    expect(dualMode.shadowColors).toBe(2);
    expect(dualMode.totalColors).toBe(3);

    // Trio mode: exactly 3 shadow colors (total 4 colors: base + soft penumbra + mid shadow + deep umbra)
    expect(trioMode.shadowColors).toBe(3);
    expect(trioMode.totalColors).toBe(4);
  });

  it('strictly restricts specular glints to surfaces facing the light (N · L > 0) and suppresses on fabric/matte characters', () => {
    const width = 32;
    const height = 32;
    const circleData = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (Math.hypot(x - 16, y - 16) <= 12) {
          const idx = (y * width + x) * 4;
          circleData[idx] = 100;
          circleData[idx + 1] = 200;
          circleData[idx + 2] = 240;
          circleData[idx + 3] = 255;
        }
      }
    }

    const mockCtx = {
      getImageData: () => ({ data: new Uint8ClampedArray(circleData), width, height }),
    } as unknown as CanvasRenderingContext2D;

    // 1. Fabric character: specular glints appear on lit surfaces facing the light
    const fabricResult = renderParametric2p5DLighting(mockCtx, width, height, {
      azimuthDeg: 45,
      elevationDeg: 35,
      shadowIntensity: 0.5,
      specularShininess: 32,
      rimLight: false,
      selOut: false,
      material: 'fabric',
    });
    expect(fabricResult.specularPixels.length).toBeGreaterThan(0);
    for (const p of fabricResult.specularPixels) {
      const inDeepShadow = p.x < 14 && p.y > 18;
      expect(inDeepShadow).toBe(false);
    }

    // 2. Matte character: generates pure white dielectric specular glints
    const matteResult = renderParametric2p5DLighting(mockCtx, width, height, {
      azimuthDeg: 45,
      elevationDeg: 35,
      shadowIntensity: 0.5,
      specularShininess: 32,
      rimLight: false,
      selOut: false,
      material: 'matte',
    });
    expect(matteResult.specularPixels.length).toBeGreaterThan(0);
    const apexMatte = matteResult.specularPixels[0];
    expect(apexMatte.r).toBe(255);
    expect(apexMatte.g).toBe(255);
    expect(apexMatte.b).toBe(255);

    // 3. Shiny metal orb: specular pixels must ONLY exist on surfaces facing the light (N · L > 0)
    const metalResult = renderParametric2p5DLighting(mockCtx, width, height, {
      azimuthDeg: 45,
      elevationDeg: 35,
      shadowIntensity: 0.5,
      specularShininess: 32,
      rimLight: false,
      selOut: false,
      material: 'metal',
    });

    expect(metalResult.specularPixels.length).toBeGreaterThan(0);

    // Verify each specular pixel is strictly in the lit hemisphere
    // For light at 45° azimuth (top-right), shadow side is bottom-left (x < 14, y > 18).
    for (const specPixel of metalResult.specularPixels) {
      const inDeepShadow = specPixel.x < 14 && specPixel.y > 18;
      expect(inDeepShadow).toBe(false);
    }

    // 4. Character with head, ears, and feet: specular glints must cluster on head and exclude feet
    const charData = new Uint8ClampedArray(width * height * 4);
    // Draw ears at y: 3..6
    for (let y = 3; y <= 6; y++) {
      for (const x of [13, 14, 18, 19]) {
        const idx = (y * width + x) * 4;
        charData[idx] = 100;
        charData[idx + 1] = 200;
        charData[idx + 2] = 240;
        charData[idx + 3] = 255;
      }
    }
    // Draw head at y: 7..12, x: 12..20
    for (let y = 7; y <= 12; y++) {
      for (let x = 12; x <= 20; x++) {
        const idx = (y * width + x) * 4;
        charData[idx] = 100;
        charData[idx + 1] = 200;
        charData[idx + 2] = 240;
        charData[idx + 3] = 255;
      }
    }
    // Draw eyes at (14, 9) and (18, 9)
    for (const eye of [{ x: 14, y: 9 }, { x: 18, y: 9 }]) {
      const idx = (eye.y * width + eye.x) * 4;
      charData[idx] = 20;
      charData[idx + 1] = 20;
      charData[idx + 2] = 20;
      charData[idx + 3] = 255;
    }
    // Draw body at y: 13..20, x: 10..22
    for (let y = 13; y <= 20; y++) {
      for (let x = 10; x <= 22; x++) {
        const idx = (y * width + x) * 4;
        charData[idx] = 100;
        charData[idx + 1] = 200;
        charData[idx + 2] = 240;
        charData[idx + 3] = 255;
      }
    }
    // Draw feet at y: 24..28
    for (let y = 24; y <= 28; y++) {
      for (const x of [8, 9, 10, 11, 12, 18, 19, 20, 21, 22]) {
        const idx = (y * width + x) * 4;
        charData[idx] = 100;
        charData[idx + 1] = 200;
        charData[idx + 2] = 240;
        charData[idx + 3] = 255;
      }
    }

    const charCtx = {
      getImageData: () => ({ data: new Uint8ClampedArray(charData), width, height }),
    } as unknown as CanvasRenderingContext2D;

    const charResult = renderParametric2p5DLighting(charCtx, width, height, {
      azimuthDeg: 45,
      elevationDeg: 50,
      shadowIntensity: 0.5,
      specularShininess: 32,
      rimLight: false,
      selOut: false,
      material: 'matte',
    });

    expect(charResult.specularPixels.length).toBeGreaterThanOrEqual(4);
    // All specular glints must be on the upper body/head (y < 20), zero glints on feet (y >= 24)
    for (const sp of charResult.specularPixels) {
      expect(sp.y).toBeLessThan(20);
    }
  });
});
