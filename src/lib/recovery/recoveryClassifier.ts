/**
 * recoveryClassifier.ts
 *
 * Metadata-only Project Classifier for Restricted Recovery Mode.
 *
 * Inspects untrusted project JSON payloads without allocating canvas buffers,
 * decoding raster layers, or performing IndexedDB writes.
 *
 * Note on Allocation:
 * classifyProjectMetadata operates on project metadata without raster/image decoding,
 * but JSON.parse necessarily creates in-memory AST objects. SafeJson bounds this with
 * MAX_METADATA_NODES during its prototype-pollution sanitization pass.
 */

import { PROJECT_FORMAT_VERSION } from '@/types/project';
import {
  SafeJsonPayloadLimitError,
  SafeJsonNestingDepthError,
  SafeJsonTraversalLimitError,
  SafeJsonSyntaxError,
} from '@/lib/safety/safeJson';
import {
  validateProjectJsonWithPolicy,
  type ProjectValidationWithPolicyResult,
} from '@/lib/project/schema';
import { safeMultiply } from '@/lib/project/resourceBudget';
import { RECOVERY_INSPECTION_CEILINGS } from './recoveryLimits';
import {
  type RecoveryClassification,
  type SafeProjectMetadata,
} from './recoveryTypes';

/**
 * Classifies an untrusted project metadata JSON payload into one of five states:
 * 1. 'valid'
 * 2. 'recoverable-envelope-exceeded'
 * 3. 'malformed'
 * 4. 'unsupported-version'
 * 5. 'unsafe-content'
 *
 * Never performs canvas/bitmap/Base64 decoding or IndexedDB mutations.
 */
export function classifyProjectMetadata(rawJson: string): RecoveryClassification {
  if (typeof rawJson !== 'string') {
    return {
      status: 'malformed',
      reasonCode: 'INVALID_ROOT_TYPE',
      message: 'Project payload must be a string.',
    };
  }

  let validation: ProjectValidationWithPolicyResult;
  try {
    validation = validateProjectJsonWithPolicy(
      rawJson,
      { envelopeMode: 'collect-recoverable' },
      { maxTraversedNodes: RECOVERY_INSPECTION_CEILINGS.MAX_METADATA_NODES }
    );
  } catch (err) {
    if (err instanceof SafeJsonPayloadLimitError) {
      return {
        status: 'unsafe-content',
        reasonCode: 'SAFE_JSON_PAYLOAD_LIMIT',
        message: err.message,
      };
    }
    if (err instanceof SafeJsonNestingDepthError) {
      return {
        status: 'unsafe-content',
        reasonCode: 'SAFE_JSON_NESTING_DEPTH',
        message: err.message,
      };
    }
    if (err instanceof SafeJsonTraversalLimitError) {
      return {
        status: 'unsafe-content',
        reasonCode: 'SAFE_JSON_TRAVERSAL_LIMIT',
        message: err.message,
      };
    }
    if (err instanceof SafeJsonSyntaxError || err instanceof SyntaxError) {
      return {
        status: 'malformed',
        reasonCode: 'SAFE_JSON_SYNTAX_ERROR',
        message: 'The project file contains invalid JSON syntax.',
      };
    }
    return {
      status: 'malformed',
      reasonCode: 'MALFORMED_JSON_SYNTAX',
      message: err instanceof Error ? err.message : 'Failed to parse project JSON.',
    };
  }

  if (!validation.ok) {
    if (validation.reasonCode === 'UNSUPPORTED_FUTURE_VERSION') {
      const foundVersion =
        typeof validation.foundVersion === 'number'
          ? validation.foundVersion
          : PROJECT_FORMAT_VERSION + 1;
      return {
        status: 'unsupported-version',
        reasonCode: 'UNSUPPORTED_FUTURE_VERSION',
        foundVersion,
        supportedVersion: PROJECT_FORMAT_VERSION,
        message: validation.error,
      };
    }

    if (validation.reasonCode === 'INSPECTION_CEILING_EXCEEDED') {
      return {
        status: 'unsafe-content',
        reasonCode: 'INSPECTION_CEILING_EXCEEDED',
        message: validation.error,
        details: validation.details,
      };
    }

    return {
      status: 'malformed',
      reasonCode: validation.reasonCode ?? 'MALFORMED_METADATA',
      message: validation.error,
      details: validation.details,
    };
  }

  // Compute safe metadata metrics with iterative, overflow-safe arithmetic (no large array spread)
  let maxLayersInAFrame = 0;
  let totalLayerCount = 0;
  for (let i = 0; i < validation.value.frames.length; i++) {
    const lCount = validation.value.frames[i].layers.length;
    totalLayerCount += lCount;
    if (lCount > maxLayersInAFrame) {
      maxLayersInAFrame = lCount;
    }
  }

  const pxPerFrame = safeMultiply(validation.value.width, validation.value.height) ?? Number.MAX_SAFE_INTEGER;
  const materializableRasterPixels = safeMultiply(totalLayerCount, pxPerFrame) ?? Number.MAX_SAFE_INTEGER;
  const baseRawRgbaBytes = safeMultiply(materializableRasterPixels, 4) ?? Number.MAX_SAFE_INTEGER;

  const metadata: SafeProjectMetadata = {
    name: validation.value.name,
    width: validation.value.width,
    height: validation.value.height,
    frameCount: validation.value.frames.length,
    totalLayerCount,
    maxLayersInAFrame,
    materializableRasterPixels,
    baseRawRgbaBytes,
    fps: validation.value.fps,
    version: validation.value.version,
    createdAt: validation.value.createdAt,
    updatedAt: validation.value.updatedAt,
  };

  if (validation.violations.length === 0) {
    return {
      status: 'valid',
      project: validation.value,
      metadata,
    };
  }

  return {
    status: 'recoverable-envelope-exceeded',
    project: validation.value,
    metadata,
    violations: validation.violations,
    reasonCodes: validation.reasonCodes,
  };
}
