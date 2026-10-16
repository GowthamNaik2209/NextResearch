// Integrity check for the sector/domain/zone/company graph in
// src/lib/sector-content/products.ts (the data-model upgrade's Domain/Component
// relational fields: domainId, relatedComponents, relatedDomains, and zone->company
// links). Mirrors the spirit of prisma/extract-source-data.mjs's own sanity check,
// but for the frontend content layer that script never touches (it reads from a
// separate seed-source copy — see that file's header).
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
    if (!sector.whyNow || !sector.thesisSummary) fail(`[${sector.slug}] live sector is missing whyNow/thesisSummary`);
    const report = getReport(sector.slug);
    if (!report) fail(`[${sector.slug}] live sector has no research deck (src/lib/sector-content/reports/)`);
    else validateReport(report, sector).forEach(fail);
  }

  const scenarioIds = new Set<string>();
  for (const sc of listScenarios(sector.slug)) {
    if (scenarioIds.has(sc.id)) fail(`[${sector.slug}] duplicate scenario id "${sc.id}"`);
    scenarioIds.add(sc.id);
    for (const imp of sc.impacts) {
      if (!zoneIds.has(imp.zone)) fail(`[${sector.slug}] scenario "${sc.id}" touches unknown zone "${imp.zone}"`);
    }
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
