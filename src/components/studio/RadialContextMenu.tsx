'use client';

import React from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { PixelIcon, PixelIconName } from '@/components/ui/PixelIcon';
import { ToolType } from '@/types/tools';

interface RadialContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  onClose: () => void;
}

export const RadialContextMenu: React.FC<RadialContextMenuProps> = ({ isOpen, position, onClose }) => {
  const { tools, setActiveTool, primaryColor, secondaryColor, swapColors } = useStudioStore();
  const menuRef = React.useRef<HTMLDivElement>(null);
  const openerRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
        openerRef.current = document.activeElement;
      }
      
      const explicitFocus = menuRef.current?.querySelector<HTMLElement>('[data-autofocus="true"]');
      if (explicitFocus) {
        explicitFocus.focus();
      } else {
        menuRef.current?.focus();
      }
    } else {
      if (openerRef.current && typeof openerRef.current.focus === 'function') {
        openerRef.current.focus();
      }
    }
  }, [isOpen]);

  const handleTool = (tool: ToolType) => {
    setActiveTool(tool);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }

    if (e.key === 'Tab' && menuRef.current) {
      const focusable = menuRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  const primaryTools: { id: ToolType; label: string; icon: PixelIconName }[] = [
    { id: 'pen', label: 'Pen', icon: 'pen' },
    { id: 'eraser', label: 'Eraser', icon: 'eraser' },
    { id: 'bucket', label: 'Fill', icon: 'bucket' },
    { id: 'eyedropper', label: 'Eyedropper', icon: 'eyedropper' },
  ];

  if (!isOpen) return null;

  const menuWidth = 240;
  const menuHeight = 56;
  const clampedX = typeof window !== 'undefined'
    ? Math.max(12, Math.min(window.innerWidth - menuWidth - 12, position.x - 48))
    : position.x - 48;
  const clampedY = typeof window !== 'undefined'
    ? Math.max(12, Math.min(window.innerHeight - menuHeight - 12, position.y - 48))
    : position.y - 48;

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
      {/* eslint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */}
      <div 
        ref={menuRef}
        className="fixed z-50 flex flex-col items-center gap-2 outline-none"
        style={{ left: clampedX, top: clampedY }}
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-modal="true"
        aria-label="Radial tools menu"
        tabIndex={0}
      >
      {/* eslint-enable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */}
        <div 
          className="bg-[var(--desk-surface-raised)] border-2 border-[var(--desk-border)] rounded-[4px] p-2 shadow-xl flex gap-2"
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          {primaryTools.map(tool => (
            <button
              key={tool.id}
              onClick={() => handleTool(tool.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleTool(tool.id);
              }}
              onPointerUp={(e) => {
                if (e.button === 0 || e.button === 2) {
                  e.preventDefault();
                  e.stopPropagation();
                  handleTool(tool.id);
                }
              }}
              className={`w-9 h-9 flex items-center justify-center rounded-[2px] border-2 cursor-pointer transition-transform ${
                tools.activeTool === tool.id 
                  ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120] scale-110' 
                  : 'bg-[var(--desk-surface)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[#f0be7c] hover:bg-[#2e2040] focus:ring-2 focus:ring-[#f0be7c]'
              }`}
              title={`${tool.label} (Click or Right-Click to choose)`}
              data-autofocus={tools.activeTool === tool.id}
            >
              <PixelIcon name={tool.icon} size={16} />
            </button>
          ))}
          <div className="w-px bg-[var(--desk-border)] mx-1" />
          <div className="relative w-9 h-9">
            <button
              type="button"
              onClick={() => { swapColors(); onClose(); }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                swapColors();
                onClose();
              }}
              onPointerUp={(e) => {
                if (e.button === 0 || e.button === 2) {
                  e.preventDefault();
                  e.stopPropagation();
                  swapColors();
                  onClose();
                }
              }}
              style={{ backgroundColor: secondaryColor }}
              className="absolute bottom-0 right-0 w-6 h-6 rounded-[2px] border-2 border-[var(--desk-border)] shadow-[0_2px_0_var(--btn-shadow)] cursor-pointer hover:scale-110 transition-transform focus:ring-2"
              title="Secondary Color (Click or Right-Click to Swap)"
            />
            <button
              type="button"
              style={{ backgroundColor: primaryColor }}
              onClick={onClose}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }}
              onPointerUp={(e) => {
                if (e.button === 0 || e.button === 2) {
                  e.preventDefault();
                  e.stopPropagation();
                  onClose();
                }
              }}
              className="absolute top-0 left-0 w-6 h-6 rounded-[2px] border-2 border-[#f0be7c] shadow-[0_2px_4px_rgba(0,0,0,0.6)] z-10 cursor-pointer"
              title="Primary Color"
            />
          </div>
        </div>
      </div>
    </>
  );
};
