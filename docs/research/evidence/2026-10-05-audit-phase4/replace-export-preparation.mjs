import fs from 'node:fs';
const path = 'src/components/modals/ExportModal.tsx';
let source = fs.readFileSync(path, 'utf8').replaceAll('\r\n', '\n');
source = source.replace("import { reserveMemory } from '@/lib/safety/memoryBudget';", "import { reserveMemory } from '@/lib/safety/memoryBudget';\nimport { prepareExportFrames } from '@/lib/export/prepareFrames';");
for (const name of ['handleExportGIF', 'handleExportMp4', 'handleExportWebm']) {
  const start = source.indexOf(`  const ${name} =`);
  const end = source.indexOf('\n  const ', start + 1);
  let block = source.slice(start, end);
  const prep = block.indexOf('    const frameCanvases: HTMLCanvasElement[] = [];');
  const controller = block.indexOf('    const controller = new AbortController();', prep);
  if (prep < 0 || controller < prep) throw new Error(`Missing ${name} prep`);
  block = block.slice(0, prep) + '    let prepared: ReturnType<typeof prepareExportFrames> | undefined;\n\n' + block.slice(controller);
  block = block.replaceAll('total: frameCanvases.length', 'total: animationFrames.length');
  block = block.replace('    try {\n', '    try {\n      prepared = prepareExportFrames(animationFrames, canvasWidth, canvasHeight);\n      const frameCanvases = prepared.canvases;\n');
  block = block.replace('    } finally {\n', '    } finally {\n      prepared?.release();\n');
  source = source.slice(0, start) + block + source.slice(end);
}
const start = source.indexOf('  const handleExportSpriteSheet =');
const end = source.indexOf('\n  const ', start + 1);
let block = source.slice(start, end);
const prep = block.indexOf('      const frameCanvases = targetFrames.map(');
const after = block.indexOf('      const baseFilename', prep);
if (prep < 0 || after < prep) throw new Error('Missing sheet prep');
block = block.slice(0, prep) + '      releaseSheet = reserveMemory(geometry.sheetWidth * geometry.sheetHeight * 4 * 4, \'Preparing sprite sheet and PNG\');\n      prepared = prepareExportFrames(targetFrames, canvasWidth, canvasHeight);\n      const frameCanvases = prepared.canvases;\n' + block.slice(after);
block = block.replace('    try {', '    let prepared: ReturnType<typeof prepareExportFrames> | undefined;\n    let releaseSheet: (() => void) | undefined;\n    let sheet: HTMLCanvasElement | undefined;\n    try {');
block = block.replace("      const dataUrl = packed.canvas.toDataURL('image/png');", "      sheet = packed.canvas;\n      const dataUrl = packed.canvas.toDataURL('image/png');");
block = block.replace('    }\n  };', '    } finally {\n      prepared?.release();\n      if (sheet) { sheet.width = 0; sheet.height = 0; }\n      releaseSheet?.();\n    }\n  };');
source = source.slice(0, start) + block + source.slice(end);
fs.writeFileSync(path, source);
