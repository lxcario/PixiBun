import { describe, it, expect } from 'vitest';
import * as SchemaModule from '@/lib/project/schema';
import * as RecoveryTypesModule from '@/lib/recovery/recoveryTypes';
import {
  validateProjectFile,
  validateProjectWithPolicy,
  validateProjectJsonWithPolicy,
  migrateProjectPayload,
} from '@/lib/project/schema';
import { classifyProjectMetadata } from '@/lib/recovery/recoveryClassifier';
import { RECOVERY_INSPECTION_CEILINGS } from '@/lib/recovery/recoveryLimits';
import { WORKSPACE_ENVELOPE } from '@/config/canvasLimits';
import {
  SafeJson,
  SafeJsonTraversalLimitError,
  SafeJsonOptionError,
} from '@/lib/safety/safeJson';
import { PROJECT_FORMAT_ID, PROJECT_FORMAT_VERSION } from '@/types/project';

function validBaseFixture() {
  return {
    format: PROJECT_FORMAT_ID,
    version: PROJECT_FORMAT_VERSION,
    name: 'Recovery Base Project',
    width: 32,
    height: 32,
    fps: 12,
    loopMode: 'repeat' as const,
    onionSkin: {
      enabled: false,
      prevFrames: 1,
      nextFrames: 1,
      prevColor: '#7fae6b',
      nextColor: '#c792df',
      opacity: 0.35,
    },
    palettes: [
      { id: 'pal-1', name: 'Cozy', colors: ['#3A2E4C', '#C792DF', '#DDDFDF'] },
    ],
    currentPaletteId: 'pal-1',
    customRamps: [],
    clips: [],
    frames: [
      {
        id: 'frame-1',
        durationMs: 100,
        layers: [
          {
            id: 'layer-1',
            name: 'Base',
            visible: true,
            locked: false,
            opacity: 1.0,
            blendMode: 'source-over' as const,
          },
        ],
      },
    ],
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  };
}

