import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { decodeAndValidateProject } from '@/lib/project/decodeProject';
import { PROJECT_FORMAT_VERSION, PROJECT_FORMAT_ID } from '@/types/project';

describe('Historical Project Fixtures and Migration Verification', () => {
  const v113Path = path.resolve(__dirname, 'fixtures/project-v1.13.json');
  const v114Path = path.resolve(__dirname, 'fixtures/project-v1.14.0.json');

  it('correctly decodes, validates, and migrates v1.13 (format v2) to current format v3', () => {
    const rawContent = fs.readFileSync(v113Path, 'utf-8');
    const result = decodeAndValidateProject(rawContent);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const project = result.value;
    expect(project.format).toBe(PROJECT_FORMAT_ID);
    expect(project.version).toBe(PROJECT_FORMAT_VERSION); // Migrated to 3
    expect(project.name).toBe('Historical v1.13 Artwork');
    expect(project.width).toBe(16);
    expect(project.height).toBe(16);
    expect(project.fps).toBe(8);
    expect(project.loopMode).toBe('repeat');

    // Verify onionSkin preservation
    expect(project.onionSkin.enabled).toBe(true);
    expect(project.onionSkin.opacity).toBe(0.4);
    expect(project.onionSkin.prevColor).toBe('#7fae6b');

    // Verify palettes & clips preservation
    expect(project.palettes).toHaveLength(1);
    expect(project.palettes[0].id).toBe('palette-retro');
    expect(project.clips).toHaveLength(1);
    expect(project.clips[0].name).toBe('Idle');

    // Verify frames & layers preservation
    expect(project.frames).toHaveLength(2);
    expect(project.frames[0].layers).toHaveLength(2);
    expect(project.frames[0].layers[1].name).toBe('Character');
    expect(project.frames[0].layers[1].opacity).toBe(0.9);
  });

  it('correctly decodes and validates v1.14.0 (format v3) preserving layer effect recipes', () => {
    const rawContent = fs.readFileSync(v114Path, 'utf-8');
    const result = decodeAndValidateProject(rawContent);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const project = result.value;
    expect(project.version).toBe(3);
    expect(project.name).toBe('Historical v1.14.0 Artwork');
    expect(project.frames).toHaveLength(1);

    const fxLayer = project.frames[0].layers.find((l) => l.tag === 'fx');
    expect(fxLayer).toBeDefined();
    expect(fxLayer?.effect).toBeDefined();
    expect(fxLayer?.effect?.kind).toBe('photometric');
    expect(fxLayer?.effect?.params.material).toBe('skin');
  });

  it('preserves fields across re-serialization with format version 3', () => {
    const rawContent = fs.readFileSync(v113Path, 'utf-8');
    const result = decodeAndValidateProject(rawContent);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Simulate export/re-serialization to JSON string
    const reserializedJson = JSON.stringify(result.value);
    const roundtrip = decodeAndValidateProject(reserializedJson);

    expect(roundtrip.ok).toBe(true);
    if (!roundtrip.ok) return;
    expect(roundtrip.value.version).toBe(3);
    expect(roundtrip.value.name).toBe(result.value.name);
    expect(roundtrip.value.frames.length).toBe(result.value.frames.length);
  });

  it('enforces resource budget on legacy format files (does not bypass limits for old formats)', () => {
    const rawContent = fs.readFileSync(v113Path, 'utf-8');
    const parsed = JSON.parse(rawContent);

    // Inflate legacy format payload to exceed aggregate pixel budget
    parsed.width = 2048;
    parsed.height = 2048;
    // 2 frames with 10 layers each = 20 layers * 4Mpx = 80Mpx > 64Mpx budget
    const layer = parsed.frames[0].layers[0];
    parsed.frames = [
      { id: 'f1', durationMs: 100, layers: Array.from({ length: 10 }, (_, i) => ({ ...layer, id: `l-${i}` })) },
      { id: 'f2', durationMs: 100, layers: Array.from({ length: 10 }, (_, i) => ({ ...layer, id: `l-${i + 10}` })) },
    ];

    const result = decodeAndValidateProject(JSON.stringify(parsed));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/resource.*ceiling|resource.*budget|worst-case footprint/i);
    }
  });

  it('rejects corrupt JSON string with a descriptive error', () => {
    const corruptJson = '{"format": "pixibun-project", "version": 2, name: incomplete...';
    const result = decodeAndValidateProject(corruptJson);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeDefined();
    }
  });

  it('rejects JSON missing required structural fields', () => {
    const missingFrames = JSON.stringify({
      format: 'pixibun-project',
      version: 3,
      name: 'Missing Frames',
      width: 16,
      height: 16,
      fps: 8,
    });
    const result = decodeAndValidateProject(missingFrames);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/frames|palettes/i);
    }
  });

  it('rejects JSON with invalid field types', () => {
    const invalidTypes = JSON.stringify({
      format: 'pixibun-project',
      version: 3,
      name: 'Invalid Types',
      width: -10,
      height: 16,
      fps: 'eight',
      frames: [],
    });
    const result = decodeAndValidateProject(invalidTypes);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeDefined();
    }
  });

  it('sanitizes prototype pollution payload without corrupting Object prototype', () => {
    const maliciousJson = JSON.stringify({
      format: 'pixibun-project',
      version: 2,
      name: 'Exploit Test',
      width: 16,
      height: 16,
      fps: 8,
      __proto__: { isAdmin: true },
      palettes: [{ id: 'p1', name: 'Pal', colors: ['#000000'] }],
      currentPaletteId: 'p1',
      frames: [{ id: 'f1', durationMs: 100, layers: [{ id: 'l1', name: 'L1', visible: true, locked: false, opacity: 1, blendMode: 'source-over' }] }],
      createdAt: 1000,
      updatedAt: 1000,
    });

    const result = decodeAndValidateProject(maliciousJson);
    expect((({} as unknown as Record<string, unknown>).isAdmin)).toBeUndefined();
    if (result.ok) {
      expect((result.value as unknown as Record<string, unknown>).isAdmin).toBeUndefined();
    }
  });
});
