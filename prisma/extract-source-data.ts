// Regenerates prisma/seed-source/extracted.json straight from the live
// src/lib/sector-content/products.ts (the actual source of truth for sector/
// company content) instead of the frozen, one-off artifact-data-slice.js this
// repo bootstrapped from. Run this whenever products.ts changes (new sectors,
// new companies, edited financials) and then `npm run db:seed` to sync the
// database — extract-source-data.mjs + artifact-data-slice.js are now stale
// and only reflect the original port, not anything added since.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PRODUCTS, NEWS, ASOF, SRC, NEWS_ASOF } from "../src/lib/sector-content/products";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const sectorKeys = Object.keys(PRODUCTS).filter((k) => k !== "_comingSoon");
console.log(`Extracted ${sectorKeys.length} sectors: ${sectorKeys.join(", ")}`);

const out = {
  asOf: ASOF,
  src: SRC,
  newsAsOf: NEWS_ASOF,
  sectors: sectorKeys.map((key) => {
    const p = (PRODUCTS as Record<string, { suppliers: unknown }>)[key];
    return { key, suppliers: p.suppliers };
  }),
  news: NEWS,
};

const outPath = path.join(__dirname, "seed-source/extracted.json");
fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log(`Wrote ${outPath}`);
