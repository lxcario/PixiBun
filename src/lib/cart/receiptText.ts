/** "38 min", "2 h 5 min", "under a minute": how long a drawing took, in plain words. */
export function formatDuration(ms: number): string {
  const minutes = Math.round(Math.max(0, ms) / 60000);
  if (minutes < 1) return 'under a minute';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60), rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}
