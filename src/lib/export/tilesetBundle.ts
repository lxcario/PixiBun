import { useStudioStore } from '@/stores/studioStore';
import { getBufferGeneration, getBufferRevision, snapshotBuffers } from '@/lib/engine/bufferRegistry';
import { extractTileFromBuffer, tilesAreEqual, type RawPixelBuffer } from '@/lib/canvas/tileStamp';
import { reserveMemory } from '@/lib/safety/memoryBudget';
import { zipBundle } from './zipBundle';

export function validateTilesetSource(width: number, height: number, tileSize: number): void {
  if (![8, 16, 32].includes(tileSize)) throw new Error('Choose 8, 16 or 32 px tiles.');
  if (![width, height].every(n => Number.isSafeInteger(n) && n > 0 && n <= 4096) || width * height > 4_000_000) {
    throw new Error('Tile slicing supports artwork up to 4096 px per side and four million pixels.');
  }
  if (width % tileSize || height % tileSize) throw new Error(`Choose a tile size that divides both canvas dimensions. ${tileSize} px tiles would cut off an edge.`);
  if (width * height / (tileSize * tileSize) > 4096) throw new Error('Slice at most 4096 source tiles. Try a larger tile size or a smaller canvas.');
}

/** Exact byte equality after hash bucketing; IDs follow first appearance, row by row. */
export function packUniqueTiles(source: RawPixelBuffer, tileSize: number) {
  validateTilesetSource(source.width, source.height, tileSize);
  if (source.data.length !== source.width * source.height * 4) throw new Error('The source pixels are incomplete.');
  const columns = source.width / tileSize, rows = source.height / tileSize;
  const tiles: Uint8ClampedArray[] = [], buckets = new Map<number, number[]>(), tilemap: number[][] = [];
  for (let y = 0; y < rows; y++) {
    const row: number[] = [];
    for (let x = 0; x < columns; x++) {
      const tile = extractTileFromBuffer(source, x * tileSize, y * tileSize, tileSize);
      let hash = 2166136261;
      for (const byte of tile) hash = Math.imul(hash ^ byte, 16777619) >>> 0;
      const candidates = buckets.get(hash) ?? [];
      let id = candidates.find(i => tilesAreEqual(tiles[i], tile));
      if (id === undefined) { id = tiles.length; tiles.push(tile); candidates.push(id); buckets.set(hash, candidates); }
      row.push(id);
    }
    tilemap.push(row);
  }
  const atlasColumns = Math.ceil(Math.sqrt(tiles.length)), atlasRows = Math.ceil(tiles.length / atlasColumns);
  const width = atlasColumns * tileSize, height = atlasRows * tileSize;
  const pixels = new Uint8ClampedArray(width * height * 4);
  tiles.forEach((tile, id) => {
    const x = id % atlasColumns * tileSize, y = Math.floor(id / atlasColumns) * tileSize;
    for (let row = 0; row < tileSize; row++) pixels.set(tile.subarray(row * tileSize * 4, (row + 1) * tileSize * 4), ((y + row) * width + x) * 4);
  });
  const metadata = { format: 'pixibun-tilemap', version: 1, tileSize, columns, rows, uniqueTiles: tiles.length,
    source: { width: source.width, height: source.height },
    atlas: { image: 'tileset.png', columns: atlasColumns, rows: atlasRows, width, height, margin: 0, spacing: 0, indexBase: 0 }, tilemap };
  // Tiled reserves GID 0 for an empty cell; our local tile 0 becomes GID 1.
  const tiled = { type: 'map', version: '1.10', orientation: 'orthogonal', renderorder: 'right-down', infinite: false,
    width: columns, height: rows, tilewidth: tileSize, tileheight: tileSize, nextlayerid: 2, nextobjectid: 1,
    layers: [{ id: 1, name: 'Artwork', type: 'tilelayer', width: columns, height: rows, x: 0, y: 0, opacity: 1, visible: true, data: tilemap.flat().map(id => id + 1) }],
    tilesets: [{ firstgid: 1, name: 'PixiBun tiles', tilewidth: tileSize, tileheight: tileSize, tilecount: tiles.length, columns: atlasColumns,
      image: 'tileset.png', imagewidth: width, imageheight: height, margin: 0, spacing: 0 }] };
  return { pixels, metadata, tiled };
}

