import { before, test } from "node:test";
import assert from "node:assert/strict";
import { findSupplierByTicker, getSector, isSideLink, linkWeight, listSectors, primaryLink, primarySector } from "./index";
import { listCompanyPages, primaryAppearance } from "./companies";
import { listCompanyMetrics } from "./insights";
import { installFinancialsFromDatabase } from "@/lib/financials/test-db";

before(installFinancialsFromDatabase);

test("link weights: strength first, side links half a step down", () => {
  assert.equal(linkWeight({ key: "x", exposureStrength: "high", exposureType: "enabler" }) > linkWeight({ key: "x", exposureStrength: "medium" }), true);
  assert.equal(linkWeight({ key: "x", exposureStrength: "medium", exposureType: "direct_supplier" }) > linkWeight({ key: "x", exposureStrength: "medium", exposureType: "enabler" }), true);
  assert.equal(linkWeight("x"), linkWeight({ key: "x", exposureStrength: "high" }));
});

// The stock pop-up (findSupplierByTicker), the company page (primaryAppearance) and the landing
// screens (listCompanyMetrics) once picked a company's home with three different weightings, so
// AVALON, CYIENT and SRF read as different industries depending on where you looked.
test("every listed company has the same home sector on every surface", () => {
  const metrics = new Map(listCompanyMetrics().map((c) => [c.ticker, c]));
  const pages = listCompanyPages();
  assert.ok(pages.length > 100);
  for (const p of pages) {
    const home = primaryLink(p.ticker);
    assert.ok(home, p.ticker);
    assert.equal(primarySector(p.ticker), home.slug);
    assert.equal(findSupplierByTicker(p.ticker), getSector(home.slug)!.suppliers[home.key], `${p.ticker}: pop-up record`);
    const a = primaryAppearance(p);
    assert.equal(a.sectorSlug, home.slug, `${p.ticker}: company page`);
    assert.equal(p.supplier, getSector(home.slug)!.suppliers[a.companyKey], `${p.ticker}: company page record`);
    const m = metrics.get(p.ticker);
    if (m) assert.equal(m.sectorSlug, home.slug, `${p.ticker}: landing screens`);
  }
});

test("a company's home is its strongest link in a live sector", () => {
  // An index (the Nifty 50) is a home only for a company no industry or policy maps (homes() in index.ts).
  for (const s of listSectors().filter((x) => !x.muted && x.category !== "index"))
    for (const z of s.zones)
      for (const link of z.suppliers) {
        const sup = s.suppliers[typeof link === "string" ? link : link.key];
        if (!sup?.listed || !sup.f?.ticker) continue;
        const home = primaryLink(sup.f.ticker)!;
        const homeSector = getSector(home.slug)!;
        const homeWeight = Math.max(
          ...homeSector.zones.flatMap((hz) => hz.suppliers.filter((l) => (typeof l === "string" ? l : l.key) === home.key).map(linkWeight)),
        );
        assert.ok(homeWeight >= linkWeight(link), `${sup.f.ticker}: ${s.slug}/${z.id} outranks its home ${home.slug}`);
      }
});

test("the Nifty 50 is a company's home only where no industry or policy maps it in the chain itself", () => {
  const nifty = getSector("nifty50")!;
  const direct = new Set<string>();
  for (const x of listSectors().filter((x) => !x.muted && x.category !== "index"))
    for (const z of x.zones)
      for (const link of z.suppliers) {
        const sup = x.suppliers[typeof link === "string" ? link : link.key];
        if (sup?.listed && sup.f?.ticker && !isSideLink(link)) direct.add(sup.f.ticker);
      }
  for (const sup of Object.values(nifty.suppliers)) {
    const t = sup.f!.ticker;
    assert.equal(primarySector(t) === "nifty50", !direct.has(t), `${t}: home ${primarySector(t)}`);
  }
});
