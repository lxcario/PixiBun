export type TemplateId = 'bun' | 'mochi' | 'sprout' | 'teacup-frog';

export interface StarterTemplate {
  id: TemplateId;
  /** Human name shown in the gallery, e.g. 'Mochi'. */
  name: string;
  /** One warm sentence under the gallery piece. */
  blurb: string;
  width: number;
  height: number;
  /**
   * Rows of single-char color keys, '.' means transparent.
   * Keys index into TEMPLATE_PALETTE (src/lib/art/starterTemplates.ts).
   */
  rows: string[];
}

/** A visitor's doodle on the landing pad. One byte per cell; 0 = empty. */
export interface DoodlePadState {
  cols: number;
  rows: number;
  cells: Uint8Array;
}