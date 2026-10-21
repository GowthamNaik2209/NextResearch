import assert from "node:assert/strict";
import { test } from "node:test";
import { quoteTiming } from "./freshness";

test("quoteTiming says delayed while trading and names the last trade once the market has closed", () => {
  const asOf = "2026-10-19T09:59:00Z"; // 3:29 pm IST
  assert.equal(quoteTiming({ asOf, delayedMin: 15 }, Date.parse("2026-10-19T10:10:00Z")), "~15 min delayed");
  assert.match(quoteTiming({ asOf, delayedMin: 15 }, Date.parse("2026-10-20T06:00:00Z")), /^last trade 19 Oct.*3:29.*IST$/i);
});
