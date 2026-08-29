'use client';

import React from 'react';

export type PixelIconName = 
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
  | 'color-replace'
  | 'rotate'
  | 'undo' 
  | 'redo' 
  | 'zoom-in' 
  | 'zoom-out' 
  | 'grid' 
  | 'grid-iso'
  | 'wrap'
  | 'play' 
  | 'pause' 
  | 'step-forward' 
  | 'step-backward' 
  | 'loop' 
  | 'ping-pong' 
  | 'onion' 
  | 'layers' 
  | 'palette' 
  | 'gemini' 
  | 'export' 
  | 'import' 
  | 'trash' 
  | 'plus' 
  | 'copy' 
  | 'eye' 
  | 'eye-off' 
  | 'lock' 
  | 'unlock'
  | 'help'
  | 'sparkles'
  | 'sun'
  | 'symmetry'
  | 'preview';

interface PixelIconProps {
  name: PixelIconName;
  className?: string;
  size?: number;
}

export const PixelIcon: React.FC<PixelIconProps> = ({ 
  name, 
  className = '', 
  size = 18 
}) => {
  const renderSvg = () => {
    switch (name) {
      // 1. Drawing Tools
      case 'pen':
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
            <path d="m15 5 4 4" />
          </svg>
        );

      case 'eraser':
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" />
            <path d="M22 21H7" />
            <path d="m5 11 9 9" />
          </svg>
        );

      case 'bucket':
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="m19 11-8-8-8.6 8.6a2 2 0 0 0 0 2.8l5.2 5.2c.8.8 2 .8 2.8 0L19 11Z" />
            <path d="m5 2 5 5" />
            <path d="M2 13h15" />
            <path d="M22 20a2 2 0 1 1-4 0c0-1.6 1.7-2.4 2-4 .3 1.6 2 2.4 2 4Z" />
          </svg>
        );

      case 'dither':
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" className={className}>
            <rect x="3" y="3" width="4" height="4" />
            <rect x="11" y="3" width="4" height="4" />
            <rect x="17" y="3" width="4" height="4" />
            <rect x="7" y="7" width="4" height="4" />
            <rect x="15" y="7" width="4" height="4" />
            <rect x="3" y="11" width="4" height="4" />
            <rect x="11" y="11" width="4" height="4" />
            <rect x="17" y="11" width="4" height="4" />
            <rect x="7" y="15" width="4" height="4" />
            <rect x="15" y="15" width="4" height="4" />
            <rect x="3" y="19" width="4" height="4" />
            <rect x="11" y="19" width="4" height="4" />
            <rect x="17" y="19" width="4" height="4" />
          </svg>
        );

      case 'eyedropper':
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="m14 2 6 6" />
            <path d="m16 6-9 9-4 1 1-4 9-9" />
            <path d="m9 13 2 2" />
          </svg>
        );

      case 'select-box':
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3" className={className}>
            <rect width="18" height="18" x="3" y="3" rx="1" />
          </svg>
        );

      case 'select-lasso':
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="3 2" className={className}>
            <path d="M7 22a5 5 0 0 1-2-4c0-4 4-8 9-8s8 4 8 8-3 6-8 6c-3 0-5-1-6-2" />
            <path d="M3 14c1-4 4-7 8-9" strokeDasharray="none" />
            <circle cx="6" cy="18" r="1.5" fill="currentColor" stroke="none" />
          </svg>
        );

      case 'line':
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={className}>
            <line x1="5" y1="19" x2="19" y2="5" />
          </svg>
        );

      case 'rectangle':
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" className={className}>
            <rect width="18" height="14" x="3" y="5" rx="1" />
          </svg>
        );

      case 'ellipse':
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" className={className}>
            <circle cx="12" cy="12" r="8" />
          </svg>
        );

      // 2. Timeline & Utilities
      case 'undo':
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M3 7v6h6" />
            <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
          </svg>
        );

      case 'redo':
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M21 7v6h-6" />
            <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" />
          </svg>
        );

      case 'zoom-in':
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="11" y1="8" x2="11" y2="14" />
            <line x1="8" y1="11" x2="14" y2="11" />
          </svg>
        );

      case 'zoom-out':
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="8" y1="11" x2="14" y2="11" />
          </svg>
        );

      case 'grid':
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <rect width="18" height="18" x="3" y="3" rx="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="3" y1="15" x2="21" y2="15" />
            <line x1="9" y1="3" x2="9" y2="21" />
            <line x1="15" y1="3" x2="15" y2="21" />
          </svg>
        );

      case 'play':
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" className={className}>
            <polygon points="6 3 20 12 6 21 6 3" />
          </svg>
        );

      case 'pause':
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" className={className}>
            <rect x="6" y="4" width="4" height="16" />
            <rect x="14" y="4" width="4" height="16" />
          </svg>
        );

      case 'step-forward':
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" className={className}>
            <polygon points="5 4 15 12 5 20 5 4" />
            <line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" strokeWidth="2.5" />
          </svg>
        );

      case 'step-backward':
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" className={className}>
            <polygon points="19 20 9 12 19 4 19 20" />
            <line x1="5" y1="5" x2="5" y2="19" stroke="currentColor" strokeWidth="2.5" />
          </svg>
        );

      case 'loop':
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="m17 2 4 4-4 4" />
            <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
            <path d="m7 22-4-4 4-4" />
            <path d="M21 13v1a4 4 0 0 1-4 4H3" />
          </svg>
        );

      case 'ping-pong':
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M7 16V4m0 0L3 8m4-4l4 4" />
            <path d="M17 8v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        );

      case 'onion':
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7z" />
            <circle cx="12" cy="9" r="2.5" />
          </svg>
        );

      case 'layers':
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <polygon points="12 2 2 7 12 12 22 7 12 2" />
            <polyline points="2 17 12 22 22 17" />
            <polyline points="2 12 12 17 22 12" />
          </svg>
        );

      case 'palette':
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
            <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
            <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
            <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
            <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.5-.68 1.5-1.5 0-.38-.15-.74-.39-1.02-.23-.27-.37-.62-.37-1.02 0-.83.67-1.5 1.5-1.5H16c3.31 0 6-2.69 6-6 0-4.97-4.48-9-10-9z" />
          </svg>
        );

      case 'gemini':
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" className={className}>
            <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" />
          </svg>
        );

      case 'export':
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        );

      case 'import':
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        );

      case 'trash':
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M3 6h18" />
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          </svg>
        );

      case 'plus':
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={className}>
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        );

      case 'copy':
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
          </svg>
        );

      case 'eye':
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        );

      case 'eye-off':
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
            <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
            <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
            <line x1="2" y1="2" x2="22" y2="22" />
          </svg>
        );

      case 'lock':
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        );

      case 'unlock':
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 9.9-1" />
          </svg>
        );

      case 'help':
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        );

      case 'curve':
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M3 19c6-14 12-14 18 0" />
            <circle cx="3" cy="19" r="2" fill="currentColor" />
            <circle cx="12" cy="5" r="2" fill="currentColor" />
            <circle cx="21" cy="19" r="2" fill="currentColor" />
          </svg>
        );

      case 'isometric-line':
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M2 17 22 7" />
            <path d="M2 12 22 2" strokeDasharray="3 3" />
            <path d="M2 22 22 12" strokeDasharray="3 3" />
          </svg>
        );

      case 'select-wand':
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="m15 4-2 2" />
            <path d="M15 9l-2-2" />
            <path d="M3 21l9-9" />
            <path d="m14 2 1.5 2.5L18 5l-2.5 1.5L14 9l-1.5-2.5L10 5l2.5-1.5Z" />
          </svg>
        );

      case 'color-replace':
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="m16 3 4 4-4 4" />
            <path d="M20 7H4" />
            <path d="m8 21-4-4 4-4" />
            <path d="M4 17h16" />
          </svg>
        );

      case 'rotate':
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
          </svg>
        );

      case 'sun':
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2" />
            <path d="M12 20v2" />
            <path d="m4.93 4.93 1.41 1.41" />
            <path d="m17.66 17.66 1.41 1.41" />
            <path d="M2 12h2" />
            <path d="M20 12h2" />
            <path d="m6.34 17.66-1.41 1.41" />
            <path d="m19.07 4.93-1.41 1.41" />
          </svg>
        );

      case 'sparkles':
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
          </svg>
        );

      case 'symmetry':
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <line x1="12" y1="2" x2="12" y2="22" strokeDasharray="3 3" />
            <path d="M4 6h4l3 6-3 6H4Z" />
            <path d="M20 6h-4l-3 6 3 6h4Z" />
          </svg>
        );

      case 'preview':
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <rect width="18" height="14" x="3" y="5" rx="2" />
            <path d="M7 15l3-3 2 2 5-5" />
          </svg>
        );

      case 'grid-iso':
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M12 2L2 7l10 5 10-5-10-5Z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        );

      case 'wrap':
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <rect width="6" height="6" x="9" y="9" rx="1" />
            <rect width="4" height="4" x="3" y="3" opacity="0.5" />
            <rect width="4" height="4" x="17" y="3" opacity="0.5" />
            <rect width="4" height="4" x="3" y="17" opacity="0.5" />
            <rect width="4" height="4" x="17" y="17" opacity="0.5" />
          </svg>
        );

      default:
        return null;
    }
  };

  return <span className="inline-flex items-center justify-center pointer-events-none select-none">{renderSvg()}</span>;
};
