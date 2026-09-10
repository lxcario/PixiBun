import { LessonFrameTemplate, getTemplateRows, getTemplateGridSize } from './playgroundLessons';

export interface StencilAnalysis {
  targetOutlineCells: number;
  coveredOutlineCells: number;
  outlineCoverage: number;

  totalTargetCells: number;
  totalCoveredCells: number;
  totalCoverage: number;

  targetBoundingBox: { minX: number; minY: number; maxX: number; maxY: number };
  drawnBoundingBox: { minX: number; minY: number; maxX: number; maxY: number } | null;
  boundingBoxIoU: number;

  totalDrawnPixels: number;

  isComplete: boolean;
  completionScore: number; // 0 to 100
  statusMessage: string;

  effectivePixelArea?: number;
  areaDeviation?: number;
}

export function evaluateStencilCoverage(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  template: LessonFrameTemplate
): StencilAnalysis {
  const imgData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
  const data = imgData.data;

  const rows = getTemplateRows(template);
  const gridSize = getTemplateGridSize(template);

  let targetOutlineCells = 0;
  let coveredOutlineCells = 0;
  let totalDrawnPixels = 0;

  let targetMinX = gridSize;
  let targetMinY = gridSize;
  let targetMaxX = 0;
  let targetMaxY = 0;

  let drawnMinX = gridSize;
  let drawnMinY = gridSize;
  let drawnMaxX = 0;
  let drawnMaxY = 0;
  let hasAnyDrawnCell = false;

  const cellW = canvasWidth / gridSize;
  const cellH = canvasHeight / gridSize;
  const totalPixelsPerCell = cellW * cellH;

  for (let gy = 0; gy < gridSize; gy++) {
    const row = rows[gy];
    if (!row) continue;

    for (let gx = 0; gx < gridSize; gx++) {
      const char = row[gx];
      const isTarget = char !== '.' && char !== undefined;

      if (isTarget) {
        if (gx < targetMinX) targetMinX = gx;
        if (gx > targetMaxX) targetMaxX = gx;
        if (gy < targetMinY) targetMinY = gy;
        if (gy > targetMaxY) targetMaxY = gy;
        targetOutlineCells++;
      }

      // Count non-transparent pixels in this cell block
      let drawnInCell = 0;
      const startX = Math.floor(gx * cellW);
      const startY = Math.floor(gy * cellH);
      const endX = Math.floor((gx + 1) * cellW);
      const endY = Math.floor((gy + 1) * cellH);

      for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
          const idx = (y * canvasWidth + x) * 4;
          if (data[idx + 3] > 40) {
            drawnInCell++;
            totalDrawnPixels++;
          }
        }
      }

      const cellInked = drawnInCell >= Math.max(1, totalPixelsPerCell * 0.15);

      if (cellInked) {
        hasAnyDrawnCell = true;
        if (gx < drawnMinX) drawnMinX = gx;
        if (gx > drawnMaxX) drawnMaxX = gx;
        if (gy < drawnMinY) drawnMinY = gy;
        if (gy > drawnMaxY) drawnMaxY = gy;

        if (isTarget) {
          coveredOutlineCells++;
        }
      }
    }
  }

  const totalTargetCells = targetOutlineCells;
  const totalCoveredCells = coveredOutlineCells;
  const outlineCoverage = targetOutlineCells > 0 ? coveredOutlineCells / targetOutlineCells : 1.0;
  const totalCoverage = outlineCoverage;

  // Bounding Box IoU
  let boundingBoxIoU = 0;
  if (hasAnyDrawnCell && totalTargetCells > 0) {
    const interMinX = Math.max(targetMinX, drawnMinX);
    const interMinY = Math.max(targetMinY, drawnMinY);
    const interMaxX = Math.min(targetMaxX, drawnMaxX);
    const interMaxY = Math.min(targetMaxY, drawnMaxY);

    const interW = Math.max(0, interMaxX - interMinX + 1);
    const interH = Math.max(0, interMaxY - interMinY + 1);
    const interArea = interW * interH;

    const targetArea = (targetMaxX - targetMinX + 1) * (targetMaxY - targetMinY + 1);
    const drawnArea = (drawnMaxX - drawnMinX + 1) * (drawnMaxY - drawnMinY + 1);
    const unionArea = targetArea + drawnArea - interArea;

    boundingBoxIoU = unionArea > 0 ? interArea / unionArea : 0;
  }

  const completionScore = Math.min(100, Math.round(outlineCoverage * 100));

  // Strict outline completion criteria: at least 85% of outline pixels must be inked
  const isComplete = outlineCoverage >= 0.85;

  let statusMessage = 'Trace the outline stencil on the canvas.';
  if (isComplete) {
    statusMessage = 'Outline complete! Click Next Frame to proceed.';
  } else if (completionScore > 0) {
    statusMessage = `Outline in progress (${completionScore}%). Finish inking all edges!`;
  }

  const effectivePixelArea = template.effectivePixelArea;
  const areaDeviation = effectivePixelArea ? totalDrawnPixels - effectivePixelArea : 0;

  return {
    targetOutlineCells,
    coveredOutlineCells,
    outlineCoverage,
    totalTargetCells,
    totalCoveredCells,
    totalCoverage,
    targetBoundingBox: { minX: targetMinX, minY: targetMinY, maxX: targetMaxX, maxY: targetMaxY },
    drawnBoundingBox: hasAnyDrawnCell ? { minX: drawnMinX, minY: drawnMinY, maxX: drawnMaxX, maxY: drawnMaxY } : null,
    boundingBoxIoU,
    totalDrawnPixels,
    isComplete,
    completionScore,
    statusMessage,
    effectivePixelArea,
    areaDeviation,
  };
}
