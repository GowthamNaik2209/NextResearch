// Integrity check for the sector/domain/zone/company graph in
// src/lib/sector-content/products.ts (the data-model upgrade's Domain/Component
// relational fields: domainId, relatedComponents, relatedDomains, and zone->company
// links), the completeness of every live sector, and that no company figure is typed
// into the prose (figures come only from the company table - see TYPED_FIGURE below).
//
// Run: npm run validate:content
import { companyLinkKey, listSectors } from "../src/lib/sector-content/index.js";
import { getResearchForSector } from "../src/lib/sector-content/docs.js";
import { listScenarios } from "../src/lib/sector-content/scenarios.js";
import { getReport } from "../src/lib/sector-content/reports/index.js";
import { validateReport } from "../src/lib/sector-content/reports/validate.js";

let problems = 0;

function fail(message: string) {
  console.error(message);
  problems++;
}

// A company's P/E, market cap, ratios and share-price moves live only in the company table (the
// database), shown with their snapshot date; typed into strengths/risks they drift within weeks
// ("P/E ~120x" while the table says 130). Write what stays true instead ("rich valuation - see the
// figures", "the stock has fallen sharply over the past year"). Business history (revenue, profit,
// order book, "profit fell 36%") and dated news are fine.
const TYPED_FIGURE: [RegExp, string][] = [
  [/P\/E\s*(of\s*|above\s*|below\s*)?\(?~?\d/i, "a P/E"],
  [/~?\d+(\.\d+)?x\s*(earnings|EPS|trailing|P\/E|book)\b/i, "a valuation multiple"],
  [/\b(valuation|multiple)\s*\(~?\d+(\.\d+)?x?\)/i, "a valuation multiple"],
  [/market[ -]?(cap|value|capitali[sz]ation)\b[^.;]{0,15}~?(Rs\s?|₹)[\d,]/i, "a market cap"],
  [/(Rs\s?|₹)[\d,.]+\s*L?\s*(crore|Cr)\s*market[ -]?(cap|value)/i, "a market cap"],
  [/(?<!unsold )\b(stock|shares|share price)\b[^.;]{0,40}\b(down|up|fell|rose|gained|lost|dropped|slid|declined|rallied)\s*~?\d+(\.\d+)?%/i, "a share-price move"],
  [/\b(stock|shares)\s*[-−+]\d+%/i, "a share-price move"],
  [/\b(stock|share)\b[^.;]{0,20}\bCAGR\b[^.;]{0,10}\d+%/i, "a share-price return"],
  [/\b(down|up)\s*~?\d+%\s*(in a year|over the past year)/i, "a one-year return"],
  [/\bRO(C)?E\b[^.;]{0,10}~?\d+(\.\d+)?%/, "a ROCE/ROE"],
  [/52[- ]?(week|W)\b[^.;]{0,30}(Rs\s?|₹)[\d,]/i, "a 52-week price"],
];

// Every string in an authored object, with its path; skips the figures (`f`) and 3D builders.
function* strings(v: unknown, path: string): Generator<[string, string]> {
  if (typeof v === "string") yield [path, v];
  else if (Array.isArray(v)) for (const [i, x] of v.entries()) yield* strings(x, `${path}[${i}]`);
  else if (v && typeof v === "object")
    for (const [k, x] of Object.entries(v)) if (k !== "f" && typeof x !== "function") yield* strings(x, `${path}.${k}`);
}

function checkTypedFigures(v: unknown, path: string) {
  for (const [where, text] of strings(v, path))
    for (const [re, what] of TYPED_FIGURE) {
      const m = text.match(re);
      if (m) fail(`${where} types ${what} into the text ("${m[0]}") - it drifts from the company table; say it in words`);
    }
}

for (const sector of listSectors()) {
  const zoneIds = new Set(sector.zones.map((z) => z.id));
  const domainIds = new Set((sector.domains ?? []).map((d) => d.id));
  const supplierKeys = new Set(Object.keys(sector.suppliers));

  if (sector.integratorZoneId !== undefined && !zoneIds.has(sector.integratorZoneId)) {
    fail(`[${sector.slug}] integratorZoneId "${sector.integratorZoneId}" has no matching zone`);
  }

  // Completeness gate: a sector shown on the site (not muted) must be wired into every
  // feature that has per-sector content, or it silently shows up half-built there.
  if (!sector.muted) {
    if (listScenarios(sector.slug).length === 0) fail(`[${sector.slug}] live sector has no scenarios (src/lib/sector-content/scenarios.ts)`);
    if (getResearchForSector(sector.slug).length === 0) fail(`[${sector.slug}] live sector has no reading-list links (src/lib/sector-content/docs.ts)`);
    if (!sector.integratorZoneId) fail(`[${sector.slug}] live sector has no integratorZoneId`);
    if (!sector.whyNow?.length || !sector.thesisSummary?.length) fail(`[${sector.slug}] live sector is missing whyNow/thesisSummary`);
    const report = getReport(sector.slug);
    if (!report) fail(`[${sector.slug}] live sector has no research deck (src/lib/sector-content/reports/)`);
    else validateReport(report, sector).forEach(fail);
  }

  checkTypedFigures({ ...sector, views: undefined }, `[${sector.slug}]`);
  const deck = getReport(sector.slug);
  // A deck's dated company headlines are news as reported, not figures.
  if (deck) checkTypedFigures({ ...deck, companyNews: undefined }, `[${sector.slug}] report`);

  const scenarioIds = new Set<string>();
  for (const sc of listScenarios(sector.slug)) {
    if (scenarioIds.has(sc.id)) fail(`[${sector.slug}] duplicate scenario id "${sc.id}"`);
    scenarioIds.add(sc.id);
    for (const imp of sc.impacts) {
      if (!zoneIds.has(imp.zone)) fail(`[${sector.slug}] scenario "${sc.id}" touches unknown zone "${imp.zone}"`);
    }
  }

  for (const v of sector.views) {
    if (v.layer !== undefined && (!Number.isInteger(v.layer) || v.layer < 0 || v.layer >= sector.layerNames.length))
      fail(`[${sector.slug}] view "${v.id}" layer ${v.layer} is outside layerNames`);
  }

  for (const zone of sector.zones) {
    // Picking a system peels the 3D model to this layer (engine.ts selectZone).
    if (zone.layer === undefined) {
      if (!sector.muted) fail(`[${sector.slug}] zone "${zone.id}" has no layer (index into layerNames that shows it)`);
    } else if (!Number.isInteger(zone.layer) || zone.layer < 0 || zone.layer >= sector.layerNames.length) {
      fail(`[${sector.slug}] zone "${zone.id}" layer ${zone.layer} is outside layerNames (0-${sector.layerNames.length - 1})`);
    }
    if (zone.domainId !== undefined && !domainIds.has(zone.domainId)) {
      fail(`[${sector.slug}] zone "${zone.id}" has domainId "${zone.domainId}" with no matching domain`);
    }
    for (const relatedId of zone.relatedComponents ?? []) {
      if (!zoneIds.has(relatedId)) {
        fail(`[${sector.slug}] zone "${zone.id}" has relatedComponents entry "${relatedId}" with no matching zone`);
      } else if (relatedId === zone.id) {
        fail(`[${sector.slug}] zone "${zone.id}" lists itself in relatedComponents`);
      }
    }
    for (const link of zone.suppliers) {
      const key = companyLinkKey(link);
      if (!supplierKeys.has(key)) {
        fail(`[${sector.slug}] zone "${zone.id}" references missing supplier "${key}"`);
      }
    }
  }

  for (const domain of sector.domains ?? []) {
    for (const relatedId of domain.relatedDomains ?? []) {
      if (!domainIds.has(relatedId)) {
        fail(`[${sector.slug}] domain "${domain.id}" has relatedDomains entry "${relatedId}" with no matching domain`);
      } else if (relatedId === domain.id) {
        fail(`[${sector.slug}] domain "${domain.id}" lists itself in relatedDomains`);
      }
    }
  }
}

if (problems) {
  console.error(`${problems} problem(s) found.`);
  process.exit(1);
}
console.log(`No integrity problems found across ${listSectors().length} sectors.`);
