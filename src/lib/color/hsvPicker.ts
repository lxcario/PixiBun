export function hsvToHex(h: number, s: number, v: number): string {
  const hue = ((h % 360) + 360) % 360;
  const channel = (n: number) => {
    const k = (n + hue / 60) % 6;
    return Math.round(255 * (v - v * s * Math.max(0, Math.min(k, 4 - k, 1))));
  };
  return '#' + [5, 3, 1].map(n => channel(n).toString(16).padStart(2, '0')).join('');
}
export function hexToHsv(hex: string): [number, number, number] {
  const expanded = hex.length === 4 ? '#' + hex.slice(1).split('').map(c => c + c).join('') : hex;
  const rgb = [1, 3, 5].map(i => parseInt(expanded.slice(i, i + 2), 16) / 255);
  if (rgb.some(c => !Number.isFinite(c))) return [0, 0, 0];
  const [r, g, b] = rgb, max = Math.max(...rgb), min = Math.min(...rgb), d = max - min;
  const hue = d === 0 ? 0 : max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [hue * 60, max === 0 ? 0 : d / max, max];
}
/** Hue at the top, white at bottom-left, black at bottom-right. */
export function trianglePoint(s: number, v: number) {
  const hueWeight = s * v, blackWeight = 1 - v;
  return { x: 0.5 * hueWeight + blackWeight, y: 1 - hueWeight };
}
export function triangleHsv(x: number, y: number): [number, number] {
  // Clamp outside drags to the nearest edge, rather than wrapping the color.
  const vertices = [{ x: 0.5, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }];
  let hue = 1 - y, black = x - hue * 0.5, white = 1 - hue - black;
  if (Math.min(hue, white, black) < 0) {
    let best = vertices[0], distance = Infinity;
    for (let i = 0; i < 3; i++) {
      const a = vertices[i], b = vertices[(i + 1) % 3];
      const dx = b.x - a.x, dy = b.y - a.y;
      const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy)));
      const p = { x: a.x + t * dx, y: a.y + t * dy }, d = (x - p.x) ** 2 + (y - p.y) ** 2;
      if (d < distance) { best = p; distance = d; }
    }
    hue = 1 - best.y; black = best.x - hue * 0.5; white = 1 - hue - black;
  }
  const value = Math.max(0, Math.min(1, hue + white));
  return [value === 0 ? 0 : Math.max(0, Math.min(1, hue / value)), value];
}
