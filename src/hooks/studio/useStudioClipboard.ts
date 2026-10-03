'use client';

import { readImportFile, reportImportError } from '@/lib/project/importFile';
import { useEffect } from 'react';
import type { ImportPayload } from '@/components/modals/ImportModal';
import { shouldIgnoreWorkspaceEvent } from '@/lib/input/workspaceKeyboard';

export function useStudioClipboard(handleOpenImport: (payload: ImportPayload) => void) {
  // Global Clipboard Paste (Ctrl+V) for Image Files
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (shouldIgnoreWorkspaceEvent(e)) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            void readImportFile(file).then(handleOpenImport).catch(reportImportError);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handleOpenImport]);
}
