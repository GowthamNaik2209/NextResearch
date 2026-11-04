// Authored shape of one sector's research deck (the reading list's slide
// presentations). Each sector file in this folder exports one `SectorReport`;
// `./index.ts` joins it with the live sector content (zones, suppliers and their
// seed financials) into the plain, serializable `Deck` the client viewer renders.
//
// Company figures are never typed in here: `beneficiaries` and `companyNews`
// reference supplier keys from products.ts, and their revenue/profit/market-cap
// numbers come from that sector's own supplier records — so a deck cannot drift
// from what the stock pop-up shows. Industry-level figures (market size, growth,
// policy numbers) are authored and must name a source.

export type Tone = "pos" | "neg" | "neutral";

export type ReportStat = { label: string; value: string; sub?: string };

export type SeriesPoint = { label: string; value: number; projected?: boolean };

export type PestleKey = "political" | "economic" | "social" | "technological" | "legal" | "environmental";

export type SectorReport = {
  /** Sector slug in products.ts. */
  slug: string;
  /** Cover title, e.g. "India Electric Passenger Vehicles". */
  title: string;
  /** One-line subtitle under the cover title. */
  subtitle: string;
  /** Month the content was written against, e.g. "Oct 2026". */
  asOf: string;

  // --- Slide 1: cover + investor summary ---
  /** Editorial view of the industry, not a stock call. tone drives the chip colour. */
  stance: { label: string; tone: Tone; line: string };
  /** Exactly 4 headline numbers. */
  keyStats: ReportStat[];
  /** Exactly 3 numbered thesis points. */
  thesis: { title: string; body: string }[];

  // --- Slide 2: latest developments ---
  /** 5-6 dated industry/policy developments, newest first. */
  developments: { date: string; title: string; body: string; impact: Tone; tag: string }[];

  // --- Slide 3: industry overview ---
  overview: {
    /**
     * Optional authored action title for the slide. Without it the title is derived from the
     * chart: a growth rate for a time series, a plain "largest of" line for a category chart.
     */
    headline?: string;
    /** 2-3 short paragraphs. */
    narrative: string[];
    /**
     * Market-size (or volume) series, 4-8 points; mark forecasts with projected. `kind` says
     * whether the labels are periods ("series": FY21, 2025, Sep 26) or unrelated categories
     * ("categories": schemes, segments, stages). Category charts never get a growth-rate
     * headline and draw as horizontal bars so long labels stay readable. Left out, the kind is
     * inferred from the labels.
     */
    chart: { title: string; unit: string; source: string; points: SeriesPoint[]; kind?: "series" | "categories" };
    /** 4-6 rows, like an analyst's "industry snapshot" table. */
    snapshot: { label: string; value: string; tone?: Tone }[];
  };

  // --- Slide 4: value chain & profit pools ---
  /** 4-6 stages in flow order; zoneIds must be real zone ids of the sector. */
  valueChain: { stage: string; zoneIds: string[]; margin: string; moat: "high" | "medium" | "low"; note: string }[];

  // --- Slide 5: growth drivers & mix ---
  /** Exactly 4 demand/supply drivers, each with a headline metric. */
  drivers: { title: string; metric: string; body: string }[];
  /** A parts-of-a-whole split (segment / source / end-use), 3-5 slices summing to ~100. */
  mix: { title: string; source: string; slices: { label: string; value: number }[] };

  // --- Slide 6: PESTLE ---
  /** 2 points per factor. */
  pestle: Record<PestleKey, { point: string; impact: Tone }[]>;

  // --- Slides 7-8: beneficiaries + financial scorecard ---
  /** 6-10 supplier keys (listed only) from this sector, ranked by how directly they benefit. */
  beneficiaries: { key: string; tier: "core" | "direct" | "indirect"; why: string }[];

  // --- Slide 9: company developments & industry impact ---
  /** 5-6 company-level developments; key is a supplier key from this sector. */
  companyNews: { key: string; date: string; development: string; impact: string; tone: Tone }[];

  // --- Slide 10: risks, outlook & further reading ---
  /** 4 risks. */
  risks: { risk: string; mitigant: string; severity: "high" | "medium" | "low" }[];
  outlook: { bull: string; base: string; bear: string };
  /** 3-6 external reports to read further (real, stable URLs). */
  reading: { title: string; source: string; url: string; year?: string }[];
};

// A chart label that names a period: "FY21", "FY26BE", "FY29T", "2030P", "Sep 26", "Oct 2025".
const PERIOD_LABEL = /^(?:(?:FY|CY)?\d{2}(?:\d{2})?[A-Z]{0,2}|[A-Z][a-z]{2} \d{2}(?:\d{2})?)$/;
const periodYear = (label: string) => {
  const m = label.match(/(\d{4}|\d{2})/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return n < 100 ? 2000 + n : n;
};

/** True when every label is a period and the periods run forward (never back). */
export function looksLikeTimeSeries(points: SeriesPoint[]) {
  if (!points.every((p) => PERIOD_LABEL.test(p.label))) return false;
  const ys = points.map((p) => periodYear(p.label)!);
  return ys.every((y, i) => i === 0 || y >= ys[i - 1]) && ys[ys.length - 1] > ys[0];
}

/** The chart's kind: authored, or inferred from its labels. */
export const chartKind = (chart: SectorReport["overview"]["chart"]) => chart.kind ?? (looksLikeTimeSeries(chart.points) ? "series" : "categories");
