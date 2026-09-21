/**
 * Shared Import Types for PixiBun Atelier.
 *
 * Neutral type contract decoupled from UI modals to maintain proper
 * layer hierarchy: types -> lib -> hooks -> components.
 */

export interface ImportPayload {
  type: 'image' | 'project';
  filename: string;
  dataUrl?: string;
  /** Raw parsed JSON, validated before anything touches studio state. */
  projectJson?: unknown;
  imgWidth?: number;
  imgHeight?: number;
}

export interface ImageImportConfirmPayload {
  canvas: HTMLCanvasElement;
  target: 'new-layer' | 'new-frame' | 'replace-layer' | 'sprite-sheet-append' | 'sprite-sheet-replace';
  extractedPalette: string[];
  addToPalette: boolean;
  filename: string;
  resizeCanvasToMatch?: { width: number; height: number };
  slicedFrames?: HTMLCanvasElement[];
}
