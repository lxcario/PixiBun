'use client';

import React from 'react';
import { PhotometricLightingSection } from './PhotometricLightingSection';
import { RaymarchedShadowSection } from './RaymarchedShadowSection';
import { VolumetricOpticsSection } from './VolumetricOpticsSection';
import { TilesetDecomposerSection } from './TilesetDecomposerSection';
import { PixiBudAssistanceSection } from './PixiBudAssistanceSection';

export const AiToolsPanel: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col p-3 gap-3 overflow-y-auto">
      {/* 1. Photometric Studio & Relighting */}
      <PhotometricLightingSection />

      {/* 2. Raymarched Soft Shadows */}
      <RaymarchedShadowSection />

      {/* 3. Volumetric Optics & Subsurface Scattering */}
      <VolumetricOpticsSection />

      {/* 4. WFC Pattern Synthesis & Tileset Decomposer */}
      <TilesetDecomposerSection />

      {/* 5. PixiBud Smart Studio (RotSprite, Thinning, Color Grading) */}
      <PixiBudAssistanceSection />
    </div>
  );
};