export function tilesetSourceKey(tileSize: number): string {
  const s = useStudioStore.getState(), frame = s.frames[s.activeFrameIndex];
  return JSON.stringify([s.currentProjectId, frame?.id, s.activeLayerId, s.canvasWidth, s.canvasHeight, tileSize,
    s.editRevision, s.bufferVersion, getBufferGeneration(s.activeLayerId ?? ''), getBufferRevision(s.activeLayerId ?? '')]);
}

export function assertTilesetCurrent(sourceKey: string, tileSize: number, signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException('Tile export cancelled.', 'AbortError');
  if (sourceKey !== tilesetSourceKey(tileSize)) throw new Error('Artwork, layer or tile size changed. Slice again before exporting.');
}

function encodePng(canvas: HTMLCanvasElement, signal?: AbortSignal): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (error?: Error) => { if (settled) return false; settled = true; clearTimeout(timer); signal?.removeEventListener('abort', abort); if (error) reject(error); return true; };
    const abort = () => finish(new DOMException('Tile export cancelled.', 'AbortError'));
    const timer = setTimeout(() => finish(new Error('Tile PNG encoding timed out. Try a smaller canvas.')), 30_000);
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) { abort(); return; }
    try {
      canvas.toBlob(blob => {
        if (settled) return;
        if (!blob) { finish(new Error('Could not encode the tile PNG.')); return; }
        void blob.arrayBuffer().then(bytes => { if (finish()) resolve(new Uint8Array(bytes)); }, error => finish(error));
      }, 'image/png');
    } catch (error) { finish(error instanceof Error ? error : new Error('Could not encode the tile PNG.')); }
  });
}

/** Publish one matching archive only after encoding and a final ownership check. */
export async function prepareTilesetBundle(tileSize: number, signal?: AbortSignal) {
  const s = useStudioStore.getState(), sourceKey = tilesetSourceKey(tileSize);
  const check = () => assertTilesetCurrent(sourceKey, tileSize, signal);
  check(); validateTilesetSource(s.canvasWidth, s.canvasHeight, tileSize);
  const id = s.activeLayerId, frame = s.frames[s.activeFrameIndex];
  const source = id ? snapshotBuffers().get(id) : undefined;
  if (!id || !frame?.layers.some(l => l.id === id) || !source) throw new Error('Choose a layer with stored pixels before slicing.');
  if (source.canvas.width !== s.canvasWidth || source.canvas.height !== s.canvasHeight) throw new Error('Layer dimensions do not match the canvas. Restore the artwork before slicing.');
  const release = reserveMemory(s.canvasWidth * s.canvasHeight * 64 + 2_000_000, 'Unique tile export');
  let canvas: HTMLCanvasElement | undefined;
  try {
    const packed = packUniqueTiles({ width: s.canvasWidth, height: s.canvasHeight, data: source.ctx.getImageData(0, 0, s.canvasWidth, s.canvasHeight).data }, tileSize);
    canvas = document.createElement('canvas'); canvas.width = packed.metadata.atlas.width; canvas.height = packed.metadata.atlas.height;
    const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('The tile export canvas is unavailable.');
    const image = ctx.createImageData(canvas.width, canvas.height); image.data.set(packed.pixels); ctx.putImageData(image, 0, 0);
    const png = await encodePng(canvas, signal); check();
    const json = JSON.stringify(packed.metadata, null, 2), tiled = JSON.stringify(packed.tiled, null, 2);
    const blob = zipBundle([{ name: 'tileset.png', bytes: png }, { name: 'tilemap.json', bytes: new TextEncoder().encode(json) }, { name: 'map.tmj', bytes: new TextEncoder().encode(tiled) }]);
    check();
    const dispose = reserveMemory(blob.size + json.length * 2, 'Retained tile download');
    return { blob, json, sourceKey, uniqueCount: packed.metadata.uniqueTiles, cols: packed.metadata.columns, rows: packed.metadata.rows, dispose };
  } finally { if (canvas) { canvas.width = 0; canvas.height = 0; } release(); }
}
