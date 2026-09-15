/**
 * Where generated data lives under `public/`. Kept in one place so the fetch scripts, the loaders
 * and the tests agree. Snapshot years are the hour-cut subset of aourednik/historical-basemaps
 * (negative = BC; `-1` is the file `world_bc1.geojson`).
 */
export const SNAPSHOT_YEARS: readonly number[] = [
  -500, -1, 400, 800, 1279, 1492, 1650, 1815, 1914, 1920, 1945, 1994, 2010,
];

export const COUNTRIES_URL = "/data/countries.json";
export const SNAPSHOT_INDEX_URL = "/data/borders/index.json";

/** File name used both on disk (public/data/borders/) and by the upstream repo. */
export function snapshotFileName(year: number): string {
  if (year === 0) throw new Error("There is no year 0");
  return year < 0 ? `world_bc${-year}.geojson` : `world_${year}.geojson`;
}

export function snapshotUrl(year: number): string {
  return `/data/borders/${snapshotFileName(year)}`;
}

export const UPSTREAM_SNAPSHOT_BASE =
  "https://raw.githubusercontent.com/aourednik/historical-basemaps/master/geojson/";
