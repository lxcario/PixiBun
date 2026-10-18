import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const target = process.argv[2];

function clean(text) {
  return text
    .replace(/^[ \t]*Co-Authored-By:\s*(?:Claude|Anthropic).*$/gim, '')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd() + '\n';
}

if (target && existsSync(target)) {
  const content = readFileSync(target, 'utf8');
  writeFileSync(target, clean(content), 'utf8');
} else {
  try {
    const input = readFileSync(0, 'utf8');
    process.stdout.write(clean(input));
  } catch {
    // If no stdin or file, exit gracefully
    process.exit(0);
  }
}
