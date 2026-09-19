import type { ImportPayload } from '@/components/modals/ImportModal';
import { SafeJson } from '@/lib/safety/safeJson';
import { ImageHeaderProbe } from '@/lib/safety/imageHeaderProbe';

/** Shared admission path for picker, drop and clipboard, before decoding. */
export async function readImportFile(file: File): Promise<ImportPayload> {
  if (file.size > SafeJson.MAX_PAYLOAD_BYTES) throw new Error('Import exceeds the 50 MB file limit.');
  if (/\.(pixibun|json)$/i.test(file.name)) {
    return { type: 'project', filename: file.name, projectJson: SafeJson.parse(await file.text()) };
  }
  const dimensions = await ImageHeaderProbe.probe(file);
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('The image file could not be read.'));
    reader.readAsDataURL(file);
  });
  await new Promise<void>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('The image could not be decoded.'));
    img.src = dataUrl;
  });
  return { type: 'image', filename: file.name, dataUrl, imgWidth: dimensions.width, imgHeight: dimensions.height };
}

export function reportImportError(error: unknown): void {
  window.alert(error instanceof Error ? error.message : 'The file could not be imported.');
}
