'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { useStudioStore } from '@/stores/studioStore';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { CANONICAL_TOOLS } from '@/config/shortcuts';
import type { ToolType } from '@/types/tools';

interface RadialContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  viewportRef: React.RefObject<HTMLElement | null>;
}

const quickToolIds: ToolType[] = ['pen', 'eraser', 'bucket', 'eyedropper', 'select-box', 'select-lasso', 'select-wand', 'line', 'rectangle', 'ellipse'];
const quickTools = quickToolIds.map(id => CANONICAL_TOOLS.find(tool => tool.id === id)!);

export const RadialContextMenu = React.memo(function RadialContextMenu({ isOpen, position, onClose, viewportRef }: RadialContextMenuProps) {
  const activeTool = useStudioStore(s => s.tools.activeTool);
  const setActiveTool = useStudioStore(s => s.setActiveTool);
  const primaryColor = useStudioStore(s => s.primaryColor);
  const secondaryColor = useStudioStore(s => s.secondaryColor);
  const swapColors = useStudioStore(s => s.swapColors);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useLayoutEffect(() => {
    if (!isOpen) return;
    const place = () => {
      if (!viewportRef.current?.getClientRects().length) { onClose(); return; }
      const menu = menuRef.current;
      if (!menu) return;
      const bounds = menu.getBoundingClientRect();
      menu.style.left = `${Math.max(12, Math.min(window.innerWidth - bounds.width - 12, position.x + 12))}px`;
      menu.style.top = `${Math.max(12, Math.min(window.innerHeight - bounds.height - 12, position.y + 12))}px`;
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [isOpen, position, onClose, viewportRef]);

  React.useEffect(() => {
    if (!isOpen) return;
    const opener = document.activeElement instanceof HTMLElement && document.activeElement !== document.body
      ? document.activeElement : document.getElementById('center-canvas-area');
    (menuRef.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]') ?? menuRef.current?.querySelector<HTMLButtonElement>('button'))?.focus();
    return () => { if (opener?.isConnected && opener.getClientRects().length) opener.focus({ preventScroll: true }); };
  }, [isOpen]);

  const choose = (tool: ToolType) => { setActiveTool(tool); onClose(); };
  const handleKeyDown = (event: React.KeyboardEvent) => {
    event.stopPropagation();
    if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
    const buttons = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('button') ?? []);
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const offset = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowDown' ? 2 : event.key === 'ArrowUp' ? -2 : 0;
    if (offset || event.key === 'Home' || event.key === 'End' || event.key === 'Tab') {
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1
        : (index + (offset || (event.shiftKey ? -1 : 1)) + buttons.length) % buttons.length;
      buttons[next]?.focus();
    }
  };

  if (!isOpen) return null;
  // Portals still bubble React events through the viewport: stop the entire
  // pointer sequence so canvas capture cannot steal a tool click or paint below it.
  return createPortal(
    <div
      className="fixed inset-0 z-[100]"
      onPointerDown={event => event.stopPropagation()}
      onPointerMove={event => event.stopPropagation()}
      onPointerUp={event => event.stopPropagation()}
      onPointerCancel={event => event.stopPropagation()}
      onContextMenu={event => { event.preventDefault(); event.stopPropagation(); }}
    >
      <button type="button" className="absolute inset-0 h-full w-full cursor-default bg-transparent border-0" aria-label="Close canvas tools" tabIndex={-1}
        onPointerDown={event => { event.preventDefault(); onClose(); }} onContextMenu={onClose} />
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- The dialog implements keyboard navigation and focus containment for its native buttons. */}
      <div ref={menuRef} role="dialog" aria-modal="true" aria-label="Canvas tools" aria-describedby="canvas-tools-help"
        onKeyDown={handleKeyDown}
        className="fixed overflow-y-auto border-2 border-[var(--desk-border)] bg-[var(--desk-surface-raised)] p-2 shadow-xl rounded-[4px] text-[var(--text-body)]"
        style={{ left: 12, top: 12, width: 'min(304px, calc(100vw - 24px))', maxHeight: 'calc(100dvh - 24px)' }}>
        <div className="flex h-7 items-center justify-between text-xs font-semibold"><span>Canvas tools</span><span className="font-normal text-[var(--text-muted)]">Esc to close</span></div>
        <div className="grid grid-cols-2 gap-1">
          {quickTools.map(tool => <button key={tool.id} type="button" aria-label={tool.label} aria-pressed={activeTool === tool.id}
            onClick={() => choose(tool.id)} onContextMenu={() => choose(tool.id)} title={`${tool.label} (${tool.shortcut})`}
            className={`flex h-9 min-w-0 items-center gap-2 px-2 border rounded-[2px] text-xs leading-none cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--accent-gold)] ${activeTool === tool.id ? 'bg-[var(--tool-active-bg)] text-[var(--tool-active-fg)] border-[var(--tool-active-border)]' : 'bg-[var(--desk-surface)] border-[var(--desk-border)] hover:bg-[var(--surface-3)]'}`}>
            <PixelIcon name={tool.icon} size={14} /><span className="truncate">{tool.label}</span><span aria-hidden="true" className="ml-auto text-[10px]">{tool.shortcut}</span>
          </button>)}
        </div>
        <button type="button" onClick={() => { swapColors(); onClose(); }} onContextMenu={() => { swapColors(); onClose(); }}
          className="mt-2 flex h-9 w-full items-center justify-center gap-2 border border-[var(--desk-border)] bg-[var(--desk-surface)] text-xs cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--accent-gold)]" aria-label="Swap primary and secondary colors">
          <span aria-hidden="true" className="flex gap-1"><span className="h-4 w-4 border border-[var(--desk-border)]" style={{ backgroundColor: primaryColor }} /><span className="h-4 w-4 border border-[var(--desk-border)]" style={{ backgroundColor: secondaryColor }} /></span>
          <span>Swap colors</span><span aria-hidden="true">X</span>
        </button>
        <p id="canvas-tools-help" className="mt-2 text-[11px] leading-4 text-[var(--text-muted)]">Choose with either mouse button. Arrow keys move; Enter selects.</p>
      </div>
    </div>, document.body
  );
});
