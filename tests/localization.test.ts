import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Localization & Quality Gate - Turkish Character Purge', () => {
  const rootDir = process.cwd();
  const targetDirs = [
    path.join(rootDir, 'src', 'components'),
    path.join(rootDir, 'src', 'stores'),
  ];

  // Regex specifically targeting Turkish characters (both lowercase and uppercase)
  const turkishCharRegex = /[çğıöşüÇĞİÖŞÜ]/;

  function getSourceFiles(dir: string): string[] {
    const files: string[] = [];
    if (!fs.existsSync(dir)) return files;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...getSourceFiles(fullPath));
      } else if (/\.(ts|tsx)$/.test(entry.name)) {
        files.push(fullPath);
      }
    }
    return files;
  }

  it('contains zero Turkish-specific characters in src/components and src/stores', () => {
    const allFiles = targetDirs.flatMap((dir) => getSourceFiles(dir));
    expect(allFiles.length).toBeGreaterThan(0);

    const violations: { file: string; line: number; text: string }[] = [];

    for (const file of allFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        if (turkishCharRegex.test(line)) {
          violations.push({
            file: path.relative(rootDir, file),
            line: index + 1,
            text: line.trim(),
          });
        }
      });
    }

    expect(violations).toEqual([]);
  });

  it('verifies all structural history labels in store slices are strictly in English', () => {
    const layerSlicePath = path.join(rootDir, 'src', 'stores', 'slices', 'createLayerSlice.ts');
    const animSlicePath = path.join(rootDir, 'src', 'stores', 'slices', 'createAnimationSlice.ts');

    const layerContent = fs.readFileSync(layerSlicePath, 'utf8');
    const animContent = fs.readFileSync(animSlicePath, 'utf8');

    // Expected English labels
    const expectedEnglishLabels = [
      'Delete Layer',
      'Duplicate Layer',
      'Reorder Layers',
      'Merge Down Layer',
      'Add Frame',
      'Duplicate Frame',
      'Delete Frame',
      'Reorder Frames',
    ];

    for (const label of expectedEnglishLabels.slice(0, 4)) {
      expect(layerContent).toContain(`'${label}'`);
    }

    for (const label of expectedEnglishLabels.slice(4)) {
      expect(animContent).toContain(`'${label}'`);
    }

    // Prohibited legacy Turkish labels
    const legacyTurkishLabels = [
      'Katman Silindi',
      'Katman Çoğaltıldı',
      'Katmanlar Sıralandı',
      'Katman Aşağı Birleştirildi',
      'Kare Eklendi',
      'Kare Çoğaltıldı',
      'Kare Silindi',
      'Kareler Sıralandı',
    ];

    for (const label of legacyTurkishLabels) {
      expect(layerContent).not.toContain(label);
      expect(animContent).not.toContain(label);
    }
  });

  it('verifies guest lock titles in timeline and inspector are in English', () => {
    const timelinePath = path.join(rootDir, 'src', 'components', 'layout', 'BottomTimeline.tsx');
    const layersPanelPath = path.join(rootDir, 'src', 'components', 'layout', 'inspector', 'LayersPanel.tsx');

    const timelineContent = fs.readFileSync(timelinePath, 'utf8');
    const layersPanelContent = fs.readFileSync(layersPanelPath, 'utf8');

    expect(timelineContent).toContain('Frame structure is managed by the session host.');
    expect(layersPanelContent).toContain('Layer structure is managed by the session host.');

    expect(timelineContent).not.toContain('oturum sahibi');
    expect(layersPanelContent).not.toContain('oturum sahibi');
  });
});
