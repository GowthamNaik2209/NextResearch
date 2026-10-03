// Integrity check for the sector/domain/zone/company graph in
// src/lib/sector-content/products.ts (the data-model upgrade's Domain/Component
// relational fields: domainId, relatedComponents, relatedDomains, and zone->company
// links). Mirrors the spirit of prisma/extract-source-data.mjs's own sanity check,
// but for the frontend content layer that script never touches (it reads from a
// separate seed-source copy — see that file's header).
//
// Run: npm run validate:content
import { companyLinkKey, listSectors } from "../src/lib/sector-content/index.js";

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

  for (const zone of sector.zones) {
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
