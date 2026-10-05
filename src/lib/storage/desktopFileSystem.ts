/**
 * desktopFileSystem.ts
 *
 * Native Desktop Ergonomics & File System Access API for PixiBun Atelier.
 * Provides direct, in-place file editing and saving on Chromium browsers (Chrome, Edge, Opera, Brave)
 * using window.showSaveFilePicker / window.showOpenFilePicker / FileSystemFileHandle,
 * with zero external dependencies and graceful, robust fallbacks for Firefox, Safari, and headless contexts.
 */

import { SafeJson } from '@/lib/safety/safeJson';

interface FileHandleWithPermissions extends FileSystemFileHandle {
  queryPermission?: (descriptor: { mode: string }) => Promise<PermissionState>;
  requestPermission?: (descriptor: { mode: string }) => Promise<PermissionState>;
}

interface FilePickerWindow extends Window {
  showOpenFilePicker?: (options?: unknown) => Promise<FileSystemFileHandle[]>;
  showSaveFilePicker?: (options?: unknown) => Promise<FileSystemFileHandle>;
}

export const PIXIBUN_FILE_TYPES = [
  {
    description: 'PixiBun Project File (*.pixibun)',
    accept: { 'application/json': ['.pixibun', '.json'] },
  },
];

export async function verifyHandlePermission(
  handle: FileSystemFileHandle,
  mode: 'read' | 'readwrite' = 'readwrite'
): Promise<boolean> {
  const h = handle as FileHandleWithPermissions;
  if (typeof h.queryPermission !== 'function') return true;

  try {
    const status = await h.queryPermission({ mode });
    if (status === 'granted') return true;
    if (status === 'prompt' && typeof h.requestPermission === 'function') {
      const requested = await h.requestPermission({ mode });
      return requested === 'granted';
    }
  } catch {
    return false;
  }
  return false;
}

export class DesktopFileSystem {
  private static activeHandle: FileSystemFileHandle | null = null;
  private static activeProjectId: string | undefined;
  private static activeFilename: string | null = null;
  private static associationEpoch = 0;
  private static saveInFlight = false;

