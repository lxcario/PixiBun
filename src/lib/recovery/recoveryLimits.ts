/**
 * recoveryLimits.ts
 *
 * Bounded Recovery Inspection Ceilings for PixiBun Atelier.
 *
 * These limits are bounded recovery inspection ceilings designed specifically for
 * Restricted Recovery Mode and the recovery metadata classifier. They are distinct
 * from normal WORKSPACE_ENVELOPE boundaries (which define active editing capacity)
 * and do not alter normal strict project validation.
 *
 * Note on Memory & Allocation:
 * classifyProjectMetadata operates on project metadata without decoding raster layers,
 * canvases, or Base64 images, but it is not non-allocating. JSON.parse necessarily
 * materializes the JSON document into JavaScript engine objects, and SafeJson
 * sanitization creates a sanitized copy while enforcing prototype-pollution defense.
 * The MAX_METADATA_NODES ceiling bounds the sanitization traversal to prevent CPU
 * exhaustion or memory denial-of-service from pathological metadata structures.
 */

export const RECOVERY_INSPECTION_CEILINGS = {
  /** Maximum number of animation frames inspected during recovery (normal envelope is 500). */
  MAX_INSPECTABLE_FRAMES: 2000,
  /** Maximum layers per frame inspected during recovery (normal envelope is 100). */
  MAX_INSPECTABLE_LAYERS_PER_FRAME: 200,
  /** Maximum total layers across all frames inspected during recovery (normal envelope is 2,000). */
  MAX_INSPECTABLE_TOTAL_LAYERS: 5000,
  /** Maximum animation clips inspected. */
  MAX_INSPECTABLE_CLIPS: 100,
  /** Maximum color palettes inspected. */
  MAX_INSPECTABLE_PALETTES: 50,
  /** Maximum colors per palette inspected in recovery mode. */
  MAX_INSPECTABLE_COLORS_PER_PALETTE: 512,
  /** Maximum custom color ramps inspected. */
  MAX_INSPECTABLE_CUSTOM_RAMPS: 100,
  /** Maximum shades per custom ramp inspected. */
  MAX_INSPECTABLE_SHADES_PER_RAMP: 256,
  /** Maximum parameters per smart effect recipe inspected. */
  MAX_INSPECTABLE_EFFECT_PARAMS: 64,
  /** Maximum items in a list-type effect parameter. */
  MAX_INSPECTABLE_EFFECT_LIST_ITEMS: 256,
  /** Maximum metadata nodes (root + property values + array elements) traversed during SafeJson sanitization. */
  MAX_METADATA_NODES: 50_000,
  /** Maximum individual frame violation details recorded for ENVELOPE_MAX_LAYERS_PER_FRAME. */
  MAX_RECORDED_FRAME_VIOLATION_DETAILS: 20,
  /** Maximum stored layer blobs inspected for a single project during recovery. */
  MAX_INSPECTABLE_STORED_BLOBS: 10_000,
  /** Batch size for paginated resumable layer blob scanning. */
  BLOB_SCAN_BATCH_SIZE: 25,
  /** Maximum orphan details retained in diagnostic summary. */
  MAX_RECORDED_ORPHAN_DETAILS: 20,
  /** Maximum invalid layer details retained in diagnostic summary. */
  MAX_RECORDED_INVALID_LAYERS: 100,
  /** Maximum length of reasonCodes array accepted by the recovery ledger. */
  MAX_LEDGER_INPUT_REASON_CODES: 256,

  /** Recovery string length limits. */
  MAX_PROJECT_NAME_LENGTH: 256,
  MAX_IDENTIFIER_LENGTH: 128,
  MAX_TAG_LENGTH: 128,
  MAX_EFFECT_RATIONALE_LENGTH: 1000,
  /** Maximum byte size for a single stored layer blob during recovery (80 MiB). */
  MAX_SINGLE_BLOB_BYTES: 80 * 1024 * 1024,
  /** Maximum aggregate byte size for all stored layer blobs in a project (256 MiB). */
  MAX_AGGREGATE_BLOB_BYTES: 256 * 1024 * 1024,
  /** Timeout in milliseconds for kept-alive transaction blob operations (30,000 ms). */
  TRANSACTION_DIGEST_TIMEOUT_MS: 30_000,
  /** Maximum destination ID collision retry attempts (3). */
  MAX_ID_GENERATION_RETRIES: 3,
} as const;

export const RECOVERY_BACKUP_LIMITS = {
  /** Maximum bytes for the generated recovery manifest JSON (16 MiB). Derived from 10,000 blobs and worst-case escaping. */
  MAX_MANIFEST_BYTES: 16 * 1024 * 1024,
  /** Maximum bytes for in-memory Blob fallback archive accumulation (250 MB). */
  MAX_FALLBACK_BLOB_BYTES: 250 * 1024 * 1024,
  /** Maximum chunk size for incremental UTF-8 string streaming (64 KiB). */
  MAX_UTF8_STREAM_CHUNK_BYTES: 65536,
  /** Maximum length for a stored blob MIME type in manifest. */
  MAX_MIME_TYPE_LENGTH: 128,
} as const;
