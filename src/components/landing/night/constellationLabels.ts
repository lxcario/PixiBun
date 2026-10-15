export interface LabelBox { x: number; y: number; width: number; height: number }
export interface MeasuredLabel { id: number; x: number; y: number; width: number; height: number }

const NAMES = [
  'The Sleepy Teacup', "Bun's Left Ear", 'The Lost Mitten', 'The Great Dumpling',
  'Two Moths Gossiping', 'The Midnight Snack', 'The Wobbly Kettle',
  'A Cat Pretending Not to Care', 'The Little Paintbrush', "Grandma's Cardigan",
  'The Forgotten Sock', 'Three Peas, Arguing',
];

/** Names are unique among the constellations still on the canvas. */
export function nextConstellationName(used: readonly string[]): string {
  const available = NAMES.find(name => !used.includes(name));
  if (available) return available;
  let serial = 2;
  while (used.includes(`${NAMES[0]} ${serial}`)) serial++;
  return `${NAMES[0]} ${serial}`;
}

const intersects = (a: LabelBox, b: LabelBox) =>
  a.x < b.x + b.width + 8 && a.x + a.width + 8 > b.x &&
  a.y < b.y + b.height + 8 && a.y + a.height + 8 > b.y;

/** Use measured text sizes. A crowded name stays hidden rather than covering copy. */
export function placeConstellationLabels(labels: readonly MeasuredLabel[], bounds: LabelBox, obstacles: readonly LabelBox[]) {
  const placed = new Map<number, LabelBox>();
  for (const label of labels) {
    if (label.width > bounds.width || label.height > bounds.height) continue;
    const xs = [label.x - label.width / 2, ...obstacles.flatMap(box => [box.x + box.width + 8, box.x - label.width - 8]), bounds.x, bounds.x + bounds.width - label.width];
    const ys = [label.y, label.y - label.height - 12, label.y + label.height + 12, bounds.y, bounds.y + bounds.height - label.height];
    const candidates = xs.flatMap(x => ys.map(y => ({
      x: Math.round(Math.max(bounds.x, Math.min(x, bounds.x + bounds.width - label.width))),
      y: Math.round(Math.max(bounds.y, Math.min(y, bounds.y + bounds.height - label.height))),
      width: label.width, height: label.height,
    }))).sort((a, b) => Math.hypot(a.x + a.width / 2 - label.x, a.y - label.y) - Math.hypot(b.x + b.width / 2 - label.x, b.y - label.y));
    const slot = candidates.find(box => ![...obstacles, ...placed.values()].some(other => intersects(box, other)));
    if (slot) placed.set(label.id, slot);
  }
  return placed;
}
