export interface PixelPoint { x: number; y: number }
export interface CanvasGeometry {
  width: number; height: number;
  bounds: { x: number; y: number; width: number; height: number };
}

export class ControllerInputError extends Error {
  constructor(message: string) { super(message); this.name = 'ControllerInputError'; }
}

/** Pixel centres, measured afresh after zoom, layout, frame and tool changes. */
export function pixelToClient(point: PixelPoint, canvas: CanvasGeometry): PixelPoint {
  const { width, height, bounds } = canvas;
  if (![width, height].every(v => Number.isInteger(v) && v > 0)
    || ![bounds.x, bounds.y, bounds.width, bounds.height].every(Number.isFinite)
    || bounds.width <= 0 || bounds.height <= 0) throw new ControllerInputError('Canvas geometry is unavailable.');
  if (![point.x, point.y].every(Number.isInteger) || point.x < 0 || point.y < 0
    || point.x >= width || point.y >= height) throw new ControllerInputError('Pixel is outside the current canvas.');
  return { x: bounds.x + (point.x + 0.5) * bounds.width / width,
    y: bounds.y + (point.y + 0.5) * bounds.height / height };
}
