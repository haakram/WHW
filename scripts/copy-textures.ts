/** Copies the MIT-licensed three-globe example textures into public/ so nothing loads from a CDN at runtime. */
import { copyFile, mkdir, access } from "node:fs/promises";
import path from "node:path";

const SRC = path.join(process.cwd(), "node_modules/.pnpm/three-globe@2.45.2_three@0.186.0/node_modules/three-globe/example/img");
const DEST = path.join(process.cwd(), "public/textures");
const FILES = ["earth-blue-marble.jpg", "earth-topology.png", "earth-dark.jpg", "earth-water.png"];

async function main(): Promise<void> {
  await mkdir(DEST, { recursive: true });
  for (const f of FILES) {
    const from = path.join(SRC, f);
    try {
      await access(from);
    } catch {
      console.warn(`skip (not shipped): ${f}`);
      continue;
    }
    await copyFile(from, path.join(DEST, f));
    console.log(`copied ${f}`);
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
