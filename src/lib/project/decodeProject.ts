/**
 * decodeProject.ts
 *
 * Canonical Project Decoder for PixiBun Atelier.
 *
 * Provides a single trusted parsing and validation pathway:
 * Untrusted serialized JSON
 *   -> SafeJson parse (with prototype pollution & size defenses)
 *   -> Structural validation
 *   -> Version migration
 *   -> Aggregate resource budget validation
 *   -> Strongly-typed, normalized ProjectFile
 *
 * Used consistently across IndexedDB restore, duplicate, rename, file import,
 * and external project loading.
 */

import { SafeJson } from '@/lib/safety/safeJson';
import { validateProjectFile } from '@/lib/project/schema';
import type { ProjectValidationResult } from '@/types/project';

/**
 * Decodes and thoroughly validates an untrusted JSON string or object into a verified ProjectFile.
 * Returns a ProjectValidationResult ({ ok: true, value } or { ok: false, error }).
 */
export function decodeAndValidateProject(raw: string | unknown): ProjectValidationResult {
  try {
    const parsed = typeof raw === 'string' ? SafeJson.parse(raw) : raw;
    return validateProjectFile(parsed);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Invalid JSON format in project data.',
    };
  }
}
