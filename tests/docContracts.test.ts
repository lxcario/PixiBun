import { describe, expect, it } from 'vitest';
import { headingIds, withoutFences, validateMarkdownLinks } from '../scripts/docContracts.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

describe('Markdown heading validation', () => {
  it('preserves code underscores, duplicate IDs and explicit anchors', () => {
    const ids = headingIds('# 3.3 Palette via `i8x16_swizzle`\n## Repeat\n## Repeat\n<a id="custom"></a>');
    expect([...ids]).toEqual(['custom', '33-palette-via-i8x16_swizzle', 'repeat', 'repeat-1']);
  });
  it('ignores fenced code headings and links', () => {
    const source = '# Actual\n\n```md\n# Example\n[example](missing.md)\n```\n';
    expect(headingIds(source).has('example')).toBe(false);
    expect(withoutFences(source)).not.toContain('missing.md');
  });
  it('rejects ignored local link targets even when they exist in the working checkout', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pixibun-doc-links-'));
    try {
      fs.writeFileSync(path.join(root, 'guide.md'), '[record](local.md)\n[tracked](tracked.md)');
      fs.writeFileSync(path.join(root, 'local.md'), '# Private record');
      fs.writeFileSync(path.join(root, 'tracked.md'), '# Published record');
      const result = validateMarkdownLinks(root, ['guide.md'], new Set(['guide.md', 'tracked.md']));
      expect(result.errors).toEqual(['guide.md: local-only link is absent from a clean checkout: local.md']);
      expect(result.checked).toBe(2);
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });
});
