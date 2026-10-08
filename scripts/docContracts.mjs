import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';

export function headingIds(markdown) {
  const ids = new Set([...markdown.matchAll(/\bid=["']([^"']+)["']/g)].map(m => m[1]));
  const counts = new Map();
  for (const match of withoutFences(markdown).matchAll(/^#{1,6}\s+(.+?)\s*#*\s*$/gm)) {
    // GitHub preserves underscores in code names; removing them caused the old swizzle false positive.
    const base = match[1].replace(/<[^>]*>/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[*~`]/g, '').toLowerCase().replace(/[^\p{L}\p{N}_ -]/gu, '').replaceAll(' ', '-');
    const count = counts.get(base) ?? 0; counts.set(base, count + 1);
    ids.add(base + (count ? '-' + count : ''));
  }
  return ids;
}
export function withoutFences(s) {
  return s.replace(/^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1\s*$/gm, '');
}
export function validateMarkdownLinks(root, docs) {
  const errors = []; let checked = 0;
  for (const doc of docs) {
    const content = withoutFences(fs.readFileSync(path.join(root, doc), 'utf8'));
    for (const match of content.matchAll(/\]\((<[^>]+>|[^)\n]+)\)/g)) {
      const target = match[1].replace(/^<|>$/g, '').replace(/\s+["'][^"']*["']$/, '');
      if (/^[\w+.-]+:/.test(target)) continue;
      const [file, fragment] = target.split('#');
      const dest = file ? path.resolve(root, path.dirname(doc), decodeURIComponent(file)) : path.resolve(root, doc);
      checked++;
      if (!fs.existsSync(dest)) errors.push(`${doc}: missing ${target}`);
      else if (fragment && dest.endsWith('.md') && !headingIds(fs.readFileSync(dest, 'utf8')).has(decodeURIComponent(fragment))) {
        errors.push(`${doc}: missing heading ${target}`);
      }
    }
  }
  return { checked, errors };
}
export function ownedMarkdown(root) {
  // Git lists tracked and new non-ignored project docs, excluding private scratch/worktrees.
  // Include long paths in retained browser evidence without truncating Git's list.
  return execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: root, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 })
    .split('\0').filter(p => p.endsWith('.md') && !p.startsWith('.kilo/')).sort();
}
export function sourceContracts(root) {
  const read = p => fs.readFileSync(path.join(root, p), 'utf8');
  const source = ts.createSourceFile('shortcuts.ts', read('src/config/shortcuts.ts'), ts.ScriptTarget.Latest, true);
  const tools = [];
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === 'CANONICAL_TOOLS' && ts.isArrayLiteralExpression(node.initializer)) {
      for (const element of node.initializer.elements) {
        if (!ts.isObjectLiteralExpression(element)) throw Error('Tool inventory must use static entries');
        const row = {};
        for (const prop of element.properties) if (ts.isPropertyAssignment(prop) && ts.isStringLiteral(prop.initializer)) row[prop.name.getText(source)] = prop.initializer.text;
        tools.push({ id: row.id, label: row.label, shortcut: row.shortcut });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  if (!tools.length) throw Error('No canonical tools found');
  const keyboard = read('src/hooks/studio/useStudioKeyboard.ts');
  const commands = read('src/config/studioCommands.ts');
  // Tool commands now derive from the inventory rather than a second switch.
  // Gesture execution is verified by unit and compiled browser tests separately.
  if (!commands.includes('CANONICAL_TOOLS.map(tool =>') || !commands.includes('shortcut: tool.shortcut') ||
      !commands.includes('setActiveTool(tool.id)') || !keyboard.includes('studioCommandForKey(e)') ||
      !keyboard.includes('command.action()') || keyboard.includes('state.setActiveTool(')) {
    throw Error('Keyboard tool commands must use the canonical command registry');
  }
  if (!/case ' ':/.test(keyboard)) throw Error('Space shortcut contract changed');
  if (read('src/components/layout/AtelierRail.tsx').includes('Spritesheet (E)')) throw Error('Export must not advertise the Eraser shortcut');
  const exports = [
    { format: 'WebM', source: 'src/lib/export/webmEncoder.ts', implementation: 'recordCanvasVideo', alpha: 'not-guaranteed' },
    { format: 'APNG', source: 'src/lib/export/apngEncoder.ts', implementation: 'encodeZlibDeflate', alpha: 'RGBA', compression: 'DEFLATE-store-blocks' },
    { format: 'MP4', source: 'src/lib/export/mp4Encoder.ts', implementation: 'VideoEncoder', alpha: 'not-guaranteed' },
    { format: 'GIF', source: 'src/lib/export/gifEncoderCore.ts', implementation: 'LZW', alpha: 'palette-transparency' },
  ];
  for (const entry of exports) if (!read(entry.source).includes(entry.implementation)) throw Error(`Review changed encoder contract: ${entry.source}`);
  const pkg = JSON.parse(read('package.json'));
  if (!pkg.engines.node.includes('22') || !read('.nvmrc').trim().startsWith('22')) throw Error('Review runtime contract');
  return { packageVersion: pkg.version, node: pkg.engines.node, tools, exports };
}
export function testInventory(root) {
  const run = args => execFileSync(process.execPath, args, { cwd: root, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
  const unit = JSON.parse(run(['node_modules/vitest/vitest.mjs', 'list', '--json']));
  const enumerate = config => {
    const raw = run(['node_modules/@playwright/test/cli.js', 'test', '--list', ...(config ? ['--config', config] : [])]);
    const match = raw.match(/Total:\s+(\d+)\s+tests\s+in\s+(\d+)\s+files/);
    if (!match) throw Error('Unable to parse Playwright inventory');
    return { tests: Number(match[1]), files: Number(match[2]) };
  };
  return { kind: 'runner-enumeration-not-execution', unit: { tests: unit.length, suites: new Set(unit.map(t => t.file)).size }, editor: enumerate(), production: enumerate('playwright.production.config.ts') };
}
