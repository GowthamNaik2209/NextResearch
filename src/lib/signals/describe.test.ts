import { test } from "node:test";
import assert from "node:assert/strict";
import { describeStrategy, describeTrigger, verdict } from "./describe";
import { renderAlertEmail } from "./alert-email";
import { GUIDE } from "./guide";
import { METRICS } from "./metrics";
import { PRESETS } from "./strategy";
import { IDEA_SETS } from "./books";

test("rules read as one plain sentence each", () => {
  const s = PRESETS.find((p) => p.id === "trend-200")!.strategy;
  const d = describeStrategy(s);
  assert.equal(d.entry, "Get in when the price is above SMA 200.");
  assert.equal(d.exit, "Get out when the price crosses below SMA 200; or it falls 15% from its highest close since entry.");
  const m = describeStrategy(PRESETS.find((p) => p.id === "trend-top-fifth")!.strategy);
  assert.match(m.entry, /checked on a month's last close/);
});

test("every idea describes without leftovers, and never says buy or sell", () => {
  for (const p of IDEA_SETS.flatMap((x) => x.ideas)) {
    const d = describeStrategy(p.strategy);
    for (const line of [d.entry, d.exit, p.idea, p.label, p.note]) {
      assert.doesNotMatch(line, /undefined|NaN|\bbuy\b|\bsell\b/i, p.id);
    }
  }
});

test("an exit control explains itself in an alert", () => {
  const s = PRESETS.find((p) => p.id === "trend-200")!.strategy;
  assert.equal(describeTrigger(s, "exit", "trail"), "Trailing stop: 15% below its highest close since entry.");
  assert.equal(describeTrigger(s, "exit", "rule"), "The price crosses below SMA 200.");
});

test("the verdict says what ₹1 lakh became and whether the rules beat holding", () => {
  const f = { rules: { cagr: 0, maxDd: -14, sharpe: null, sortino: null }, hold: { cagr: 0, maxDd: -32, sharpe: null, sortino: null } };
  const v = verdict(240, 560, f);
  assert.equal(v.beat, false);
  assert.equal(v.text, "The rules turned ₹1 lakh into ₹2.40 lakh with a smaller largest fall (−14% against −32%); simply holding made ₹5.60 lakh.");
  assert.equal(verdict(300, 200, f).beat, true);
});

test("the alert email names each trigger, links the backtest and carries the unsubscribe", () => {
  const e = renderAlertEmail(
    [{ name: "Bharat Electronics", scope: "stock", target: "BEL", ticker: "BEL", kind: "entry", why: "Get in when the price is above SMA 200.", price: 414.8 }],
    "2026-11-10",
    { site: "https://example.test", unsubscribe: "https://example.test/signals/unsubscribe?t=abc" },
  );
  assert.equal(e.subject, "BEL: entry rules met on the 10 Nov close");
  assert.match(e.html, /signals\?t=BEL/);
  assert.match(e.html, /unsubscribe\?t=abc/);
  assert.match(e.text, /not buy or sell calls/);
});

test("the indicator guide covers every indicator", () => {
  for (const m of METRICS) assert.ok(GUIDE[m.id]?.what, m.id);
  assert.equal(Object.keys(GUIDE).length, METRICS.length);
});

test("the indicator guide describes practice, never buy or sell", () => {
  for (const [id, g] of Object.entries(GUIDE)) for (const line of Object.values(g)) assert.doesNotMatch(line, /\b(buy|buys|buying|bought|sell|sells|selling|sold)\b/i, id);
});
