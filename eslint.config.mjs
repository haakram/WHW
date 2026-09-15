import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "public/**", "temp/**", ".superpowers/**"]),
  {
    files: ["src/**/*.{ts,tsx}", "scripts/**/*.ts", "tests/**/*.ts"],
    rules: {
      "react/no-danger": "error",
      "no-console": ["error", { allow: ["warn", "error"] }],
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
    },
  },
  {
    // AI_RULES R4.1 — domain + data schemas stay pure (no framework, no DOM libs).
    files: ["src/lib/domain/**/*.ts", "src/lib/data/schemas.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["next", "next/*", "react", "react-dom", "react-dom/*", "three", "three/*", "react-globe.gl", "@/components/*", "@/app/*", "@/lib/store/*"], message: "src/lib/domain must stay pure (AI_RULES R4.1)." },
          ],
        },
      ],
    },
  },
  {
    // R4.3 — components are presentation only; the proxy route is reached over HTTP, never imported.
    files: ["src/components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [{ group: ["@/app/api/*", "server-only", "node:*", "fs", "path"], message: "Components never import server code (AI_RULES R4.3)." }] },
      ],
    },
  },
  {
    files: ["scripts/**/*.ts"],
    rules: { "no-console": "off" },
  },
]);

export default eslintConfig;
