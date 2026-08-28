'use client';

import React from 'react';

interface IconProps {
  size?: number;
  className?: string;
  'aria-hidden'?: boolean | 'true' | 'false';
}

/** Tiny Pixel Hint Icons for Scene Caption */
export const IconHintLamp: React.FC<IconProps> = ({ size = 12, className = '' }) => (
  <svg viewBox="0 0 12 12" width={size} height={size} shapeRendering="crispEdges" className={`inline-block pixelated ${className}`} aria-hidden="true">
    <rect x="4" y="1" width="4" height="2" fill="#e0b94d" />
    <rect x="3" y="3" width="6" height="3" fill="#e0b94d" />
    <rect x="5" y="6" width="2" height="3" fill="#67558d" />
    <rect x="3" y="9" width="6" height="2" fill="#130e20" />
  </svg>
);

export const IconHintRadio: React.FC<IconProps> = ({ size = 12, className = '' }) => (
  <svg viewBox="0 0 12 12" width={size} height={size} shapeRendering="crispEdges" className={`inline-block pixelated ${className}`} aria-hidden="true">
    <rect x="9" y="1" width="1" height="3" fill="#f4f1fa" />
    <rect x="2" y="4" width="8" height="6" fill="#4a3d68" />
    <rect x="3" y="5" width="4" height="2" fill="#130e20" />
    <rect x="8" y="5" width="1" height="1" fill="#e0b94d" />
    <rect x="3" y="8" width="2" height="1" fill="#b8aecf" />
  </svg>
);

export const IconHintPen: React.FC<IconProps> = ({ size = 12, className = '' }) => (
  <svg viewBox="0 0 12 12" width={size} height={size} shapeRendering="crispEdges" className={`inline-block pixelated ${className}`} aria-hidden="true">
    <rect x="8" y="1" width="3" height="3" fill="#f5c2d9" />
    <rect x="5" y="4" width="4" height="4" fill="#e0b94d" />
    <rect x="3" y="7" width="3" height="3" fill="#67558d" />
    <rect x="1" y="10" width="2" height="2" fill="#130e20" />
  </svg>
);

/** 1. Pixel Pencil Icon for Feature Card 1 (Pixel Canvas) */
export const IconPixelPencil: React.FC<IconProps> = ({ size = 48, className = '', 'aria-hidden': ariaHidden = true }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    shapeRendering="crispEdges"
    className={`select-none pixelated ${className}`}
    aria-hidden={ariaHidden}
  >
    <path
      d="M17 2h4v4h-1v1h-1v1h-1v1h-1v1h-1v1h-1v1h-1v1h-1v1h-1v1h-1v1h-1v1H5v-2h1v-1h1v-1h1v-1h1v-1h1v-1h1v-1h1v-1h1V6h1V5h1V4h1V3h1V2z"
      fill="#130e20"
    />
    <rect x="18" y="3" width="2" height="2" fill="#f5c2d9" />
    <rect x="17" y="4" width="2" height="2" fill="#b8aecf" />
    <rect x="16" y="5" width="2" height="2" fill="#4a3d68" />
    <rect x="15" y="6" width="2" height="2" fill="#b8aecf" />
    <path
      d="M14 7h2v2h-1v1h-1v1h-1v1h-1v1h-1v1h-1v1h-1v1h-1v1H8v-2h1v-1h1v-1h1v-1h1v-1h1v-1h1V7z"
      fill="#e0b94d"
    />
    <path
      d="M13 8h1v1h-1v1h-1v1h-1v1h-1v1h-1v1h-1v1h-1v1H7v-1h1v-1h1v-1h1v-1h1v-1h1v-1h1V8z"
      fill="#6b4426"
    />
    <rect x="6" y="16" width="2" height="2" fill="#f4f1fa" />
    <rect x="5" y="18" width="1" height="1" fill="#130e20" />
    <rect x="18" y="3" width="1" height="1" fill="#ffffff" />
  </svg>
);

