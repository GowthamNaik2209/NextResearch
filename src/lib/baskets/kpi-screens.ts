// Rule-based baskets screened on the company table's figures (supplier.f): five fiscal years of
// revenue and net profit (FY22..FY26), P/E and ROCE. Each rule is fixed and stated in one line, uses
// only the latest snapshot, keeps out small companies, those with a one-off year (./outliers.ts)
// and REITs/InvITs, and ranks by one number shown beside each stock. The ROCE and margin rules
// (compounders, GARP, widening margins) also keep out lenders and insurers (financials/kinds.ts),
// whose ROCE and net margin mean nothing; they have rules of their own (quality lenders, insurer value). They deliberately differ from the
// other rule-based baskets (past price, ROCE alone, our maps) and from the landing page's "Stock
// screens" (src/lib/sector-content/insights.ts: highest ROCE, latest-year revenue growth, lowest
// P/E with ROCE above 15%, furthest below the 52-week high, highest dividend yield).
// Pure, so each rule is unit-tested on fixture data (kpi-screens.test.ts).
import { croreShort } from "@/lib/format";
import type { CompanyKind } from "@/lib/financials/kinds";
import { STALE_AFTER_DAYS, type InsurerFigures } from "@/lib/financials/insurer";
import { ONE_OFF_NOTE } from "./outliers";

/** What a screen needs about one company (from the company table; null when not reported). */
export type KpiStock = {
  ticker: string;
  name: string;
  mcapCr: number | null;
  /** Figures distorted by a one-off year (./outliers.ts): kept out of every screen. */
  outlier?: boolean;
  /** A REIT or InvIT: it passes its income through, so its P/E, margins and "losses" (fair-value
   * marks) don't compare with a company's. Kept out of these screens. */
  trust?: boolean;
  /** Lender, insurer or operating company (financials/kinds.ts); missing reads as operating. */
  kind?: CompanyKind;
  pe?: number | null;
  roce?: number | null;
  /** Return on equity, % (the company table's kpi[4]). */
  roe?: number | null;
  /** A lender's net NPA, % of advances, latest quarter (its lender block). */
  nnpa?: number | null;
  /** An insurer's figures (its insurer block): VNB margin, P/EV and whether the quarter is fresh. */
  insurer?: Pick<InsurerFigures, "vnbMargin" | "pev" | "fresh"> | null;
  /** Revenue and net profit, ₹ Cr, FY22..FY26 (index 4 is the latest year). */
  rev?: (number | null)[];
  np?: (number | null)[];
};

export type KpiScreen = {
  id: string;
  title: string;
  /** One line for the card. */
  blurb: string;
  /** The rule in one line (the card's and the page's "i"). */
  rule: string;
  stocks: { ticker: string; stat: string }[];
};

/** Companies smaller than this are left out of every screen here (thin, volatile figures). */
export const KPI_MIN_MCAP_CR = 1000;
/** No screen lists more than this many stocks. */
export const KPI_LIST_N = 12;
/** A growth rate is only measured from a base profit of at least this (₹ Cr): from ₹1 Cr to ₹100 Cr is
 * "+200% a year" but says little, and it would crowd out every steadier grower. */
export const KPI_MIN_BASE_PROFIT_CR = 25;

