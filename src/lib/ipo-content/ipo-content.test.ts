import assert from "node:assert/strict";
import { before, test } from "node:test";
import { getIpo, listIpoDecks, listIpos } from "./index";
import { validateIpo } from "./validate";
import { companyFinancials, parseCrore } from "../sector-content";
import { installFinancialsFromDatabase } from "@/lib/financials/test-db";

// Company figures come from the database (DATABASE_URL), as in the app.
before(installFinancialsFromDatabase);

test("every IPO deck is well formed", () => {
  for (const r of listIpos()) assert.deepEqual(validateIpo(r), [], r.slug);
});

test("IPO slugs are unique and resolvable", () => {
  const slugs = listIpos().map((r) => r.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  for (const s of slugs) assert.ok(getIpo(s));
});

test("IPOs are listed nearest-to-listing first", () => {
  const order = { open: 0, upcoming: 1, approved: 2, filed: 3, listed: 4 } as const;
  const stages = listIpos().map((r) => order[r.status.stage]);
  assert.deepEqual(stages, [...stages].sort((a, b) => a - b));
});

test("a peer with an NSE ticker we cover resolves to its supplier record", () => {
  for (const d of listIpoDecks())
    for (const p of d.peers) if (p.supplier) assert.equal(p.supplier.f?.ticker, p.ticker, `${d.slug}: ${p.name}`);
});

test("an NSE peer shows the same figures as its industry and policy pages", () => {
  for (const d of listIpoDecks())
    for (const p of d.peers) {
      if (!p.ticker) continue;
      const f = companyFinancials(p.ticker);
      assert.ok(f, `${d.slug}: ${p.ticker} is not in the company table`);
      assert.deepEqual([p.mcapCr, p.revenueCr, p.pe, p.asOf], [parseCrore(f.mcap), f.rev?.[4] ?? null, f.kpi?.[0] ?? null, f.asOf], `${d.slug}: ${p.ticker}`);
      if (p.supplier) assert.deepEqual(p.supplier.f && { ...p.supplier.f, note: null }, { ...f, note: null }, `${d.slug}: ${p.ticker} pop-up record`);
    }
});