describe('Phase 1B.1: Project Validation and Recovery Classification', () => {
  it('all existing validateProjectFile behavior continues passing for well-formed projects', () => {
    const fixture = validBaseFixture();
    const result = validateProjectFile(fixture);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe(fixture.name);
      expect(result.value.width).toBe(fixture.width);
      expect(result.value.height).toBe(fixture.height);
      expect(result.value.frames).toHaveLength(1);
      expect(result.value.frames[0].layers[0].id).toBe('layer-1');
    }
  });

  it('existing legacy inputs migrate identically and normalize missing fields', () => {
    const legacyV1 = {
      format: PROJECT_FORMAT_ID,
      version: 1,
      name: 'Legacy V1 Canvas',
      width: 16,
      height: 16,
      fps: 8,
      palettes: [
        { id: 'pal-1', name: 'Retro', colors: ['#3A2E4C', '#F0BE7C'] },
      ],
      currentPaletteId: 'pal-1',
      frames: [
        {
          id: 'frame-1',
          durationMs: 100,
          layers: [{ id: 'layer-1', name: 'Layer 1' }],
        },
      ],
      createdAt: 1680000000000,
      updatedAt: 1680000000000,
    };

    const directMigrated = migrateProjectPayload(legacyV1);
    expect(directMigrated.version).toBe(PROJECT_FORMAT_VERSION);

    const result = validateProjectFile(legacyV1);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.version).toBe(PROJECT_FORMAT_VERSION);
      expect(result.value.customRamps).toEqual([]);
      expect(result.value.clips).toEqual([]);
      expect(result.value.onionSkin.enabled).toBe(false);
      expect(result.value.frames[0].layers[0].blendMode).toBe('source-over');
      expect(result.value.frames[0].layers[0].opacity).toBe(1.0);
      expect(result.value.frames[0].layers[0].visible).toBe(true);
      expect(result.value.frames[0].layers[0].locked).toBe(false);
    }
  });

  it('normal and recovery validation reject long palette id/name/author', () => {
    const longId = 'pal-id-'.repeat(25); // 175 chars > 128
    const longName = 'Palette-Name-'.repeat(15); // 195 chars > 128
    const longAuthor = 'Author-Name-'.repeat(15); // 180 chars > 128
    const fixture = {
      ...validBaseFixture(),
      palettes: [
        { id: longId, name: longName, author: longAuthor, colors: ['#111111', '#222222'] },
      ],
      currentPaletteId: longId,
    };

    // Normal validation now shares these bounds with recovery inspection.
    const strictRes = validateProjectFile(fixture);
    expect(strictRes.ok).toBe(false);

    // Recovery mode rejects it as malformed palette identifier/name/author
    const recoveryRes = classifyProjectMetadata(JSON.stringify(fixture));
    expect(recoveryRes.status).toBe('malformed');
    if (recoveryRes.status === 'malformed') {
      expect(recoveryRes.reasonCode).toBe('INVALID_PALETTES');
    }
  });

  it('normal and recovery validation reject palettes with > 512 valid colors', () => {
    const manyColors = Array.from({ length: 600 }, (_, i) => `#${(i % 16).toString(16).repeat(6)}`);
    const fixture = {
      ...validBaseFixture(),
      palettes: [
        { id: 'pal-large', name: 'Large Palette', colors: manyColors },
      ],
      currentPaletteId: 'pal-large',
    };

    // The normal editor must not admit a palette beyond the bounded color count.
    const strictRes = validateProjectFile(fixture);
    expect(strictRes.ok).toBe(false);

    // Recovery mode rejects it with INSPECTION_CEILING_EXCEEDED
    const recoveryRes = classifyProjectMetadata(JSON.stringify(fixture));
    expect(recoveryRes.status).toBe('unsafe-content');
    if (recoveryRes.status === 'unsafe-content') {
      expect(recoveryRes.reasonCode).toBe('INSPECTION_CEILING_EXCEEDED');
      expect(recoveryRes.message).toContain('recovery color inspection ceiling');
    }
  });

  it('normal and recovery validation reject an unresolved currentPaletteId', () => {
    const fixture = {
      ...validBaseFixture(),
      currentPaletteId: 'non-existent-pal-id',
    };

    const strictRes = validateProjectFile(fixture);
    expect(strictRes.ok).toBe(false);

    // Recovery mode rejects unresolved active palette for safe pruning
    const recoveryRes = classifyProjectMetadata(JSON.stringify(fixture));
    expect(recoveryRes.status).toBe('malformed');
    if (recoveryRes.status === 'malformed') {
      expect(recoveryRes.reasonCode).toBe('INVALID_ACTIVE_PALETTE');
    }
  });

  it('normal and recovery validation reject duplicate clip IDs', () => {
    const fixture = {
      ...validBaseFixture(),
      clips: [
        { id: 'clip-dup', name: 'Clip 1', startFrame: 0, endFrame: 0 },
        { id: 'clip-dup', name: 'Clip 2', startFrame: 0, endFrame: 0 },
      ],
    };

    const strictRes = validateProjectFile(fixture);
    expect(strictRes.ok).toBe(false);

    // Recovery mode rejects duplicate clip IDs
    const recoveryRes = classifyProjectMetadata(JSON.stringify(fixture));
    expect(recoveryRes.status).toBe('malformed');
    if (recoveryRes.status === 'malformed') {
      expect(recoveryRes.reasonCode).toBe('DUPLICATE_CLIP_ID');
    }
  });

  it('normal and recovery validation reject empty or long clip id/name', () => {
    const fixture = {
      ...validBaseFixture(),
      clips: [
        { id: '', name: 'Empty ID Clip', startFrame: 0, endFrame: 0 },
      ],
    };

    const strictRes = validateProjectFile(fixture);
    expect(strictRes.ok).toBe(false);

    // Recovery mode rejects empty clip IDs
    const recoveryRes = classifyProjectMetadata(JSON.stringify(fixture));
    expect(recoveryRes.status).toBe('malformed');
    if (recoveryRes.status === 'malformed') {
      expect(recoveryRes.reasonCode).toBe('INVALID_CLIPS');
    }
  });

  it('normal and recovery validation reject an inverted clip range', () => {
    const fixture = {
      ...validBaseFixture(),
      clips: [
        { id: 'clip-inverted', name: 'Inverted Clip', startFrame: 5, endFrame: 2 },
      ],
    };

    const strictRes = validateProjectFile(fixture);
    expect(strictRes.ok).toBe(false);

    // Recovery mode rejects inverted clip ranges
    const recoveryRes = classifyProjectMetadata(JSON.stringify(fixture));
    expect(recoveryRes.status).toBe('malformed');
    if (recoveryRes.status === 'malformed') {
      expect(recoveryRes.reasonCode).toBe('MALFORMED_CLIP_RANGE');
    }
  });

  it('normal and recovery validation reject duplicate palette IDs', () => {
    const fixture = {
      ...validBaseFixture(),
      palettes: [
        { id: 'pal-dup', name: 'Palette 1', colors: ['#111111'] },
        { id: 'pal-dup', name: 'Palette 2', colors: ['#222222'] },
      ],
      currentPaletteId: 'pal-dup',
    };

    const strictRes = validateProjectFile(fixture);
    expect(strictRes.ok).toBe(false);

    // Recovery mode rejects duplicate palette IDs to avoid active palette ambiguity
    const recoveryRes = classifyProjectMetadata(JSON.stringify(fixture));
    expect(recoveryRes.status).toBe('malformed');
    if (recoveryRes.status === 'malformed') {
      expect(recoveryRes.reasonCode).toBe('DUPLICATE_PALETTE_ID');
    }
  });

  it('normal and recovery validation reject clips beyond the frame count', () => {
    const fixture = {
      ...validBaseFixture(),
      frames: [
        {
          id: 'frame-1',
          durationMs: 100,
          layers: [{ id: 'layer-1', name: 'Layer 1', visible: true, locked: false, opacity: 1, blendMode: 'source-over' as const }],
        },
        {
          id: 'frame-2',
          durationMs: 100,
          layers: [{ id: 'layer-2', name: 'Layer 2', visible: true, locked: false, opacity: 1, blendMode: 'source-over' as const }],
        },
      ],
      clips: [
        // Project has only 2 frames (valid indices 0 and 1). endFrame: 5 is outside project frame count.
        { id: 'clip-out-of-bounds', name: 'Out Of Bounds Clip', startFrame: 0, endFrame: 5 },
      ],
    };

    const strictRes = validateProjectFile(fixture);
    expect(strictRes.ok).toBe(false);

    // Recovery mode rejects clip range beyond frame count
    const recoveryRes = classifyProjectMetadata(JSON.stringify(fixture));
    expect(recoveryRes.status).toBe('malformed');
    if (recoveryRes.status === 'malformed') {
      expect(recoveryRes.reasonCode).toBe('MALFORMED_CLIP_RANGE');
      expect(recoveryRes.message).toContain('outside project frame count');
    }
  });

  it('characterization: strict validator has no recovery node traversal ceiling', () => {
    // 50 palettes * 510 colors = 25,500 nodes + 100 ramps * 250 shades = 25,000 nodes > 50,000 nodes
    const palettes = Array.from({ length: 50 }, (_, i) => ({
      id: `p-${i}`,
      name: `Pal ${i}`,
      colors: Array.from({ length: 510 }, (_, c) => `#${(c % 16).toString(16).repeat(6)}`),
    }));
    const customRamps = Array.from({ length: 100 }, () => ({
      baseColor: '#000000',
      shades: Array.from({ length: 250 }, (_, s) => `#${(s % 16).toString(16).repeat(6)}`),
    }));

    const fixture = {
      ...validBaseFixture(),
      palettes,
      currentPaletteId: 'p-0',
      customRamps,
    };

    // Strict validator MUST NOT apply recovery node ceilings
    const strictRes = validateProjectFile(fixture);
    expect(strictRes.ok).toBe(true);
  });

  it('existing strict envelope failures still fail with identical user-facing error messages', () => {
    // 1. Over 500 frames in strict mode
    const overFrames = {
      ...validBaseFixture(),
      frames: Array.from({ length: 501 }, (_, i) => ({
        id: `f-${i}`,
        durationMs: 100,
        layers: [{ id: `l-${i}`, name: 'L', visible: true, locked: false, opacity: 1, blendMode: 'source-over' }],
      })),
    };
    const framesRes = validateProjectFile(overFrames);
    expect(framesRes.ok).toBe(false);
    if (!framesRes.ok) {
      expect(framesRes.error).toBe(`The project exceeds the ${WORKSPACE_ENVELOPE.MAX_CANVAS_FRAMES} animation frame limit.`);
    }

    // 2. Over 100 layers in a frame in strict mode
    const overLayers = {
      ...validBaseFixture(),
      frames: [
        {
          id: 'f-1',
          durationMs: 100,
          layers: Array.from({ length: 101 }, (_, i) => ({
            id: `l-${i}`,
            name: `L ${i}`,
            visible: true,
            locked: false,
            opacity: 1,
            blendMode: 'source-over',
          })),
        },
      ],
    };
    const layersRes = validateProjectFile(overLayers);
    expect(layersRes.ok).toBe(false);
    if (!layersRes.ok) {
      expect(layersRes.error).toBe(`Frame 1 exceeds the ${WORKSPACE_ENVELOPE.MAX_CANVAS_LAYERS} layer ceiling.`);
    }

    // 3. Over 2,000 total layers in strict mode
    const overTotalLayers = {
      ...validBaseFixture(),
      frames: Array.from({ length: 25 }, (_, f) => ({
        id: `f-${f}`,
        durationMs: 100,
        layers: Array.from({ length: 81 }, (_, l) => ({
          id: `l-${f}-${l}`,
          name: 'L',
          visible: true,
          locked: false,
          opacity: 1,
          blendMode: 'source-over',
        })),
      })),
    };
    const totalRes = validateProjectFile(overTotalLayers);
    expect(totalRes.ok).toBe(false);
    if (!totalRes.ok) {
      expect(totalRes.error).toContain('Project exceeds total layer limit');
    }

    // 4. Over 64 MP aggregate pixels in strict mode
    const overMegapixels = {
      ...validBaseFixture(),
      width: 1024,
      height: 1024,
      frames: [
        {
          id: 'f-1',
          durationMs: 100,
          layers: Array.from({ length: 65 }, (_, i) => ({
            id: `l-${i}`,
            name: 'L',
            visible: true,
            locked: false,
            opacity: 1,
            blendMode: 'source-over',
          })),
        },
      ],
    };
    const mpRes = validateProjectFile(overMegapixels);
    expect(mpRes.ok).toBe(false);
    if (!mpRes.ok) {
      expect(mpRes.error).toContain('Project exceeds conservative resource complexity ceiling');
    }
  });
});

