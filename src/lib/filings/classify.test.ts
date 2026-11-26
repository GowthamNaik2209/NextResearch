import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { classifyFiling, istToMs, parseAnnouncements } from "./classify";

const fixture = JSON.parse(readFileSync(join(__dirname, "__fixtures__", "nse-announcements.json"), "utf8"));

test("subjects that decide the type on their own", () => {
  assert.equal(classifyFiling("Bagging/Receiving of orders/contracts", "x"), "orders");
  assert.equal(classifyFiling("Credit Rating- Revision", ""), "ratings");
  assert.equal(classifyFiling("Acquisition", ""), "deals");
  assert.equal(classifyFiling("Dividend", ""), "payouts");
  assert.equal(classifyFiling("Change in Management", ""), "management");
});

test("routine paperwork is left out", () => {
  assert.equal(classifyFiling("Copy of Newspaper Publication", "results"), null);
  assert.equal(classifyFiling("Analysts/Institutional Investor Meet/Con. Call Updates", "order"), null);
  assert.equal(classifyFiling("Trading Window", "financial results"), null);
  assert.equal(classifyFiling("Shareholders meeting", ""), null);
});

test("board-meeting outcomes are read from the summary", () => {
  assert.equal(classifyFiling("Outcome of Board Meeting", "The board approved the unaudited financial results for the quarter"), "results");
  assert.equal(classifyFiling("Outcome of Board Meeting", "The board approved the appointment of a director"), "other");
  assert.equal(classifyFiling("Outcome of Board Meeting", "declared an interim dividend of Rs 5"), "payouts");
});

test("catch-all updates are kept only when material", () => {
  assert.equal(classifyFiling("General Updates", "The company received a Letter of Award from NHAI"), "orders");
  assert.equal(classifyFiling("Updates", "submitted machine-readable financial results for the quarter ended September 30"), "results");
  assert.equal(classifyFiling("General Updates", "change in registered office address"), null);
  assert.equal(classifyFiling("Updates", "filed Form C under insider trading regulations"), null);
  // A meeting to consider results is a date, not results.
  assert.equal(classifyFiling("General Updates", "board meeting is scheduled on 5 December to consider the financial results"), null);
  assert.equal(classifyFiling("Press Release", "launched a new brand campaign"), "other");
});

test("IST timestamps", () => {
  assert.equal(istToMs("2026-11-26 20:39:57"), Date.UTC(2026, 10, 26, 15, 9, 57));
  assert.ok(Number.isNaN(istToMs("26-Nov-2026")));
});

test("parseAnnouncements on a real response", () => {
  const out = parseAnnouncements(fixture);
  const subjects = new Set(out.map((f) => f.subject));
  assert.ok(!subjects.has("Copy of Newspaper Publication"));
  assert.ok(!subjects.has("Analysts/Institutional Investor Meet/Con. Call Updates"));
  assert.ok(!subjects.has("Trading Window"));
  const tex = out.find((f) => f.ticker === "TEXRAIL");
  assert.ok(tex);
  assert.equal(tex.type, "orders");
  assert.match(tex.summary, /Utkal Alumina/);
  assert.match(tex.url, /^https:\/\/nsearchives\.nseindia\.(com|in)\//);
  assert.equal(out.find((f) => f.ticker === "EXPLEOSOL")?.type, "results");
  assert.equal(out.find((f) => f.ticker === "PRANAV"), undefined, "Form C is paperwork");
  for (let i = 1; i < out.length; i++) assert.ok(out[i - 1].ts >= out[i].ts, "newest first");
});

test("summary falls back to the attachment text", () => {
  const [f] = parseAnnouncements([
    { symbol: "LT", sm_name: "Larsen & Toubro Limited", desc: "Bagging/Receiving of orders/contracts", voiceSummary: null, attchmntText: "L&T has informed the Exchange about an order", attchmntFile: "https://nsearchives.nseindia.com/corporate/x.pdf", sort_date: "2026-11-26 10:00:00" },
  ]);
  assert.equal(f.summary, "L&T has informed the Exchange about an order");
  assert.deepEqual(parseAnnouncements("<html>Access Denied</html>"), []);
  assert.deepEqual(parseAnnouncements([{ symbol: "LT", desc: "Dividend", attchmntFile: "", sort_date: "2026-11-26 10:00:00" }]), [], "no PDF, no row");
});

test("court orders and analyst meets are not order wins or results", () => {
  assert.equal(classifyFiling("General Updates", "update regarding litigation; the City Civil Court passed an order"), "other");
  assert.equal(classifyFiling("General Updates", "held an investors and analysts meet; discussion covered financial results already disclosed"), null);
  assert.equal(classifyFiling("Updates", "filed a corporate presentation for the quarter; capacity utilisation rose"), null);
  assert.equal(classifyFiling("General Updates", "has received a trial purchase order for its Steel Tyre Cord"), "orders");
  assert.equal(classifyFiling("Updates", "has commissioned an additional 65.1 MWp capacity"), "orders");
});
