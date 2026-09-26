'use client';

import React, { useState, useEffect, useCallback } from 'react';

export function useRadialContextMenu(containerRef?: React.RefObject<HTMLElement | null>) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleContextMenu = useCallback((e: React.MouseEvent | MouseEvent) => {
    // Prevent default context menu
    e.preventDefault();
    setPosition({ x: e.clientX, y: e.clientY });
    setIsOpen(true);
  }, []);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    const target = containerRef?.current ?? document;
    // Also support long-press via touch events
    let timer: number | null = null;
    let isMoving = false;
    
    const handleTouchStart = (e: Event) => {
      const te = e as TouchEvent;
      isMoving = false;
      if (te.touches.length === 1) {
        timer = window.setTimeout(() => {
          if (!isMoving) {
            setPosition({ x: te.touches[0].clientX, y: te.touches[0].clientY });
            setIsOpen(true);
          }
        }, 500); // 500ms long press
      }
    };
    
    const handleTouchMove = () => {
      isMoving = true;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    };
    
    const handleTouchEnd = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    };
    
    // Attach touch events to container (scoped) or document (fallback)
    target.addEventListener('touchstart', handleTouchStart, { passive: true });
    target.addEventListener('touchmove', handleTouchMove, { passive: true });
    target.addEventListener('touchend', handleTouchEnd);
    target.addEventListener('touchcancel', handleTouchEnd);
    
    return () => {
      target.removeEventListener('touchstart', handleTouchStart);
      target.removeEventListener('touchmove', handleTouchMove);
      target.removeEventListener('touchend', handleTouchEnd);
      target.removeEventListener('touchcancel', handleTouchEnd);
      if (timer) clearTimeout(timer);
    };
  }, [containerRef]);

  return {
    isOpen,
    position,
    handleContextMenu,
    closeMenu
  };
}
