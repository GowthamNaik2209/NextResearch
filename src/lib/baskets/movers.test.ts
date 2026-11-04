import { test } from "node:test";
import assert from "node:assert/strict";
import { rankMovers, rankMoversByFilter, shareUp, stockPeriodReturns, type MoverInput } from "./movers";
import { PERIODS } from "./periods";

const row = (ticker: string, d1: number | null | undefined, extra: Partial<MoverInput> = {}): MoverInput => ({
  ticker,
  name: extra.name ?? `Co ${ticker}`,
  industry: extra.industry ?? "Railways",
  outlier: extra.outlier ?? false,
  ret: extra.ret ?? { "1D": d1 },
  ...(extra.sector ? { sector: extra.sector } : {}),
  ...(extra.policy ? { policy: extra.policy } : {}),
});
const tickers = (ms: { ticker: string }[] | undefined) => (ms ?? []).map((m) => m.ticker);

test("gainers are the biggest rises first, losers the biggest falls first, five each", () => {
  const rows = [9, 1, -3, 7, 5, -8, 3, -1, 11, -6, -2, 2].map((v, i) => row(`T${i}`, v));
  const m = rankMovers(rows)["1D"]!;
  assert.deepEqual(tickers(m.gainers), ["T8", "T0", "T3", "T4", "T6"]);
  assert.deepEqual(tickers(m.losers), ["T5", "T9", "T2", "T10", "T7"]);
  assert.equal(m.ranked, 12);
});

test("one-off companies are left out of every list", () => {
  const rows = [row("SPARC", 40, { outlier: true }), row("A", 5), row("B", -5), row("JSWSTEEL", -30, { outlier: true })];
  const m = rankMovers(rows)["1D"]!;
  assert.deepEqual(tickers(m.gainers), ["A"]);
  assert.deepEqual(tickers(m.losers), ["B"]);
  // Coverage is counted on the companies that can be ranked, so outliers don't make a period "updating".
  assert.equal(m.ranked, 2);
});

test("a ticker listed twice (a company in several industries) counts once, its first entry", () => {
  const rows = [row("LT", 6, { industry: "Railways" }), row("LT", 6, { industry: "Defence" }), row("A", 2)];
  const m = rankMovers(rows)["1D"]!;
  assert.deepEqual(tickers(m.gainers), ["LT", "A"]);
  assert.equal(m.gainers[0].industry, "Railways");
  assert.equal(m.ranked, 2);
});

test("equal moves are ordered by name, then ticker, so the lists are stable", () => {
  const rows = [row("Z", 4, { name: "Beta" }), row("Y", 4, { name: "Alpha" }), row("X", 4, { name: "Alpha" }), row("W", -4, { name: "Delta" }), row("V", -4, { name: "Charlie" })];
  const m = rankMovers(rows)["1D"]!;
  assert.deepEqual(tickers(m.gainers), ["X", "Y", "Z"]);
  assert.deepEqual(tickers(m.losers), ["V", "W"]);
});

test("missing, non-finite and flat figures are skipped; a gainer is never also a loser", () => {
  const rows = [row("A", 3), row("B", null), row("C", undefined), row("D", Number.NaN), row("E", Infinity), row("F", 0), row("G", -2)];
  const m = rankMovers(rows, 5, 0)["1D"]!;
  assert.deepEqual(tickers(m.gainers), ["A"]);
  assert.deepEqual(tickers(m.losers), ["G"]);
  assert.equal(m.ranked, 3);
});

test("a period with too few figures reads as updating (null), not a thin list", () => {
  const rows = Array.from({ length: 10 }, (_, i) => row(`T${i}`, null, { ret: { "1D": i < 7 ? i - 3 : null, "1Y": i < 5 ? i : null } }));
  const all = rankMovers(rows);
  assert.ok(all["1D"]);
  assert.equal(all["1Y"], null);
  assert.equal(all["3Y"], null);
  assert.deepEqual(Object.keys(all).sort(), [...PERIODS].sort());
  assert.deepEqual(rankMovers([])["1D"], null);
});

test("fewer than five risers: the gainers list is shorter, never padded with fallers", () => {
  const m = rankMovers([row("A", 1), row("B", -1), row("C", -2), row("D", -3)])["1D"]!;
  assert.deepEqual(tickers(m.gainers), ["A"]);
  assert.deepEqual(tickers(m.losers), ["D", "C", "B"]);
});

