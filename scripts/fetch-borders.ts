/**
 * Downloads the hour-cut subset of aourednik/historical-basemaps (GPL-3.0), simplifies each snapshot
 * with mapshaper (the raw files are 1–3 MB and re-triangulate with a visible hitch), validates the
 * result and writes public/data/borders/*.geojson + index.json.
 */
import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import mapshaper from "mapshaper";
import { BorderSnapshotSchema } from "../src/lib/data/schemas";
import { SNAPSHOT_YEARS, UPSTREAM_SNAPSHOT_BASE, snapshotFileName } from "../src/lib/data/paths";

const UA = process.env["WIKI_USER_AGENT"] ?? "WorldHistoryWeb/0.1 (https://github.com/haakram/WHW)";
const OUT_DIR = path.join(process.cwd(), "public/data/borders");

async function fetchSnapshot(year: number): Promise<string> {
  const name = snapshotFileName(year);
  const res = await fetch(UPSTREAM_SNAPSHOT_BASE + name, {
    headers: { "User-Agent": UA },
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
  return res.text();
}

async function simplify(raw: string): Promise<string> {
  const out = await mapshaper.applyCommands(
    "-i in.geojson -simplify 12% keep-shapes -clean -o out.geojson format=geojson precision=0.001",
    { "in.geojson": raw },
  );
  const result = out["out.geojson"];
  if (!result) throw new Error("mapshaper produced no output");
  return typeof result === "string" ? result : result.toString("utf8");
}

async function main(): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true });
  const done: number[] = [];
  for (const year of SNAPSHOT_YEARS) {
    const name = snapshotFileName(year);
    const target = path.join(OUT_DIR, name);
    if (!process.env["FORCE"]) {
      try {
        await access(target);
        done.push(year);
        console.log(`${name}: already present (FORCE=1 to refetch)`);
        continue;
      } catch {
        /* not there yet */
      }
    }
    try {
      const raw = await fetchSnapshot(year);
      const simplified = await simplify(raw);
      const parsed = BorderSnapshotSchema.parse(JSON.parse(simplified));
      const features = parsed.features.filter((f) => f.geometry && f.geometry.coordinates);
      const json = JSON.stringify({ type: "FeatureCollection", features });
      await writeFile(target, json);
      done.push(year);
      console.log(`${name}: ${features.length} polygons, ${(raw.length / 1e6).toFixed(2)} MB → ${(json.length / 1e6).toFixed(2)} MB`);
    } catch (e) {
      console.error(`${name}: FAILED —`, e instanceof Error ? e.message : e);
    }
  }
  await writeFile(path.join(OUT_DIR, "index.json"), JSON.stringify({ years: done }));
  console.log(`index.json: ${done.length}/${SNAPSHOT_YEARS.length} snapshots`);
  if (done.length === 0) process.exit(1);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