/** 2. Floppy Disk Icon for Feature Card 2 (Save & Organize) */
export const IconFloppyDisk: React.FC<IconProps> = ({ size = 48, className = '', 'aria-hidden': ariaHidden = true }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    shapeRendering="crispEdges"
    className={`select-none pixelated ${className}`}
    aria-hidden={ariaHidden}
  >
    <path d="M3 2h15l3 3v16H3V2z" fill="#130e20" />
    <rect x="4" y="3" width="13" height="17" fill="#b8aecf" />
    <rect x="17" y="6" width="3" height="14" fill="#b8aecf" />
    <rect x="17" y="5" width="2" height="1" fill="#b8aecf" />
    <rect x="7" y="3" width="8" height="6" fill="#4a3d68" />
    <rect x="9" y="4" width="2" height="4" fill="#130e20" />
    <rect x="6" y="11" width="12" height="8" fill="#f4f1fa" />
    <rect x="8" y="13" width="8" height="1" fill="#f5c2d9" />
    <rect x="8" y="15" width="6" height="1" fill="#f5c2d9" />
    <rect x="17" y="17" width="2" height="2" fill="#130e20" />
  </svg>
);

/** 3. Clean Pixel Globe Icon for Feature Card 3 (Share Your Art) */
export const IconPixelGlobe: React.FC<IconProps> = ({ size = 48, className = '', 'aria-hidden': ariaHidden = true }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    shapeRendering="crispEdges"
    className={`select-none pixelated ${className}`}
    aria-hidden={ariaHidden}
  >
    <path
      d="M7 2h10v1h3v2h2v3h1v8h-1v3h-2v2h-3v1H7v-1H4v-2H2v-3H1V8h1V5h2V3h3V2z"
      fill="#130e20"
    />
    <path
      d="M7 3h10v1h3v2h2v2h1v8h-1v2h-2v2h-3v1H7v-1H4v-2H2v-2H1V8h1V6h2V4h3V3z"
      fill="#b8aecf"
    />
    <rect x="8" y="4" width="5" height="3" fill="#6b4426" />
    <rect x="6" y="7" width="4" height="4" fill="#6b4426" />
    <rect x="14" y="6" width="6" height="4" fill="#6b4426" />
    <rect x="9" y="11" width="8" height="4" fill="#6b4426" />
    <rect x="8" y="15" width="6" height="4" fill="#6b4426" />
    <path d="M11 3h2v18h-2V3z" fill="#4a3d68" />
    <path d="M2 11h20v2H2v-2z" fill="#4a3d68" />
    <rect x="5" y="4" width="2" height="2" fill="#ffffff" />
  </svg>
);

/** 4. Pixel Star Icon for Feature Card 4 (Built for Lovers) */
export const IconPixelStar: React.FC<IconProps> = ({ size = 48, className = '', 'aria-hidden': ariaHidden = true }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    shapeRendering="crispEdges"
    className={`select-none pixelated ${className}`}
    aria-hidden={ariaHidden}
  >
    <path
      d="M10 2h4v2h2v2h2v2h4v4h-2v2h-1v2h-1v2h1v4h-4v-2h-2v-1h-2v1h-2v2H3v-4h1v-2h-1v-2h-1v-2H0V8h4V6h2V4h2V2h2z"
      fill="#130e20"
      transform="translate(1, 1)"
    />
    <path
      d="M10 3h2v2h2v2h2v2h3v2h-2v2h-1v2h-1v2h1v2h-2v-1h-2v-1h-2v1h-2v1H5v-2h1v-2h-1v-2h-1v-2H2V9h3V7h2V5h2V3h1z"
      fill="#e0b94d"
      transform="translate(1, 1)"
    />
    <path
      d="M10 13h2v2h2v2h-2v-1h-2v-1h-2v1H8v-2h2v-1z"
      fill="#6b4426"
      transform="translate(1, 1)"
    />
    <rect x="8" y="10" width="1" height="2" fill="#130e20" />
    <rect x="14" y="10" width="1" height="2" fill="#130e20" />
    <rect x="11" y="12" width="1" height="1" fill="#f5c2d9" />
    <rect x="6" y="12" width="2" height="1" fill="#f5c2d9" />
    <rect x="15" y="12" width="2" height="1" fill="#f5c2d9" />
  </svg>
);

