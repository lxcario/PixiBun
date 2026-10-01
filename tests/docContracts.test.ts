import { describe, expect, it } from 'vitest';
import { headingIds, withoutFences } from '../scripts/docContracts.mjs';

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
});
