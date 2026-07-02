/** Parse exhibit or museum id from route param (e.g. "1", "m1") to numeric API id. */
export function parseNumericId(id: string | undefined): number | null {
  if (!id) return null;
  const n = parseInt(id.replace(/^m/i, ''), 10);
  return Number.isFinite(n) ? n : null;
}
