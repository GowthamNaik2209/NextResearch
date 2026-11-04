import { test } from "node:test";
import assert from "node:assert/strict";
import { pulseFlowSums, pulseHeading, pulseItems, signedCrShort, type PulseCashDay } from "./pulse";

const IDX = [
  { name: "Nifty 50", ret: { "1D": 0.42, "1W": -1.26, "1M": -0.04, "3Y": 140.2 } },
  { name: "Sensex", ret: { "1D": 0.38 } },
];

test("the heading carries the latest close's date", () => {
  assert.equal(pulseHeading("2026-11-03"), "Market pulse · 3 Nov 2026");
  assert.equal(pulseHeading(null), "Market pulse");
});

test("index returns are signed, toned by the shown figure and labelled with the period", () => {
  const d1 = pulseItems(IDX, null, "1D");
  assert.deepEqual(
    d1.map((i) => [i.label, i.value, i.tone]),
    [
      ["Nifty 50 · 1D", "+0.4%", "pos"],
      ["Sensex · 1D", "+0.4%", "pos"],
    ],
  );
  const w = pulseItems(IDX, null, "1W");
  assert.deepEqual([w[0].value, w[0].tone], ["−1.3%", "neg"]);
  // Missing: a dash, untoned, not a zero.
  assert.deepEqual([w[1].value, w[1].tone], ["—", "none"]);
  // A tiny move reads 0.0%, never −0.0%, and is neither green nor red.
  assert.deepEqual([pulseItems(IDX, null, "1M")[0].value, pulseItems(IDX, null, "1M")[0].tone], ["0.0%", "flat"]);
  assert.equal(pulseItems(IDX, null, "3Y")[0].value, "+140%");
});

// Weekdays from `from` to `to` (inclusive), each with the given figures.
const weekdays = (from: string, to: string, f: (day: string, i: number) => Omit<PulseCashDay, "day">): PulseCashDay[] => {
  const out: PulseCashDay[] = [];
  for (let t = Date.parse(from), i = 0; t <= Date.parse(to); t += 86_400_000) {
    const d = new Date(t);
    if (d.getUTCDay() === 0 || d.getUTCDay() === 6) continue;
    const day = d.toISOString().slice(0, 10);
    out.push({ day, ...f(day, i++) });
  }
  return out;
};

test("signed short crore: grouping under a lakh crore, L Cr above, the sign before the rupee", () => {
  assert.equal(signedCrShort(6837.4), "+₹6,837 Cr");
  assert.equal(signedCrShort(-2418.4), "−₹2,418 Cr");
  assert.equal(signedCrShort(123456), "+₹1.23L Cr");
  assert.equal(signedCrShort(-250000), "−₹2.50L Cr");
  assert.equal(signedCrShort(0.2), "₹0 Cr");
  assert.equal(signedCrShort(Number.NaN), "—");
});

// FII every weekday from Oct 2021 at +10; DII from SEBI's mutual-fund figures (+1000, which must not be
// summed as DII) until NSDL's DII report starts on Fri 29 May 2026, then +100; the latest day Tue 3 Nov 2026.
const DAYS = weekdays("2021-10-01", "2026-11-03", (day) => ({ fiiNetCr: 10, diiNetCr: day >= "2026-05-29" ? 100 : 1000, diiSource: day >= "2026-05-29" ? "nsdl" : "sebi-mf" }));

test("FII and DII net are the sums of the daily figures over the period's window, as /updates counts it", () => {
  const f = pulseFlowSums(DAYS)!;
  assert.equal(f.day, "2026-11-03");
  // 1D: the latest day alone.
  assert.deepEqual(f.byPeriod["1D"]!.fii, { netCr: 10, sessions: 1, from: "2026-11-03", to: "2026-11-03" });
  assert.deepEqual(f.byPeriod["1D"]!.dii, { netCr: 100, sessions: 1, from: "2026-11-03", to: "2026-11-03" });
  // 1W: the seven days up to it (Wed 28 Oct - Tue 3 Nov), five trading days.
  assert.deepEqual([f.byPeriod["1W"]!.fii!.sessions, f.byPeriod["1W"]!.fii!.netCr, f.byPeriod["1W"]!.fii!.from], [5, 50, "2026-10-28"]);
  // 1M: 4 Oct - 3 Nov, 22 weekdays.
  assert.deepEqual([f.byPeriod["1M"]!.fii!.sessions, f.byPeriod["1M"]!.dii!.netCr, f.byPeriod["1M"]!.dii!.since], [22, 2200, undefined]);
  // 3Y: from 4 Nov 2023; FII history covers it all.
  const y3 = f.byPeriod["3Y"]!;
  assert.equal(y3.fii!.since, undefined);
  assert.equal(y3.fii!.from, "2023-11-06");
  assert.equal(y3.fii!.netCr, y3.fii!.sessions * 10);
});

