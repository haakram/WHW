/** The border snapshot to draw for a year: the latest available year that is ≤ the slider year. */
export function pickSnapshotYear(year: number, available: readonly number[]): number {
  if (available.length === 0) throw new Error("no snapshots available");
  const sorted = [...available].sort((a, b) => a - b);
  let best = sorted[0]!;
  for (const y of sorted) if (y <= year) best = y;
  return best;
}
