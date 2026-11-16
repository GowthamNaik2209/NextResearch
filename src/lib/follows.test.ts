import assert from "node:assert/strict";
import { test } from "node:test";
import { isFollowable, liveFollows } from "./follows";
import { followedFeedCompanies } from "./live/news";
import { listSectors } from "@/lib/sector-content";
import type { CompanyMetrics } from "@/lib/sector-content/insights";

const live = listSectors().filter((s) => !s.muted);
const muted = listSectors().filter((s) => s.muted);

test("only a live module can be followed", () => {
  assert.ok(live.length > 0);
  for (const s of live) assert.equal(isFollowable(s.slug), true, s.slug);
  for (const s of muted) assert.equal(isFollowable(s.slug), false, s.slug);
  for (const bad of ["", "nope", "DATACENTER", " datacenter", "x".repeat(65), null, undefined, 42, {}]) assert.equal(isFollowable(bad), false, String(bad));
});

test("stored follows are read back live-only, in site order, named, without duplicates", () => {
  const [a, b] = live;
  const got = liveFollows([b.slug, "retired-module", a.slug, b.slug, ...muted.map((s) => s.slug)]);
  assert.deepEqual(got.map((f) => f.slug), [a.slug, b.slug]);
  assert.equal(got[0].name, a.name);
  for (const f of got) assert.ok(["industry", "policy", "index"].includes(f.word));
  assert.deepEqual(liveFollows([]), []);
});

// Fake companies per slug: no database needed.
const co = (ticker: string, sectorSlug: string, mcapCr: number, centrality = 1) =>
  ({ ticker, name: ticker, sectorSlug, sectorName: sectorSlug, mcapCr, centrality }) as CompanyMetrics;
const pools: Record<string, CompanyMetrics[]> = {
  a: Array.from({ length: 20 }, (_, i) => co(`A${i}`, "a", 1000 - i)).concat(co("SHARED", "a", 5000), co("SIDE", "a", 9999, 0.01)),
  b: Array.from({ length: 20 }, (_, i) => co(`B${i}`, "b", 1000 - i)).concat(co("SHARED", "b", 5000)),
};
const metricsFor = (slug: string) => pools[slug] ?? [];

test("the followed feed asks about each company once, skips side exposures and the watchlist", () => {
  const got = followedFeedCompanies(["a", "b"], ["A0"], metricsFor);
  const tickers = got.map((c) => c.ticker);
  assert.equal(new Set(tickers).size, tickers.length, "no company twice");
  assert.ok(!tickers.includes("SIDE"), "side-exposed company left out");
  assert.ok(!tickers.includes("A0"), "watchlisted company left out");
  assert.ok(tickers.includes("SHARED"));
  assert.ok(tickers.some((t) => t.startsWith("B")), "the second industry gets its share");
});

test("the followed feed stays bounded however many industries are followed", () => {
  assert.equal(followedFeedCompanies(["a"], [], metricsFor).length, 12, "one industry: its full feed");
  const many = Array.from({ length: 40 }, (_, i) => `s${i}`);
  const big = (slug: string) => Array.from({ length: 10 }, (_, i) => co(`${slug}-${i}`, slug, 100 - i));
  const capped = followedFeedCompanies(many, [], big);
  assert.equal(capped.length, 36, "hard ceiling");
  assert.equal(new Set(capped.map((c) => c.sectorSlug)).size, 36, "the leaders of as many industries as fit, not two of a few");
  assert.deepEqual(followedFeedCompanies([], [], metricsFor), []);
  assert.deepEqual(followedFeedCompanies(["unknown"], [], metricsFor), []);
});
