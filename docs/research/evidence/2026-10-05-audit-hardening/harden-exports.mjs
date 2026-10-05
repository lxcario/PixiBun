import { readFile, writeFile } from 'node:fs/promises';
const path = 'src/components/modals/ExportModal.tsx';
let source = await readFile(path, 'utf8');
source = source.replaceAll('if (isExporting || animationFrames.length === 0) return;', 'if (abortControllerRef.current || isExporting || animationFrames.length === 0) return;')
  .replace('if (isExporting || history.length === 0) return;', 'if (abortControllerRef.current || isExporting || history.length === 0) return;');
const cleanup = '      setIsExporting(false);\n      setExportProgress(null);\n      abortControllerRef.current = null;';
if (source.split(cleanup).length !== 6) throw new Error('Expected five animation owners');
source = source.replaceAll(cleanup, '      finishExport(controller);');
const download = '      const url = URL.createObjectURL(blob);';
if (source.split(download).length !== 6) throw new Error('Expected five asynchronous blob downloads');
source = source.replaceAll(download, '      controller.signal.throwIfAborted();\n' + download);
source = source.replaceAll('          setExportProgress({ current, total });', '          if (!controller.signal.aborted) setExportProgress({ current, total });');
const start = source.indexOf('  const handleExportApng ='), end = source.indexOf('  const handleExportMp4 =', start);
let apng = source.slice(start, end).replace('    const frameCanvases: HTMLCanvasElement[] = [];', '    let prepared: ReturnType<typeof prepareExportFrames> | undefined;');
const preparationStart = apng.indexOf('    let releaseFrames:'), preparationEnd = apng.indexOf('      const blob = await exportAnimationToApngAsync', preparationStart);
apng = apng.slice(0, preparationStart) + '    try {\n      prepared = await prepareExportFramesAsync(animationFrames, canvasWidth, canvasHeight, controller.signal);\n      const frameCanvases = prepared.canvases;\n' + apng.slice(preparationEnd);
apng = apng.replace('      for (const canvas of frameCanvases) { canvas.width = 0; canvas.height = 0; }\n      releaseFrames?.();', '      prepared?.release();');
source = source.slice(0, start) + apng + source.slice(end);
const cycleStart = source.indexOf('  const handleExportCycleLoop ='), cycleEnd = source.indexOf('  const historyLength =', cycleStart);
let cycle = source.slice(cycleStart, cycleEnd).replace('if (!currentPalette || !activeCycleTracks.length) return;', 'if (abortControllerRef.current || !currentPalette || !activeCycleTracks.length) return;');
cycle = cycle.replace('    const source = compositeFrame(frames, activeFrameIndex, canvasWidth, canvasHeight, { freshCanvas: true });\n    if (!source) return;\n\n    setIsExporting(true);\n    try {',
  '    const controller = new AbortController(); abortControllerRef.current = controller;\n    let source: HTMLCanvasElement | null = null;\n    let frameCanvases: HTMLCanvasElement[] = [];\n    let releaseFrames: (() => void) | undefined;\n    setIsExporting(true);\n    try {\n      releaseFrames = reserveMemory((estimatedFrames + 4) * canvasWidth * canvasHeight * 4, "Preparing palette cycle frames");\n      await new Promise<void>(resolve => setTimeout(resolve, 0));\n      controller.signal.throwIfAborted();\n      source = compositeFrame(frames, activeFrameIndex, canvasWidth, canvasHeight, { freshCanvas: true });\n      if (!source) throw new Error("The active frame could not be rendered.");');
cycle = cycle.replace('      const frameCanvases = generateLoopAnimationCanvases(', '      frameCanvases = generateLoopAnimationCanvases(')
  .replace('          loopCount: 0,', '          loopCount: 0,\n          signal: controller.signal,')
  .replace('          undefined,\n          delays', '          controller.signal,\n          delays')
  .replace('        const url = URL.createObjectURL(apngBlob);', '        controller.signal.throwIfAborted();\n        const url = URL.createObjectURL(apngBlob);')
  .replace('        const url = URL.createObjectURL(gifBlob);', '        controller.signal.throwIfAborted();\n        const url = URL.createObjectURL(gifBlob);')
  .replace('    } catch (err) {\n      console.error', '      onClose();\n    } catch (err) {\n      if (controller.signal.aborted) return;\n      console.error')
  .replace('      setIsExporting(false);\n      setExportProgress(null);\n      onClose();', '      if (source) { source.width = 0; source.height = 0; }\n      for (const canvas of frameCanvases) { canvas.width = 0; canvas.height = 0; }\n      releaseFrames?.();\n      finishExport(controller);');
source = source.slice(0, cycleStart) + cycle + source.slice(cycleEnd);
await writeFile(path, source);
console.log('Updated animation, backup and cycle operation ownership.');
