# World History Web

An interactive 3D globe of world history, from 3000 BC to today. Drag the timeline and watch borders shift between historical snapshots; click any country or event for a live Wikipedia summary and picture; press play to run history forward with pulsing events and animated battle fronts; or let a guided story tour fly you from stop to stop.

Built with **Next.js 16**, **React 19** and **react-globe.gl** (three.js). No backend, no database, no API keys: one tiny same-origin proxy route talks to Wikipedia, everything else is static data and client-side rendering.

![World History Web — the globe in 1950, borders of 1945](.github/screenshot.png)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/haakram/WHW&env=WIKI_USER_AGENT&envDescription=A%20descriptive%20User-Agent%20for%20Wikimedia%20requests%2C%20e.g.%20%22MyApp%2F1.0%20(contact%40example.com)%22)

## Features

- **Non-linear timeline** from 3000 BC to 2026: antiquity moves in centuries, the last five hundred years in single years. Era bands sit under the slider.
- **Historical borders** that change with the year: thirteen snapshots (500 BC, 1 BC, AD 400, 800, 1279, 1492, 1650, 1815, 1914, 1920, 1945, 1994, 2010), each polity keeping a stable parchment tone across snapshots.
- **A pin for every country** with its founding year, capital, flag and population, generated from Wikidata, plus a live "History of …" summary when clicked.
- **Curated events** with importance, category, coordinates and sources; clicking one opens curated text, the live Wikipedia extract and thumbnail, and a Wikimedia Commons video where one exists.
- **Play mode** with 1×/2×/4× speed, ring pulses as events happen, animated arcs between the belligerents of wars in progress, and an optional "Follow" camera.
- **Story tours** that step through events with narration and a cinematic camera.
- **Discovery badges** stored in the browser: no accounts, no tracking.
- **Museum-archive look**: parchment, ink, serif type.

## Quick start

