import { before, test } from "node:test";
import assert from "node:assert/strict";
import { listCompanyFinancials, listSectors, type SupplierFinancials } from "./index";
import { missingTickers } from "@/lib/financials/store";
import { installFinancialsFromDatabase } from "@/lib/financials/test-db";

// Company figures come from the database (DATABASE_URL), as in the app.
before(installFinancialsFromDatabase);

test("every ticker the content names is in the company table", () => {
  const byTicker = Object.fromEntries(listCompanyFinancials().map((f) => [f.ticker, f]));
  assert.deepEqual(missingTickers(byTicker), [], "add them with scripts/refresh-financials.ts --add=TICKER");
});

// Every listed supplier row across all sectors, tagged with where it lives.
const rows = listSectors().flatMap((sector) =>
  Object.entries(sector.suppliers).flatMap(([key, sup]) => (sup.f ? [{ where: `${sector.slug}/${key}`, f: sup.f }] : [])),
);

// The figures that must agree; `note` may carry sector-specific context on top of the company note.
const figures = (f: SupplierFinancials) => JSON.stringify({ ...f, note: undefined });

test("a ticker carries the same financials in every sector", () => {
  const byTicker = new Map<string, { where: string; f: SupplierFinancials }[]>();
  for (const r of rows) byTicker.set(r.f.ticker, [...(byTicker.get(r.f.ticker) ?? []), r]);
  for (const [ticker, rs] of byTicker) {
    const first = figures(rs[0].f);
    for (const r of rs.slice(1)) assert.equal(figures(r.f), first, `${ticker}: ${r.where} differs from ${rs[0].where} - use co("${ticker}") so it reads the company table`);
  }
});

test("different companies never share a revenue series", () => {
  const seen = new Map<string, string>();
  for (const { f } of rows) {
    if (!f.rev?.some((v) => v != null)) continue;
    const k = JSON.stringify(f.rev);
    const other = seen.get(k);
    assert.ok(!other || other === f.ticker, `${f.ticker} and ${other} have identical revenue ${k} - likely a copy error`);
    seen.set(k, f.ticker);
  }
});

test("five fiscal years of revenue and profit, aligned", () => {
  for (const { where, f } of rows) {
    if (!f.rev) continue;
    assert.equal(f.rev.length, 5, `${where} rev`);
    assert.equal(f.np?.length, 5, `${where} np`);
    f.rev.forEach((v, i) => assert.equal(v == null, f.np![i] == null, `${where} FY${22 + i} has revenue or profit but not both`));
  }
});

// scripts/refresh-financials.ts re-reads every company in one run, so industries, policies and IPO
// peer tables all quote prices and valuations from the same day.
// A company with no market price at all (DIGIFIBRE, STONEINDIA: Screener has none) has no price date
// to share; the refresh cannot read it, so it keeps its older snapshot.
test("every company's price and valuation share one snapshot date", () => {
  const dates = new Map<string, string[]>();
  for (const f of listCompanyFinancials().filter((x) => x.price != null)) dates.set(f.asOf ?? "none", [...(dates.get(f.asOf ?? "none") ?? []), f.ticker]);
  assert.equal(dates.size, 1, `mixed dates - run scripts/refresh-financials.ts: ${[...dates].map(([d, ts]) => `${d}: ${ts.slice(0, 8).join(", ")}${ts.length > 8 ? "..." : ""}`).join(" | ")}`);
});
