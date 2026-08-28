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
  materialPreset: MaterialType;
  cavityStrength: number; // 0 to 1
  ditherModulation: number; // 0 to 1
  curveTightness: number; // 0 to 1
  isoAngleSnap: boolean;
}


