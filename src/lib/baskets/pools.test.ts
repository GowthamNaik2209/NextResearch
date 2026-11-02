import { test } from "node:test";
import assert from "node:assert/strict";
import { companyValue, countedCompanies, groupValue, layerPools, poolTakeaway, shares, type IndustryPools, type PoolCompany } from "./pools";

// Fixtures shaped like the solar modules industry's FY26 figures (₹ Cr: [FY25, FY26]).
const co = (ticker: string, layer: string, rev: [number, number], np: [number, number], mcapCr: number, extra: Partial<PoolCompany> = {}): PoolCompany => ({
  ticker,
  name: ticker,
  layer,
  rev,
  np,
  mcapCr,
  roce: 20,
  ...extra,
});

const none = new Set<string>();

const pools: IndustryPools = {
  slug: "solar",
  year: "FY26",
  asOf: "30 Oct 2026",
  layers: [
    { name: "Glass", color: "#C99A2E" },
    { name: "Modules", color: "#1E9E76" },
    { name: "EPC", color: "#3D5A80" },
  ],
  companies: [
    co("BORO", "Glass", [1476, 1556], [-87, 127], 5687, { oneOff: "FY25 loss looks one-off" }),
    co("WAAREE", "Modules", [14444, 26537], [1928, 3884], 66161, { roce: 38.4 }),
    co("VIKRAM", "Modules", [3415, 4803], [139, 469], 4542, { roce: 30.6 }),
    co("ADANI", "Modules", [97895, 100469], [8005, 9951], 349157, { lowExposure: "Large group, most revenue elsewhere" }),
    co("KPI", "EPC", [1735, 2696], [325, 509], 5470),
    co("SW", "EPC", [6302, 7548], [86, -296], 3170),
  ],
};

test("a low-exposure company counts only once the viewer adds it", () => {
  assert.equal(countedCompanies(pools, none).length, 5);
  assert.equal(countedCompanies(pools, new Set(["ADANI"])).length, 6);
  // Adding a company that isn't low exposure changes nothing.
  assert.equal(countedCompanies(pools, new Set(["WAAREE"])).length, 5);
  assert.deepEqual(layerPools(pools, new Set(["ADANI"]))[1].counted.map((c) => c.ticker), ["WAAREE", "VIKRAM", "ADANI"]);
  const mods = layerPools(pools, none).find((l) => l.name === "Modules")!;
  assert.deepEqual(mods.counted.map((c) => c.ticker), ["WAAREE", "VIKRAM"]);
  assert.equal(mods.all.length, 3);
});

test("pools add up; a one-off year is left out of profit but not revenue", () => {
  const [glass, mods, epc] = layerPools(pools, none);
  assert.equal(groupValue(mods.counted, "rev"), 26537 + 4803);
  assert.equal(groupValue(glass.counted, "rev"), 1556);
  assert.equal(groupValue(glass.counted, "np"), null);
  assert.equal(companyValue(glass.counted[0], "np"), null);
  // A loss nets off within its layer.
  assert.equal(groupValue(epc.counted, "np"), 509 - 296);
});

test("rates are the layer's own ratio, not an average of its companies'", () => {
  const mods = layerPools(pools, none)[1];
  assert.equal(groupValue(mods.counted, "margin"), (3884 + 469) / (26537 + 4803));
  assert.equal(groupValue(mods.counted, "growth"), (26537 + 4803) / (14444 + 3415) - 1);
  assert.equal(groupValue(mods.counted, "pe"), (66161 + 4542) / (3884 + 469));
  assert.equal(groupValue(mods.counted, "roce"), (38.4 + 30.6) / 2);
});

test("P/E needs a profit: a loss-making company or layer has none", () => {
  const sw = pools.companies.find((c) => c.ticker === "SW")!;
  assert.equal(companyValue(sw, "pe"), null);
  assert.equal(groupValue([sw], "pe"), null);
  // Only the one-off company in the layer: no margin or P/E at all.
  assert.equal(groupValue([pools.companies[0]], "margin"), null);
});

test("only positive totals take a share of a pool", () => {
  const s = shares([100, 300, -50, null], (v) => v);
  assert.deepEqual(s.map((x) => x.share), [0.25, 0.75, null, null]);
});

test("the takeaway names the layer that keeps the most profit for its revenue, and the least", () => {
  const t = poolTakeaway(layerPools(pools, none))!;
  assert.equal(t.more.layer, "Modules");
  assert.equal(t.less.layer, "EPC");
  assert.ok(t.more.profit > t.more.revenue);
  assert.ok(t.less.profit < t.less.revenue);
});

test("the takeaway leaves a one-off company's revenue out along with its profit", () => {
  // A big one-off company in EPC: counted in revenue it would make EPC look profit-poor.
  const withOneOff: IndustryPools = { ...pools, companies: [...pools.companies, co("BIG", "EPC", [90000, 100000], [500, 40000], 50000, { oneOff: "FY26 profit jump looks one-off" })] };
  const t = poolTakeaway(layerPools(withOneOff, none))!;
  const epc = [t.more, t.less].find((x) => x.layer === "EPC")!;
  assert.ok(epc.revenue < 0.5, `EPC revenue share ${epc.revenue} should leave BIG out`);
});