const FY = (i: number) => `FY${22 + i}`;
const ok = (v: number | null | undefined): v is number => typeof v === "number" && Number.isFinite(v);
const cagr = (from: number, to: number, years: number) => ((to / from) ** (1 / years) - 1) * 100;
const pct0 = (v: number) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(0)}%`;
const eligible = (s: KpiStock) => !s.outlier && !s.trust && (s.mcapCr ?? 0) >= KPI_MIN_MCAP_CR;
/** The ROCE and margin rules also need an operating company: a lender's or insurer's ROCE and net margin mean nothing. */
const operating = (s: KpiStock) => eligible(s) && (s.kind ?? "operating") === "operating";
/** Ties break on market cap (bigger first), then name, so the order is fully determined. */
const tie = (a: KpiStock, b: KpiStock) => (b.mcapCr ?? -1) - (a.mcapCr ?? -1) || a.name.localeCompare(b.name);

function rank<T extends KpiStock>(rows: { s: T; key: number; stat: string }[], dir: "asc" | "desc") {
  return rows
    .sort((a, b) => (dir === "desc" ? b.key - a.key : a.key - b.key) || tie(a.s, b.s))
    .slice(0, KPI_LIST_N)
    .map((r) => ({ ticker: r.s.ticker, stat: r.stat }));
}

// ---- the rules ----

/** Consistent compounders: revenue and net profit up every year FY22→FY26, ROCE 15%+; fastest profit growth first. */
export const COMPOUNDER_MIN_ROCE = 15;
export function compounders(stocks: KpiStock[]): KpiScreen["stocks"] {
  const rows = stocks.flatMap((s) => {
    const rev = s.rev ?? [];
    const np = s.np ?? [];
    if (!operating(s) || !ok(s.roce) || s.roce < COMPOUNDER_MIN_ROCE) return [];
    if (rev.length < 5 || np.length < 5 || ![...rev, ...np].every(ok)) return [];
    const r = rev as number[];
    const p = np as number[];
    if (p[0] < KPI_MIN_BASE_PROFIT_CR) return [];
    for (let i = 1; i < 5; i++) if (!(r[i] > r[i - 1]) || !(p[i] > p[i - 1])) return [];
    const g = cagr(p[0], p[4], 4);
    return [{ s, key: g, stat: `profit ${pct0(g)}/yr` }];
  });
  return rank(rows, "desc");
}

/** Growth at a reasonable price: P/E ÷ FY23→FY26 profit growth (PEG), lowest first, among real growers. */
export const GARP = { minProfitCagr: 15, minRevCagr: 10, minRoce: 12, maxPeg: 1.5 };
export function garp(stocks: KpiStock[]): KpiScreen["stocks"] {
  const rows = stocks.flatMap((s) => {
    const rev = s.rev ?? [];
    const np = s.np ?? [];
    if (!operating(s) || !ok(s.pe) || s.pe <= 0 || !ok(s.roce) || s.roce < GARP.minRoce) return [];
    if (!ok(np[1]) || !ok(np[4]) || np[1] < KPI_MIN_BASE_PROFIT_CR || !ok(rev[1]) || !ok(rev[4]) || rev[1] <= 0) return [];
    // Profitable every year FY22-FY26: growth rebounding from a loss is the Turnarounds list, and it
    // would flatter the PEG here.
    if (np.length < 5 || !np.every((v) => ok(v) && v > 0)) return [];
    const pg = cagr(np[1], np[4], 3);
    const rg = cagr(rev[1], rev[4], 3);
    if (pg < GARP.minProfitCagr || rg < GARP.minRevCagr) return [];
    const peg = s.pe / pg;
    if (peg > GARP.maxPeg) return [];
    return [{ s, key: peg, stat: `PEG ${peg.toFixed(2)} · P/E ${s.pe.toFixed(1)}x` }];
  });
  return rank(rows, "asc");
}

/** Turnarounds: a net loss in FY22, FY23 or FY24, then a profit in FY25 and a bigger one in FY26; biggest FY26 profit first. */
export function turnarounds(stocks: KpiStock[]): KpiScreen["stocks"] {
  const rows = stocks.flatMap((s) => {
    const np = s.np ?? [];
    const rev = s.rev ?? [];
    if (!eligible(s) || !ok(np[3]) || !ok(np[4]) || !(np[3] > 0) || !(np[4] > np[3])) return [];
    if (ok(rev[2]) && ok(rev[4]) && rev[4] < rev[2]) return []; // profits back, but on shrinking sales
    const lossAt = [2, 1, 0].find((i) => ok(np[i]) && np[i]! < 0);
    if (lossAt == null) return [];
    return [{ s, key: np[4], stat: `loss ${FY(lossAt)} → ${croreShort(np[4])}` }];
  });
  return rank(rows, "desc");
}

/** Widening margins: net margin up most from FY23 to FY26, profitable each year and on growing revenue. */
export const MARGIN_MIN_REV_CR = 500;
export function wideningMargins(stocks: KpiStock[]): KpiScreen["stocks"] {
  const rows = stocks.flatMap((s) => {
    const rev = s.rev ?? [];
    const np = s.np ?? [];
    if (!operating(s)) return [];
    if (![rev[1], rev[4], np[1], np[2], np[3], np[4]].every(ok)) return [];
    const r1 = rev[1]!;
    const r4 = rev[4]!;
    if (r1 <= 0 || r4 < MARGIN_MIN_REV_CR || !(r4 > r1)) return [];
    if (![np[1], np[2], np[3], np[4]].every((v) => v! > 0)) return []; // turnarounds are their own list
    const m1 = (np[1]! / r1) * 100;
    const m4 = (np[4]! / r4) * 100;
    // A margin above 100% is not a trading margin (a holding company's dividends, a one-off gain).
    if (m4 > 100) return [];
    return [{ s, key: m4 - m1, stat: `margin ${m1.toFixed(0)}% → ${m4.toFixed(0)}%` }];
  });
  return rank(rows, "desc");
}

/** Quality lenders: banks and NBFCs earning ROE 15%+ with net NPA 1% or less; highest ROE first. */
export const QUALITY_LENDER = { minRoe: 15, maxNnpa: 1 };
export function qualityLenders(stocks: KpiStock[]): KpiScreen["stocks"] {
  const rows = stocks.flatMap((s) => {
    if (!eligible(s) || s.kind !== "lender" || !ok(s.roe) || !ok(s.nnpa)) return [];
    if (s.roe < QUALITY_LENDER.minRoe || s.nnpa > QUALITY_LENDER.maxNnpa) return [];
    return [{ s, key: s.roe, stat: `ROE ${s.roe.toFixed(0)}% · Net NPA ${s.nnpa.toFixed(2)}%` }];
  });
  return rank(rows, "desc");
}

/**
 * Insurer value: life insurers with VNB margin 20%+ on a fresh quarter, cheapest price to embedded
 * value (P/EV) first. A life insurer is an insurer with a VNB margin: only life insurers report value
 * of new business (general and health insurers report a combined ratio instead). A stale quarter
 * (financials/insurer.ts STALE_AFTER_DAYS) is left out: ranking on it would rank an old quarter.
 */
export const INSURER_VALUE = { minVnb: 20 };
export function insurerValue(stocks: KpiStock[]): KpiScreen["stocks"] {
  const rows = stocks.flatMap((s) => {
    const i = s.insurer;
    if (!eligible(s) || s.kind !== "insurer" || !i || i.fresh !== "fresh" || !ok(i.vnbMargin) || !ok(i.pev) || i.pev <= 0) return [];
    if (i.vnbMargin < INSURER_VALUE.minVnb) return [];
    return [{ s, key: i.pev, stat: `P/EV ${i.pev.toFixed(2)}x · VNB ${i.vnbMargin.toFixed(0)}%` }];
  });
  return rank(rows, "asc");
}

/**
 * The screens still waiting on figures, each with the line its page and card show: Quality lenders
 * while no covered lender has a net NPA, Insurer value while no covered insurer has a VNB margin and
 * a P/EV. An empty list then means the figures aren't in yet, not that no company passes the rule.
 */
export function screensAwaitingFigures(stocks: KpiStock[]): Record<string, string> {
  const out: Record<string, string> = {};
  const lenders = stocks.filter((s) => s.kind === "lender");
  const insurers = stocks.filter((s) => s.kind === "insurer");
  if (lenders.length && !lenders.some((s) => ok(s.nnpa)))
    out["quality-lenders"] = "Net NPA figures are not yet added for covered lenders, so the list is empty until they are. It is not that no lender passes the rule.";
  if (insurers.length && !insurers.some((s) => ok(s.insurer?.vnbMargin) && ok(s.insurer?.pev)))
    out["insurer-value"] = "VNB margin and embedded value figures are not yet added for covered insurers, so the list is empty until they are. It is not that no insurer passes the rule.";
  return out;
}

const cr = `₹${KPI_MIN_MCAP_CR.toLocaleString("en-IN")} Cr`;

/** Every KPI screen, with its name and rule (a screen with no stocks is still returned; buildIdeas drops it). */
export function kpiScreens(stocks: KpiStock[]): KpiScreen[] {
  return [
    {
      id: "compounders",
      title: "Consistent compounders",
      blurb: "Revenue and profit higher every year for five years, with ROCE of 15% or more.",
      rule: `Revenue and net profit up every year FY22→FY26 (FY22 profit ₹${KPI_MIN_BASE_PROFIT_CR} Cr+) and ROCE ${COMPOUNDER_MIN_ROCE}%+, worth ${cr}+; fastest 4-year profit growth first. ${ONE_OFF_NOTE}`,
      stocks: compounders(stocks),
    },
    {
      id: "garp",
      title: "Growth at a reasonable price",
      blurb: "Fast profit growth for the price paid: the lowest P/E per point of growth.",
      rule: `P/E ÷ FY23→FY26 profit growth (PEG ${GARP.maxPeg} or less), lowest first; profit growth ${GARP.minProfitCagr}%+ a year from ₹${KPI_MIN_BASE_PROFIT_CR} Cr+ with no loss since FY22, revenue ${GARP.minRevCagr}%+, ROCE ${GARP.minRoce}%+, worth ${cr}+. ${ONE_OFF_NOTE}`,
      stocks: garp(stocks),
    },
    {
      id: "turnarounds",
      title: "Turnarounds",
      blurb: "A net loss in at least one of FY22, FY23 or FY24, profitable since, with FY26 profit up on FY25.",
      rule: `A net loss in FY22, FY23 or FY24, then profits in FY25 and FY26 (FY26 higher) without shrinking sales, worth ${cr}+; biggest FY26 profit first. ${ONE_OFF_NOTE}`,
      stocks: turnarounds(stocks),
    },
    {
      id: "margins",
      title: "Widening margins",
      blurb: "Net margin up most over three years, profitable each year on growing revenue.",
      rule: `Net margin (profit ÷ revenue) up most from FY23 to FY26, profitable every year, revenue growing and ₹${MARGIN_MIN_REV_CR} Cr+, worth ${cr}+. ${ONE_OFF_NOTE}`,
      stocks: wideningMargins(stocks),
    },
    {
      id: "quality-lenders",
      title: "Quality lenders",
      blurb: "Banks and NBFCs earning a high return on equity with few bad loans.",
      rule: `Banks and NBFCs with ROE ${QUALITY_LENDER.minRoe}%+ and net NPA ${QUALITY_LENDER.maxNnpa}% or less (latest quarter), worth ${cr}+; highest ROE first. ${ONE_OFF_NOTE}`,
      stocks: qualityLenders(stocks),
    },
    {
      id: "insurer-value",
      title: "Insurer value",
      blurb: "Life insurers writing profitable new business, cheapest against their embedded value first.",
      rule: `Life insurers with VNB margin ${INSURER_VALUE.minVnb}%+ in a quarter ended within ${STALE_AFTER_DAYS} days, worth ${cr}+; lowest price to embedded value (P/EV) first. ${ONE_OFF_NOTE}`,
      stocks: insurerValue(stocks),
    },
  ];
}
