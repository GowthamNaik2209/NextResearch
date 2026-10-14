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
    /** 2-3 short paragraphs. */
    narrative: string[];
    /** Market-size (or volume) series, 5-8 points; mark forecasts with projected. */
    chart: { title: string; unit: string; source: string; points: SeriesPoint[] };
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