/** Potted Plant Sprite */
export const IconPottedPlant: React.FC<IconProps> = ({ size = 64, className = '', 'aria-hidden': ariaHidden = true }) => (
  <svg
    viewBox="0 0 32 32"
    width={size}
    height={size}
    shapeRendering="crispEdges"
    className={`select-none pixelated ${className}`}
    aria-hidden={ariaHidden}
  >
    <path d="M9 18h14v2h-1v8h-1v2h-10v-2h-1v-8h-1v-2z" fill="#130e20" />
    <rect x="10" y="19" width="12" height="2" fill="#f5c2d9" />
    <rect x="11" y="21" width="10" height="7" fill="#4a3d68" />
    <rect x="12" y="21" width="2" height="6" fill="#b8aecf" />
    <path
      d="M14 6h4v3h2v2h2v4h-3v-2h-2v-2h-1V6z M12 8h3v4h-2v3h-3v-3h1V9h1V8z M7 12h4v3h2v3H9v-2H7v-4z M19 11h4v4h-2v3h-3v-2h1v-5z"
      fill="#6b4426"
    />
  </svg>
);

/** Artist Easel with Heart Canvas */
export const IconHeartEasel: React.FC<IconProps> = ({ size = 80, className = '', 'aria-hidden': ariaHidden = true }) => (
  <svg
    viewBox="0 0 36 36"
    width={size}
    height={size}
    shapeRendering="crispEdges"
    className={`select-none pixelated ${className}`}
    aria-hidden={ariaHidden}
  >
    <path d="M17 2h2v6h-2V2z M6 22l-2 12h3l2-12H6z M28 22l2 12h-3l-2-12h3z M17 24h2v10h-2V24z" fill="#3d2718" />
    <rect x="4" y="22" width="28" height="2" fill="#130e20" />
    <rect x="6" y="6" width="24" height="17" fill="#130e20" />
    <rect x="7" y="7" width="22" height="15" fill="#f4f1fa" />
    <path
      d="M13 11h3v2h2v-2h3v2h1v3h-1v2h-2v2h-2v2h-2v-2h-2v-2h-2v-2h-1v-3h1v-2h3z"
      fill="#f5c2d9"
    />
    <rect x="14" y="12" width="1" height="1" fill="#ffffff" />
  </svg>
);

/** Sleeping Mascot on Velvet Cushion (Untouched - user loved this) */
export const IconCushionCat: React.FC<IconProps> = ({ size = 96, className = '', 'aria-hidden': ariaHidden = true }) => (
  <svg
    viewBox="0 0 44 32"
    width={size}
    height={size}
    shapeRendering="crispEdges"
    className={`select-none pixelated ${className}`}
    aria-hidden={ariaHidden}
  >
    <path d="M4 20h36v3h-1v5h-2v2H7v-2H5v-5H4v-3z" fill="#130e20" />
    <rect x="5" y="21" width="34" height="3" fill="#b8aecf" />
    <rect x="6" y="24" width="32" height="4" fill="#4a3d68" />
    <rect x="7" y="28" width="30" height="1" fill="#1e1730" />
    <rect x="4" y="24" width="1" height="2" fill="#e0b94d" />
    <rect x="39" y="24" width="1" height="2" fill="#e0b94d" />

    <path
      d="M12 12h14v2h4v2h3v5h-1v2H10v-2H9v-4h1v-3h2v-2z"
      fill="#130e20"
    />
    <path
      d="M13 13h12v2h4v2h2v3h-1v1H11v-1h-1v-3h1v-2h2v-2z"
      fill="#f4f1fa"
    />
    <rect x="13" y="10" width="3" height="3" fill="#130e20" />
    <rect x="14" y="11" width="1" height="2" fill="#f5c2d9" />
    <rect x="18" y="10" width="3" height="3" fill="#130e20" />
    <rect x="19" y="11" width="1" height="2" fill="#f5c2d9" />
    <rect x="13" y="16" width="3" height="1" fill="#130e20" />
    <rect x="18" y="16" width="3" height="1" fill="#130e20" />
    <rect x="16" y="17" width="1" height="1" fill="#f5c2d9" />
  </svg>
);

