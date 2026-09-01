'use client';

import { useState, useEffect, useCallback } from 'react';

export function useRadialContextMenu() {
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
    // Also support long-press via touch events
    let timer: number | null = null;
    let isMoving = false;
    
    const handleTouchStart = (e: TouchEvent) => {
      isMoving = false;
      if (e.touches.length === 1) {
        timer = window.setTimeout(() => {
          if (!isMoving) {
            setPosition({ x: e.touches[0].clientX, y: e.touches[0].clientY });
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
    
    // Attach touch events globally or just document
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('touchcancel', handleTouchEnd);
    
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchEnd);
      if (timer) clearTimeout(timer);
    };
  }, []);

  return {
    isOpen,
    position,
    handleContextMenu,
    closeMenu
  };
}
