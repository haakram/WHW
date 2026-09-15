/**
 * Resolves every event's `commonsVideo` file title into a playable `videoUrl` (a web-friendly
 * transcode on upload.wikimedia.org) via the Wikimedia Commons API, so nothing is looked up at
 * runtime. Re-run after adding a `commonsVideo` to an event.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { HistoryEventsSchema, type HistoryEvent } from "../src/lib/data/schemas";

const UA = process.env["WIKI_USER_AGENT"] ?? "WorldHistoryWeb/0.1 (https://github.com/haakram/WHW)";
const PREFERRED = ["480p.vp9.webm", "480p.webm", "360p.vp9.webm", "360p.webm", "720p.vp9.webm", "720p.webm", "240p.vp9.webm"];

interface Derivative {
  src?: string;
  type?: string;
  transcodekey?: string;
}
interface VideoInfo {
  url?: string;
  mime?: string;
  derivatives?: Derivative[];
}
interface CommonsResponse {
  query?: { pages?: { title?: string; missing?: boolean; videoinfo?: VideoInfo[] }[] };
}

function pickUrl(info: VideoInfo): string | undefined {
  const ders = info.derivatives ?? [];
  for (const key of PREFERRED) {
    const d = ders.find((x) => x.transcodekey === key && x.src?.startsWith("https://upload.wikimedia.org/"));
    if (d?.src) return d.src;
  }
  const anyWebm = ders.find((x) => x.type?.includes("webm") && x.src?.startsWith("https://upload.wikimedia.org/"));
  if (anyWebm?.src) return anyWebm.src;
  if (info.url?.startsWith("https://upload.wikimedia.org/") && /\.(webm|mp4)$/i.test(info.url)) return info.url;
  return undefined;
}

async function resolve(title: string): Promise<string | undefined> {
  const url =
    "https://commons.wikimedia.org/w/api.php?action=query&prop=videoinfo&viprop=url%7Cmime%7Cderivatives&format=json&formatversion=2&titles=" +
    encodeURIComponent(title);
  const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`Commons ${res.status} for ${title}`);
  const json = (await res.json()) as CommonsResponse;
  const page = json.query?.pages?.[0];
  if (!page || page.missing || !page.videoinfo?.[0]) return undefined;
  return pickUrl(page.videoinfo[0]);
}

async function main(): Promise<void> {
  const file = path.join(process.cwd(), "src/data/events.json");
  const events: HistoryEvent[] = HistoryEventsSchema.parse(JSON.parse(await readFile(file, "utf8")));
  let changed = 0;
  for (const e of events) {
    if (!e.commonsVideo || e.videoUrl) continue;
    try {
      const resolved = await resolve(e.commonsVideo);
      if (resolved) {
        e.videoUrl = resolved;
        changed++;
        console.log(`${e.id}: ${resolved}`);
      } else {
        console.warn(`${e.id}: no playable derivative for ${e.commonsVideo}`);
      }
    } catch (err) {
      console.warn(`${e.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  HistoryEventsSchema.parse(events);
  await writeFile(file, JSON.stringify(events, null, 2) + "\n");
  console.log(`resolved ${changed} video URL(s)`);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