describe('Phase 1B.1: Bounded Sanitization & SafeJson Traversal Ceiling', () => {
  it('throws SafeJsonTraversalLimitError on flat array exceeding maxTraversedNodes', () => {
    const flatArrayJson = JSON.stringify(Array.from({ length: 100 }, () => 1));
    expect(() =>
      SafeJson.parse(flatArrayJson, { maxTraversedNodes: 50 })
    ).toThrow(SafeJsonTraversalLimitError);

    try {
      SafeJson.parse(flatArrayJson, { maxTraversedNodes: 50 });
    } catch (err) {
      expect(err instanceof SafeJsonTraversalLimitError).toBe(true);
      if (err instanceof SafeJsonTraversalLimitError) {
        expect(err.code).toBe('SAFE_JSON_TRAVERSAL_LIMIT');
        expect(err.limit).toBe(50);
        expect(err.observed).toBe(51);
        expect(err.message).toContain('JSON metadata traversal exceeded ceiling');
      }
    }
  });

  it('throws SafeJsonTraversalLimitError on deeply nested object/array structures exceeding node budget', () => {
    // Nested structure with 40 nodes: { a: { b: { c: [1, 2, 3] } } }
    const nested = { a: { b: { c: Array.from({ length: 30 }, (_, i) => i) } } };
    expect(() =>
      SafeJson.parse(JSON.stringify(nested), { maxTraversedNodes: 20 })
    ).toThrow(SafeJsonTraversalLimitError);
  });

  it('classifyProjectMetadata classifies traversal limit violation as unsafe-content with SAFE_JSON_TRAVERSAL_LIMIT', () => {
    const hugeFlatArray = JSON.stringify(Array.from({ length: 60_000 }, () => 0));
    const classification = classifyProjectMetadata(hugeFlatArray);
    expect(classification.status).toBe('unsafe-content');
    if (classification.status === 'unsafe-content') {
      expect(classification.reasonCode).toBe('SAFE_JSON_TRAVERSAL_LIMIT');
      expect(classification.message).toContain('JSON metadata traversal exceeded ceiling');
    }
  });

  it('proves an ordinary policy-validator caller cannot bypass prototype-pollution sanitization through options', () => {
    const maliciousPayload = {
      ...validBaseFixture(),
      __proto__: { isAdmin: true },
      nested: {
        constructor: { evil: true },
      },
    };

    // Public validator must unconditionally sanitize untrusted object input
    const result = validateProjectWithPolicy(maliciousPayload, {
      envelopeMode: 'strict',
      // Attacker attempts to pass skipSanitization
      ...({ skipSanitization: true } as unknown as object),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Object.prototype.hasOwnProperty.call(result.value, '__proto__')).toBe(false);
      expect(Reflect.get(Object.prototype, 'isAdmin')).toBeUndefined();
      expect(Reflect.get(Object.prototype, 'evil')).toBeUndefined();
    }
  });

  it('proves that neither a trusted token nor validateSanitizedProjectCore is exported', () => {
    // Assert at runtime that neither the trusted token nor the internal core is exported
    expect('RECOVERY_TRUSTED_TOKEN' in (RecoveryTypesModule as Record<string, unknown>)).toBe(false);
    expect('RECOVERY_TRUSTED_TOKEN' in (SchemaModule as Record<string, unknown>)).toBe(false);
    expect('validateSanitizedProjectCore' in (SchemaModule as Record<string, unknown>)).toBe(false);
  });

  it('rejects large flat array structurally before allocating destination array of source length', () => {
    const largeLength = 100_000;
    const hugeArrayJson = JSON.stringify(Array.from({ length: largeLength }, () => 1));

    try {
      SafeJson.parse(hugeArrayJson, { maxTraversedNodes: 50 });
      expect.unreachable('Should have thrown SafeJsonTraversalLimitError');
    } catch (err) {
      expect(err instanceof SafeJsonTraversalLimitError).toBe(true);
      if (err instanceof SafeJsonTraversalLimitError) {
        expect(err.code).toBe('SAFE_JSON_TRAVERSAL_LIMIT');
        expect(err.limit).toBe(50);
        expect(err.observed).toBe(51);
      }
    }

    // Verify incremental growth behaviorally: array of 5 elements where element 2 breaches budget aborts midway
    const nestedJson = JSON.stringify([
      1,
      2,
      Array.from({ length: 20 }, (_, i) => i), // Element 2 contains 20 children
      4,
      5,
    ]);

    expect(() =>
      SafeJson.parse(nestedJson, { maxTraversedNodes: 10 })
    ).toThrow(SafeJsonTraversalLimitError);
  });

  it('validateProjectJsonWithPolicy parses, sanitizes, and validates in a single pass', () => {
    const fixture = validBaseFixture();
    const rawJson = JSON.stringify(fixture);

    const validRes = validateProjectJsonWithPolicy(rawJson, { envelopeMode: 'strict' });
    expect(validRes.ok).toBe(true);
    if (validRes.ok) {
      expect(validRes.value.name).toBe(fixture.name);
    }

    // Propagates typed SafeJson errors
    expect(() =>
      validateProjectJsonWithPolicy(
        JSON.stringify(Array.from({ length: 100 }, () => 1)),
        { envelopeMode: 'strict' },
        { maxTraversedNodes: 50 }
      )
    ).toThrow(SafeJsonTraversalLimitError);
  });
});

