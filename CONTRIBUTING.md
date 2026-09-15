# Contributing

Thanks for helping. The most valuable contribution is **well-sourced history**: events that are accurate, dated, located to the city, and written in your own words.

## Adding or fixing events

1. Edit `src/data/events.json` (see the field guide in the README, and the contracts in `src/lib/data/schemas.ts`).
2. Give every event at least one source URL and the exact English Wikipedia article title.
3. Run `pnpm exec tsx scripts/validate-data.ts` until it prints `OK`.
4. Open a pull request. Describe what you added and where it came from.

## Code changes

```bash
pnpm install
pnpm dev
pnpm lint:strict && pnpm typecheck && pnpm test && pnpm build
```

All four must pass; CI runs the same commands. Keep `src/lib/domain/` pure (no React, Next or three.js imports), keep components presentation-only, and never fetch a user-supplied URL from the server.

## Data licensing

Border snapshots are derived from a GPL-3.0 dataset and keep that license; everything else you contribute is MIT. Don't add data whose license you can't name.
