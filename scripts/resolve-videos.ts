/**
 * Resolves each event's `commonsVideo` (a Wikimedia Commons "File:…" title) into a directly
 * playable `videoUrl` on upload.wikimedia.org, preferring the 480p VP9 WebM transcode (originals
 * are often Theora .ogv, which browsers no longer play). Writes the result back into events.json.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { HistoryEventsSchema, type HistoryEvent } from "../src/lib/data/schemas";

const UA = process.env["WIKI_USER_AGENT"] ?? "WorldHistoryWeb/0.1 (https://github.com/haakram/WHW)";
const EVENTS = path.join(process.cwd(), "src/data/events.json");
const PREFERRED = ["480p.vp9.webm", "480p.webm", "720p.vp9.webm", "360p.webm", "240p.vp9.webm"];

interface VideoInfo {
  url?: string;
  mime?: string;
  derivatives?: { src: string; type: string; transcodekey?: string }[];
}

async function resolve(title: string): Promise<string | null> {
  const params = new URLSearchParams({
    action: "query",
    titles: title,
    prop: "videoinfo",
    viprop: "url|mime|derivatives",
    format: "json",
    formatversion: "2",
  });
  const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { query?: { pages?: { videoinfo?: VideoInfo[] }[] } };
  const info = json.query?.pages?.[0]?.videoinfo?.[0];
  if (!info) return null;
  const derivatives = info.derivatives ?? [];
  for (const key of PREFERRED) {
    const hit = derivatives.find((d) => d.transcodekey === key);
    if (hit) return hit.src;
  }
  const anyWebm = derivatives.find((d) => d.type.includes("webm") && d.src.includes("/transcoded/"));
  if (anyWebm) return anyWebm.src;
  if (info.url && (info.mime === "video/webm" || info.mime === "video/mp4")) return info.url;
  return null;
}

async function main(): Promise<void> {
  const events = HistoryEventsSchema.parse(JSON.parse(await readFile(EVENTS, "utf8")));
  let changed = 0;
  const out: HistoryEvent[] = [];
  for (const e of events) {
    if (!e.commonsVideo || (e.videoUrl && !process.env["FORCE"])) {
      out.push(e);
      continue;
    }
    const url = await resolve(e.commonsVideo);
    if (url && url.startsWith("https://upload.wikimedia.org/")) {
      out.push({ ...e, videoUrl: url });
      changed++;
      console.log(`${e.id}: ${url}`);
    } else {
      console.warn(`${e.id}: no playable derivative for ${e.commonsVideo}`);
      out.push(e);
    }
  }
  HistoryEventsSchema.parse(out);
  await writeFile(EVENTS, JSON.stringify(out, null, 2) + "\n");
  console.log(`resolved ${changed} video URL(s)`);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
