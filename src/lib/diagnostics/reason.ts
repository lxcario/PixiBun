/** Global rejection values can be arbitrary objects, including circular graphs and throwing getters. */
export function diagnosticReason(reason: unknown): { message: string; detail: string } {
  const text = (key: string) => {
    try { const value = reason && typeof reason === 'object' ? Reflect.get(reason, key) : undefined;
      return typeof value === 'string' ? value.slice(0, 2048) : undefined; } catch { return undefined; }
  };
  const seen = new WeakSet<object>();
  let nodes = 0;
  const visit = (value: unknown, depth: number): unknown => {
    if (++nodes > 64 || depth > 4) return '[truncated]';
    if (typeof value === 'bigint') return `${value}n`;
    if (typeof value === 'string') return value.slice(0, 2048);
    if (value === null || typeof value !== 'object') return String(value);
    if (seen.has(value)) return '[circular]';
    seen.add(value);
    const result: Record<string, unknown> = Object.create(null);
    let keys = 0;
    for (const key in value) {
      if (++keys > 32 || nodes >= 64) break;
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor) result[key.slice(0, 128)] = 'value' in descriptor ? visit(descriptor.value, depth + 1) : '[accessor]';
    }
    return result;
  };
  let detail: string;
  try { detail = text('stack') ?? JSON.stringify(visit(reason, 0)).slice(0, 2048); }
  catch { detail = '[unreadable rejection value]'; }
  return { message: typeof reason === 'string' ? reason.slice(0, 1024) : text('message') ?? 'Unhandled promise rejection', detail };
}