describe('Phase 1B.1: SafeJson Option Validation', () => {
  it('rejects invalid numeric maxDepth values (0, negative, fraction, NaN, Infinity, > MAX_SAFE_INTEGER)', () => {
    const invalidValues = [0, -5, 1.5, NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 10];
    for (const val of invalidValues) {
      expect(() => SafeJson.parse('{}', val)).toThrow(SafeJsonOptionError);
      expect(() => SafeJson.parse('{}', { maxDepth: val })).toThrow(SafeJsonOptionError);
    }
  });

  it('rejects invalid maxTraversedNodes values (0, negative, fraction, NaN, Infinity, > MAX_SAFE_INTEGER)', () => {
    const invalidValues = [0, -10, 5.5, NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 10];
    for (const val of invalidValues) {
      expect(() => SafeJson.parse('{}', { maxTraversedNodes: val })).toThrow(SafeJsonOptionError);
    }
  });

  it('rejects non-object non-number options', () => {
    expect(() => SafeJson.parse('{}', 'not-valid' as unknown as number)).toThrow(SafeJsonOptionError);
    expect(() => SafeJson.parse('{}', null as unknown as number)).toThrow(SafeJsonOptionError);
    expect(() => SafeJson.parse('{}', [1, 2, 3] as unknown as number)).toThrow(SafeJsonOptionError);
  });

  it('accepts valid positive safe integer options in numeric or object form', () => {
    expect(SafeJson.parse('{"a": 1}', 10)).toEqual({ a: 1 });
    expect(SafeJson.parse('{"a": 1}', { maxDepth: 10, maxTraversedNodes: 100 })).toEqual({ a: 1 });
  });
});

