import { before, test } from "node:test";
import assert from "node:assert/strict";
import { findSupplierByTicker, getSector, isSideLink, linkWeight, listSectors, primaryLink, primarySector } from "./index";
import { listCompanyPages, primaryAppearance, primaryIndustry } from "./companies";
import { listCompanyMetrics } from "./insights";
import { installFinancialsFromDatabase } from "@/lib/financials/test-db";
import { companyKind } from "@/lib/financials/kinds";
import { industryPe, pePeers } from "@/lib/valuation/pe-data";

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

// P/E in context compares a stock with its primary industry: an industry it is mapped in directly
// beats a policy or index home (Tata Power under the ALMM solar policy is compared with energy), a
// side link never does (SBI's home-loan link in real estate never makes it a real-estate stock), and a
// company with no direct industry keeps its home.
test("primary industry: a direct industry link over a policy or index home, never a side link", () => {
  const byTicker = new Map(listCompanyPages().map((p) => [p.ticker, p]));
  const of = (t: string) => primaryIndustry(byTicker.get(t)!).sectorSlug;
  assert.equal(of("TATAPOWER"), "energy");
  assert.equal(of("TMPV"), "ev4w");
  assert.equal(of("SBIN"), "banks"); // mapped directly in Banks & NBFCs; its real-estate home-loan link stays a side link
  // Ties go to the industry it has more of: Tata Power's four energy layers beat one transmission layer.
  assert.equal(of("BHARATFORG"), "aerospace");
  assert.equal(of("LT"), "realestate");
  assert.equal(of("20MICRONS"), "rareearth");
  for (const p of byTicker.values()) {
    const home = primaryAppearance(p);
    const ind = primaryIndustry(p);
    if (!getSector(home.sectorSlug)!.category) assert.equal(ind, home, p.ticker);
    else if (ind !== home) assert.ok(!ind.side && !getSector(ind.sectorSlug)!.category, p.ticker);
  }
});

// A company that falls back to the Nifty 50 is compared within its bracket of the index.
test("P/E peers: a Nifty 50 fallback is compared within its bracket", () => {
  const tcs = pePeers("TCS")!;
  assert.equal(tcs.name, "Information Technology (Nifty 50)");
  assert.ok(tcs.peers.some((s) => s.ticker === "INFY"));
  assert.ok(!tcs.peers.some((s) => s.ticker === "HDFCBANK"));
  assert.equal(industryPe("TCS")?.name, "Information Technology (Nifty 50)");
  assert.equal(pePeers("TATAPOWER")!.name, getSector("energy")!.name);
});

// A lender or an insurer is compared with covered companies of its own kind, not its industry.
test("P/E peers: lenders against covered lenders, insurers against covered insurers", () => {
  const sbi = pePeers("SBIN")!;
  assert.equal(sbi.group, "lender");
  assert.ok(sbi.peers.some((s) => s.ticker === "RECLTD") && sbi.peers.some((s) => s.ticker === "HDFCBANK"));
  assert.ok(!sbi.peers.some((s) => s.ticker === "TCS" || s.ticker === "HDFCLIFE"));
  const rec = pePeers("RECLTD")!;
  assert.ok(rec.peers.every((s) => s.ticker !== "KEI" && s.ticker !== "POLYCAB"), "no cable makers");
  const life = pePeers("HDFCLIFE")!;
  assert.equal(life.group, "insurer");
  assert.ok(life.peers.length > 5 && life.peers.every((s) => companyKind(s.ticker) === "insurer"), "insurers only");
  assert.ok(life.peers.some((s) => s.ticker === "LICI") && life.peers.some((s) => s.ticker === "GODIGIT"));
  assert.equal(industryPe("SBIN")?.group, "lender");
});
