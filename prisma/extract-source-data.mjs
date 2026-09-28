// One-off tool: runs the data-only slice of the original NextResearch artifact
// (prisma/seed-source/artifact-data-slice.js — everything up to but not including
// the three.js/DOM "ENGINE" section, which never executes here) inside a Node vm
// sandbox, then dumps the resulting PRODUCTS/NEWS objects to JSON for prisma/seed.ts
// to consume. `build()` functions on each product are dropped automatically by
// JSON.stringify (they're 3D-rendering logic, not data — that gets ported straight
// into the SectorExplorer component's source, not through the database).
import vm from "node:vm";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sliceSrc = fs.readFileSync(
  path.join(__dirname, "seed-source/artifact-data-slice.js"),
  "utf8"
);

const sandbox = { window: {}, console };
vm.createContext(sandbox);
vm.runInContext(sliceSrc, sandbox, { filename: "artifact-data-slice.js" });

const { PRODUCTS, NEWS, ASOF, SRC, NEWS_ASOF } = sandbox;

const sectorKeys = Object.keys(PRODUCTS).filter((k) => k !== "_comingSoon");
console.log(
  `Extracted ${sectorKeys.length} sectors: ${sectorKeys.join(", ")}`
);
console.log(`Coming soon: ${PRODUCTS._comingSoon.map((p) => p.name).join(", ")}`);

const out = {
  asOf: ASOF,
  src: SRC,
  newsAsOf: NEWS_ASOF,
  sectors: sectorKeys.map((key) => {
    const p = PRODUCTS[key];
    return {
      key,
      id: p.id,
      name: p.name,
      tagline: p.tagline,
      headerTitle: p.headerTitle,
      headerSub: p.headerSub,
      layerNames: p.layerNames,
      shellMaxOpacity: p.shellMaxOpacity,
      exoBaseOpacity: p.exoBaseOpacity,
      defaultView: p.defaultView,
      views: p.views,
      zones: p.zones,
      suppliers: p.suppliers,
    };
  }),
  comingSoon: PRODUCTS._comingSoon,
  news: NEWS,
};

const outPath = path.join(__dirname, "seed-source/extracted.json");
fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log(`Wrote ${outPath}`);

// Sanity: every supplier key referenced by a zone should exist in that product's
// suppliers map, and every fin() result should carry a ticker.
let problems = 0;
for (const sector of out.sectors) {
  for (const zone of sector.zones) {
    for (const supKey of zone.suppliers || []) {
      if (!sector.suppliers[supKey]) {
        console.error(`[${sector.key}] zone "${zone.id}" references missing supplier "${supKey}"`);
        problems++;
      }
    }
  }
  for (const [supKey, sup] of Object.entries(sector.suppliers)) {
    if (sup.listed && !sup.f?.ticker) {
      console.error(`[${sector.key}] listed supplier "${supKey}" has no ticker`);
      problems++;
    }
  }
}
if (problems) {
  console.error(`${problems} problem(s) found — check the data before seeding.`);
  process.exit(1);
}
console.log("No integrity problems found.");
