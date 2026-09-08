'use client';

import React, { useState } from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { TactileButton } from '@/components/ui/TactileButton';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { harmonizePaletteColors } from '@/lib/ai/pixelAiEngine';
import { studioEvents } from '@/lib/events/studioEvents';

export const PixiBudAssistanceSection: React.FC = () => {
  const {
    palettes,
    currentPaletteId,
    addCustomColorToPalette,
  } = useStudioStore();

  const [rotationAngle, setRotationAngle] = useState<number>(45);
  const currentPalette = palettes.find((p) => p.id === currentPaletteId) || palettes[0];

  const handleRotSprite = (angle: number) => {
    studioEvents.emit('pixibun:rot-sprite', { angle });
  };

  const handleCleanJaggies = () => {
    studioEvents.emit('pixibun:clean-jaggies');
  };

  const handleSkeletonThinning = () => {
    studioEvents.emit('pixibun:skeleton-thinning');
  };

  const handleRemoveStrays = () => {
    studioEvents.emit('pixibun:remove-strays');
  };

  const handleColorGrade = (grade: 'sunset' | 'moonlight' | 'neon') => {
    studioEvents.emit('pixibun:color-grade', { grade });
  };

  const handleQuantizePalette = () => {
    studioEvents.emit('pixibun:quantize-palette', { colors: currentPalette.colors });
  };

  const handleHarmonizePalette = () => {
    const harmonics = harmonizePaletteColors(currentPalette.colors);
    harmonics.forEach((c) => addCustomColorToPalette(currentPaletteId, c));
  };

  const handleInBetweenFrame = () => {
    studioEvents.emit('pixibun:in-between-frame');
  };

  const handleAtkinsonDither = () => {
    studioEvents.emit('pixibun:atkinson-dither', { colors: currentPalette.colors });
  };

  const handleRiemersmaDither = () => {
    studioEvents.emit('pixibun:riemersma-dither', { colors: currentPalette.colors });
  };

  return (
    <>
      {/* Module 4: Pixel Perfection & RotSprite 8x Engine */}
      <div className="bg-[var(--desk-surface)] p-2.5 rounded-[2px] border-2 border-[var(--desk-border)] flex flex-col gap-2.5 shadow-xs">
        <span className="text-[10px] font-mono font-bold text-[#dcabdf] uppercase tracking-wider flex items-center gap-1">
          <PixelIcon name="rotate" size={12} />
          <span>RotSprite 8x & Cleanup</span>
        </span>

        {/* RotSprite Angle Control */}
        <div className="bg-[var(--desk-surface-raised)] p-2 rounded-[2px] border border-[var(--desk-border)] flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[10px] text-[var(--text-body)] font-bold">Angle:</span>
            <input
              type="range"
              min="-180"
              max="180"
              value={rotationAngle}
              aria-label="RotSprite rotation angle in degrees"
              onChange={(e) => setRotationAngle(parseInt(e.target.value, 10))}
              className="w-32 accent-[#f0be7c] cursor-pointer"
            />
            <span className="text-[#f0be7c] font-bold text-[10px] min-w-[28px] text-right">
              {rotationAngle}°
            </span>
          </div>

          <div className="flex items-center gap-1">
            {[-90, -45, 45, 90].map((deg) => (
              <button
                key={deg}
                onClick={() => {
                  setRotationAngle(deg);
                  handleRotSprite(deg);
                }}
                className="flex-1 py-0.5 text-[9px] font-bold font-mono bg-[var(--desk-surface)] hover:bg-[#2e2040] text-[var(--text-body)] hover:text-[#f0be7c] border border-[var(--desk-border)] rounded-[1px] cursor-pointer"
              >
                {deg > 0 ? `+${deg}°` : `${deg}°`}
              </button>
            ))}
          </div>
        </div>

        <TactileButton
          size="sm"
          variant="default"
          onClick={() => handleRotSprite(rotationAngle)}
          title="Scale2X 8x upsampling + subpixel inverse rotation + 64-sample Gaussian downsampling"
          className="text-[10px] py-1.5 font-bold bg-[var(--desk-surface-raised)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[#f0be7c] justify-center"
        >
          <PixelIcon name="rotate" size={12} />
          <span>Execute RotSprite ({rotationAngle}°)</span>
        </TactileButton>

        <div className="grid grid-cols-2 gap-1.5">
          <TactileButton
            size="sm"
            variant="default"
            onClick={handleCleanJaggies}
            title="Clean single-pixel L-corner jaggies along strokes"
            className="text-[10px] py-1.5 font-bold bg-[var(--desk-surface-raised)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[#f0be7c] flex items-center justify-center gap-1"
          >
            <PixelIcon name="pen" size={12} />
            <span>De-Jaggy</span>
          </TactileButton>

          <TactileButton
            size="sm"
            variant="default"
            onClick={handleSkeletonThinning}
            title="Zhang-Suen morphological thinning to 1px centerlines"
            className="text-[10px] py-1.5 font-bold bg-[var(--desk-surface-raised)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[#f0be7c] flex items-center justify-center gap-1"
          >
            <PixelIcon name="pen" size={12} />
            <span>Thin to 1px</span>
          </TactileButton>
        </div>

        <TactileButton
          size="sm"
          variant="default"
          onClick={handleRemoveStrays}
          title="Remove orphan 1-pixel artifacts with no orthogonal neighbors"
          className="text-[10px] py-1.5 font-bold bg-[var(--desk-surface-raised)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[#f0be7c] justify-center"
        >
          <PixelIcon name="eraser" size={12} />
          <span>Remove Stray Pixels</span>
        </TactileButton>
      </div>

      {/* Module 5: Color Science, Grading & In-Betweening */}
      <div className="bg-[var(--desk-surface)] p-2.5 rounded-[2px] border-2 border-[var(--desk-border)] flex flex-col gap-2.5 shadow-xs">
        <span className="text-[10px] font-mono font-bold text-[#dcabdf] uppercase tracking-wider flex items-center gap-1">
          <PixelIcon name="palette" size={12} />
          <span>Color Science & Morphing</span>
        </span>

        {/* Color Grading Presets */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-mono text-[var(--text-body)] font-bold">Atmosphere LUT:</span>
          <div className="grid grid-cols-3 gap-1">
            <button
              onClick={() => handleColorGrade('sunset')}
              className="py-1 text-[9px] font-mono font-bold bg-[#2e1c14] border border-[#8c4015] text-[#f08c4a] rounded-[1px] hover:bg-[#3d2419] cursor-pointer"
            >
              Sunset
            </button>
            <button
              onClick={() => handleColorGrade('moonlight')}
              className="py-1 text-[9px] font-mono font-bold bg-[#141b2e] border border-[#1d3d8c] text-[#7cb3f0] rounded-[1px] hover:bg-[#19243d] cursor-pointer"
            >
              Moonlight
            </button>
            <button
              onClick={() => handleColorGrade('neon')}
              className="py-1 text-[9px] font-mono font-bold bg-[#26142e] border border-[#7e1d8c] text-[#df7cf0] rounded-[1px] hover:bg-[#33193d] cursor-pointer"
            >
              Neon
            </button>
          </div>
        </div>

        {/* Advanced Dithering */}
        <div className="grid grid-cols-2 gap-1.5">
          <TactileButton
            size="sm"
            variant="default"
            onClick={handleAtkinsonDither}
            title="Classic Macintosh Atkinson 75% error diffusion dither"
            className="text-[10px] py-1.5 font-bold bg-[var(--desk-surface-raised)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[#f0be7c] flex items-center justify-center gap-1"
          >
            <PixelIcon name="dither" size={12} />
            <span>Atkinson Dither</span>
          </TactileButton>

          <TactileButton
            size="sm"
            variant="default"
            onClick={handleRiemersmaDither}
            title="Hilbert space-filling curve non-worming dither"
            className="text-[10px] py-1.5 font-bold bg-[var(--desk-surface-raised)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[#f0be7c] flex items-center justify-center gap-1"
          >
            <PixelIcon name="dither" size={12} />
            <span>Riemersma Dither</span>
          </TactileButton>
        </div>

        {/* Snap / Quantize to Palette */}
        <TactileButton
          size="sm"
          variant="default"
          onClick={handleQuantizePalette}
          title="Snap active layer colors to the closest palette swatches using DeltaE OKLab"
          className="text-[10px] py-1.5 font-bold bg-[var(--desk-surface-raised)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[#f0be7c] justify-center"
        >
          <PixelIcon name="palette" size={12} />
          <span>Snap to Active Palette</span>
        </TactileButton>

        {/* Harmonize Palette */}
        <TactileButton
          size="sm"
          variant="default"
          onClick={handleHarmonizePalette}
          title="Add complementary and triadic color accents to current palette in OKLCH"
          className="text-[10px] py-1.5 font-bold bg-[var(--desk-surface-raised)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[#f0be7c] justify-center"
        >
          <PixelIcon name="sparkles" size={12} />
          <span>+ Harmonize Accents</span>
        </TactileButton>

        {/* Optical Flow In-Between Animation Frame */}
        <TactileButton
          size="sm"
          variant="primary"
          onClick={handleInBetweenFrame}
          title="Synthesize an in-between frame using Block-Matching Optical Flow and Signed Distance Field morphing"
          className="text-xs py-2 font-bold justify-center"
        >
          <PixelIcon name="play" size={12} />
          <span>+ In-Between Frame (Morph)</span>
        </TactileButton>
      </div>
    </>
  );
};
