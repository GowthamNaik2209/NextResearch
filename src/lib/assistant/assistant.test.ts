import assert from "node:assert/strict";
import { test } from "node:test";
import { listSectors } from "../sector-content";
import { listCompanyPages } from "../sector-content/companies";
import { listIpos } from "../ipo-content";
import { buildContext, contextKeyForPath } from "./index";
import { checkAnswer } from "./ai";

// Every page the assistant can be opened on - so a new sector, company or IPO that breaks an
// answer (empty text, "undefined", "NaN") fails here rather than in front of a reader.
function allKeys(): string[] {
  return [
    "platform",
    "ipos",
    ...listSectors().filter((s) => !s.muted).map((s) => `sector:${s.slug}`),
    ...listCompanyPages().map((p) => `company:${p.slug}`),
    ...listIpos().map((r) => `ipo:${r.slug}`),
  ];
}

test("every page gets 3-5 suggested questions with clean answers", () => {
  for (const key of allKeys()) {
    const ctx = buildContext(key);
    assert.ok(ctx, `${key} should have a context`);
    assert.ok(ctx.questions.length >= 3 && ctx.questions.length <= 5, `${key}: ${ctx.questions.length} questions`);
    assert.equal(new Set(ctx.questions.map((q) => q.id)).size, ctx.questions.length, `${key}: duplicate question ids`);
    for (const q of ctx.questions) {
      assert.ok(q.a.length > 20, `${key}/${q.id} answer too short: "${q.a}"`);
      // A chat bubble, not an essay.
      assert.ok(q.a.length <= 700, `${key}/${q.id} answer too long (${q.a.length}): ${q.a}`);
      assert.doesNotMatch(q.a, /undefined|NaN|null|\[object/, `${key}/${q.id}: ${q.a}`);
      // The code-written answer must itself pass the AI checks (its numbers are all in its facts).
      assert.ok(checkAnswer(q.a, q.facts), `${key}/${q.id} fails its own number check: ${q.a}`);
    }
  }
});

test("pages map to the right context", () => {
  const sector = listSectors().find((s) => !s.muted)!.slug;
  const company = listCompanyPages()[0].slug;
  const ipo = listIpos()[0].slug;
  const p = (qs = "") => new URLSearchParams(qs);
  assert.equal(contextKeyForPath("/", p()), "platform");
  assert.equal(contextKeyForPath(`/sector/${sector}`, p()), `sector:${sector}`);
  assert.equal(contextKeyForPath(`/company/${company}`, p()), `company:${company}`);
  assert.equal(contextKeyForPath("/ipos", p()), "ipos");
  assert.equal(contextKeyForPath("/ipos", p(`ipo=${ipo}`)), `ipo:${ipo}`);
  assert.equal(contextKeyForPath("/docs", p(`report=${sector}`)), `sector:${sector}`);
  assert.equal(contextKeyForPath("/docs", p(`view=charts&sector=${sector}`)), `sector:${sector}`);
  assert.equal(contextKeyForPath("/ipos", p("ipo=not-a-real-ipo")), "ipos");
  assert.equal(buildContext("sector:not-a-real-sector"), null);
});

test("the AI check rejects new numbers and advice, and allows rounding", () => {
  const facts = ["Median P/E: 38.6.", "Market cap: Rs 1,12,682 Cr."];
  assert.ok(checkAnswer("The median P/E is 38.6 and market cap is Rs 1,12,682 Cr.", facts));
  assert.ok(checkAnswer("Shares trade at about 39 times earnings.", facts));
  assert.ok(!checkAnswer("The median P/E is 42.", facts));
  assert.ok(!checkAnswer("Investors should buy at a P/E of 38.6.", facts));
});
