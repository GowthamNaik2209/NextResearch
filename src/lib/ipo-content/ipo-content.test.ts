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

// The authored chip ("Opens 21 Oct") is written once; the stage must follow the dated timeline.
const day = (s: string) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));

test("an IPO's stage and chip follow its dates, not the authored text", () => {
  const jio = (d: string) => getIpo("jio-platforms", day(d))!.status;
  assert.deepEqual([jio("2026-10-20").stage, jio("2026-10-20").label], ["upcoming", "Opens 21 Oct"]);
  assert.deepEqual([jio("2026-10-22").stage, jio("2026-10-22").label], ["open", "Open · closes 23 Oct"]);
  assert.deepEqual([jio("2026-10-25").stage, jio("2026-10-25").label], ["upcoming", "Closed · lists 28 Oct"]);
  assert.equal(jio("2026-10-29").stage, "listed");
  // No dated window to go by: the authored stage stays.
  assert.equal(getIpo("oyo", day("2027-06-01"))!.status.stage, "approved");
});

test("no IPO chip promises an opening date that has passed", () => {
  for (const d of ["2026-10-22", "2026-10-24", "2026-11-15"])
    for (const r of listIpos(day(d))) {
      const m = r.status.label.match(/^Opens (\d{1,2}) (\w{3})/);
      if (m) assert.ok(Date.parse(`${m[1]} ${m[2]} 2026 UTC`) >= day(d), `${r.slug} on ${d}: "${r.status.label}"`);
    }
  // Sorted on the live stage.
  const order = { open: 0, upcoming: 1, approved: 2, filed: 3, listed: 4 } as const;
  const stages = listIpoDecks(day("2026-10-22")).map((r) => order[r.status.stage]);
  assert.deepEqual(stages, [...stages].sort((a, b) => a - b));
});

test("a listed deck shows its own current figures from the company table, against its issue price", () => {
  const listed = listIpoDecks().filter((d) => d.ticker);
  assert.ok(listed.some((d) => d.slug === "nse") && listed.some((d) => d.slug === "manipal-hospitals"));
  for (const d of listed) {
    const f = companyFinancials(d.ticker!);
    assert.ok(f && d.now, `${d.slug}: ${d.ticker} is not in the company table`);
    const price = parseFloat(f.price!.replace(/[^\d.]/g, ""));
    assert.deepEqual([d.now.price, d.now.mcapCr, d.now.pe, d.now.asOf], [price, parseCrore(f.mcap), f.kpi?.[0] ?? null, f.asOf ?? null], d.slug);
    assert.equal(d.now.vsIssuePct, (price / d.issue.issuePrice! - 1) * 100, d.slug);
  }
});
