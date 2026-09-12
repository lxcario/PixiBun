/**
 * safeJson.ts
 *
 * Prototype-pollution immune JSON parsing and sanitization for PixiBun Atelier.
 *
 * Academic & Security References:
 * 1. Common Weakness Enumeration (CWE): CWE-1321
 *    "Improperly Controlled Modification of Dynamically-Determined Object Attributes ('Prototype Pollution')"
 * 2. Arteau, Olivier. "Prototype Pollution: The New Vulnerability Class in Node.js Applications."
 *    NorthSec Conference, 2018.
 */

export class SafeJson {
  /**
   * Maximum allowed JSON payload size (50 MB).
   * Mitigates Denial-of-Service (DoS) and heap out-of-memory crashes on untrusted imports.
   */
  public static readonly MAX_PAYLOAD_BYTES = 50 * 1024 * 1024;

  /**
   * Maximum recursion depth to prevent call-stack overflow attacks.
   */
  public static readonly MAX_RECURSION_DEPTH = 32;

  /**
   * Parses untrusted JSON while stripping prototype-pollution keys (__proto__, constructor, prototype)
   * and enforcing a recursion depth ceiling.
   */
  public static parse<T>(rawJson: string, maxDepth = SafeJson.MAX_RECURSION_DEPTH): T {
    if (typeof rawJson !== 'string') {
      throw new TypeError('[SafeJson] Input must be a string');
    }

    if (rawJson.length > this.MAX_PAYLOAD_BYTES) {
      throw new RangeError(
        `[SafeJson] JSON payload size (${rawJson.length} bytes) exceeds maximum limit (${this.MAX_PAYLOAD_BYTES} bytes)`
      );
    }

    const parsed = JSON.parse(rawJson, (key, value) => {
      // Strip prototype pollution vector keys
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        return undefined;
      }
      return value;
    });

    // Enforce depth ceiling on parsed structure
    function assertDepth(obj: unknown, currentDepth: number): void {
      if (currentDepth > maxDepth) {
        throw new RangeError(`[SafeJson] JSON nesting exceeded max recursion depth of ${maxDepth}`);
      }
      if (obj !== null && typeof obj === 'object') {
        if (Array.isArray(obj)) {
          for (let i = 0; i < obj.length; i++) {
            assertDepth(obj[i], currentDepth + 1);
          }
        } else {
          for (const k of Object.keys(obj)) {
            assertDepth((obj as Record<string, unknown>)[k], currentDepth + 1);
          }
        }
      }
    }

    assertDepth(parsed, 1);
    return parsed as T;
  }

  /**
   * Recursively sanitizes an existing in-memory object by removing any prototype pollution keys.
   */
  public static sanitizeObject<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitizeObject(item)) as unknown as T;
    }

    const clean: Record<string, unknown> = Object.create(null);
    for (const key of Object.keys(obj as Record<string, unknown>)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }
      clean[key] = this.sanitizeObject((obj as Record<string, unknown>)[key]);
    }

    return clean as unknown as T;
  }
}
