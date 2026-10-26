// Checking Claude's summary against the transcript it came from, before anything is stored.
//
// Two layers. parseSummary() makes sure the JSON is the ConcallSummaryJson shape (structured
// outputs guarantee the schema, but a refusal or a truncated reply does not, and stored rows feed
// the track record). checkSummary() then checks every item: its verbatim quote should be on the page
// it cites (a sentence split across a page break counts), and every number in the item (statement,
// quote, guidance low/high) should appear somewhere in the transcript. Items that fail are kept
// and flagged (checksPassed / checksTotal on ConcallSummary, the per-item list in the summary JSON)
// rather than dropped: a quote that differs by a ligature still says what management said.
import type { ConcallSummaryJson, GuidanceItem, ItemCheck, KeyQA, Point } from "./types";
import { GUIDANCE_METRICS, GUIDANCE_SCOPES, PERIOD_KINDS, TONES } from "./types";

// ------------------------------------------------------------------ Shape

const UNITS = ["%", "bps", "Rs cr", "$ mn", "x", "units"] as const;
const DIRECTIONS = ["up", "down", "flat"] as const;

const isStr = (v: unknown): v is string => typeof v === "string";
const isInt = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v);
const isNumOrNull = (v: unknown) => v === null || (typeof v === "number" && Number.isFinite(v));
const oneOf = <T extends readonly unknown[]>(list: T, v: unknown) => list.includes(v as T[number]);

function quotedOk(x: Record<string, unknown>) {
  return isStr(x.quote) && isInt(x.page) && (x.page as number) >= 1;
}

/** Parses Claude's text output as ConcallSummaryJson, or throws saying what is wrong. */
export function parseSummary(text: string): ConcallSummaryJson {
  let j: Record<string, unknown>;
  try {
    j = JSON.parse(text);
  } catch {
    throw new Error(`summary is not JSON (${text.slice(0, 60).replace(/\s+/g, " ")})`);
  }
  const bad = (what: string) => new Error(`summary: ${what}`);
  if (!j || typeof j !== "object") throw bad("not an object");
  if (!isInt(j.fiscal_year) || (j.fiscal_year as number) < 2000 || (j.fiscal_year as number) > 2100) throw bad("fiscal_year");
  if (!isInt(j.quarter) || (j.quarter as number) < 1 || (j.quarter as number) > 4) throw bad("quarter");
  if (!isStr(j.call_date) || (j.call_date !== "" && !/^\d{4}-\d{2}-\d{2}$/.test(j.call_date))) throw bad("call_date");
  const arr = (k: string) => {
    if (!Array.isArray(j[k])) throw bad(`${k} is not a list`);
    return j[k] as Record<string, unknown>[];
  };
  arr("guidance").forEach((g, i) => {
    if (!quotedOk(g) || !isStr(g.statement)) throw bad(`guidance[${i}]`);
    if (!oneOf(GUIDANCE_METRICS, g.metric) || !oneOf(PERIOD_KINDS, g.period_kind)) throw bad(`guidance[${i}] metric/period_kind`);
    if (!oneOf(GUIDANCE_SCOPES, g.scope)) throw bad(`guidance[${i}] scope`);
    if (!(g.target_fiscal_year === null || isInt(g.target_fiscal_year))) throw bad(`guidance[${i}] target_fiscal_year`);
    if (!(g.target_quarter === null || (isInt(g.target_quarter) && (g.target_quarter as number) >= 1 && (g.target_quarter as number) <= 4)))
      throw bad(`guidance[${i}] target_quarter`);
    if (!isNumOrNull(g.low) || !isNumOrNull(g.high)) throw bad(`guidance[${i}] low/high`);
    if (!(g.unit === null || oneOf(UNITS, g.unit))) throw bad(`guidance[${i}] unit`);
    if (!(g.direction === null || oneOf(DIRECTIONS, g.direction))) throw bad(`guidance[${i}] direction`);
  });
  for (const k of ["demand", "risks", "initiatives"]) arr(k).forEach((x, i) => {
    if (!quotedOk(x) || !isStr(x.point)) throw bad(`${k}[${i}]`);
  });
  arr("key_qa").forEach((x, i) => {
    if (!quotedOk(x) || !isStr(x.analyst_question) || !isStr(x.management_answer)) throw bad(`key_qa[${i}]`);
  });
  const tone = j.tone as Record<string, unknown> | undefined;
  if (!tone || !oneOf(TONES, tone.label) || !isStr(tone.rationale)) throw bad("tone");
  return j as unknown as ConcallSummaryJson;
}