test("the filter decides who is ranked: industry stocks, policy stocks, or every covered stock", () => {
  const rows = [
    row("POL", 9, { industry: "PLI", policy: "PLI" }),
    row("IND", 7, { industry: "Railways", sector: "Railways" }),
    row("BOTH", 5, { industry: "Defence", sector: "Defence", policy: "Make in India" }),
    row("DOWN", -4, { industry: "Railways", sector: "Railways" }),
  ];
  const by = rankMoversByFilter(rows, 5, 0);
  assert.deepEqual(tickers(by.all["1D"]?.gainers), ["POL", "IND", "BOTH"]);
  assert.deepEqual(tickers(by.sector["1D"]?.gainers), ["IND", "BOTH"]);
  assert.deepEqual(tickers(by.sector["1D"]?.losers), ["DOWN"]);
  assert.deepEqual(tickers(by.policy["1D"]?.gainers), ["POL", "BOTH"]);
  assert.deepEqual(tickers(by.policy["1D"]?.losers), []);
  // Each row is tagged with a module of the filter's kind; "all" keeps the home industry.
  assert.equal(by.all["1D"]!.gainers[2].industry, "Defence");
  assert.equal(by.sector["1D"]!.gainers[1].industry, "Defence");
  assert.equal(by.policy["1D"]!.gainers[1].industry, "Make in India");
  // Coverage is counted within the filter's own companies.
  assert.equal(by.policy["1D"]!.ranked, 2);
  assert.equal(rankMoversByFilter([row("IND", 3, { sector: "Railways" })]).policy["1D"], null);
});

// ---- per-stock returns from the store's closes

const days = (n: number, from = "2026-10-01") => Array.from({ length: n }, (_, i) => new Date(Date.parse(from) + i * 86_400_000).toISOString().slice(0, 10));

test("1D is the last close against the one before; 1M runs over the Nifty's window", () => {
  const d = days(31);
  const bench = d.map((t, i) => ({ t, c: 100 + i }));
  const stock = d.map((t, i) => ({ t, c: i === 30 ? 110 : 100 }));
  const r = stockPeriodReturns({ "1M": stock }, { "1M": bench });
  assert.ok(Math.abs(r["1D"]! - 10) < 1e-9);
  assert.ok(Math.abs(r["1M"]! - 10) < 1e-9);
  // No 6M / 1Y / 3Y closes: those periods are missing, not zero.
  assert.equal(r["6M"], undefined);
  assert.equal(r["3Y"], undefined);
});

test("a stock that missed the latest day reads flat for 1D, not yesterday's move", () => {
  const d = days(10);
  const bench = d.map((t, i) => ({ t, c: 100 + i }));
  const stock = d.slice(0, 9).map((t, i) => ({ t, c: 50 + i * 5 }));
  assert.equal(stockPeriodReturns({ "1M": stock }, { "1M": bench })["1D"], 0);
});

test("a recent listing doesn't count for a period its history doesn't cover", () => {
  const bench = days(31).map((t) => ({ t, c: 100 }));
  const listed = days(5, "2026-10-27").map((t, i) => ({ t, c: 10 + i }));
  const r = stockPeriodReturns({ "1M": listed }, { "1M": bench });
  assert.equal(r["1M"], undefined);
  assert.ok(r["1D"] != null);
});

// ---- % of stocks up in each industry

test("% up counts rises over the stocks with a figure, per module and period", () => {
  const returns = { A: { "1D": 2, "1W": -1 }, B: { "1D": -3, "1W": 4 }, C: { "1D": 0 }, D: {}, E: { "1D": Number.NaN } };
  const up = shareUp(
    [
      { slug: "rail", tickers: ["A", "B", "C", "D", "A"] },
      { slug: "empty", tickers: ["D", "E", "Z"] },
    ],
    returns,
  );
  // A up, B down, C flat (not up), D no figure; A listed twice counts once.
  assert.deepEqual(up["1D"].rail, { up: 1, n: 3, m: 4 });
  assert.deepEqual(up["1W"].rail, { up: 1, n: 2, m: 4 });
  // No figures at all (or only NaN, or an unknown ticker): the module sits the period out.
  assert.equal(up["1D"].empty, undefined);
  assert.deepEqual(Object.keys(up["3Y"]), []);
});
