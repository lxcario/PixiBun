'use client';

import React from 'react';

interface IconProps {
  size?: number;
  className?: string;
  'aria-hidden'?: boolean | 'true' | 'false';
}

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
    <path d="M9 18h14v2h-1v8h-1v2h-10v-2h-1v-8h-1v-2z" fill="var(--ink)" />
    <rect x="10" y="19" width="12" height="2" fill="var(--accent-wisteria)" />
    <rect x="11" y="21" width="10" height="7" fill="var(--accent-wisteria)" />
    <rect x="12" y="21" width="2" height="6" fill="var(--accent-wisteria)" />
    <path
      d="M14 6h4v3h2v2h2v4h-3v-2h-2v-2h-1V6z M12 8h3v4h-2v3h-3v-3h1V9h1V8z M7 12h4v3h2v3H9v-2H7v-4z M19 11h4v4h-2v3h-3v-2h1v-5z"
      fill="var(--accent-wisteria)"
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
    <path d="M17 2h2v6h-2V2z M6 22l-2 12h3l2-12H6z M28 22l2 12h-3l-2-12h3z M17 24h2v10h-2V24z" fill="var(--ink)" />
    <rect x="4" y="22" width="28" height="2" fill="var(--ink)" />
    <rect x="6" y="6" width="24" height="17" fill="var(--ink)" />
    <rect x="7" y="7" width="22" height="15" fill="var(--accent-wisteria)" />
    <path
      d="M13 11h3v2h2v-2h3v2h1v3h-1v2h-2v2h-2v2h-2v-2h-2v-2h-2v-2h-1v-3h1v-2h3z"
      fill="var(--accent-wisteria)"
    />
    <rect x="14" y="12" width="1" height="1" fill="var(--accent-wisteria)" />
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
    <path d="M4 20h36v3h-1v5h-2v2H7v-2H5v-5H4v-3z" fill="var(--ink)" />
    <rect x="5" y="21" width="34" height="3" fill="var(--accent-wisteria)" />
    <rect x="6" y="24" width="32" height="4" fill="var(--accent-wisteria)" />
    <rect x="7" y="28" width="30" height="1" fill="var(--ink)" />
    <rect x="4" y="24" width="1" height="2" fill="var(--accent-wisteria)" />
    <rect x="39" y="24" width="1" height="2" fill="var(--accent-wisteria)" />

    <path
      d="M12 12h14v2h4v2h3v5h-1v2H10v-2H9v-4h1v-3h2v-2z"
      fill="var(--ink)"
    />
    <path
      d="M13 13h12v2h4v2h2v3h-1v1H11v-1h-1v-3h1v-2h2v-2z"
      fill="var(--accent-wisteria)"
    />
    <rect x="13" y="10" width="3" height="3" fill="var(--ink)" />
    <rect x="14" y="11" width="1" height="2" fill="var(--accent-wisteria)" />
    <rect x="18" y="10" width="3" height="3" fill="var(--ink)" />
    <rect x="19" y="11" width="1" height="2" fill="var(--accent-wisteria)" />
    <rect x="13" y="16" width="3" height="1" fill="var(--ink)" />
    <rect x="18" y="16" width="3" height="1" fill="var(--ink)" />
    <rect x="16" y="17" width="1" height="1" fill="var(--accent-wisteria)" />
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
    <rect x="4" y="2" width="36" height="5" fill="var(--ink)" />
    <rect x="5" y="3" width="34" height="3" fill="var(--accent-wisteria)" />
    <rect x="6" y="3" width="32" height="1" fill="var(--accent-wisteria)" />

    {/* Brick Columns on sides */}
    <rect x="5" y="7" width="9" height="23" fill="var(--ink)" />
    <rect x="6" y="8" width="7" height="21" fill="var(--ink)" />
    <rect x="6" y="13" width="7" height="1" fill="var(--ink)" />
    <rect x="6" y="19" width="7" height="1" fill="var(--ink)" />
    <rect x="6" y="25" width="7" height="1" fill="var(--ink)" />

    <rect x="30" y="7" width="9" height="23" fill="var(--ink)" />
    <rect x="31" y="8" width="7" height="21" fill="var(--ink)" />
    <rect x="31" y="13" width="7" height="1" fill="var(--ink)" />
    <rect x="31" y="19" width="7" height="1" fill="var(--ink)" />
    <rect x="31" y="25" width="7" height="1" fill="var(--ink)" />

    {/* Fireplace Hearth Arch & Dark Backing */}
    <rect x="14" y="7" width="16" height="23" fill="var(--ink)" />
    <rect x="15" y="8" width="14" height="21" fill="var(--ink)" />

    {/* Glowing Firewood Logs */}
    <rect x="17" y="23" width="10" height="4" fill="var(--ink)" />
    <rect x="18" y="24" width="8" height="2" fill="var(--primary-shade)" />

    {/* Glowing Flame & Embers */}
    <rect x="18" y="17" width="8" height="7" fill="var(--accent-gold)" />
    <rect x="19" y="18" width="6" height="5" fill="var(--accent-wisteria)" />
    <rect x="21" y="19" width="2" height="3" fill="var(--accent-wisteria)" />
    <rect x="16" y="21" width="2" height="2" fill="var(--accent-plum)" />
    <rect x="26" y="21" width="2" height="2" fill="var(--accent-plum)" />

    {/* Tea Kettle on Mantel */}
    <rect x="8" y="0" width="8" height="3" fill="var(--ink)" />
    <rect x="9" y="1" width="6" height="2" fill="var(--text-heading)" />
    <rect x="15" y="1" width="2" height="1" fill="var(--ink)" />

    {/* Warm Candle on Mantel */}
    <rect x="28" y="0" width="4" height="3" fill="var(--ink)" />
    <rect x="29" y="0" width="2" height="3" fill="var(--text-heading)" />
    <rect x="29" y="-2" width="2" height="2" fill="var(--accent-gold)" />
  </svg>
);
