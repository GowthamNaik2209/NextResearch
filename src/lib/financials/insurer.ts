// Insurers' quality figures are not on Screener, so they are kept by hand from each insurer's quarterly
// public disclosures (data/insurer-metrics.json, loaded by scripts/insurer-metrics.ts): VNB margin and
// embedded value for life insurers, combined ratio for general and health insurers, solvency for all.
// One row per insurer per quarter, with the period, the source and the date it was read.
import { INSURERS } from "./kinds";

export type InsurerFigures = {
  period: string; // "Q2 FY27"
  periodEnd: string; // "2026-09-30"
  vnbMargin: number | null;
  pev: number | null;
  combinedRatio: number | null;
  solvency: number | null;
  sourceUrl: string;
  fresh: "fresh" | "stale";
};

/** One row of data/insurer-metrics.json. */
export type InsurerRow = {
  ticker: string;
  period: string;
  periodEnd: string; // YYYY-MM-DD
  vnbMargin: number | null;
  embeddedValueCr: number | null;
  combinedRatio: number | null;
  solvencyRatio: number | null;
  sourceUrl: string;
  readOn: string; // YYYY-MM-DD
};

const DAY_MS = 86_400_000;
export const STALE_AFTER_DAYS = 200;

/** Stale once the quarter ended more than 200 days ago (exactly 200 is still fresh). */
export function insurerFreshness(periodEnd: Date, today: Date): "fresh" | "stale" {
  return (today.getTime() - periodEnd.getTime()) / DAY_MS > STALE_AFTER_DAYS ? "stale" : "fresh";
}

/** "Rs 1,74,575 Cr" -> 174575 (crore); null when it cannot be read. */
export function parseMarketCapCr(mcap: string | null | undefined): number | null {
  if (!mcap) return null;
  const m = mcap.match(/(\d[\d,]*(?:\.\d+)?)/);
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

/** P/EV = market cap (Rs Cr) / embedded value (Rs Cr); null when either is missing or EV <= 0. */
export function priceToEmbeddedValue(mcap: string | null | undefined, embeddedValueCr: number | null | undefined): number | null {
  const cap = parseMarketCapCr(mcap);
  if (cap == null || embeddedValueCr == null || !(embeddedValueCr > 0)) return null;
  return cap / embeddedValueCr;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const isDate = (v: unknown) => typeof v === "string" && DATE.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));
const isNumOrNull = (v: unknown) => v === null || (typeof v === "number" && Number.isFinite(v));
const isHttp = (v: unknown) => {
  if (typeof v !== "string") return false;
  try {
    const p = new URL(v).protocol;
    return p === "http:" || p === "https:";
  } catch {
    return false;
  }
};

/** Checks every row of the JSON file; a row with any problem is reported and the file must not be applied. */
export function validateInsurerRows(input: unknown): { rows: InsurerRow[]; errors: string[] } {
  if (!Array.isArray(input)) return { rows: [], errors: ["the file must contain a JSON array"] };
  const errors: string[] = [];
  const rows: InsurerRow[] = [];
  const seen = new Set<string>();
  input.forEach((raw, i) => {
    const at = `row ${i + 1}`;
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
      errors.push(`${at}: not an object`);
      return;
    }
    const r = raw as Record<string, unknown>;
    const bad: string[] = [];
    if (typeof r.ticker !== "string" || !INSURERS.includes(r.ticker)) bad.push("ticker must be one of the covered insurers");
    if (typeof r.period !== "string" || !r.period.trim()) bad.push("period is required (e.g. Q2 FY27)");
    if (!isDate(r.periodEnd)) bad.push("periodEnd must be a date as YYYY-MM-DD");
    if (!isDate(r.readOn)) bad.push("readOn must be a date as YYYY-MM-DD");
    if (!isHttp(r.sourceUrl)) bad.push("sourceUrl must be an http(s) URL");
    for (const k of ["vnbMargin", "embeddedValueCr", "combinedRatio", "solvencyRatio"]) {
      if (!isNumOrNull(r[k])) bad.push(`${k} must be a number or null`);
    }
    if (bad.length) {
      errors.push(`${at}: ${bad.join("; ")}`);
      return;
    }
    const key = `${r.ticker}|${r.periodEnd}`;
    if (seen.has(key)) {
      errors.push(`${at}: duplicate of an earlier row for ${r.ticker} ${r.periodEnd}`);
      return;
    }
    seen.add(key);
    rows.push(r as unknown as InsurerRow);
  });
  return { rows, errors };
}
