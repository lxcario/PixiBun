export type ToolType = 
  | 'pen' 
  | 'curve'
  | 'eraser' 
  | 'bucket'
  | 'gradient'
  | 'dither' 
  | 'eyedropper' 
  | 'select-box' 
  | 'select-lasso' 
  | 'select-wand'
  | 'line' 
  | 'isometric-line'
  | 'rectangle' 
  | 'ellipse' 
  | 'color-replace'
  | 'erase-color'
  | 'normal-chisel';

export type DitherMatrixType = '2x2' | '4x4' | '8x8' | 'atkinson' | 'riemersma' | 'blue-noise';

export type GlintStyle = 'off' | 'soft' | 'crisp';

export type MaterialType = 'matte' | 'metal' | 'glass' | 'fabric' | 'gold';

export interface MaterialProperties {
  kd: number; // Diffuse coefficient
  ks: number; // Specular coefficient
  shininess: number; // Blinn-Phong exponent alpha
  isMetallic: boolean; // Metallic vs dielectric
  isDielectric: boolean; // Pure light color vs albedo specular
  hasRim: boolean;
}

export interface CharacterRampBounds {
  minL: number;
  maxL: number;
  referenceL: number;
  referenceA: number;
  referenceB: number;
}

export interface PhotometricAnalysisGeometry {
  formType: 'character' | 'orb' | 'prop';
  normalField: {
    nx: Float32Array;
    ny: Float32Array;
    nz: Float32Array;
    width: number;
    height: number;
  };
  glintNormalField?: PhotometricAnalysisGeometry['normalField'];
  baseNormalField?: {
    nx: Float32Array;
    ny: Float32Array;
    nz: Float32Array;
    width: number;
    height: number;
  };
  appendageData?: {
    charCenterX: number;
    pixels: { idx: number; segLeft: number; segRight: number }[];
  } | null;
  cavityAO: Float32Array;
  isFeatureMask?: Uint8Array | null;
  isInkLineMask?: Uint8Array | null;
  sourceLightAzimuth?: number;
  sourceLightElevation?: number;
  directionalShadingCue?: number;
  artworkRampBounds?: Map<number, CharacterRampBounds>;
}

export interface PhotometricLightingParams {
  glintStyle?: GlintStyle;
  lightAzimuth: number; // 0° to 360°
  lightElevation: number; // 0° to 90°
  lightRadius: number; // Distance attenuation radius (e.g. 16 to 128px)
  lightColor: string; // Hex color for light source
  ambientIntensity: number; // 0.0 to 1.0
  lightBrightness?: number; // 0.5 to 2.0 (overall exposure/brightness multiplier)
  sourceShadingRemoval?: number; // 0.0 to 1.0 (baked shading removal)
  material: MaterialType;
  cavityStrength: number; // 0.0 to 2.0 (Laplace AO)
  ditherModulation: number; // 0.0 to 1.0 (Bayer threshold offset strength)
  bayerSize: '2x2' | '4x4' | '8x8';
  formType?: 'character' | 'orb' | 'prop' | 'auto';
  minecraftSkinMode?: 'auto' | 'enabled' | 'disabled';
  celShading?: boolean;
  shadingBands?: ShadingBandMode; // 1 = Single (1 shadow), 2 = Dual (2 shadows), 3 = Trio (3 shadows)
  lightCenterX?: number; // Center anchor X in canvas coordinates (middle light point)
  lightCenterY?: number; // Center anchor Y in canvas coordinates (middle light point)
  normalMapData?: ImageData | Uint8ClampedArray; // Optional manual normal sculpt layer data
  precomputedAnalysis?: PhotometricAnalysisGeometry; // Precomputed geometry & normals for 60fps live dragging
}

export type ShadingBandMode = 1 | 2 | 3;

export interface ToolSettings {
  glintStyle?: GlintStyle;
  activeTool: ToolType;
  brushSize: number; // 1 to 32
  pixelPerfect: boolean;
  ditherMatrix: DitherMatrixType;
  ditherDensity: number; // 0.1 to 0.9
  bucketContiguous: boolean;
  bucketTolerance: number; // 0 to 255
  fillTolerance: number; // RGB/alpha distance for the bucket, 0 to 255
  fillEnclosedSpecks: boolean; // Include small, fully enclosed color islands
  eraseColorTolerance: number; // RGB distance, 0 to 255
  eraseColorContiguous: boolean;
  eraseColorFamily: boolean;
  eraseColorAllFrames: boolean;
  shapeFilled: boolean;
  symmetryHorizontal: boolean;
  symmetryVertical: boolean;
  symmetryGroup?: WallpaperGroup;
  lightAzimuth: number; // 0 to 360 deg
  lightElevation: number; // 0 to 90 deg
  lightRadius: number; // Distance attenuation radius (16 to 256)
  lightBrightness: number; // 0.5 to 2.0 (exposure / brightness)
  sourceShadingRemoval: number; // 0 to 1
  materialPreset: MaterialType;
  formType?: 'character' | 'orb' | 'prop' | 'auto';
  minecraftSkinMode?: 'auto' | 'enabled' | 'disabled';
  shadingBands: ShadingBandMode; // 1 = Single, 2 = Dual, 3 = Trio
  cavityStrength: number; // 0 to 1
  ditherModulation: number; // 0 to 1
  curveTightness: number; // 0 to 1
  isoAngleSnap: boolean;
  chiselAzimuth: number; // 0 to 360 deg
  chiselIncline: number; // 15 to 75 deg
  chiselWidth: number; // 1 to 32px
  chiselRidgeMode: boolean;
  normalBlendMode: 'rnm' | 'udn' | 'overwrite';
  rotationAlgorithm: RotationAlgorithm;
}

export type RotationAlgorithm = 'rotsprite' | 'paeth';

export type WallpaperGroup = 'none' | 'pm' | 'p2' | 'p4' | 'p4m' | 'p6m';

export type CelToneCount = 2 | 3 | 4 | 'smooth';

