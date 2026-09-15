import { NextResponse } from "next/server";
import { z } from "zod";
import type { WikiSummaryResponse } from "@/lib/data/schemas";

/**
 * The app's only server code: a same-origin proxy for the Wikipedia REST summary endpoint.
 * Order: Zod on the title → fixed upstream host → descriptive User-Agent → 8 s timeout → only
 * whitelisted fields go back, and the thumbnail host is checked against the CSP allowlist.
 */
const TitleSchema = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .regex(/^[^<>{}|\\^[\]#]+$/, "title contains forbidden characters");

const UpstreamSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  extract: z.string().optional(),
  thumbnail: z.object({ source: z.string() }).optional(),
  content_urls: z.object({ desktop: z.object({ page: z.string() }) }).optional(),
});

const UA = process.env["WIKI_USER_AGENT"] ?? "WorldHistoryWeb/0.1 (https://github.com/haakram/WHW)";
const ALLOWED_IMAGE_HOSTS = new Set(["upload.wikimedia.org", "thumb.wikimedia.org"]);

function safeImage(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === "https:" && ALLOWED_IMAGE_HOSTS.has(u.hostname) ? u.toString() : null;
  } catch {
    return null;
  }
}

function reply(body: WikiSummaryResponse, status = 200): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": status === 200 ? "public, max-age=3600" : "no-store" },
  });
}

export async function GET(req: Request): Promise<NextResponse> {
  if (process.env["CONTENT_PROVIDER"] === "static") return reply({ ok: false, reason: "static-mode" });
  const parsed = TitleSchema.safeParse(new URL(req.url).searchParams.get("title"));
  if (!parsed.success) return reply({ ok: false, reason: "bad-title" }, 400);
  const title = parsed.data.replace(/ /g, "_");
  try {
    const upstream = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}?redirect=true`,
      {
        headers: { "User-Agent": UA, Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
        next: { revalidate: 86400 },
      },
    );
    if (upstream.status === 404) return reply({ ok: false, reason: "not-found" }, 404);
    if (!upstream.ok) return reply({ ok: false, reason: `upstream-${upstream.status}` }, 502);
    const data = UpstreamSchema.parse(await upstream.json());
    return reply({
      ok: true,
      title: data.title,
      description: data.description ?? null,
      extract: data.extract ?? "",
      thumbnailUrl: safeImage(data.thumbnail?.source),
      pageUrl: data.content_urls?.desktop.page ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`,
    });
  } catch (e) {
    const reason = e instanceof Error && e.name === "TimeoutError" ? "timeout" : "unavailable";
    return reply({ ok: false, reason }, 504);
  }
}
