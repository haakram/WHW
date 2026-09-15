# Contributing

Thanks for helping. This is a small, dependency-light project, so contributions are easy to make and easy to review.

## Set up

```bash
pnpm install
pnpm data:all      # countries (Wikidata), textures, video URLs, historical borders
pnpm dev           # http://localhost:3000
```

Before opening a pull request:

```bash
pnpm typecheck && pnpm lint:strict && pnpm test && pnpm build
```

## Adding or fixing history content

All curated content lives in `src/data/` and is validated against the Zod contracts in `src/lib/data/schemas.ts`:

- `events.json` — one object per event. Years are integers, **negative for BC, there is no year 0**. Every event needs a real `wikipediaTitle` (exact English Wikipedia article title), at least one `sources` URL, and a summary written in your own words.
- `tours.json` — ordered stops that reference event ids.
- `eras.json` — the bands under the timeline.

Run `pnpm exec tsx scripts/validate-data.ts` and make sure it prints `OK`. Videos must be Wikimedia Commons files with a free license; run `pnpm data:videos` to resolve the playable URL.

## Ground rules

- No third-party scripts, embeds or trackers. The Content Security Policy in `src/lib/security/headers.ts` is part of the product.
- The only server code is the Wikipedia proxy route. Everything else is static or client-side.
- Colors live in `src/app/globals.css` (UI) and `src/lib/domain/palette.ts` (WebGL, which cannot read CSS variables).
- Keep `src/lib/domain/*` pure: no React, no Next.js, no DOM.
