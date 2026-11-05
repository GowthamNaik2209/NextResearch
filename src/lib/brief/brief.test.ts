import { test } from "node:test";
import assert from "node:assert/strict";
import { breadth, parseBhavcopy } from "./bhavcopy";
import { summaryLine } from "./highlights";
import { pickHeadlines } from "./headlines";
import { stockEvents } from "./events";
import { keyDates } from "./key-dates";
import { crossedLevel, dealLine, watchBrief } from "./watchlist";
import { briefSubject, mergedDates, renderBriefEmail } from "./email";
import { briefFlows } from "./market";
import type { MarketBrief } from "./types";

const BHAV = `SYMBOL, SERIES, DATE1, PREV_CLOSE, OPEN_PRICE, HIGH_PRICE, LOW_PRICE, LAST_PRICE, CLOSE_PRICE, AVG_PRICE, TTL_TRD_QNTY, TURNOVER_LACS, NO_OF_TRADES, DELIV_QTY, DELIV_PER
TATAPOWER, EQ, 05-Nov-2026, 425.90, 426.00, 455.00, 425.00, 452.00, 452.30, 448.00, 9000000, 40320.00, 90000, 1, 1
ZOMATO, EQ, 05-Nov-2026, 251.70, 250.00, 252.00, 236.00, 238.00, 238.10, 240.00, 8000000, 19200.00, 80000, 1, 1
TINYCO, EQ, 05-Nov-2026, 10.00, 10.00, 12.00, 10.00, 12.00, 12.00, 11.00, 1000, 0.11, 10, 1, 1
HDFCBANK, EQ, 05-Nov-2026, 1718.00, 1720.00, 1745.00, 1715.00, 1742.00, 1742.00, 1735.00, 5000000, 8675.00, 70000, 1, 1
FLATCO, BE, 05-Nov-2026, 50.00, 50.00, 50.00, 50.00, 50.00, 50.00, 50.00, 100, 0.05, 1, 1, 1
GSEC, GS, 05-Nov-2026, 100.00, 100.00, 100.00, 100.00, 101.00, 101.00, 100.00, 100, 0.10, 1, 1, 1
`;
test("the bhavcopy parses NSE's spaced cells and drops rows without prices", () => {
  const rows = parseBhavcopy(BHAV);
  assert.equal(rows.length, 6);
  assert.deepEqual(rows[0], { symbol: "TATAPOWER", series: "EQ", prevClose: 425.9, close: 452.3, turnoverLacs: 40320 });
  assert.deepEqual(parseBhavcopy("nonsense\n1,2,3"), []);
});

test("breadth counts EQ and BE stocks only", () => {
  assert.deepEqual(breadth(parseBhavcopy(BHAV)), { up: 3, down: 1, flat: 1 });
});

const MARKET: MarketBrief = {
  day: "2026-11-05",
  indices: [
    { name: "Nifty 50", close: 24318.4, change: 142.6, pct: 0.59 },
    { name: "Sensex", close: 79942.1, change: 431.8, pct: 0.54 },
  ],
  flows: { day: "2026-11-05", fiiNetCr: 2140, diiNetCr: -615, fiiStreak: 3, diiMonthCr: 8920 },
  breadth: { up: 1820, down: 1240, flat: 60 },
  themes: [
    { slug: "grid", name: "Grid capex", kind: "Policy", ret: 3.4 },
    { slug: "power", name: "Power", kind: "Industry", ret: 2.8 },
  ],
  headlines: [{ headline: "Sensex jumps <1,700> points", source: "Mint", url: "https://news.example/a?x=1&y=2" }],
  ipos: [{ slug: "phonepe", name: "PhonePe", label: "Opens 9 Nov", size: "₹12,000 Cr" }],
  keyDates: [
    { day: "2026-11-12", what: "India CPI inflation (Oct)" },
    { day: "2026-11-30", what: "India GDP, Jul–Sep quarter" },
  ],
  summary: "",
};

test("the summary is one line: the indices, breadth and the best theme on NextResearch", () => {
  assert.equal(
    summaryLine(MARKET),
    "Nifty 50 +0.59% at 24,318, Sensex +0.54% at 79,942; 1,820 stocks rose and 1,240 fell. Best theme on NextResearch: Grid capex, +3.4%.",
  );
  assert.equal(summaryLine({ indices: [], breadth: null, themes: [] }), "");
  assert.equal(summaryLine({ indices: [], breadth: null, themes: MARKET.themes }), "Best theme on NextResearch: Grid capex, +3.4%.");
});