  public static isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof (window as FilePickerWindow).showOpenFilePicker === 'function' &&
      typeof (window as FilePickerWindow).showSaveFilePicker === 'function'
    );
  }

  public static getActiveHandle(): FileSystemFileHandle | null {
    return this.activeHandle;
  }

  public static getActiveFilename(): string | null {
    return this.activeFilename;
  }

  public static setActiveHandle(handle: FileSystemFileHandle | null, filename?: string | null): void {
    this.associationEpoch += 1;
    this.activeHandle = handle;
    this.activeFilename = filename ?? handle?.name ?? null;
  }

  public static captureAssociation() {
    return { handle: this.activeHandle, projectId: this.activeProjectId, filename: this.activeFilename };
  }

  public static restoreAssociation(saved: ReturnType<typeof DesktopFileSystem.captureAssociation>): void {
    this.associationEpoch += 1;
    this.activeHandle = saved.handle;
    this.activeProjectId = saved.projectId;
    this.activeFilename = saved.filename;
  }

  public static reset(): void {
    this.associationEpoch += 1;
    this.activeProjectId = undefined;
    this.activeHandle = null;
    this.activeFilename = null;
  }

  public static verifyHandlePermission = verifyHandlePermission;

  /**
   * Opens an existing project file from disk.
   * Uses native showOpenFilePicker when supported, or a transient hidden file input fallback.
   */
  public static async openProject(): Promise<{
    filename: string;
    content: string;
    handle?: FileSystemFileHandle;
  } | null> {
    if (this.isSupported()) {
      try {
        const picker = (window as FilePickerWindow).showOpenFilePicker;
        if (!picker) throw new Error('File picker is unavailable');

        const [handle] = await picker({
          multiple: false,
          types: PIXIBUN_FILE_TYPES,
        });

        if (!handle) return null;

        const hasPermission = await verifyHandlePermission(handle, 'read');
        if (!hasPermission) return null;

        const file = await handle.getFile();
        if (file.size > SafeJson.MAX_PAYLOAD_BYTES) throw new Error('Project exceeds the 50 MB import limit.');
        const content = await file.text();
        SafeJson.parse(content);

        this.setActiveHandle(handle, file.name);
        return { filename: file.name, content, handle };
      } catch (err: unknown) {
        if ((err as Error).name === 'AbortError') return null; // User cancelled dialog
        throw err;
      }
    }

    // DOM Fallback: Invisible input[type=file]
    if (typeof document === 'undefined') return null;

    return new Promise<{ filename: string; content: string } | null>((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.pixibun,.json';
      input.style.display = 'none';

      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) {
          resolve(null);
          return;
        }
        try {
          if (file.size > SafeJson.MAX_PAYLOAD_BYTES) throw new Error('Project exceeds the 50 MB import limit.');
          const content = await file.text();
          SafeJson.parse(content);
          DesktopFileSystem.setActiveHandle(null, file.name);
          resolve({ filename: file.name, content });
        } catch (e) {
          reject(e);
        } finally {
          input.remove();
        }
      };

      document.body.appendChild(input);
      input.click();
    });
  }

  /**
   * Saves project data to disk.
   * If an active file handle exists and `forceSaveAs` is false, it overwrites in-place without prompting.
   * Otherwise, opens showSaveFilePicker or initiates an anchor download fallback.
   */
  public static async saveProject(
    data: string | Blob,
    suggestedName: string = 'project.pixibun',
    forceSaveAs: boolean = false,
    projectId?: string,
    signal?: AbortSignal
  ): Promise<{ success: boolean; filename: string; fallbackUsed: boolean; error?: string }> {
    signal?.throwIfAborted();
    if (this.saveInFlight) return { success: false, filename: suggestedName, fallbackUsed: false, error: 'A project file is still being written. Try again after it finishes.' };
    this.saveInFlight = true;
    const associationEpoch = this.associationEpoch;
    try {
      if (this.isSupported()) {
        try {
          let handle = this.activeProjectId === projectId ? this.activeHandle : null;

          if (!handle || forceSaveAs) {
            const savePicker = (window as FilePickerWindow).showSaveFilePicker;
            if (!savePicker) throw new Error('Save picker is unavailable');

            handle = await savePicker({
              suggestedName,
              types: PIXIBUN_FILE_TYPES,
            });
          }

          signal?.throwIfAborted();
          const hasPermission = await verifyHandlePermission(handle, 'readwrite');
          signal?.throwIfAborted();
          if (!hasPermission) {
            return { success: false, filename: handle.name, fallbackUsed: false, error: 'Permission denied' };
          }

          const writable = await handle.createWritable();
          try {
            signal?.throwIfAborted();
            await writable.write(data);
            signal?.throwIfAborted();
            await writable.close();
          } catch (error) {
            try { await writable.abort(error); }
            catch { console.warn('The failed project file write could not be discarded.'); }
            throw error;
          }

          // A reset/open during the picker or write owns the current association.
          // Closing commits the file; cancellation after that cannot undo it.
          if (!signal?.aborted && this.associationEpoch === associationEpoch) {
            this.setActiveHandle(handle, handle.name);
            this.activeProjectId = projectId;
          }

          return { success: true, filename: handle.name, fallbackUsed: false };
        } catch (err: unknown) {
          if ((err as Error).name === 'AbortError') {
            return { success: false, filename: suggestedName, fallbackUsed: false, error: 'Save cancelled by user' };
          }
          throw err;
        }
      }

      // DOM Fallback: <a download>
      signal?.throwIfAborted();
      if (typeof document === 'undefined') {
        return { success: false, filename: suggestedName, fallbackUsed: true, error: 'Document unavailable' };
      }

      const blob = typeof data === 'string' ? new Blob([data], { type: 'application/json' }) : data;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = suggestedName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      return { success: true, filename: suggestedName, fallbackUsed: true };
    } finally { this.saveInFlight = false; }
  }
}
