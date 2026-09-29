export type LocalSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function getLocalSaveLabel(status: LocalSaveStatus, isDirty: boolean): string {
  if (status === 'error') return 'Local save failed';
  if (status === 'saving') return 'Saving locally…';
  if (isDirty) return 'Unsaved changes';
  if (status === 'saved') return 'Saved on this device';
  return 'Not saved yet';
}
