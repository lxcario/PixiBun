'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { buildProjectFileAsync } from '@/lib/project/serialize';
import { DesktopFileSystem } from '@/lib/storage/desktopFileSystem';
import { studioEvents } from '@/lib/events/studioEvents';

export function useStudioFileSystem() {
  const projectName = useStudioStore((s) => s.projectName);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const saveToastTimerRef = useRef<number | null>(null);

  // Affirmative explicit save confirmation toast helper (UX-14)
  const triggerSaveToast = useCallback(() => {
    if (saveToastTimerRef.current !== null) {
      window.clearTimeout(saveToastTimerRef.current);
    }
    setSaveToast(`Saved "${projectName || 'project'}" to browser storage`);
    saveToastTimerRef.current = window.setTimeout(() => {
      setSaveToast(null);
      saveToastTimerRef.current = null;
    }, 2500);
  }, [projectName]);

  useEffect(() => {
    return () => {
      if (saveToastTimerRef.current !== null) {
        window.clearTimeout(saveToastTimerRef.current);
      }
    };
  }, []);

  // Desktop In-Place Save (File System Access API)
  const handleSaveDesktopProject = useCallback(
    async (forceSaveAs = false) => {
      try {
        const snapshot = useStudioStore.getState();
        const project = await buildProjectFileAsync();
        const jsonStr = JSON.stringify(project, null, 2);
        const filename = `${(snapshot.projectName || 'project').toLowerCase().replace(/\s+/g, '-')}.pixibun`;
        const res = await DesktopFileSystem.saveProject(jsonStr, filename, forceSaveAs, snapshot.currentProjectId);
        if (!res.success && res.error !== 'Save cancelled by user') {
          studioEvents.emit('pixibun:toast', { type: 'error', message: res.error || 'The project file could not be written. Your drawing is still open. Try again or download a backup.' });
        }
      } catch (err) {
        console.error('Desktop save error:', err);
        studioEvents.emit('pixibun:toast', { type: 'error', message: 'The project file could not be written. Your drawing is still open. Try again or download a backup.' });
      }
    },
    []
  );

  return {
    saveToast,
    triggerSaveToast,
    handleSaveDesktopProject,
  };
}