// ------------------------------------------------------------------ Quotes and numbers

export const normText = (s: string) =>
  s
    .toLowerCase()
    .replace(/[‘’“”"'`´]/g, "")
    .replace(/[–—‐-]/g, "-")
    .replace(/ﬁ/g, "fi")
    .replace(/ﬂ/g, "fl")
    .replace(/\s+/g, " ")
    .trim();
const digitsOnly = (s: string) => s.replace(/(\d),(?=\d)/g, "$1");

/** Where a quote is: on its cited page (or across the break either side), elsewhere, or nowhere. */
export function quoteLocation(quote: string, page: number, pages: string[]): ItemCheck["quoteFound"] {
  const q = normText(quote).replace(/\.\.\.|…/g, "\u0000");
  const parts = q
    .split("\u0000")
    .map((p) => p.trim())
    .filter((p) => p.length >= 8);
  if (!parts.length) return "missing";
  const on = (txt: string) => {
    const t = normText(txt);
    return parts.every((p) => t.includes(p));
  };
  if (pages[page - 1] && on(pages[page - 1])) return "page";
  // Text extraction can split a sentence across a page break.
  if (page >= 1 && on(pages.slice(Math.max(0, page - 2), page + 1).join(" "))) return "page";
  return on(pages.join(" ")) ? "elsewhere" : "missing";
}

/** Figures in a piece of text (years like 2026 and fiscal labels like FY27 / Q2 / H1 are not figures). */
export function numbersIn(s: string): string[] {
  const own = digitsOnly(s).replace(/\b(?:FY|Q[1-4]|H[12])\s*'?\d{2,4}(?:\s*-\s*\d{2,4})?\b/gi, " ").replace(/\bQ[1-4]\b|\bH[12]\b/gi, " ");
  return [...new Set((own.match(/\d+(?:\.\d+)?/g) ?? []).filter((n) => !/^(19|20)\d\d$/.test(n)))];
}

/** Numbers in `claim` that the transcript does not contain. */
export function missingNumbers(claim: string, fullText: string): string[] {
  const hay = digitsOnly(fullText);
  return numbersIn(claim).filter((n) => {
    // "12.0" in the claim matches "12" in the text and the other way round.
    const variants = [n, n.replace(/\.0+$/, ""), n.includes(".") ? n : `${n}.0`];
    return !variants.some((v) => new RegExp(`(^|[^\\d.])${v.replace(".", "\\.")}(?![\\d])`).test(hay));
  });
}

const fmt = (n: number | null) => (n === null ? "" : String(n));

/** One check per item, in summary order (section + index point back at the item). */
export function checkSummary(s: ConcallSummaryJson, pages: string[]): ItemCheck[] {
  const full = pages.join("\n");
  const out: ItemCheck[] = [];
  const push = (section: ItemCheck["section"], index: number, claim: string, q: { quote: string; page: number }) =>
    out.push({ section, index, quoteFound: quoteLocation(q.quote, q.page, pages), missingNumbers: missingNumbers(`${claim} ${q.quote}`, full) });
  s.guidance.forEach((g: GuidanceItem, i) => push("guidance", i, `${g.statement} ${fmt(g.low)} ${fmt(g.high)}`, g));
  s.demand.forEach((x: Point, i) => push("demand", i, x.point, x));
  s.risks.forEach((x: Point, i) => push("risks", i, x.point, x));
  s.initiatives.forEach((x: Point, i) => push("initiatives", i, x.point, x));
  s.key_qa.forEach((x: KeyQA, i) => push("key_qa", i, `${x.analyst_question} ${x.management_answer}`, x));
  return out;
}

export const checkPassed = (c: ItemCheck) => c.quoteFound === "page" && c.missingNumbers.length === 0;

export function checkCounts(checks: ItemCheck[]): { checksPassed: number; checksTotal: number } {
  return { checksPassed: checks.filter(checkPassed).length, checksTotal: checks.length };
}
