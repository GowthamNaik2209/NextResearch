// Banks, NBFCs and insurers do not earn a margin on sales or a return on
// operating capital, so ROCE and operating margin mean nothing for them. This
// flag lets screens, rankings and stock pages swap in lender metrics (net
// interest margin, asset quality, capital adequacy) or insurer metrics (combined
// ratio, solvency, value of new business) instead. It is kept in code, like the
// REIT list, so it holds before any financials are loaded. A holding company
// goes where most of its profit comes from. Brokers, asset managers, exchanges,
// registrars, rating agencies and insurance brokers or aggregators earn fees
// and stay "operating".
import type { SupplierFinancials } from "@/lib/sector-content";
import type { Fundamentals } from "@/lib/live/screener-company";

export type CompanyKind = "operating" | "lender" | "insurer";

/** The lenders that are banks (they take deposits): the lender block's deposit growth row is theirs. */
export const BANKS: readonly string[] = [
  "HDFCBANK", "ICICIBANK", "SBIN", "AXISBANK", "KOTAKBANK",
  "INDUSINDBK", "IDFCFIRSTB", "BANDHANBNK", "FEDERALBNK", "AUBANK", "YESBANK",
  "PNB", "BANKBARODA", "CANBK", "UNIONBANK",
  "RBLBANK", "IDBI", "CUB", "KARURVYSYA", "J&KBANK", "TMB", "KTKBANK", "SOUTHBANK", "DCBBANK", "CSBBANK",
  "BANKINDIA", "MAHABANK", "CENTRALBK", "IOB", "UCOBANK", "INDIANB", "PSB",
  // Small finance banks
  "EQUITASBNK", "UJJIVANSFB", "JSFB", "UTKARSHBNK", "SURYODAY", "ESAFSFB", "CAPITALSFB",
];

export const LENDERS: readonly string[] = [
  ...BANKS,
  // NBFCs and holding companies led by lending
  "BAJFINANCE", "BAJAJFINSV", "JIOFIN", "SHRIRAMFIN", "CHOLAFIN", "MUTHOOTFIN", "MANAPPURAM", "M&MFIN", "POONAWALLA", "SBICARD",
  "HDBFS", "KISSHT", "TATACAP", "IIFL", "SUNDARMFIN", "LTF", "ABCAPITAL", "PIRAMALFIN", "SAMMAANCAP",
  "BAJAJHLDNG", "CHOLAHLDNG", "MUTHOOTMF", "FIVESTAR", "CGCL", "SBFC", "UGROCAP", "MASFIN",
  // Housing finance
  "BAJAJHFL", "LICHSGFIN", "PNBHOUSING", "AADHARHFC", "AAVAS", "HOMEFIRST", "CANFINHOME", "APTUS", "INDIASHLTR", "REPCOHOME",
  // Infrastructure and energy lenders
  "RECLTD", "PFC", "IRFC", "IREDA", "HUDCO", "IFCI",
  // Microfinance
  "CREDITACC", "SPANDANA", "FUSION", "SATIN",
];

/**
 * The insurers that write life policies (they report VNB margin and embedded value; the rest report a combined ratio).
 * MFSL is a holding company whose figures are Axis Max Life's; ICICILIFE was ICICIPRULI until 23 Oct 2026.
 */
export const LIFE_INSURERS: readonly string[] = ["HDFCLIFE", "SBILIFE", "ICICILIFE", "LICI", "MFSL", "CANHLIFE"];

export const INSURERS: readonly string[] = [
  ...LIFE_INSURERS,
  // General insurers and the reinsurer
  "ICICIGI", "NIACL", "GODIGIT", "GICRE",
  // Standalone health insurers (RELIGARE: its figures are Care Health's)
  "STARHEALTH", "NIVABUPA", "RELIGARE",
];

const LENDER_SET = new Set(LENDERS);
const LIFE_SET = new Set(LIFE_INSURERS);
export const isLifeInsurer = (ticker: string) => LIFE_SET.has(ticker);
const BANK_SET = new Set(BANKS);
const INSURER_SET = new Set(INSURERS);

export const isBank = (ticker: string) => BANK_SET.has(ticker);

