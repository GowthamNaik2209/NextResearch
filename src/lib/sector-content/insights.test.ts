import assert from "node:assert/strict";
import { test } from "node:test";
import { findSupplierByTicker, listSectors } from "./index";
import { buildIdeas, listNews, sectorNumbers } from "./insights";
import { buildSearchIndex, getPlatformStats } from "./stats";

test("every idea screen is non-empty, short, and states its rule", () => {
  const ideas = buildIdeas();
  assert.ok(ideas.length >= 3);
  for (const idea of ideas) {
    assert.ok(idea.rule.length > 10, `${idea.id} should explain its rule`);
    assert.ok(idea.rows.length > 0 && idea.rows.length <= 5);
  }
});

test("the ROCE screen is sorted high to low", () => {
  const roce = buildIdeas().find((i) => i.id === "quality")!;
  const values = roce.rows.map((r) => parseFloat(r.value));
  assert.deepEqual(values, [...values].sort((a, b) => b - a));
});

test("news is newest-first and never dated in the future", () => {
  const news = listNews();
  assert.ok(news.length > 0);
  for (let i = 1; i < news.length; i++) assert.ok(news[i - 1].ts >= news[i].ts);
  assert.ok(news.every((n) => n.ts <= Date.now()));
});

test("platform stats and per-sector numbers are derived from the content", () => {
  const stats = getPlatformStats();
  assert.equal(stats.sectors, listSectors().filter((s) => !s.muted).length);
  assert.ok(stats.listed > 0 && stats.listed <= stats.companies);
  const n = sectorNumbers("datacenter");
  assert.ok(n.medianPe != null && n.medianRoce != null && n.combinedRevenueCr != null);
});

test("the search index has one row per company, with short-name aliases", () => {
  const rows = buildSearchIndex().filter((r) => r.kind === "company");
  const hrefs = rows.map((r) => r.href);
  assert.equal(new Set(hrefs).size, hrefs.length);
  const lt = rows.find((r) => r.label === "Larsen & Toubro");
  assert.ok(lt?.aliases?.includes("l&t"));
});

test("findSupplierByTicker is the allowlist for the live API: known listed tickers only", () => {
  assert.equal(findSupplierByTicker("VOLTAS")?.name, "Voltas");
  assert.equal(findSupplierByTicker("NOT_A_TICKER"), null);
  assert.equal(findSupplierByTicker("../etc/passwd"), null);
});
