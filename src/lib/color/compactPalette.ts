import { rgbToOKLab } from '@/lib/graphics/math/colorSpace';

/** Bounded, alpha-weighted palette summaries. Returned colors are actual source
 * samples, not averaged paint; nearby raster variations share an OKLab cluster. */
export function extractCompactPalette(data: Uint8ClampedArray, count = 6): string[] {
  const limit = Math.max(1, Math.min(32, Number.isFinite(count) ? Math.round(count) : 6));
  const bins = new Map<number, { r: number; g: number; b: number; weight: number; sample: number }>();
  const exact = new Map<number, number>();
  let exactOverflow = false;
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3]; if (alpha <= 30) continue;
    const r = data[i], g = data[i + 1], b = data[i + 2], sample = (r << 16) | (g << 8) | b;
    if (!exactOverflow) {
      exact.set(sample, (exact.get(sample) ?? 0) + alpha);
      if (exact.size > limit) { exactOverflow = true; exact.clear(); }
    }
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    const bin = bins.get(key);
    if (bin) { bin.r += r * alpha; bin.g += g * alpha; bin.b += b * alpha; bin.weight += alpha; }
    else bins.set(key, { r: r * alpha, g: g * alpha, b: b * alpha, weight: alpha, sample });
  }
  const hex = (rgb: number) => `#${rgb.toString(16).padStart(6, '0').toUpperCase()}`;
  if (!exactOverflow) return [...exact].sort((a, b) => b[1] - a[1] || a[0] - b[0]).map(([rgb]) => hex(rgb));
  // Select each bin's source sample nearest its mean in a second bounded pass.
  const distances = new Map<number, number>();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] <= 30) continue;
    const r = data[i], g = data[i + 1], b = data[i + 2], key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    const bin = bins.get(key)!;
    const distance = (r - bin.r / bin.weight) ** 2 + (g - bin.g / bin.weight) ** 2 + (b - bin.b / bin.weight) ** 2;
    if (distance < (distances.get(key) ?? Infinity)) { distances.set(key, distance); bin.sample = (r << 16) | (g << 8) | b; }
  }
  const points = [...bins.values()].map(bin => ({ ...bin, ...rgbToOKLab(bin.r / bin.weight, bin.g / bin.weight, bin.b / bin.weight) }))
    .sort((a, b) => b.weight - a.weight || a.sample - b.sample);
  if (!points.length) return [];
  const distance = (a: { L: number; a: number; b: number }, b: { L: number; a: number; b: number }) =>
    (a.L - b.L) ** 2 + (a.a - b.a) ** 2 + (a.b - b.b) ** 2;
  let centers = [{ L: points[0].L, a: points[0].a, b: points[0].b }];
  while (centers.length < Math.min(limit, points.length)) {
    let best = points[0], score = -1;
    for (const p of points) {
      const candidate = Math.min(...centers.map(c => distance(p, c))) * Math.sqrt(p.weight);
      if (candidate > score) { best = p; score = candidate; }
    }
    if (score <= 1e-12) break;
    centers.push({ L: best.L, a: best.a, b: best.b });
  }
  const assignments = new Uint8Array(points.length);
  for (let iteration = 0; iteration < 8; iteration++) {
    const sums = centers.map(() => ({ L: 0, a: 0, b: 0, weight: 0 }));
    points.forEach((p, i) => {
      let nearest = 0, d = Infinity;
      centers.forEach((c, j) => { const next = distance(p, c); if (next < d) { nearest = j; d = next; } });
      assignments[i] = nearest;
      const sum = sums[nearest]; sum.L += p.L * p.weight; sum.a += p.a * p.weight; sum.b += p.b * p.weight; sum.weight += p.weight;
    });
    centers = sums.map((sum, i) => sum.weight ? { L: sum.L / sum.weight, a: sum.a / sum.weight, b: sum.b / sum.weight } : centers[i]);
  }
  const candidates = centers.map((c, index) => {
    const group = points.filter((_, i) => assignments[i] === index);
    // Favor a common source swatch near the center over a rare edge sample.
    group.sort((a, b) => (distance(a, c) + 0.0001) / Math.sqrt(a.weight) - (distance(b, c) + 0.0001) / Math.sqrt(b.weight) || a.sample - b.sample);
    return group.length ? { ...group[0], clusterWeight: group.reduce((sum, p) => sum + p.weight, 0) } : null;
  }).filter((p): p is NonNullable<typeof p> => p !== null).sort((a, b) => b.clusterWeight - a.clusterWeight || a.sample - b.sample);
  const distinct: typeof candidates = [];
  for (const candidate of candidates) {
    // The color limit is a ceiling, not a quota: don't fill unused slots with
    // two almost identical edge/ink shades from the same color family.
    if (!distinct.some(p => distance(p, candidate) < 0.03 ** 2)) distinct.push(candidate);
  }
  return distinct.sort((a, b) => a.L - b.L || a.sample - b.sample).map(p => hex(p.sample));
}
