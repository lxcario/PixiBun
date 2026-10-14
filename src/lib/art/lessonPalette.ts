import { TEMPLATE_PALETTE } from './starterTemplates';
import { LESSON_EXTRA_PALETTE } from './lessonArt';

/** Every color a Playground lesson pose can use: the starter palette plus the lesson extras. */
export const LESSON_PALETTE: Record<string, string> = { ...TEMPLATE_PALETTE, ...LESSON_EXTRA_PALETTE };
