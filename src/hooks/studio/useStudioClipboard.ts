'use client';

import { readImportFile, reportImportError } from '@/lib/project/importFile';
import { useEffect } from 'react';
import type { ImportPayload } from '@/components/modals/ImportModal';

export function useStudioClipboard(handleOpenImport: (payload: ImportPayload) => void) {
  // Global Clipboard Paste (Ctrl+V) for Image Files
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.tagName === 'SELECT'
      ) {
        return;
      }

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
