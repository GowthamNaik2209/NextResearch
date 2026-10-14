import { test } from "node:test";
import assert from "node:assert/strict";
import { listSectors, type SupplierFinancials } from "./index";

// Every listed supplier row across all sectors, tagged with where it lives.
const rows = listSectors().flatMap((sector) =>
  Object.entries(sector.suppliers).flatMap(([key, sup]) => (sup.f ? [{ where: `${sector.slug}/${key}`, f: sup.f }] : [])),
);

// The figures that must agree; `note` may carry sector-specific context on top of the company note.
const figures = ({ note: _note, ...rest }: SupplierFinancials) => JSON.stringify(rest);

test("a ticker carries the same financials in every sector", () => {
  const byTicker = new Map<string, { where: string; f: SupplierFinancials }[]>();
  for (const r of rows) byTicker.set(r.f.ticker, [...(byTicker.get(r.f.ticker) ?? []), r]);
  for (const [ticker, rs] of byTicker) {
    const first = figures(rs[0].f);
    for (const r of rs.slice(1)) assert.equal(figures(r.f), first, `${ticker}: ${r.where} differs from ${rs[0].where} - use co("${ticker}") from FIN`);
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