describe('Phase 1B.1: Violation Truncation & Summarization', () => {
  it('correctly aggregates 25 over-layered frames without displacing total-layer and aggregate-pixel violations', () => {
    // 25 frames, each having 101 layers (> 100 layers/frame)
    // 25 * 101 = 2525 total layers (> 2000 total layers)
    // 256x256 canvas = 65,536 px/layer. 2525 * 65536 = 165.4 MP (> 64 MP)
    // Triggers: ENVELOPE_MAX_LAYERS_PER_FRAME, ENVELOPE_MAX_TOTAL_LAYERS, ENVELOPE_MAX_MEGAPIXELS
    const frames = Array.from({ length: 25 }, (_, f) => ({
      id: `f-${f}`,
      durationMs: 100,
      layers: Array.from({ length: 101 }, (_, l) => ({
        id: `l-${f}-${l}`,
        name: `L ${l}`,
        visible: true,
        locked: false,
        opacity: 1,
        blendMode: 'source-over' as const,
      })),
    }));

    const fixture = {
      ...validBaseFixture(),
      width: 256,
      height: 256,
      frames,
    };

    const classification = classifyProjectMetadata(JSON.stringify(fixture));
    expect(classification.status).toBe('recoverable-envelope-exceeded');
    if (classification.status === 'recoverable-envelope-exceeded') {
      // 1. All applicable reason codes remain present in canonical deterministic order
      expect(classification.reasonCodes).toEqual([
        'ENVELOPE_MAX_LAYERS_PER_FRAME',
        'ENVELOPE_MAX_TOTAL_LAYERS',
        'ENVELOPE_MAX_MEGAPIXELS',
      ]);

      // 2. Exactly one summarized entry per violated code
      expect(classification.violations).toHaveLength(3);

      const layerPerFrameViolation = classification.violations.find(
        (v) => v.code === 'ENVELOPE_MAX_LAYERS_PER_FRAME'
      );
      expect(layerPerFrameViolation).toBeDefined();
      if (layerPerFrameViolation) {
        expect(layerPerFrameViolation.affectedFramesCount).toBe(25);
        expect(layerPerFrameViolation.detailsTruncated).toBe(true);
        expect(layerPerFrameViolation.actual).toBe(101);
        expect(layerPerFrameViolation.allowed).toBe(100);
        expect(layerPerFrameViolation.frameDetails).toHaveLength(
          RECOVERY_INSPECTION_CEILINGS.MAX_RECORDED_FRAME_VIOLATION_DETAILS
        );
      }

      const totalLayersViolation = classification.violations.find(
        (v) => v.code === 'ENVELOPE_MAX_TOTAL_LAYERS'
      );
      expect(totalLayersViolation).toBeDefined();
      if (totalLayersViolation) {
        expect(totalLayersViolation.actual).toBe(2525);
        expect(totalLayersViolation.allowed).toBe(2000);
      }

      const megapixelsViolation = classification.violations.find(
        (v) => v.code === 'ENVELOPE_MAX_MEGAPIXELS'
      );
      expect(megapixelsViolation).toBeDefined();
      if (megapixelsViolation) {
        expect(megapixelsViolation.actual).toBe(2525 * 256 * 256);
        expect(megapixelsViolation.allowed).toBe(WORKSPACE_ENVELOPE.MAX_PROJECT_AGGREGATE_PIXELS);
      }
    }
  });

  it('includes ENVELOPE_MAX_FRAMES in canonical order when frames also exceed 500', () => {
    // 501 frames, frame 0 has 101 layers, remaining 500 frames have 4 layers = 2101 layers at 256x256 (> 64 MP)
    const frames = [
      {
        id: 'f-0',
        durationMs: 100,
        layers: Array.from({ length: 101 }, (_, i) => ({
          id: `l-0-${i}`,
          name: `L ${i}`,
          visible: true,
          locked: false,
          opacity: 1,
          blendMode: 'source-over' as const,
        })),
      },
      ...Array.from({ length: 500 }, (_, f) => ({
        id: `f-${f + 1}`,
        durationMs: 100,
        layers: Array.from({ length: 4 }, (_, l) => ({
          id: `l-${f + 1}-${l}`,
          name: `L ${l}`,
          visible: true,
          locked: false,
          opacity: 1,
          blendMode: 'source-over' as const,
        })),
      })),
    ];

    const fixture = {
      ...validBaseFixture(),
      width: 256,
      height: 256,
      frames,
    };

    const classification = classifyProjectMetadata(JSON.stringify(fixture));
    expect(classification.status).toBe('recoverable-envelope-exceeded');
    if (classification.status === 'recoverable-envelope-exceeded') {
      expect(classification.reasonCodes).toEqual([
        'ENVELOPE_MAX_FRAMES',
        'ENVELOPE_MAX_LAYERS_PER_FRAME',
        'ENVELOPE_MAX_TOTAL_LAYERS',
        'ENVELOPE_MAX_MEGAPIXELS',
      ]);
      expect(classification.violations).toHaveLength(4);
      expect(classification.violations[0].code).toBe('ENVELOPE_MAX_FRAMES');
      expect(classification.violations[1].code).toBe('ENVELOPE_MAX_LAYERS_PER_FRAME');
      expect(classification.violations[2].code).toBe('ENVELOPE_MAX_TOTAL_LAYERS');
      expect(classification.violations[3].code).toBe('ENVELOPE_MAX_MEGAPIXELS');
    }
  });
});