Requires Node 20+ and [pnpm](https://pnpm.io).

```bash
git clone https://github.com/haakram/WHW.git
cd WHW
pnpm install
cp .env.example .env.local     # set WIKI_USER_AGENT to something that identifies you
pnpm data:all                  # countries from Wikidata, textures, video URLs, historical borders (~1 min)
pnpm dev                       # http://localhost:3000
```

Other commands: `pnpm typecheck`, `pnpm lint:strict`, `pnpm test`, `pnpm test:e2e`, `pnpm build`.

Deploying on Vercel needs nothing special: `pnpm build` fetches the historical borders first, so a fresh clone builds on its own. Set `WIKI_USER_AGENT` in the project settings; Wikimedia refuses requests without a descriptive User-Agent.

## How it works

```
src/
├── app/
│   ├── page.tsx                      # renders the client app
│   ├── api/wiki/summary/route.ts     # the only server code: Wikipedia summary proxy
│   └── globals.css                   # design tokens + layout
├── components/
│   ├── globe/                        # react-globe.gl canvas, its props contract, size hook
│   └── app/world-history-app.tsx     # timeline, panels, legend, badges, tour player
├── lib/
│   ├── data/schemas.ts               # Zod contracts for every JSON file and the API response
│   ├── data/loaders.ts               # parse curated JSON once, fetch generated data lazily
│   ├── domain/                       # pure functions: time scale, eras, borders, battles, badges
│   └── store/history-store.tsx       # one reducer: year, play loop, selection, tours, discovery
└── data/                             # curated events.json, tours.json, eras.json
scripts/                              # data generators (Wikidata, historical-basemaps, Commons)
public/data/                          # generated: countries.json, borders/ (fetched at build)
```

Data flow: the slider sets a year → pure domain functions pick the border snapshot, the visible events, the battle arcs and the pulses → the globe re-renders → a click sets the selection → the panel fetches `/api/wiki/summary?title=…` → the proxy validates the title, calls Wikipedia with a User-Agent and an 8-second timeout, and returns only whitelisted fields.

## Reusing the globe in your own project

The globe is deliberately decoupled from the history app. To drop it into another system, copy these files:

- `src/components/globe/globe-types.ts` — the props contract (`GlobeCanvasProps`: polygons, pins, arcs, rings, camera target, click handlers).
- `src/components/globe/globe-canvas.tsx` — the react-globe.gl wrapper.
- `src/components/globe/globe-loader.tsx` — client-only loading through `next/dynamic` (or use your framework's equivalent; the canvas must never render on the server).
- `src/components/globe/use-container-size.ts` — measures the container; react-globe.gl otherwise sizes itself to the window.
- `src/lib/domain/rewind.ts` — **read the comment**: three-globe triangulates polygon caps with d3-geo, whose ring winding is the reverse of RFC 7946 GeoJSON. Counter-clockwise exterior rings render as "everything except this polygon". Run every GeoJSON feature through `rewindFeature` before handing it to the globe.
- `src/lib/domain/palette.ts` — stable per-polity colors (a hash of the polity name), category colors, arc gradient.

Minimal usage:

```tsx
import GlobeLoader from "@/components/globe/globe-loader";

<GlobeLoader
  polygons={features}                       // GeoJSON Feature[] (Polygon / MultiPolygon), rewound
  polygonColor={(f) => "#d8c49b"}
  pins={[{ id: "rome", kind: "event", lat: 41.9, lng: 12.5, color: "#8f1d2c", radius: 0.5, label: "Rome", importance: 5 }]}
  arcs={[]}
  rings={[]}
  cameraTarget={{ lat: 41.9, lng: 12.5, altitude: 1.2 }}   // change the object to fly there
  autoRotate
  onPinClick={(pin) => console.log(pin.id)}
  onPolygonClick={(feature) => console.log(feature.properties.NAME)}
/>
```

Things that will bite you (all handled in this repo):

1. `pointsMerge` must stay `false`, or point click and hover handlers stop working.
2. Pass explicit `width`/`height`; the defaults are the window size.
3. Ring winding, as above. Mapshaper and most GIS tools emit counter-clockwise exteriors.
4. Keep `polygonCapCurvatureResolution` around 4–5 degrees; large values give visible facets.
5. Textures come from `three-globe`'s MIT-licensed examples, copied into `public/textures/` so the page never loads from a CDN (the Content Security Policy only allows Wikimedia hosts for images and media).

## Data and licenses

| Source | Used for | License |
|---|---|---|
| [Wikidata](https://www.wikidata.org) (SPARQL, one query at setup) | every country's founding year, capital, coordinates, flag, population | CC0 |
| [Wikipedia](https://en.wikipedia.org) REST summary (live, through the proxy) | summaries and thumbnails in the panels | text CC BY-SA 4.0; images per file |
| [Wikimedia Commons](https://commons.wikimedia.org) | event videos | per file, shown under the player |
| [aourednik/historical-basemaps](https://github.com/aourednik/historical-basemaps) | historical border snapshots | GPL-3.0. Fetched and simplified at build time by `scripts/fetch-borders.ts`; not redistributed in this repository. The author notes the borders are approximate and a work in progress. |
| [three-globe](https://github.com/vasturiano/three-globe) example textures | globe surface and bump map | MIT |

The curated events in `src/data/events.json` are written for this project and cite at least one source each. Corrections are welcome: see [CONTRIBUTING.md](CONTRIBUTING.md).

## Security

- Strict Content Security Policy: scripts, styles, fonts and XHR are same-origin only; images and media may come from Wikimedia hosts and nowhere else. No third-party scripts, iframes or trackers.
- The proxy route validates the title with Zod, calls a fixed upstream host with a descriptive User-Agent and a timeout, returns only whitelisted fields, and checks the thumbnail host against the allowlist. No user-supplied URL is ever fetched.
- Generated GeoJSON and JSON are parsed through Zod schemas as data, never executed.
- No secrets: `.env.example` documents the two optional settings.

## Roadmap

- More curated events per country (the current set is world-shaping plus regional highlights).
- More border snapshots, once the visual hitch of larger polygon swaps is measured.
- A flat-map projection toggle and shareable URLs (year, camera, selection).

## License

MIT. See [LICENSE](LICENSE). Data sources carry their own licenses as listed above.
