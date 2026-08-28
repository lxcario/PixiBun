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
          <div className="absolute inset-0 bg-[#241733]" />
          <div className="absolute top-0 left-0 w-1.5 h-1.5 bg-[#f0be7c]" />
          <div className="absolute top-0 left-0 w-0.5 h-0.5 bg-[#fff8db]" />
          <div className="absolute bottom-0 right-0 w-1 h-1 bg-[#8c5a28]" />
        </div>

        {/* Center Diamond Lattice Motifs */}
        <div className="flex flex-col gap-3 items-center">
          <div className="w-1.5 h-3 relative">
            <div className="w-1.5 h-1.5 bg-[#f0be7c] rotate-45 shadow-[0_0_4px_rgba(240,190,124,0.4)]" />
            <div className="w-0.5 h-1.5 bg-[#8c5a28] mx-auto mt-1" />
          </div>
          <div className="w-1 h-4 bg-gradient-to-b from-[#f0be7c] via-[#d89a55] to-[#8c5a28] rounded-[1px] shadow-[0_0_4px_rgba(240,190,124,0.25)]" />
          <div className="w-1.5 h-1.5 bg-[#f0be7c] rotate-45" />
        </div>

        {/* Bottom Brass Rivet */}
        <div className="w-2 h-2 relative">
          <div className="absolute inset-0 bg-[#241733]" />
          <div className="absolute top-0 left-0 w-1.5 h-1.5 bg-[#f0be7c]" />
          <div className="absolute bottom-0 right-0 w-1 h-1 bg-[#8c5a28]" />
        </div>
      </div>

      {/* Right Flank Golden Pixel Texture Spine */}
      <div className="absolute top-3 bottom-3 right-1.5 w-2 flex flex-col justify-between items-center py-2 opacity-90">
        {/* Top Brass Rivet */}
        <div className="w-2 h-2 relative">
          <div className="absolute inset-0 bg-[#241733]" />
          <div className="absolute top-0 left-0 w-1.5 h-1.5 bg-[#f0be7c]" />
          <div className="absolute top-0 left-0 w-0.5 h-0.5 bg-[#fff8db]" />
          <div className="absolute bottom-0 right-0 w-1 h-1 bg-[#8c5a28]" />
        </div>

        {/* Center Diamond Lattice Motifs */}
        <div className="flex flex-col gap-3 items-center">
          <div className="w-1.5 h-3 relative">
            <div className="w-1.5 h-1.5 bg-[#f0be7c] rotate-45 shadow-[0_0_4px_rgba(240,190,124,0.4)]" />
            <div className="w-0.5 h-1.5 bg-[#8c5a28] mx-auto mt-1" />
          </div>
          <div className="w-1 h-4 bg-gradient-to-b from-[#f0be7c] via-[#d89a55] to-[#8c5a28] rounded-[1px] shadow-[0_0_4px_rgba(240,190,124,0.25)]" />
          <div className="w-1.5 h-1.5 bg-[#f0be7c] rotate-45" />
        </div>

        {/* Bottom Brass Rivet */}
        <div className="w-2 h-2 relative">
          <div className="absolute inset-0 bg-[#241733]" />
          <div className="absolute top-0 left-0 w-1.5 h-1.5 bg-[#f0be7c]" />
          <div className="absolute bottom-0 right-0 w-1 h-1 bg-[#8c5a28]" />
        </div>
      </div>
    </div>
  );
};
