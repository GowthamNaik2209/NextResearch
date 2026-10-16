import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { afterEach, test } from "node:test";
import { getFundamentals, isUsablePage, parseCompanyPage, parsePeers } from "./screener-company";

const read = (name: string) => readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url), "utf8");
const page = read("screener-voltas.html");
const peers = read("screener-peers.html");
// Abbott India's /consolidated/ page (Oct 2026): it only files standalone, so this is an empty template.
const emptyConsolidated = read("screener-empty-consolidated.html");

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

test("an empty consolidated template is unusable and parses to nothing (no bare '%' growth rows, no empty P&L)", () => {
  assert.equal(isUsablePage(emptyConsolidated), false);
  assert.equal(isUsablePage(page), true);
  const p = parseCompanyPage(emptyConsolidated);
  assert.equal(p.kpi, null);
  assert.deepEqual(p.growth, []);
  assert.equal(p.annual, null);
  assert.equal(p.warehouseId, null);
});

test("getFundamentals falls back to the standalone page when the consolidated one is empty", async () => {
  const seen: string[] = [];
  stubFetch((url) => {
    seen.push(url);
    if (url.includes("/peers/")) return peers;
    return url.includes("/consolidated/") ? emptyConsolidated : page;
  });
  const f = await getFundamentals("STANDALONE_ONLY");
  assert.ok(f);
  assert.equal(f.basis, "standalone");
  assert.ok(f.kpi?.price);
  assert.ok(f.industry, "the standalone page's warehouse id gives the peers table");
  assert.ok(f.growth.every((g) => g.rows.every((r) => /\d/.test(r.value))));
  assert.ok(seen.some((u) => u.endsWith("/STANDALONE_ONLY/")));
});

test("getFundamentals reports the consolidated basis when that page has data", async () => {
  stubFetch((url) => (url.includes("/peers/") ? peers : page));
  assert.equal((await getFundamentals("CONSOLIDATED_OK"))?.basis, "consolidated");
});

test("parsePeers treats a 0 industry median (P/E, dividend yield, ROCE) as unavailable", () => {
  const zeroed = peers.replace(/(<tfoot>[\s\S]*?)<td>0\.39<\/td>/, "$1<td>0</td>");
  const ind = parsePeers(zeroed, null);
  assert.equal(ind?.median.divYield, null);
  assert.equal(ind?.median.pe, 33.53);
  assert.equal(parsePeers(peers, null)?.median.divYield, 0.39);
});