/** Cozy Brick Hearth with Glowing Fire, Logs & Kettle (Companion to Cushion Cat) */
export const IconCozyHearth: React.FC<IconProps> = ({ size = 96, className = '', 'aria-hidden': ariaHidden = true }) => (
  <svg
    viewBox="0 0 44 32"
    width={size}
    height={size}
    shapeRendering="crispEdges"
    className={`select-none pixelated ${className}`}
    aria-hidden={ariaHidden}
  >
    {/* Brick Fireplace Mantel */}
    <rect x="4" y="2" width="36" height="5" fill="#1e1730" />
    <rect x="5" y="3" width="34" height="3" fill="#6a5880" />
    <rect x="6" y="3" width="32" height="1" fill="#c792df" />

    {/* Brick Columns on sides */}
    <rect x="5" y="7" width="9" height="23" fill="#1e1730" />
    <rect x="6" y="8" width="7" height="21" fill="#3a2e4c" />
    <rect x="6" y="13" width="7" height="1" fill="#1e1730" />
    <rect x="6" y="19" width="7" height="1" fill="#1e1730" />
    <rect x="6" y="25" width="7" height="1" fill="#1e1730" />

    <rect x="30" y="7" width="9" height="23" fill="#1e1730" />
    <rect x="31" y="8" width="7" height="21" fill="#3a2e4c" />
    <rect x="31" y="13" width="7" height="1" fill="#1e1730" />
    <rect x="31" y="19" width="7" height="1" fill="#1e1730" />
    <rect x="31" y="25" width="7" height="1" fill="#1e1730" />

    {/* Fireplace Hearth Arch & Dark Backing */}
    <rect x="14" y="7" width="16" height="23" fill="#1e1730" />
    <rect x="15" y="8" width="14" height="21" fill="#140f22" />

    {/* Glowing Firewood Logs */}
    <rect x="17" y="23" width="10" height="4" fill="#1e1730" />
    <rect x="18" y="24" width="8" height="2" fill="#d89a55" />

    {/* Glowing Flame & Embers */}
    <rect x="18" y="17" width="8" height="7" fill="#f0be7c" />
    <rect x="19" y="18" width="6" height="5" fill="#fbe9c6" />
    <rect x="21" y="19" width="2" height="3" fill="#ffffff" />
    <rect x="16" y="21" width="2" height="2" fill="#dcabdf" />
    <rect x="26" y="21" width="2" height="2" fill="#dcabdf" />

    {/* Tea Kettle on Mantel */}
    <rect x="8" y="0" width="8" height="3" fill="#1e1730" />
    <rect x="9" y="1" width="6" height="2" fill="#ede8f4" />
    <rect x="15" y="1" width="2" height="1" fill="#1e1730" />

    {/* Warm Candle on Mantel */}
    <rect x="28" y="0" width="4" height="3" fill="#1e1730" />
    <rect x="29" y="0" width="2" height="3" fill="#ede8f4" />
    <rect x="29" y="-2" width="2" height="2" fill="#f0be7c" />
  </svg>
);

/** Bookshelf with Candle & Ivy */
export const IconBookshelfCandle: React.FC<IconProps> = ({ size = 96, className = '', 'aria-hidden': ariaHidden = true }) => (
  <svg
    viewBox="0 0 52 36"
    width={size}
    height={size}
    shapeRendering="crispEdges"
    className={`select-none pixelated ${className}`}
    aria-hidden={ariaHidden}
  >
    <rect x="2" y="26" width="48" height="4" fill="#130e20" />
    <rect x="3" y="26" width="46" height="2" fill="#6b4426" />
    <rect x="3" y="28" width="46" height="2" fill="#3d2718" />
    <rect x="8" y="30" width="3" height="5" fill="#130e20" />
    <rect x="41" y="30" width="3" height="5" fill="#130e20" />

    <rect x="5" y="12" width="4" height="14" fill="#130e20" />
    <rect x="6" y="13" width="2" height="13" fill="#4a3d68" />
    <rect x="9" y="8" width="5" height="18" fill="#130e20" />
    <rect x="10" y="9" width="3" height="17" fill="#b8aecf" />
    <rect x="10" y="13" width="3" height="2" fill="#e0b94d" />
    <rect x="14" y="14" width="4" height="12" fill="#130e20" />
    <rect x="15" y="15" width="2" height="11" fill="#f5c2d9" />

    <rect x="23" y="18" width="6" height="8" fill="#130e20" />
    <rect x="24" y="19" width="4" height="7" fill="#f4f1fa" />
    <rect x="25" y="16" width="2" height="3" fill="#130e20" />
    <rect x="24" y="12" width="4" height="4" fill="#e0b94d" />
    <rect x="25" y="13" width="2" height="2" fill="#ffffff" />

    <rect x="32" y="16" width="7" height="10" fill="#130e20" />
    <rect x="33" y="17" width="5" height="9" fill="#b8aecf" />
  </svg>
);
