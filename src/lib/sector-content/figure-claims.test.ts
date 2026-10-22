import { before, test } from "node:test";
import assert from "node:assert/strict";
import { figureClaims } from "./figure-claims";
import { listSectors } from "./index";
import { installFinancialsFromDatabase } from "@/lib/financials/test-db";

// Company figures come from the database (DATABASE_URL), as in the app.
before(installFinancialsFromDatabase);

test("the claim reader picks out revenue and profit by fiscal year", () => {
  const pick = (t: string) => figureClaims(t).map((c) => [c.metric, c.fy, c.valueCr]);
  assert.deepEqual(pick("Revenue grew from Rs 462 Cr (FY22) to Rs 2,512 Cr (FY26) with low debt"), [["rev", 22, 462], ["rev", 26, 2512]]);
  assert.deepEqual(pick("Profit nearly doubled to Rs 346 crore in FY26 on 27% revenue growth"), [["np", 26, 346]]);
  assert.deepEqual(pick("Turnaround complete: FY26 net profit Rs 5,355 crore vs a FY22 loss"), [["np", 26, 5355]]);
  // Bookings, segments and guidance are not whole-company revenue.
  assert.deepEqual(pick("Record FY26 sales of Rs 30,024 Cr, up 76%"), []);
  assert.deepEqual(pick("Defence revenue ~doubled to Rs 2,634 crore in FY26 (27% of sales)"), []);
});

// Revenue/profit history restated in strengths, risks and notes is read from the company table;
// when a refresh restates a year (or a typo slips in), the prose must follow.
test("revenue and profit quoted in supplier text match the company table (within 3%)", () => {
  let checked = 0;
  for (const s of listSectors())
    for (const [key, sup] of Object.entries(s.suppliers)) {
      if (!sup.listed || !sup.f?.rev) continue;
      for (const text of [sup.role, ...(sup.strengths ?? []), ...(sup.risks ?? []), ...(sup.notes ?? [])])
        for (const c of figureClaims(text)) {
          const db = (c.metric === "rev" ? sup.f.rev : sup.f.np)?.[c.fy - 22];
          assert.ok(db != null, `${s.slug}/${key}: "${c.text}" quotes FY${c.fy}, which the company table lacks`);
          const off = Math.abs(c.valueCr - db) / Math.max(Math.abs(db), 1);
          assert.ok(off <= 0.03, `${s.slug}/${key}: "${c.text}" says Rs ${c.valueCr} Cr for FY${c.fy} ${c.metric === "rev" ? "revenue" : "profit"}, the company table has ${db} - update the text`);
          checked++;
        }
    }
  assert.ok(checked > 40, `only ${checked} claims read - did the text format change?`);
});
