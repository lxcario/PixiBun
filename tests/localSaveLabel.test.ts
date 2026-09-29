import { describe, expect, it } from 'vitest';
import { getLocalSaveLabel } from '@/lib/project/localSaveLabel';

describe('local save copy', () => {
  it('never calls an unwritten or dirty project saved', () => {
    expect(getLocalSaveLabel('idle', false)).toBe('Not saved yet');
    expect(getLocalSaveLabel('saved', true)).toBe('Unsaved changes');
    expect(getLocalSaveLabel('saving', true)).toBe('Saving locally…');
    expect(getLocalSaveLabel('error', true)).toBe('Local save failed');
  });

  it('announces a confirmed write without persistent storage copy', () => {
    expect(getLocalSaveLabel('saved', false)).toBe('Changes saved');
  });
});