test("DII before Jun 2026 isn't totalled from mutual funds alone: the sum runs from the full figures and says since when", () => {
  const f = pulseFlowSums(DAYS)!;
  for (const p of ["6M", "1Y", "3Y"] as const) {
    const dii = f.byPeriod[p]!.dii!;
    assert.equal(dii.since, "2026-05-29", p);
    assert.equal(dii.from, "2026-05-29");
    // Only the NSDL days (+100 each), none of SEBI's +1000.
    assert.equal(dii.netCr, dii.sessions * 100);
  }
  const items = pulseItems(IDX, f, "3Y").slice(2);
  assert.deepEqual(
    items.map((i) => [i.label, i.value, i.tone]),
    [
      ["FII net · 3Y", `+₹${(f.byPeriod["3Y"]!.fii!.netCr).toLocaleString("en-IN")} Cr`, "pos"],
      ["DII net · since 29 May 2026", `+₹${(f.byPeriod["3Y"]!.dii!.netCr).toLocaleString("en-IN")} Cr`, "pos"],
    ],
  );
  assert.match(items[1].title, /Full DII figures \(NSDL\) start on 29 May 2026/);
  assert.match(items[1].title, /not over the past 3 years/);
});

test("a short stored history is labelled with its start; a window opening on a weekend is not", () => {
  // Stored from Mon 2 Nov only: 1M (from 4 Oct) is clipped for both sides; 1D is whole.
  const short = weekdays("2026-11-02", "2026-11-03", () => ({ fiiNetCr: -3000, diiNetCr: 4000, diiSource: "nse" }));
  const f = pulseFlowSums(short)!;
  assert.equal(f.byPeriod["1M"]!.fii!.since, "2026-11-02");
  assert.equal(f.byPeriod["1M"]!.dii!.since, "2026-11-02");
  assert.equal(f.byPeriod["1D"]!.fii!.since, undefined);
  const items = pulseItems([], f, "1M");
  assert.deepEqual(items.map((i) => [i.label, i.value, i.tone]), [
    ["FII net · since 2 Nov 2026", "−₹6,000 Cr", "neg"],
    ["DII net · since 2 Nov 2026", "+₹8,000 Cr", "pos"],
  ]);
  // 1M ending Mon 2 Nov starts Sat 3 Oct: a series from Mon 5 Oct covers it whole.
  const fromMonday = weekdays("2026-10-05", "2026-11-02", () => ({ fiiNetCr: 1, diiNetCr: 1, diiSource: "nsdl" }));
  assert.equal(pulseFlowSums(fromMonday)!.byPeriod["1M"]!.fii!.since, undefined);
});

test("FII and DII items follow the period; nothing stored reads as updating", () => {
  const f = pulseFlowSums(DAYS)!;
  assert.deepEqual(pulseItems([], f, "1D").map((i) => [i.label, i.value]), [
    ["FII net · 1D", "+₹10 Cr"],
    ["DII net · 1D", "+₹100 Cr"],
  ]);
  assert.match(pulseItems([], f, "1D")[0].title, /on 3 Nov 2026/);
  assert.equal(pulseItems([], f, "1W")[0].label, "FII net · 1W");
  // The heading's day matches the flows': no end day. A day ahead (NSE's evening figures not in yet): the flows name their last day.
  assert.equal(pulseItems([], f, "1W", "2026-11-03")[0].label, "FII net · 1W");
  assert.deepEqual(pulseItems([], f, "1W", "2026-11-04").map((i) => i.label), ["FII net · 1W to 3 Nov 26", "DII net · 1W to 3 Nov 26"]);
  assert.equal(pulseFlowSums([]), null);
  // Only mutual-fund days stored: no DII total at all, rather than a misleading one.
  const mfOnly = pulseFlowSums(weekdays("2026-10-01", "2026-10-30", () => ({ fiiNetCr: 5, diiNetCr: 9, diiSource: "sebi-mf" })))!;
  assert.equal(mfOnly.byPeriod["1M"]!.dii, null);
  assert.deepEqual(pulseItems([], mfOnly, "1M").map((i) => [i.value, i.tone]), [["+₹110 Cr", "pos"], ["—", "none"]]);
});
