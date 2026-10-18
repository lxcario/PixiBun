/**
 * PixiBun Smart Math & Computer Graphics Engine (Barrel Module).
 *
 * Modularized architecture (Phase 33.3) organizing mathematically rigorous algorithms:
 * 1. Linear-Time O(W*H) Exact 2D Euclidean Distance Transform (Felzenszwalb & Huttenlocher 2012, Theory of Computing; orig. Cornell TR 2004)
 * 2. Edge-Preserving Bilateral Filtering (Tomasi & Manduchi 1998, ICCV)
 * 3. Discrete Sobel Gradient Fields & Tangent Space Unit Normal Generation
 * 4. Normal Map Texture Baker (Standard Tangent Space RGB 128, 128, 255)
 * 5. Discrete Laplace Cavity Map / Ambient Occlusion (AO)
 * 6. Photometric Lighting Pipeline (Blinn-Phong 1977, SIGGRAPH)
 * 7. 2D Volumetric Optics & Subsurface Scattering (Henyey & Greenstein 1941, ApJ; Poisson kernel on S¹)
 * 8. Anisotropic Specular Highlights & Dual Cuticle Shifts (Kajiya & Kay 1989, SIGGRAPH; Marschner et al. 2003; Scheuermann 2004)
 * 9. Dielectric Fresnel Reflection with Cauchy Chromatic Dispersion
 * 10. OKLab / OKLCH Perceptual Color Spaces (Ottosson 2020)
 * 11. Dithering: Bayer Matrix (1973), Atkinson (1984), Riemersma Hilbert Space-Filling Curve (1998)
 * 12. RotSprite 8x Scale2X Distortion-Free Rotation (Xenowhirl 2007; EPX Johnston 1992)
 * 13. Zhang-Suen Morphological Skeleton Line Thinning (Zhang & Suen 1984, CACM)
 * 14. Quadratic Bézier Curves, Isometric Lines & 47-Tile Blob Autotiling
 * 15. Minecraft Skin UV Projection & Normal Mapping
 * 16. Physically Accurate 2D Soft Shadows (Aaltonen Cone Tracing 2018)
 */

export * from './math/colorSpace';
export * from './math/edtNormalMap';
export * from './math/dithering';
export * from './math/rotSprite';
export * from './math/morphology';
export * from './math/curvesAndLines';
export * from './math/minecraftSkin';
export * from './math/photometricLighting';

export {
  sampleEDTBilinear,
  tracePhysical2DSoftShadow,
  generateRaymarchedShadowMap,
  executeRaymarchedCastShadowPipeline,
  renderBoundedSpriteCastShadow,
  executeBoundedCastShadowPipeline,
  type RaymarchedShadowParams,
} from './shadowRayMarcher';
