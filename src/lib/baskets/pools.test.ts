import { test } from "node:test";
import assert from "node:assert/strict";
import { LOOKALIKE_DIST, companyValue, countedCompanies, distinctLayerColors, groupValue, layerPools, layerShares, poolTakeaway, shares, type IndustryPools, type PoolCompany } from "./pools";

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
  assert.ok(t.more.profit! > t.more.revenue);
  assert.ok(t.less.profit! < t.less.revenue);
});

test("the takeaway quotes the bars' own shares", () => {
  const layers = layerPools(pools, none);
  const rev = layerShares(layers, "rev");
  const np = layerShares(layers, "np");
  const t = poolTakeaway(layers)!;
  for (const row of [t.more, t.less]) {
    const i = layers.findIndex((l) => l.name === row.layer);
    assert.equal(row.revenue, rev[i].share);
    assert.equal(row.profit, np[i].share);
  }
});

test("'for its revenue' is a ratio: a small layer with a fat margin beats a big one that is merely above average", () => {
  // Big: 50% of revenue, 60% of profit (+10 points, margin 12%). Small: 5% of revenue, 10% of profit (+5 points, margin 20%).
  const p: IndustryPools = {
    ...pools,
    layers: [
      { name: "Big", color: "#111111" },
      { name: "Small", color: "#222222" },
      { name: "Rest", color: "#333333" },
    ],
    companies: [co("B", "Big", [1, 500], [1, 60], 1), co("S", "Small", [1, 50], [1, 10], 1), co("R", "Rest", [1, 450], [1, 30], 1)],
  };
  const t = poolTakeaway(layerPools(p, none))!;
  assert.equal(t.more.layer, "Small");
  assert.equal(t.less.layer, "Rest");
  assert.equal(t.more.ratio, 0.2);
});

test("a loss-making layer is the least, quoted as a loss, not a share of the profit", () => {
  const p: IndustryPools = { ...pools, companies: pools.companies.filter((c) => c.ticker !== "KPI") };
  const t = poolTakeaway(layerPools(p, none))!;
  assert.equal(t.less.layer, "EPC");
  assert.equal(t.less.profit, null);
  assert.equal(t.less.profitCr, -296);
});

test("a layer that is mostly a one-off year is named and not ranked, not given a different revenue share", () => {
  // A big one-off company in EPC: its revenue is in the revenue bar, its profit isn't in the profit bar.
  const withOneOff: IndustryPools = { ...pools, companies: [...pools.companies, co("BIG", "EPC", [90000, 100000], [500, 40000], 50000, { oneOff: "FY26 profit jump looks one-off" })] };
  assert.equal(poolTakeaway(layerPools(withOneOff, none)), null, "only Modules is left to rank");
  // Glass is all one-off (no profit counted at all): named, not ranked.
  const base = poolTakeaway(layerPools(pools, none))!;
  assert.deepEqual(base.skipped, [{ layer: "Glass", companies: ["BORO"] }]);
  assert.ok([base.more, base.less].every((r) => r.layer !== "Glass"));
});

test("a small one-off company keeps its layer ranked, on the bars' basis, and is listed for the note", () => {
  // TINY: 2% of EPC's revenue, profit left out.
  const p: IndustryPools = { ...pools, companies: [...pools.companies, co("TINY", "EPC", [100, 200], [10, 90], 900, { oneOff: "FY26 jump" })] };
  const layers = layerPools(p, none);
  const t = poolTakeaway(layers)!;
  const epc = [t.more, t.less].find((r) => r.layer === "EPC")!;
  assert.deepEqual(epc.oneOff, ["TINY"]);
  const i = layers.findIndex((l) => l.name === "EPC");
  assert.equal(epc.revenue, layerShares(layers, "rev")[i].share, "revenue share includes TINY, as the bar does");
  assert.equal(epc.ratio, (509 - 296) / (2696 + 7548 + 200));
});

test("look-alike layer colours get distinct shades; the rest keep theirs", () => {
  const ls = [
    { name: "AMCs", color: "#2E86AB" },
    { name: "Distribution", color: "#2E86AB" },
    { name: "Towers", color: "#2E86AB" },
    { name: "Brokers", color: "#B5179E" },
    { name: "Greens 1", color: "#1E9E76" },
    { name: "Greens 2", color: "#2EAA8A" },
  ];
  const out = distinctLayerColors(ls);
  assert.equal(out[3].color, "#B5179E");
  const hexes = out.map((l) => l.color);
  assert.equal(new Set(hexes).size, hexes.length);
  for (const h of hexes) assert.match(h, /^#[0-9A-F]{6}$/);
  // Deterministic, and the input isn't changed.
  assert.deepEqual(distinctLayerColors(ls), out);
  assert.equal(ls[0].color, "#2E86AB");
  // Shades of one colour are steps apart, not hairlines.
  const lum = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).reduce((a, b) => a + b, 0);
  const blues = out.slice(0, 3).map((l) => lum(l.color)).sort((a, b) => a - b);
  assert.ok(blues[1] - blues[0] > 60 && blues[2] - blues[1] > 60, `blues ${blues}`);
  assert.ok(LOOKALIKE_DIST > 0);
});
