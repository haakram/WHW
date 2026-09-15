/** Parses the curated JSON through the Zod contracts and checks cross-references. Exit 1 on any problem. */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ErasSchema, HistoryEventsSchema, ToursSchema } from "../src/lib/data/schemas";

async function load(rel: string): Promise<unknown> {
  return JSON.parse(await readFile(path.join(process.cwd(), rel), "utf8"));
}

async function main(): Promise<void> {
  const problems: string[] = [];
  const events = HistoryEventsSchema.parse(await load("src/data/events.json"));
  const ids = new Set<string>();
  for (const e of events) {
    if (ids.has(e.id)) problems.push(`duplicate event id ${e.id}`);
    ids.add(e.id);
  }
  const eras = ErasSchema.parse(await load("src/data/eras.json"));
  let tours: ReturnType<typeof ToursSchema.parse> = [];
  try {
    tours = ToursSchema.parse(await load("src/data/tours.json"));
  } catch (e) {
    problems.push(`tours.json: ${e instanceof Error ? e.message : String(e)}`);
  }
  for (const t of tours) {
    for (const s of t.stops) if (!ids.has(s.eventId)) problems.push(`tour ${t.id}: unknown event ${s.eventId}`);
  }
  const byCategory = new Map<string, number>();
  for (const e of events) byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + 1);
  const bc = events.filter((e) => e.year < 0).length;
  const withVideo = events.filter((e) => e.commonsVideo).length;
  const withBelligerents = events.filter((e) => e.belligerents).length;
  console.log(
    `events=${events.length} (BC ${bc}, video ${withVideo}, belligerents ${withBelligerents}) eras=${eras.length} tours=${tours.length}`,
  );
  console.log([...byCategory.entries()].map(([k, v]) => `${k}:${v}`).join("  "));
  if (problems.length) {
    console.error(problems.join("\n"));
    process.exit(1);
  }
  console.log("OK");
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
