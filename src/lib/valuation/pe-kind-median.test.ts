import { before, test } from "node:test";
import assert from "node:assert/strict";
import { installFinancialsFromDatabase } from "@/lib/financials/test-db";
import { industryPe, pePeers } from "./pe-data";

before(installFinancialsFromDatabase);

// The stock pop-up's Fundamentals P/E median for a lender or an insurer is industryPe's, the same
// covered companies of its own kind that "P/E in context" uses: one number, the same for every peer.
test("a lender's and an insurer's P/E median is one number across its kind", () => {
  for (const [a, b, group] of [["HDFCBANK", "SBIN", "lender"], ["HDFCLIFE", "SBILIFE", "insurer"]] as const) {
    const x = industryPe(a);
    const y = industryPe(b);
    if (!x || !y) continue;
    assert.equal(x.group, group);
    assert.equal(x.median, y.median);
    assert.equal(pePeers(a)?.group, group);
  }
});