/**
 * Holding and investment companies: their profit is dividends, investment gains and their subsidiaries'
 * (Bajaj Finserv's is Bajaj Finance's and the Bajaj Allianz insurers'), so a net margin on their own
 * revenue means nothing, and the lending figures, where they have a lending kind, are the subsidiaries'
 * to report. They keep their kind for P/E peers; only these two readings change.
 */
export const HOLDING_COMPANIES: readonly string[] = ["BAJAJFINSV", "BAJAJHLDNG", "JIOFIN", "TATAINVEST", "AIIL"];
const HOLDING_SET = new Set(HOLDING_COMPANIES);
export const isHoldingCompany = (ticker: string) => HOLDING_SET.has(ticker);
/** What a holding company's net margin reads as. */
export const HOLDING_MARGIN_NOTE = "Not meaningful for holding companies";

export function companyKind(ticker: string): CompanyKind {
  if (LENDER_SET.has(ticker)) return "lender";
  if (INSURER_SET.has(ticker)) return "insurer";
  return "operating";
}

/**
 * The figures as the app shows them: a lender's or an insurer's ROCE (kpi[3]) emptied, so no surface
 * (pop-up, screens, pools, decks, share images) can show it as a number. Applied only where the app
 * installs the table (./store.ts installFinancials, ./load.ts financialsFor), never on the rows the
 * refresh reads back (./query.ts readCompanyTable): the database keeps Screener's ROCE as reported,
 * and the refresh treats a null it reads as a curated "not meaningful" it would keep writing.
 */
export function forDisplay(f: SupplierFinancials): SupplierFinancials {
  const out = withMeaningfulPe(f);
  if ((out.kind ?? companyKind(out.ticker)) === "operating" || !out.kpi || out.kpi[3] == null) return out;
  return { ...out, kpi: out.kpi.map((v, i) => (i === 3 ? null : v)) };
}

/** Above this a trailing P/E is a tiny profit, not a valuation (Devyani's 1,280x, OneSource's 1,613x). */
export const PE_MAX = 300;

/**
 * A trailing P/E is left out (and says why) when the latest reported year is a loss, since a few
 * profitable quarters after it make a multiple that reads as a valuation, or when it is over PE_MAX.
 * Done once here, so the tile, P/E in context, the peers' medians and the screens all agree.
 */
export function withMeaningfulPe(f: SupplierFinancials): SupplierFinancials {
  const pe = f.kpi?.[0];
  if (typeof pe !== "number" || !Number.isFinite(pe) || pe <= 0) return f;
  const np = f.np ?? [];
  let i = np.length - 1;
  while (i >= 0 && !(typeof np[i] === "number" && Number.isFinite(np[i]))) i--;
  const lossYear = i >= 0 && (np[i] as number) <= 0;
  if (!lossYear && pe <= PE_MAX) return f;
  return { ...f, kpi: f.kpi!.map((v, j) => (j === 0 ? null : v)), peNote: lossYear ? null : "Not meaningful on a thin profit" };
}

/** What a ROCE or net-margin figure reads as for a lender or an insurer; null for an operating company. */
export function notMeaningfulNote(kind: CompanyKind | null | undefined): string | null {
  return kind === "lender" ? "Not meaningful for lenders" : kind === "insurer" ? "Not meaningful for insurers" : null;
}

// Screener's operating rows (a lender's page has none; an insurer's are not an operating business's).
const OPERATING_SERIES = /^(Operating Profit|OPM %)$/;

/**
 * Live Screener fundamentals as the pop-up gets them (api/stock/[ticker]): for a lender or an insurer
 * no ROCE (its own, the peers' median or the top ratios) and no operating profit or margin rows, so no
 * surface can show them as a number. A copy; an operating company's come back unchanged.
 */
export function fundamentalsForKind(fund: Fundamentals | null, kind: CompanyKind): Fundamentals | null {
  if (!fund || kind === "operating") return fund;
  const ind = fund.industry;
  return {
    ...fund,
    kpi: fund.kpi ? { ...fund.kpi, roce: null } : fund.kpi,
    industry: ind ? { ...ind, median: { ...ind.median, roce: null }, self: ind.self ? { ...ind.self, roce: null } : null } : ind,
    annual: fund.annual ? { ...fund.annual, series: fund.annual.series.filter((r) => !OPERATING_SERIES.test(r.label)) } : fund.annual,
  };
}
