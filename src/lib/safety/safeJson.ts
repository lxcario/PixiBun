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

/**
 * Computes the exact UTF-8 byte length of a string without allocating memory on the heap.
 * Handles single-byte ASCII, multi-byte code points, and UTF-16 surrogate pairs.
 */
export function getUtf8ByteLength(str: string): number {
  let bytes = 0;
  const len = str.length;
  for (let i = 0; i < len; i++) {
    const code = str.charCodeAt(i);
    if (code <= 0x7f) {
      bytes += 1;
    } else if (code <= 0x7ff) {
      bytes += 2;
    } else if (code >= 0xd800 && code <= 0xdbff) {
      // High surrogate: check if followed by low surrogate
      if (i + 1 < len) {
        const next = str.charCodeAt(i + 1);
        if (next >= 0xdc00 && next <= 0xdfff) {
          bytes += 4;
          i++;
          continue;
        }
      }
      bytes += 3;
    } else {
      bytes += 3;
    }
  }
  return bytes;
}

export class SafeJsonPayloadLimitError extends RangeError {
  public readonly code = 'SAFE_JSON_PAYLOAD_LIMIT' as const;
  public readonly byteLength: number;
  public readonly maxBytes: number;

  constructor(byteLength: number, maxBytes: number) {
    super(`[SafeJson] JSON payload size (${byteLength} bytes) exceeds maximum limit (${maxBytes} bytes)`);
    this.name = 'SafeJsonPayloadLimitError';
    this.byteLength = byteLength;
    this.maxBytes = maxBytes;
    Object.setPrototypeOf(this, SafeJsonPayloadLimitError.prototype);
  }
}

export class SafeJsonNestingDepthError extends RangeError {
  public readonly code = 'SAFE_JSON_NESTING_DEPTH' as const;
  public readonly depth: number;
  public readonly maxDepth: number;

  constructor(depth: number, maxDepth: number, detail?: string) {
    const msg = detail
      ? `[SafeJson] JSON nesting exceeded max recursion depth of ${maxDepth}`
      : `[SafeJson] JSON nesting exceeded max recursion depth`;
    super(msg);
    this.name = 'SafeJsonNestingDepthError';
    this.depth = depth;
    this.maxDepth = maxDepth;
    Object.setPrototypeOf(this, SafeJsonNestingDepthError.prototype);
  }
}

export class SafeJsonTraversalLimitError extends RangeError {
  public readonly code = 'SAFE_JSON_TRAVERSAL_LIMIT' as const;
  public readonly limit: number;
  public readonly observed: number;

  constructor(observed: number, limit: number) {
    super(`[SafeJson] JSON metadata traversal exceeded ceiling (${observed} nodes visited; limit is ${limit})`);
    this.name = 'SafeJsonTraversalLimitError';
    this.limit = limit;
    this.observed = observed;
    Object.setPrototypeOf(this, SafeJsonTraversalLimitError.prototype);
  }
}

export class SafeJsonOptionError extends RangeError {
  public readonly code = 'SAFE_JSON_OPTION_ERROR' as const;

  constructor(message: string) {
    super(`[SafeJson] ${message}`);
    this.name = 'SafeJsonOptionError';
    Object.setPrototypeOf(this, SafeJsonOptionError.prototype);
  }
}

function validatePositiveSafeInteger(name: string, value: unknown): number {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > Number.MAX_SAFE_INTEGER
  ) {
    throw new SafeJsonOptionError(
      `Option "${name}" must be a positive safe integer (received: ${String(value)})`
    );
  }
  return value;
}

export class SafeJsonSyntaxError extends SyntaxError {
  public readonly code = 'SAFE_JSON_SYNTAX_ERROR' as const;

  constructor(message = '[SafeJson] Invalid JSON syntax') {
    super(message);
    this.name = 'SafeJsonSyntaxError';
    Object.setPrototypeOf(this, SafeJsonSyntaxError.prototype);
  }
}

