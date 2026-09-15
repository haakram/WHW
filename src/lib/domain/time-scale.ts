import { MAX_YEAR, MIN_YEAR } from "@/lib/data/schemas";

/**
 * The timeline slider is non-linear: antiquity moves in centuries, the last 500 years move in
 * single years. `BREAKPOINTS` maps year → slider position t ∈ [0, 1]; both directions are
 * piecewise-linear between them. Pure so it can be unit-tested and used by the play loop.
 */
export const BREAKPOINTS: ReadonlyArray<readonly [year: number, t: number]> = [
  [-3000, 0],
  [-500, 0.1],
  [1, 0.18],
  [1000, 0.3],
  [1500, 0.42],
  [1800, 0.56],
  [1900, 0.7],
  [2026, 1],
];

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/** Slider position (0–1) → calendar year. Never returns 0 (the year after 1 BC is AD 1). */
export function sliderToYear(t: number): number {
  const x = clamp(t, 0, 1);
  for (let i = 1; i < BREAKPOINTS.length; i++) {
    const [y0, t0] = BREAKPOINTS[i - 1]!;
    const [y1, t1] = BREAKPOINTS[i]!;
    if (x <= t1) {
      const year = Math.round(y0 + ((x - t0) / (t1 - t0)) * (y1 - y0));
      return year === 0 ? 1 : clamp(year, MIN_YEAR, MAX_YEAR);
    }
  }
  return MAX_YEAR;
}

/** Calendar year → slider position (0–1). Inverse of `sliderToYear` within one play step. */
export function yearToSlider(year: number): number {
  const y = clamp(year === 0 ? 1 : year, MIN_YEAR, MAX_YEAR);
  for (let i = 1; i < BREAKPOINTS.length; i++) {
    const [y0, t0] = BREAKPOINTS[i - 1]!;
    const [y1, t1] = BREAKPOINTS[i]!;
    if (y <= y1) return t0 + ((y - y0) / (y1 - y0)) * (t1 - t0);
  }
  return 1;
}

/** How many years one play tick advances at a given year — coarse in antiquity, 1 after 1500. */
export function playStep(year: number): number {
  if (year < -500) return 50;
  if (year < 1) return 25;
  if (year < 1000) return 20;
  if (year < 1500) return 10;
  return 1;
}

/** The year after `year` in play mode (or before, with direction -1); skips 0 and clamps. */
export function nextYear(year: number, direction: 1 | -1 = 1): number {
  const step = playStep(direction === 1 ? year : year - 1);
  let next = year + direction * step;
  if (year < 0 && next >= 0) next = direction === 1 ? 1 : -1;
  if (next === 0) next = direction === 1 ? 1 : -1;
  return clamp(next, MIN_YEAR, MAX_YEAR);
}

/** "500 BC", "AD 476", "1950". */
export function formatYear(year: number): string {
  if (year < 0) return `${-year} BC`;
  if (year < 1000) return `AD ${year}`;
  return String(year);
}
