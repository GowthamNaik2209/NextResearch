// Regenerates prisma/seed-source/extracted.json (`npm run db:extract`) straight from
// src/lib/sector-content/products.ts: the content's companies (names, roles, sector
// links) and the curated news - no figures, which live only in the database. Run it
// when products.ts gains sectors or companies, then `npm run db:seed` to sync company
// rows.
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