describe('Phase 1B.1: Safety Boundaries & SafeJson Error Codes', () => {
  it('payload over 50 MB receives SAFE_JSON_PAYLOAD_LIMIT reason code and unsafe-content status', () => {
    const hugePayload = '{"a":"' + 'x'.repeat(SafeJson.MAX_PAYLOAD_BYTES + 10) + '"}';
    const classification = classifyProjectMetadata(hugePayload);
    expect(classification.status).toBe('unsafe-content');
    if (classification.status === 'unsafe-content') {
      expect(classification.reasonCode).toBe('SAFE_JSON_PAYLOAD_LIMIT');
      expect(classification.message).toContain('JSON payload size');
    }
  });

  it('nesting beyond 32 receives SAFE_JSON_NESTING_DEPTH reason code and unsafe-content status', () => {
    const deepJson = '['.repeat(35) + '0' + ']'.repeat(35);
    const classification = classifyProjectMetadata(deepJson);
    expect(classification.status).toBe('unsafe-content');
    if (classification.status === 'unsafe-content') {
      expect(classification.reasonCode).toBe('SAFE_JSON_NESTING_DEPTH');
      expect(classification.message).toContain('max recursion depth');
    }
  });

  it('malformed JSON syntax receives SAFE_JSON_SYNTAX_ERROR reason code without exposing raw inputs', () => {
    const badJson = '{"key": broken}';
    const classification = classifyProjectMetadata(badJson);
    expect(classification.status).toBe('malformed');
    if (classification.status === 'malformed') {
      expect(classification.reasonCode).toBe('SAFE_JSON_SYNTAX_ERROR');
      expect(classification.message).not.toContain('broken');
    }
  });

  it('recovery inspection ceilings cleanly stop traversal when frame ceiling is exceeded (> 2000 frames)', () => {
    const fixture = {
      ...validBaseFixture(),
      frames: Array.from({ length: RECOVERY_INSPECTION_CEILINGS.MAX_INSPECTABLE_FRAMES + 1 }, (_, i) => ({
        id: `f-${i}`,
        durationMs: 100,
        layers: [{ id: `l-${i}`, name: 'L', visible: true, locked: false, opacity: 1, blendMode: 'source-over' }],
      })),
    };

    const classification = classifyProjectMetadata(JSON.stringify(fixture));
    expect(classification.status).toBe('unsafe-content');
    if (classification.status === 'unsafe-content') {
      expect(classification.reasonCode).toBe('INSPECTION_CEILING_EXCEEDED');
      expect(classification.message).toContain('recovery frame inspection ceiling');
    }
  });

  it('recovery inspection ceilings cleanly stop traversal when layers per frame ceiling is exceeded (> 200 layers)', () => {
    const fixture = {
      ...validBaseFixture(),
      frames: [
        {
          id: 'f-1',
          durationMs: 100,
          layers: Array.from({ length: RECOVERY_INSPECTION_CEILINGS.MAX_INSPECTABLE_LAYERS_PER_FRAME + 1 }, (_, i) => ({
            id: `l-${i}`,
            name: `L ${i}`,
            visible: true,
            locked: false,
            opacity: 1,
            blendMode: 'source-over',
          })),
        },
      ],
    };

    const classification = classifyProjectMetadata(JSON.stringify(fixture));
    expect(classification.status).toBe('unsafe-content');
    if (classification.status === 'unsafe-content') {
      expect(classification.reasonCode).toBe('INSPECTION_CEILING_EXCEEDED');
      expect(classification.message).toContain('recovery layer inspection ceiling');
    }
  });

  it('recovery inspection ceilings cleanly stop traversal when total layer ceiling is exceeded (> 5000 layers)', () => {
    // 51 frames with 100 layers = 5100 layers (> 5000)
    const fixture = {
      ...validBaseFixture(),
      frames: Array.from({ length: 51 }, (_, f) => ({
        id: `f-${f}`,
        durationMs: 100,
        layers: Array.from({ length: 100 }, (_, l) => ({
          id: `l-${f}-${l}`,
          name: 'L',
          visible: true,
          locked: false,
          opacity: 1,
          blendMode: 'source-over',
        })),
      })),
    };

    const classification = classifyProjectMetadata(JSON.stringify(fixture));
    expect(classification.status).toBe('unsafe-content');
    if (classification.status === 'unsafe-content') {
      expect(classification.reasonCode).toBe('INSPECTION_CEILING_EXCEEDED');
      expect(classification.message).toContain('total layer count');
    }
  });

  it('prototype-pollution keys do not survive parsing or classifyProjectMetadata', () => {
    const maliciousJson = JSON.stringify({
      ...validBaseFixture(),
      __proto__: { isAdmin: true },
      constructor: { prototype: { polluter: true } },
    });

    const classification = classifyProjectMetadata(maliciousJson);
    expect(classification.status).toBe('valid');
    if (classification.status === 'valid') {
      expect(Object.prototype.hasOwnProperty.call(classification.project, '__proto__')).toBe(false);
      expect(Reflect.get(Object.prototype, 'isAdmin')).toBeUndefined();
      expect(Reflect.get(Object.prototype, 'polluter')).toBeUndefined();
    }
  });
});
