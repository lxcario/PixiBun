'use client';

import React from 'react';

interface PixelGoldenAccentsProps {
  className?: string;
  height?: number | string;
}

/**
 * 16-Bit Handcrafted Golden Pixel Side Filigree & Rivet Textures
 * Placed on the Left and Right flanks of chassis components with
 * authentic highlights, amber midtones, and deep bronze shadows.
 */
export const PixelGoldenAccents: React.FC<PixelGoldenAccentsProps> = ({
  className = '',
}) => {
  return (
    <div
      aria-hidden="true"
      className={`absolute inset-0 pointer-events-none select-none z-10 ${className}`}
    >
      {/* Left Flank Golden Pixel Texture Spine */}
      <div className="absolute top-3 bottom-3 left-1.5 w-2 flex flex-col justify-between items-center py-2 opacity-90">
        {/* Top Brass Rivet */}
        <div className="w-2 h-2 relative">
          <div className="absolute inset-0 bg-[var(--surface-0)]" />
          <div className="absolute top-0 left-0 w-1.5 h-1.5 bg-[var(--accent-gold)]" />
          <div className="absolute top-0 left-0 w-0.5 h-0.5 bg-[var(--primary-shine)]" />
          <div className="absolute bottom-0 right-0 w-1 h-1 bg-[var(--primary-shade)]" />
        </div>

        {/* Center Diamond Lattice Motifs */}
        <div className="flex flex-col gap-3 items-center">
          <div className="w-1.5 h-3 relative">
            <div className="w-1.5 h-1.5 bg-[var(--accent-gold)] rotate-45 shadow-[0_0_4px_color-mix(in srgb, var(--primary-bg) 40%, transparent)]" />
            <div className="w-0.5 h-1.5 bg-[var(--primary-shade)] mx-auto mt-1" />
          </div>
          <div className="w-1 h-4 bg-gradient-to-b from-[var(--accent-gold)] via-[var(--primary-shade)] to-[var(--primary-shade)] rounded-[1px] shadow-[0_0_4px_color-mix(in srgb, var(--primary-bg) 25%, transparent)]" />
          <div className="w-1.5 h-1.5 bg-[var(--accent-gold)] rotate-45" />
        </div>

        {/* Bottom Brass Rivet */}
        <div className="w-2 h-2 relative">
          <div className="absolute inset-0 bg-[var(--surface-0)]" />
          <div className="absolute top-0 left-0 w-1.5 h-1.5 bg-[var(--accent-gold)]" />
          <div className="absolute bottom-0 right-0 w-1 h-1 bg-[var(--primary-shade)]" />
        </div>
      </div>

      {/* Right Flank Golden Pixel Texture Spine */}
      <div className="absolute top-3 bottom-3 right-1.5 w-2 flex flex-col justify-between items-center py-2 opacity-90">
        {/* Top Brass Rivet */}
        <div className="w-2 h-2 relative">
          <div className="absolute inset-0 bg-[var(--surface-0)]" />
          <div className="absolute top-0 left-0 w-1.5 h-1.5 bg-[var(--accent-gold)]" />
          <div className="absolute top-0 left-0 w-0.5 h-0.5 bg-[var(--primary-shine)]" />
          <div className="absolute bottom-0 right-0 w-1 h-1 bg-[var(--primary-shade)]" />
        </div>

        {/* Center Diamond Lattice Motifs */}
        <div className="flex flex-col gap-3 items-center">
          <div className="w-1.5 h-3 relative">
            <div className="w-1.5 h-1.5 bg-[var(--accent-gold)] rotate-45 shadow-[0_0_4px_color-mix(in srgb, var(--primary-bg) 40%, transparent)]" />
            <div className="w-0.5 h-1.5 bg-[var(--primary-shade)] mx-auto mt-1" />
          </div>
          <div className="w-1 h-4 bg-gradient-to-b from-[var(--accent-gold)] via-[var(--primary-shade)] to-[var(--primary-shade)] rounded-[1px] shadow-[0_0_4px_color-mix(in srgb, var(--primary-bg) 25%, transparent)]" />
          <div className="w-1.5 h-1.5 bg-[var(--accent-gold)] rotate-45" />
        </div>

        {/* Bottom Brass Rivet */}
        <div className="w-2 h-2 relative">
          <div className="absolute inset-0 bg-[var(--surface-0)]" />
          <div className="absolute top-0 left-0 w-1.5 h-1.5 bg-[var(--accent-gold)]" />
          <div className="absolute bottom-0 right-0 w-1 h-1 bg-[var(--primary-shade)]" />
        </div>
      </div>
    </div>
  );
};
