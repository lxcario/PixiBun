'use client';

import React from 'react';

export type ExportType =
  | 'cart'
  | 'light-sweep'
  | 'png'
  | 'gif'
  | 'apng'
  | 'webm'
  | 'mp4'
  | 'spritesheet'
  | 'godot-kit'
  | 'replay'
  | 'svg'
  | 'shader'
  | 'palette-cycle'
  | 'project';

interface ExportTabsNavProps {
  exportType: ExportType;
  onSelectType: (type: ExportType) => void;
  isExporting: boolean;
}

const INTENT_GROUPS: { label: string; types: readonly ExportType[] }[] = [
  {
    label: 'Share',
    types: ['cart', 'light-sweep'],
  },
  {
    label: 'Image & Animation',
    types: ['png', 'gif', 'apng', 'webm', 'mp4', 'svg', 'replay'],
  },
  {
    label: 'Game Delivery',
    types: ['spritesheet', 'godot-kit', 'shader', 'palette-cycle'],
  },
  {
    label: 'Backup & Archive',
    types: ['project'],
  },
];

export const ExportTabsNav: React.FC<ExportTabsNavProps> = ({
  exportType,
  onSelectType,
  isExporting,
}) => {
  const getTabLabel = (type: ExportType) => {
    switch (type) {
      case 'cart':
        return 'Cart';
      case 'light-sweep':
        return 'Light Sweep';
      case 'spritesheet':
        return 'Sprite Sheet';
      case 'godot-kit':
        return 'Godot Kit';
      case 'replay':
        return 'Timelapse';
      case 'svg':
        return 'Vector SVG';
      case 'webm':
        return 'WebM Video';
      case 'mp4':
        return 'MP4 Video';
      case 'apng':
        return 'APNG';
      case 'shader':
        return 'Shaders';
      case 'palette-cycle':
        return 'Cycle Loop';
      case 'project':
        return 'Project Backup';
      default:
        return type.toUpperCase();
    }
  };

  return (
    <div className="pb-box flex flex-col gap-3">
      {INTENT_GROUPS.map((group) => (
        <div key={group.label} className="flex flex-col gap-1.5">
          <span className="pb-eyebrow !m-0 !mx-0.5">
            {group.label}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {group.types.map((type) => (
              <button
                key={type}
                type="button"
                disabled={isExporting}
                onClick={() => onSelectType(type)}
                aria-label={getTabLabel(type)}
                aria-pressed={exportType === type}
                data-testid={`export-tab-${type}`}
                className={`pb-pill ${isExporting ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {getTabLabel(type)}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
