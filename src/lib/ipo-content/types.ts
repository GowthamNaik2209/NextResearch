// Authored shape of one upcoming IPO's deck (the IPOs tab next to Industries and Policies).
// Each file in this folder exports one `IpoReport`, summarising the company's draft red herring
// prospectus (DRHP / UDRHP / RHP) plus dated public reporting on the issue. Everything here is
// authored and must be traceable: DRHP figures cite the offer document in `sources`, and market
// or issue figures from news name the outlet. Unknown numbers are `null`, never guessed.
//
// Money is in Rs crore unless a field says otherwise. Fiscal years are Indian (FY26 = Apr 2025 -
// Mar 2026); a stub period is labelled as such ("Q1 FY27", "9M FY26").

import type { ReportStat, SeriesPoint, Tone } from "../sector-content/reports/types";

export type { ReportStat, SeriesPoint, Tone };

/** How far along the issue is; drives the status chip and the card sort order. "listed" = recently
 *  listed, kept for a few weeks after the debut and then removed. */
export type IpoStage = "open" | "upcoming" | "approved" | "filed" | "listed";

export type IpoSource = { title: string; source: string; url: string; year?: string };

export type IpoReport = {
  /** URL slug, e.g. "jio-platforms". */
  slug: string;
  /** Short display name, e.g. "Jio Platforms". */
  name: string;
  /** Legal name from the offer document, e.g. "Jio Platforms Limited". */
  legalName: string;
  /** 2-3 character badge, like the sector icons ("JIO", "NSE"). */
  icon: string;
  /** Plain-English industry label for chips, e.g. "Telecom & digital services". */
  sectorLabel: string;
  /** Optional sector slug in products.ts this IPO belongs to (links "Open industry page"). */
  sectorSlug?: string;
  /** One line under the title on the cover and card. */
  tagline: string;
  /** Month the content was written against, e.g. "Oct 2026". */
  asOf: string;

  status: {
    stage: IpoStage;
    /** Chip text, e.g. "Opens 21 Oct", "SEBI approved", "DRHP filed". */
    label: string;
    /** One sentence on where the issue stands and what comes next. */
    detail: string;
  };
  /** 4-7 dated milestones in order (DRHP filed, SEBI observation, RHP, open, close, listing). */
  timeline: { date: string; event: string; done: boolean }[];

  issue: {
    /** Display size, e.g. "Rs 30,213 Cr" or "~Rs 30,000 Cr (expected)". */
    size: string;
    totalCr: number | null;
    freshCr: number | null;
    ofsCr: number | null;
    /** Shares offered for sale when the rupee value is not yet fixed, e.g. "11.35 crore shares". */
    ofsShares?: string;
    priceBand: string | null;
    lotSize: string | null;
    faceValue: string | null;
    /** Market cap at the upper band, or the reported expected valuation; say which. */
    valuation: string | null;
    valuationCr: number | null;
    /** e.g. "QIB 50% · NII 15% · Retail 35%"; null if not yet disclosed. */
    reservation: string | null;
    exchanges: string;
    leadManagers: string[];
    registrar: string | null;
  };

  // --- Slide 1: IPO summary ---
  /** Editorial view of the issue, not a subscribe/avoid call. */
  stance: { label: string; tone: Tone; line: string };
  /** Exactly 4 headline numbers. */
  keyStats: ReportStat[];
  /** Exactly 3 "why this IPO matters" points. */
  thesis: { title: string; body: string }[];

  // --- Slide 3: business model ---
  business: {
    /** 2-3 short paragraphs. */
    narrative: string[];
    /** 3-5 business lines/segments, each with a headline metric. */
    segments: { title: string; metric: string; body: string }[];
    /** Revenue split by segment/geography/customer, 3-6 slices summing to ~100. */
    mix: { title: string; source: string; slices: { label: string; value: number }[] };
  };

  // --- Slide 4: industry & opportunity ---
  industry: {
    narrative: string[];
    /** Market-size series, 3-8 points, only years the source gives (never interpolated); mark forecasts with projected. */
    chart: { title: string; unit: string; source: string; points: SeriesPoint[] };
    /** 4-6 rows of market facts. */
    snapshot: { label: string; value: string; tone?: Tone }[];
  };

  // --- Slide 5: financial performance (restated consolidated, from the DRHP) ---
  financials: {
    source: string;
    /** 3-4 periods, oldest first. ebitda/pat may be negative; null when not disclosed. */
    years: { label: string; revenue: number; ebitda: number | null; pat: number | null; partial?: boolean }[];
    /** 1-2 sentences of context (one-offs, accounting changes, why losses narrowed). */
    note: string;
  };

  // --- Slide 6: operating KPIs & balance sheet ---
  kpi: { title: string; unit: string; source: string; points: SeriesPoint[] };
  /** 5-8 rows: margins, ROE/RoNW, net worth, debt, cash, EPS... */
  ratios: { label: string; value: string; tone?: Tone }[];

  // --- Slide 7: use of proceeds & shareholding ---
  /** Objects of the fresh issue in Rs Cr (largest first). Empty for a pure OFS - explain in proceedsNote. */
  useOfProceeds: { label: string; valueCr: number }[];
  proceedsNote: string;
  /** Pre-issue shareholding by holder group, % summing to ~100. */
  shareholding: { holder: string; pct: number }[];
  /** Selling shareholders in the OFS (top 3-6), e.g. "SoftBank (SVF II)". */
  sellers: { name: string; detail: string }[];

  // --- Slide 8: peer valuation ---
  /**
   * 3-6 listed peers (Indian first, global if no Indian peer). `ticker` is the NSE symbol, and an
   * NSE peer's market cap, revenue and P/E come from the shared company table (the database,
   * same figures and date as every industry and policy page) - so leave those three out for it and
   * add the company to the table instead (`scripts/refresh-financials.ts --add=TICKER`). Only a peer with
   * no NSE listing carries its own figures, as of `asOf`; null when unavailable.
   */
  peers: { name: string; ticker?: string; mcapCr?: number | null; revenueCr?: number | null; pe?: number | null; note: string }[];
  /** How the IPO's implied valuation compares, in words (the peer table carries the numbers); one or two sentences. */
  valuationNote: string;

  // --- Slide 9: strengths & risk factors ---
  /** 4 strengths, as the DRHP argues them, in plain words. */
  strengths: { title: string; body: string }[];
  /** 4-5 risks from the DRHP's risk factors (plus market risks), with a mitigant. */
  risks: { risk: string; mitigant: string; severity: "high" | "medium" | "low" }[];

  // --- Slide 10: outlook & sources ---
  outlook: { bull: string; base: string; bear: string };
  /** 3-8 sources: the DRHP/RHP on SEBI or the exchange first, then reporting. Real, loaded URLs. */
  sources: IpoSource[];
};
