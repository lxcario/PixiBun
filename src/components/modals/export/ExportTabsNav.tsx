'use client';

import React from 'react';

export type ExportType =
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

export const EXPORT_TYPES: readonly ExportType[] = [
  'png',
  'gif',
  'apng',
  'webm',
  'mp4',
  'spritesheet',
  'godot-kit',
  'replay',
  'svg',
  'shader',
  'palette-cycle',
  'project',
] as const;

interface ExportTabsNavProps {
  exportType: ExportType;
  onSelectType: (type: ExportType) => void;
  isExporting: boolean;
}

const INTENT_GROUPS: { label: string; types: readonly ExportType[] }[] = [
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
    <div className="flex flex-col gap-2 bg-[var(--desk-surface)] p-2.5 rounded-[2px] border-2 border-[var(--desk-border)]">
      {INTENT_GROUPS.map((group) => (
        <div key={group.label} className="flex flex-col gap-1">
          <span className="text-[9px] font-mono uppercase tracking-wider text-[var(--text-muted)] font-semibold">
            {group.label}
          </span>
          <div className="flex flex-wrap gap-1">
            {group.types.map((type) => (
              <button
                key={type}
                type="button"
                disabled={isExporting}
                onClick={() => onSelectType(type)}
                aria-label={getTabLabel(type)}
                data-testid={`export-tab-${type}`}
                className={`py-1 px-2 rounded-[2px] text-xs font-mono font-bold cursor-pointer ${
                  exportType === type
                    ? 'bg-[var(--primary-bg)] text-[var(--primary-fg)] shadow-xs'
                    : 'text-[var(--text-body)] hover:text-[var(--text-heading)] hover:bg-[var(--surface-2)] bg-[var(--surface-0)] border border-[var(--desk-border)]'
                } ${isExporting ? 'opacity-50 cursor-not-allowed' : ''}`}
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
