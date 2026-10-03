import type { ImportPayload } from '@/types/import';
import { SafeJson } from '@/lib/safety/safeJson';
import { ImageHeaderProbe } from '@/lib/safety/imageHeaderProbe';
import { studioEvents } from '@/lib/events/studioEvents';
import { RECOVERY_INSPECTION_CEILINGS } from '@/lib/recovery/recoveryLimits';

export function importErrorMessage(error: unknown): string {
  const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
  if (code === 'SAFE_JSON_SYNTAX_ERROR') return 'The project file is not valid JSON. Choose a valid .pixibun backup.';
  if (typeof code === 'string' && code.startsWith('SAFE_JSON_')) return 'The project file is too large or complex to import. Choose a smaller backup.';
  if (error instanceof Error && error.message.startsWith('[ImageHeaderProbe]')) {
    return error instanceof RangeError ? 'The image dimensions exceed the import limits or are invalid. Choose a smaller valid image.'
      : 'The image file is damaged or unsupported. Choose a PNG, JPEG, GIF, WebP or BMP image.';
  }
  return error instanceof Error ? error.message : 'The file could not be imported.';
}

/** Shared admission path for picker, drop and clipboard, before decoding. */
export async function readImportFile(file: File): Promise<ImportPayload> {
  if (file.size > SafeJson.MAX_PAYLOAD_BYTES) throw new Error('Import exceeds the 50 MB file limit.');
  if (/\.(pixibun|json)$/i.test(file.name)) {
    return { type: 'project', filename: file.name, projectJson: SafeJson.parse(await file.text(), {
      maxTraversedNodes: RECOVERY_INSPECTION_CEILINGS.MAX_METADATA_NODES,
    }) };
  }
  const dimensions = await ImageHeaderProbe.probe(file);
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('The image file could not be read.'));
    reader.readAsDataURL(file);
  });
  return { type: 'image', filename: file.name, dataUrl, imgWidth: dimensions.width, imgHeight: dimensions.height };
}

export function reportImportError(error: unknown): void {
  console.error('Import failed:', error);
  const message = importErrorMessage(error);
  studioEvents.emit('pixibun:toast', { message, type: 'error' });
}
