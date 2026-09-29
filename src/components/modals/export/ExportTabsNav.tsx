'use client';

import React from 'react';

export type ExportType =
  | 'png'
  | 'gif'
  | 'apng'
  | 'webm'
  | 'mp4'
  | 'spritesheet'
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

export const ExportTabsNav: React.FC<ExportTabsNavProps> = ({
  exportType,
  onSelectType,
  isExporting,
}) => {
  const getTabLabel = (type: ExportType) => {
    switch (type) {
      case 'spritesheet':
        return 'Sprite Sheet';
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
    <div className="flex flex-wrap gap-1 bg-[var(--desk-surface)] p-1 rounded-[2px] border-2 border-[var(--desk-border)]">
      {EXPORT_TYPES.map((type) => (
        <button
          key={type}
          type="button"
          disabled={isExporting}
          onClick={() => onSelectType(type)}
          aria-label={getTabLabel(type)}
          data-testid={`export-tab-${type}`}
          className={`flex-1 min-w-[70px] py-1.5 px-2 rounded-[2px] text-xs font-mono font-bold transition-colors cursor-pointer capitalize ${
            exportType === type
              ? 'bg-[#f0be7c] text-[#140d1f] shadow-xs'
              : 'text-[var(--text-body)] hover:text-[#f0be7c] hover:bg-[var(--desk-surface)]'
          } ${isExporting ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {getTabLabel(type)}
        </button>
      ))}
    </div>
  );
};
