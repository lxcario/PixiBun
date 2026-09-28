import { RECOVERY_INSPECTION_CEILINGS } from '@/lib/recovery/recoveryLimits';

export const MAX_PROJECT_NAME_LENGTH = RECOVERY_INSPECTION_CEILINGS.MAX_PROJECT_NAME_LENGTH;
export const MAX_METADATA_NAME_LENGTH = RECOVERY_INSPECTION_CEILINGS.MAX_IDENTIFIER_LENGTH;
export const MAX_PROJECT_CLIPS = RECOVERY_INSPECTION_CEILINGS.MAX_INSPECTABLE_CLIPS;

export function makeLayerCopyName(name: string): string {
  const suffix = ' (Copy)';
  const stemLimit = MAX_METADATA_NAME_LENGTH - suffix.length;
  let stem = '';
  for (const character of name) {
    if (stem.length + character.length > stemLimit) break;
    stem += character;
  }
  return `${stem}${suffix}`;
}

export function projectNameError(name: string): string | null {
  if (typeof name !== 'string' || name.trim().length === 0) return 'Project name cannot be empty.';
  if (name.length > MAX_PROJECT_NAME_LENGTH) {
    return `Project name must be at most ${MAX_PROJECT_NAME_LENGTH} characters.`;
  }
  return null;
}

export function metadataNameError(name: string, kind: 'layer' | 'clip'): string | null {
  if (typeof name !== 'string' || name.length > MAX_METADATA_NAME_LENGTH) {
    return `${kind === 'layer' ? 'Layer' : 'Clip'} name must be at most ${MAX_METADATA_NAME_LENGTH} characters.`;
  }
  return null;
}

export function clipRangeError(startFrame: number, endFrame: number, frameCount: number): string | null {
  if (
    !Number.isInteger(startFrame) || !Number.isInteger(endFrame) ||
    startFrame < 0 || startFrame > endFrame || endFrame >= frameCount
  ) {
    return 'Clip frames must form a valid range within the animation.';
  }
  return null;
}
