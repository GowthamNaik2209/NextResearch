import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { parseTopRatios } from "./screener-ratios";

const page = readFileSync(new URL("./__fixtures__/screener-voltas.html", import.meta.url), "utf8");

test("parseTopRatios reads price, ratios and the 52-week high/low pair", () => {
  const k = parseTopRatios(page);
  assert.ok(k);
  assert.equal(typeof k.price, "number");
  assert.match(k.marketCap ?? "", /^Rs [\d,]+ Cr$/);
  assert.equal(typeof k.pe, "number");
  assert.equal(typeof k.roce, "number");
  assert.ok(k.high52w! > k.low52w!, "High / Low row maps to high52w then low52w");
});

test("parseTopRatios returns null when the ratios block is missing (markup changed / error page)", () => {
  assert.equal(parseTopRatios("<html><body>Too Many Requests</body></html>"), null);
});