test("headlines: newest first, one per story", () => {
  const h = (headline: string, ts: number) => ({ headline, source: "S", url: `https://n/${ts}`, ts });
  const picked = pickHeadlines([
    h("Why is Sensex up 1,700 points? 3 reasons behind stock market rally today", 5),
    h("Sensex up 1,700 points: 3 reasons behind today's stock market rally", 4),
    h("Nifty beats all of Asia on foreign flows and earnings", 3),
    h("Investors gain Rs 6 lakh crore as Dalal Street cheers US midterms", 2),
    h("Gift Nifty signals gap-up start", 1),
  ]);
  assert.deepEqual(
    picked.map((p) => p.headline),
    ["Why is Sensex up 1,700 points? 3 reasons behind stock market rally today", "Nifty beats all of Asia on foreign flows and earnings", "Investors gain Rs 6 lakh crore as Dalal Street cheers US midterms"],
  );
});

test("key dates: data releases only (no F&O expiries); CPI on the 12th, GDP at the end of Nov, auto sales on the 1st", () => {
  assert.deepEqual(keyDates("2026-11-06"), [{ day: "2026-11-12", what: "India CPI inflation (Oct)" }]);
  assert.deepEqual(keyDates("2026-11-23", { horizonDays: 8 }), [
    { day: "2026-11-30", what: "India GDP, Jul–Sep quarter" },
    { day: "2026-12-01", what: "Monthly auto sales" },
  ]);
});

test("watchlist dates: confirmed results and ex-dividend in the next two weeks, merged ahead of market dates", () => {
  const cals = new Map([
    ["BHARTIARTL", { results: "2026-11-06", exDividend: "2026-09-01" }],
    ["KAYNES", { results: null, exDividend: "2026-11-18" }],
    ["LATE", { results: "2026-12-30", exDividend: null }],
  ]);
  const saved = [
    { ticker: "BHARTIARTL", name: "Bharti Airtel" },
    { ticker: "KAYNES", name: "Kaynes Technology" },
    { ticker: "LATE", name: "Late Co" },
    { ticker: "NONE", name: "No Calendar" },
  ];
  const events = stockEvents(saved, cals, "2026-11-06");
  assert.deepEqual(events, [
    { day: "2026-11-06", what: "Bharti Airtel results" },
    { day: "2026-11-18", what: "Kaynes Technology ex-dividend" },
  ]);
  assert.deepEqual(
    mergedDates(MARKET, { items: [], deals: [], events }).map((d) => [d.day, d.mine]),
    [
      ["2026-11-06", true],
      ["2026-11-12", false],
      ["2026-11-18", true],
      ["2026-11-30", false],
    ],
  );
});

test("FII streak and DII month to date", () => {
  const d = (day: string, fii: number, dii: number) => ({ day: new Date(`${day}T00:00:00Z`), fiiNetCr: fii, diiNetCr: dii });
  assert.deepEqual(briefFlows([d("2026-10-30", -100, 50), d("2026-11-02", 10, 100), d("2026-11-03", 20, -30), d("2026-11-04", 30, 5)]), {
    day: "2026-11-04",
    fiiNetCr: 30,
    diiNetCr: 5,
    fiiStreak: 3,
    diiMonthCr: 75,
  });
  assert.equal(briefFlows([]), null);
});

test("since-added milestones: the biggest level crossed that day, up or down", () => {
  assert.equal(crossedLevel(8, 12), 10);
  assert.equal(crossedLevel(9, 30), 25);
  assert.equal(crossedLevel(12, 14), undefined);
  assert.equal(crossedLevel(-8, -27), -25);
  assert.equal(crossedLevel(30, 20), undefined);
});

test("the watchlist part: day and since-added moves, biggest move first, the day's deals", () => {
  const closes = new Map([
    ["TATAPOWER", { close: 452.3, prev: 425.9 }],
    ["HDFCBANK", { close: 1742, prev: 1718 }],
  ]);
  const deal = { day: new Date("2026-11-05T00:00:00Z"), kind: "BULK" as const, ticker: "TATAPOWER", client: "SBI Mutual Fund", party: "DII" as const, side: "BUY" as const, quantity: 12_000_000, price: 449.8, valueCr: 53.98 };
  const old = { ...deal, day: new Date("2026-11-04T00:00:00Z") };
  const w = watchBrief(
    [
      { ticker: "HDFCBANK", name: "HDFC Bank", priceAtAdd: 0 },
      { ticker: "TATAPOWER", name: "Tata Power", priceAtAdd: 400 },
      { ticker: "NOBARS", name: "No Bars", priceAtAdd: 10 },
    ],
    closes,
    [deal, old],
    "2026-11-05",
  );
  assert.deepEqual(
    w.items.map((i) => [i.ticker, i.dayPct, i.sincePct, i.milestone]),
    [
      ["TATAPOWER", 6.2, 13.08, 10],
      ["HDFCBANK", 1.4, null, undefined],
    ],
  );
  assert.deepEqual(w.deals, [{ ticker: "TATAPOWER", name: "Tata Power", text: "SBI Mutual Fund bought 1.2 cr shares at ₹449.80 (₹54 cr)" }]);
  assert.equal(dealLine({ client: "X Fund", side: "SELL", quantity: 250_000, price: 10, valueCr: 0.25 }), "X Fund sold 2.5 lakh shares at ₹10.00 (₹0 cr)");
});