export interface SafeJsonParseOptions {
  maxDepth?: number;
  maxTraversedNodes?: number;
}

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
   * and enforcing recursion depth and optional traversal node limits.
   *
   * Note on Allocation:
   * JSON.parse necessarily performs initial memory allocation of the parsed AST in the JavaScript
   * engine heap. The optional maxTraversedNodes limit bounds the subsequent sanitization/copy pass,
   * guaranteeing that processing terminates immediately if the node count exceeds the ceiling.
   */
  public static parse<T>(
    rawJson: string,
    optionsOrMaxDepth?: number | SafeJsonParseOptions
  ): T {
    if (typeof rawJson !== 'string') {
      throw new TypeError('[SafeJson] Input must be a string');
    }

    let maxDepth = SafeJson.MAX_RECURSION_DEPTH;
    let maxTraversedNodes: number | undefined;

    if (typeof optionsOrMaxDepth === 'number') {
      maxDepth = validatePositiveSafeInteger('maxDepth', optionsOrMaxDepth);
    } else if (optionsOrMaxDepth !== undefined) {
      if (typeof optionsOrMaxDepth !== 'object' || optionsOrMaxDepth === null || Array.isArray(optionsOrMaxDepth)) {
        throw new SafeJsonOptionError('Parse options must be a plain object or number');
      }
      if (optionsOrMaxDepth.maxDepth !== undefined) {
        maxDepth = validatePositiveSafeInteger('maxDepth', optionsOrMaxDepth.maxDepth);
      }
      if (optionsOrMaxDepth.maxTraversedNodes !== undefined) {
        maxTraversedNodes = validatePositiveSafeInteger('maxTraversedNodes', optionsOrMaxDepth.maxTraversedNodes);
      }
    }

    const byteLength = getUtf8ByteLength(rawJson);
    if (byteLength > this.MAX_PAYLOAD_BYTES) {
      throw new SafeJsonPayloadLimitError(byteLength, this.MAX_PAYLOAD_BYTES);
    }

    // Reject nesting before JSON.parse's recursive reviver (or our sanitizer) runs.
    let depth = 0;
    let quoted = false;
    let escaped = false;
    for (const char of rawJson) {
      if (quoted) {
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === '"') quoted = false;
      } else if (char === '"') quoted = true;
      else if (char === '{' || char === '[') {
        if (++depth > maxDepth) throw new SafeJsonNestingDepthError(depth, maxDepth);
      } else if (char === '}' || char === ']') depth--;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawJson);
    } catch (err) {
      if (err instanceof SyntaxError) {
        throw new SafeJsonSyntaxError('[SafeJson] Invalid JSON syntax');
      }
      throw err;
    }

    const traversalBudget =
      maxTraversedNodes !== undefined ? { count: 0, max: maxTraversedNodes } : undefined;

    return this.sanitizeObject(parsed, traversalBudget, 1, maxDepth) as T;
  }

  /**
   * Recursively sanitizes an existing in-memory object by removing any prototype pollution keys.
   * Returns a standard plain object preserving Object.prototype methods.
   *
   * Node Traversal Counting Definition:
   * A node is defined as any value (object, array, or primitive) visited during traversal:
   * - The root value counts as node 1.
   * - Each array element counts as 1 node.
   * - Each object property value counts as 1 node.
   * If a traversalBudget is provided and budget.count exceeds budget.max, traversal aborts
   * immediately by throwing SafeJsonTraversalLimitError.
   */
  public static sanitizeObject<T>(
    obj: T,
    traversalBudget?: { count: number; max: number },
    currentDepth = 1,
    maxDepth = SafeJson.MAX_RECURSION_DEPTH
  ): T {
    if (traversalBudget !== undefined) {
      traversalBudget.count += 1;
      if (traversalBudget.count > traversalBudget.max) {
        throw new SafeJsonTraversalLimitError(traversalBudget.count, traversalBudget.max);
      }
    }

    if (currentDepth > maxDepth) {
      throw new SafeJsonNestingDepthError(currentDepth, maxDepth, 'with-detail');
    }

    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      if (traversalBudget !== undefined) {
        // Check whether the minimum required element visits already exceed remaining budget
        const remaining = traversalBudget.max - traversalBudget.count;
        if (obj.length > remaining) {
          traversalBudget.count = traversalBudget.max + 1;
          throw new SafeJsonTraversalLimitError(traversalBudget.max + 1, traversalBudget.max);
        }

        // Bounded incremental growing array - avoid preallocating destination array
        const arr: unknown[] = [];
        for (let i = 0; i < obj.length; i++) {
          arr.push(this.sanitizeObject(obj[i], traversalBudget, currentDepth + 1, maxDepth));
        }
        return arr as unknown as T;
      }

      const arr = new Array(obj.length);
      for (let i = 0; i < obj.length; i++) {
        arr[i] = this.sanitizeObject(obj[i], undefined, currentDepth + 1, maxDepth);
      }
      return arr as unknown as T;
    }

    const clean: Record<string, unknown> = {};
    for (const key of Object.keys(obj as Record<string, unknown>)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }
      clean[key] = this.sanitizeObject(
        (obj as Record<string, unknown>)[key],
        traversalBudget,
        currentDepth + 1,
        maxDepth
      );
    }

    return clean as unknown as T;
  }
}
