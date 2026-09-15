import type { Era } from "@/lib/data/schemas";

/** The era band a year falls in (bands are [from, to) except the last, which includes its end). */
export function eraForYear(year: number, eras: readonly Era[]): Era | undefined {
  const last = eras[eras.length - 1];
  if (last && year >= last.from && year <= last.to) return last;
  return eras.find((e) => year >= e.from && year < e.to);
}