test("the subject leads with the Nifty and FIIs, and names a watchlist stock that moved 1% or more", () => {
  const item = { ticker: "TATAPOWER", slug: "tatapower", name: "Tata Power", close: 452.3, dayPct: 6.2, sincePct: 13.1 };
  assert.equal(briefSubject(MARKET, { items: [item], deals: [], events: [] }), "Nifty +0.6%, FIIs buy ₹2,140 Cr · Tata Power +6.2% in your watchlist");
  assert.equal(briefSubject(MARKET, { items: [{ ...item, dayPct: 0.4 }], deals: [], events: [] }), "Nifty +0.6%, FIIs buy ₹2,140 Cr");
  assert.equal(briefSubject({ ...MARKET, indices: [], flows: null }, null), "Market brief for Thu 5 Nov");
});

test("the email escapes names, links each stock and carries the unsubscribe link in HTML and text", () => {
  const item = { ticker: "M&M", slug: "m-m", name: "Mahindra & <Mahindra>", close: 3100, dayPct: -2, sincePct: 5, milestone: 25 };
  const e = renderBriefEmail(
    { ...MARKET, summary: "Up <day>." },
    { items: [item], deals: [], events: [{ day: "2026-11-06", what: "M&M results" }] },
    { site: "https://x.test", unsubscribe: "https://x.test/brief/unsubscribe?t=abc" },
    "2026-11-06",
  );
  assert.match(e.html, /Mahindra &amp; &lt;Mahindra&gt;/);
  assert.match(e.html, /Up &lt;day&gt;\./);
  assert.match(e.html, /href="https:\/\/news\.example\/a\?x=1&amp;y=2"[^>]*>Sensex jumps &lt;1,700&gt; points<\/a>/);
  assert.match(e.html, /Best-performing themes on NextResearch</);
  assert.match(e.html, /Buying 3 days/);
  assert.match(e.html, /Nov \+₹8,920 Cr/);
  assert.match(e.html, /href="https:\/\/x\.test\/baskets\/industry\/grid"/);
  assert.match(e.html, /M&amp;M results<\/div><div[^>]*><span[^>]*>Your watchlist<\/span>/);
  assert.doesNotMatch(e.html, /worst|expiry/i);
  assert.match(e.html, /href="https:\/\/x\.test\/company\/m-m"/);
  assert.match(e.html, /href="https:\/\/x\.test\/brief\/unsubscribe\?t=abc"/);
  assert.match(e.html, /crossed \+25%/);
  // The tiles, themes, watchlist, key dates and IPOs are fixed-layout tables: nothing can push the email wider than the screen.
  assert.equal((e.html.match(/<table[^>]*table-layout:fixed/g) ?? []).length, 5);
  assert.match(e.html, /Fri 6 Nov 2026/);
  assert.match(e.html, /Close on Thu 5 Nov/);
  assert.match(e.text, /Unsubscribe: https:\/\/x\.test\/brief\/unsubscribe\?t=abc/);
  assert.match(e.text, /Mahindra & <Mahindra>: −2\.0% \/ \+5\.0% \(crossed \+25%\)/);
  assert.doesNotMatch(e.html, /undefined|NaN/);
  assert.match(e.html, /Unsubscribe<\/a> · Not investment advice/);
  assert.doesNotMatch(e.html, /You get this|Change email settings/);
});

test("undated IPOs are titled as the pipeline", () => {
  const links = { site: "https://x.test", unsubscribe: "https://x.test/u" };
  assert.match(renderBriefEmail({ ...MARKET, iposDated: false }, null, links, "2026-11-06").html, /IPO pipeline \(approved, not yet dated\)/);
  assert.match(renderBriefEmail({ ...MARKET, iposDated: true }, null, links, "2026-11-06").html, /Upcoming IPOs/);
});
