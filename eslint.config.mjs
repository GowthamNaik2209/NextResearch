import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Ported verbatim from the original artifact (see file headers) — kept as
    // close to byte-for-byte portable as possible rather than modernized, so it
    // stays a trivial diff against future artifact iterations.
    "src/lib/sector-content/products.ts",
    "prisma/seed-source/artifact-data-slice.js",
  ]),
]);

export default eslintConfig;
