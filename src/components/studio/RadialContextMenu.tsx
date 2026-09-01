'use client';

import React from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { ToolType } from '@/types/tools';

interface RadialContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  onClose: () => void;
}

export const RadialContextMenu: React.FC<RadialContextMenuProps> = ({ isOpen, position, onClose }) => {
  const { tools, setActiveTool, primaryColor, secondaryColor, swapColors } = useStudioStore();

  if (!isOpen) return null;

  const handleTool = (tool: ToolType) => {
    setActiveTool(tool);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };

  const primaryTools: { id: ToolType; label: string; icon: string }[] = [
    { id: 'pen', label: 'Pen', icon: 'pen' },
    { id: 'eraser', label: 'Eraser', icon: 'eraser' },
    { id: 'bucket', label: 'Fill', icon: 'bucket' },
    { id: 'eyedropper', label: 'Eyedropper', icon: 'eyedropper' },
  ];

  return (
    <>
      <button 
        type="button"
        className="fixed inset-0 z-40 w-full h-full bg-transparent border-none cursor-default" 
        onClick={onClose}
        onContextMenu={(e) => { e.preventDefault(); onClose(); }}
        aria-label="Close radial menu"
        tabIndex={-1}
      />
      {/* eslint-disable */}
      <div 
        className="fixed z-50 flex flex-col items-center gap-2 outline-none"
        style={{ left: position.x - 48, top: position.y - 48 }}
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-modal="true"
        tabIndex={0}
      >
        <div className="bg-[var(--desk-surface-raised)] border-2 border-[var(--desk-border)] rounded-[4px] p-2 shadow-xl flex gap-2">
          {primaryTools.map(tool => (
            <button
              key={tool.id}
              onClick={() => handleTool(tool.id)}
              className={`w-9 h-9 flex items-center justify-center rounded-[2px] border-2 cursor-pointer transition-transform ${
                tools.activeTool === tool.id 
                  ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120] scale-110' 
                  : 'bg-[var(--desk-surface)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[#f0be7c] hover:bg-[#2e2040] focus:ring-2 focus:ring-[#f0be7c]'
              }`}
              title={tool.label}
              data-autofocus={tools.activeTool === tool.id}
            >
              <PixelIcon name={tool.icon as any} size={16} />
            </button>
          ))}
          <div className="w-px bg-[var(--desk-border)] mx-1" />
          <div className="relative w-9 h-9">
            <button
              type="button"
              onClick={() => { swapColors(); onClose(); }}
              style={{ backgroundColor: secondaryColor }}
              className="absolute bottom-0 right-0 w-6 h-6 rounded-[2px] border-2 border-[var(--desk-border)] shadow-[0_2px_0_var(--btn-shadow)] cursor-pointer hover:scale-110 transition-transform focus:ring-2"
              title="Secondary Color (Click to Swap)"
            />
            <button
              type="button"
              style={{ backgroundColor: primaryColor }}
              onClick={onClose}
              className="absolute top-0 left-0 w-6 h-6 rounded-[2px] border-2 border-[#f0be7c] shadow-[0_2px_4px_rgba(0,0,0,0.6)] z-10"
              title="Primary Color"
            />
          </div>
        </div>
      </div>
    </>
  );
};
