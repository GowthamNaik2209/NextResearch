import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { afterEach, test } from "node:test";
import { getFundamentals } from "./screener-company";

const read = (name: string) => readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url), "utf8");
const page = read("screener-voltas.html");
const peers = read("screener-peers.html");

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

function stubFetch(handler: (url: string) => string | null) {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const body = handler(String(input));
    return { ok: body != null, text: async () => body ?? "" } as Response;
  }) as typeof fetch;
}

test("getFundamentals parses classification, growth, shareholding, annual P&L and the industry median", async () => {
  stubFetch((url) => (url.includes("/peers/") ? peers : page));
  const f = await getFundamentals("PARSE_OK");
  assert.ok(f);
  assert.equal(f.source, "screener");
  assert.equal(f.classification.sector, "Consumer Durables");
  assert.equal(f.classification.industry, "Household Appliances");
  assert.ok(f.growth.some((g) => /Sales/.test(g.title)));
  assert.ok(f.shareholding && f.shareholding.rows.some((r) => r.label === "Promoters"));
  assert.ok(f.annual?.series.some((s) => s.label === "Sales"));
  // Industry block comes from the peers table: footer = median, row matching our company id = "self".
  assert.equal(f.industry?.peerCount, 23);
  assert.equal(f.industry?.median.pe, 33.53);
  assert.equal(f.industry?.self?.pe, 73.3);
});

test("getFundamentals still returns the company page data when the peers request fails", async () => {
  stubFetch((url) => (url.includes("/peers/") ? null : page));
  const f = await getFundamentals("PEERS_DOWN");
  assert.ok(f);
  assert.equal(f.industry, null);
  assert.ok(f.kpi);
});

test("getFundamentals returns null when screener.in is unreachable or blocks us", async () => {
  stubFetch(() => null);
  assert.equal(await getFundamentals("BLOCKED"), null);
});
