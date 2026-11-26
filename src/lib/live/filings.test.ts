import { test } from "node:test";
import assert from "node:assert/strict";
import { nseRange, readJson } from "./filings";

test("nseRange uses today's date in India", () => {
  // 20:00 UTC on the 26th is 01:30 on the 27th in India.
  assert.deepEqual(nseRange(7, new Date("2026-11-26T20:00:00Z")), { from: "20-11-2026", to: "27-11-2026" });
  assert.deepEqual(nseRange(30, new Date("2026-11-26T10:00:00Z")), { from: "27-10-2026", to: "26-11-2026" });
});

test("readJson: a refusal page or empty body is no data", () => {
  assert.equal(readJson("<HTML><HEAD><TITLE>Access Denied</TITLE>"), null);
  assert.equal(readJson(null), null);
  assert.equal(readJson(""), null);
  assert.deepEqual(readJson("[]"), []);
});
