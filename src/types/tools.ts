export type ToolType = 
  | 'pen' 
  | 'curve'
  | 'eraser' 
  | 'bucket' 
  | 'dither' 
  | 'eyedropper' 
  | 'select-box' 
  | 'select-lasso' 
  | 'select-wand'
  | 'line' 
  | 'isometric-line'
  | 'rectangle' 
  | 'ellipse' 
  | 'color-replace';

export type DitherMatrixType = '2x2' | '4x4' | '8x8' | 'atkinson' | 'riemersma';

export type MaterialType = 'matte' | 'metal' | 'glass' | 'fabric' | 'gold';

export interface MaterialProperties {
  kd: number; // Diffuse coefficient
  ks: number; // Specular coefficient
  shininess: number; // Blinn-Phong exponent alpha
  isMetallic: boolean; // Metallic vs dielectric
  isDielectric: boolean; // Pure light color vs albedo specular
  hasRim: boolean;
}

export interface PhotometricLightingParams {
  lightAzimuth: number; // 0° to 360°
  lightElevation: number; // 0° to 90°
  lightRadius: number; // Distance attenuation radius (e.g. 16 to 128px)
  lightColor: string; // Hex color for light source
  ambientIntensity: number; // 0.0 to 1.0
  lightBrightness?: number; // 0.5 to 2.0 (overall exposure/brightness multiplier)
  material: MaterialType;
  cavityStrength: number; // 0.0 to 2.0 (Laplace AO)
  ditherModulation: number; // 0.0 to 1.0 (Bayer threshold offset strength)
  bayerSize: '2x2' | '4x4' | '8x8';
}

export interface ToolSettings {
  activeTool: ToolType;
  brushSize: number; // 1 to 32
  pixelPerfect: boolean;
  ditherMatrix: DitherMatrixType;
  ditherDensity: number; // 0.1 to 0.9
  bucketContiguous: boolean;
  bucketTolerance: number; // 0 to 255
  shapeFilled: boolean;
  symmetryHorizontal: boolean;
  symmetryVertical: boolean;
  lightAzimuth: number; // 0 to 360 deg
  lightElevation: number; // 0 to 90 deg
  lightRadius: number; // Distance attenuation radius (16 to 256)
  lightBrightness: number; // 0.5 to 2.0 (exposure / brightness)
  materialPreset: MaterialType;
  cavityStrength: number; // 0 to 1
  ditherModulation: number; // 0 to 1
  curveTightness: number; // 0 to 1
  isoAngleSnap: boolean;
  opticalPreset: OpticalPresetType;
  translucencyDepth: number; // 1 to 32px
  fresnelPower: number; // 1.0 to 8.0
  anisoAngle: number; // 0 to 180 deg
  anisoFlow: AnisoFlowPreset;
}

export type OpticalPresetType = 'gemstone' | 'slime' | 'hair' | 'foliage' | 'metal_aniso';
export type AnisoFlowPreset = 'vertical' | 'horizontal' | 'radial' | 'curvature';

export interface VolumetricOpticsParams {
  preset: OpticalPresetType;
  translucencyDepth: number; // 1 to 32px (optical path length scale)
  fresnelPower: number; // 1.0 to 8.0 (grazing angle exponent)
  anisoAngle: number; // 0° to 180°
  anisoFlow: AnisoFlowPreset;
  lightAzimuth: number; // 0° to 360°
  lightElevation: number; // 0° to 90°
  lightColor: string;
  paletteColors: string[];
  ditherModulation: number; // 0.0 to 1.0
}


