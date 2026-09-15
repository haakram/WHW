/**
 * One Wikidata SPARQL call → public/data/countries.json (every current sovereign state).
 * No GROUP BY / SAMPLE (they crash Blazegraph) — rows are deduped here, keeping the largest population.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { CountriesSchema, MAX_YEAR, MIN_YEAR, type Country } from "../src/lib/data/schemas";

const UA = process.env["WIKI_USER_AGENT"] ?? "WorldHistoryWeb/0.1 (https://github.com/haakram/WHW)";
const QUERY = `SELECT ?item ?itemLabel ?iso ?inception ?capitalLabel ?coord ?flag ?population WHERE {
  ?item wdt:P31 wd:Q3624078 ; wdt:P297 ?iso .
  FILTER NOT EXISTS { ?item wdt:P576 ?d }
  OPTIONAL { ?item wdt:P571 ?inception }
  OPTIONAL { ?item wdt:P36 ?capital }
  OPTIONAL { ?item wdt:P625 ?coord }
  OPTIONAL { ?item wdt:P41 ?flag }
  OPTIONAL { ?item wdt:P1082 ?population }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}`;

interface Binding {
  [k: string]: { value: string } | undefined;
}

function yearFromWikidataTime(v: string | undefined): number | null {
  if (!v) return null;
  const m = /^([+-]?\d+)-/.exec(v);
  if (!m?.[1]) return null;
  let y = Number.parseInt(m[1], 10);
  if (Number.isNaN(y) || y === 0) return null;
  if (y < MIN_YEAR) y = MIN_YEAR;
  if (y > MAX_YEAR) y = MAX_YEAR;
  return y;
}

function parsePoint(v: string | undefined): { lat: number; lng: number } | null {
  if (!v) return null;
  const m = /Point\(\s*(-?[\d.]+)\s+(-?[\d.]+)\s*\)/.exec(v);
  if (!m?.[1] || !m[2]) return null;
  return { lng: Number(m[1]), lat: Number(m[2]) };
}

async function main(): Promise<void> {
  const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(QUERY)}`;
  const res = await fetch(url, {
    headers: { Accept: "application/sparql-results+json", "User-Agent": UA },
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`Wikidata ${res.status}`);
  const json = (await res.json()) as { results: { bindings: Binding[] } };
  const byQid = new Map<string, Country>();
  for (const b of json.results.bindings) {
    const qid = b["item"]?.value.split("/").pop() ?? "";
    const point = parsePoint(b["coord"]?.value);
    const iso = b["iso"]?.value?.toUpperCase();
    if (!/^Q\d+$/.test(qid) || !point || !iso || iso.length !== 2) continue;
    const population = b["population"] ? Math.round(Number(b["population"].value)) : null;
    const flagRaw = b["flag"]?.value ?? null;
    const row: Country = {
      iso2: iso,
      qid,
      name: b["itemLabel"]?.value ?? iso,
      inceptionYear: yearFromWikidataTime(b["inception"]?.value),
      capital: b["capitalLabel"]?.value ?? null,
      lat: point.lat,
      lng: point.lng,
      flagUrl: flagRaw ? flagRaw.replace(/^http:/, "https:") : null,
      population: population !== null && Number.isFinite(population) ? population : null,
      wikipediaTitle: b["itemLabel"]?.value ?? iso,
    };
    const prev = byQid.get(qid);
    if (!prev || (row.population ?? 0) > (prev.population ?? 0)) byQid.set(qid, row);
  }
  const countries = CountriesSchema.parse(
    [...byQid.values()].sort((a, b) => a.name.localeCompare(b.name)),
  );
  const out = path.join(process.cwd(), "public/data/countries.json");
  await mkdir(path.dirname(out), { recursive: true });
  await writeFile(out, JSON.stringify(countries, null, 1));
  console.log(`wrote ${countries.length} countries → ${out}`);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
