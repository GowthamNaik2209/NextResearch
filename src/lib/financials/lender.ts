// A lender's own figures from its Screener.in company page: asset quality (gross and net NPA % of the
// latest quarter), financing margin and net profit of the latest full year, and the last two year-end
// total assets and deposits (return on assets and deposit growth are worked out from these where they
// are shown). Pure: the daily refresh (./refresh.ts) calls it only for companies whose kind is
// "lender" (./kinds.ts), and ./write.ts stores the result on that day's KpiSnapshot.
//
// Always the STANDALONE page, whatever basis the company's snapshot uses: a consolidated bank page
// folds in insurance and other subsidiaries (HDFC Bank's consolidated financing margin reads -12%
// against 12% standalone) and often leaves the NPA rows empty. One basis for the whole block, so
// return on assets is standalone profit over standalone assets.
//
// Screener lays a lender's page out differently from everyone else's: its P&L has "Revenue",
// "Interest", "Financing Profit" and "Financing Margin %" rows instead of "Sales" and "Operating
// Profit"; its quarterly table adds "Gross NPA %" and "Net NPA %" (empty on many consolidated
// pages); a bank's balance sheet carries "Deposits". Column labels are "Mar 2026", or "Mar 2026 (S)"
// when a consolidated table falls back to standalone figures for that period.

export type LenderFigures = {
  gnpa: number | null;
  nnpa: number | null;
  finMargin: number | null;
  // The full year finMargin and netProfit are for ("Mar 2026")
  finMarginYear: string | null;
  // Net profit (Rs cr) of that year, for return on assets
  netProfit: number | null;
  // [latest year-end, the year-end before]
  totalAssets: [number | null, number | null];
  // null when the balance sheet has no Deposits row (an NBFC); [latest, previous] for a bank
  deposits: [number | null, number | null] | null;
  // The latest year-end the assets and deposits are at ("Mar 2026")
  bsYear: string | null;
  // The quarter the NPAs are from ("Sep 2026"), null when the page shows none
  quarter: string | null;
};

type Table = { cols: string[]; rows: Map<string, (number | null)[]> };

const text = (s: string) => s.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").replace(/\s*\+\s*$/, "").trim();
const num = (s: string) => {
  const n = parseFloat(s.replace(/[,%\s]/g, ""));
  return Number.isFinite(n) ? n : null;
};

// One of the page's data tables (the same row extraction as revenueRow in ./refresh.ts), by section id.
function table(html: string, section: string): Table | null {
  const i = html.indexOf(`id="${section}"`);
  if (i < 0) return null;
  const start = html.indexOf("<table", i);
  const end = html.indexOf("</table>", start);
  if (start < 0 || end < 0) return null;
  const t = html.slice(start, end);
  const cols = [...(t.match(/<thead[\s\S]*?<\/thead>/)?.[0] ?? "").matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map((m) => text(m[1])).slice(1);
  const rows = new Map<string, (number | null)[]>();
  for (const m of t.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
    const cells = [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => text(c[1]));
    if (cells.length > 1 && !rows.has(cells[0])) rows.set(cells[0], cells.slice(1).map(num));
  }
  return { cols, rows };
}

// "Mar 2026" / "Mar 2026 (S)" -> "Mar"; null for "TTM" and anything else that is not a period end.
const monthOf = (label: string) => /^([A-Z][a-z]{2}) \d{4}(?: \(S\))?$/.exec(label)?.[1] ?? null;
const periodOf = (label: string) => label.replace(/ \(S\)$/, "");

/** A lender's figures from its Screener page, or null when the page is not a lender layout (no "Financing Profit" row). */
export function parseLenderFigures(html: string): LenderFigures | null {
  const pl = table(html, "profit-loss");
  if (!pl?.rows.has("Financing Profit")) return null;

  // Full years: the P&L's dated columns (not TTM). Their month (Mar, or Dec for a calendar-year
  // company) tells the balance sheet's year-ends from a half-year column such as "Sep 2026".
  const years = pl.cols.map((c, i) => (monthOf(c) ? i : -1)).filter((i) => i >= 0);
  const lastYear = years.at(-1);
  const atYear = (label: string) => (lastYear == null ? null : (pl.rows.get(label)?.[lastYear] ?? null));
  const yearEnd = lastYear == null ? "Mar" : monthOf(pl.cols[lastYear]);

  const bs = table(html, "balance-sheet");
  const ends = bs ? bs.cols.map((c, i) => (monthOf(c) === yearEnd ? i : -1)).filter((i) => i >= 0) : [];
  const lastTwo = (label: string): [number | null, number | null] | null => {
    const row = bs?.rows.get(label);
    if (!row) return null;
    const at = (k: number | undefined) => (k == null ? null : (row[k] ?? null));
    return [at(ends.at(-1)), at(ends.at(-2))];
  };

  // NPAs: the latest quarter that shows either figure (many consolidated pages leave the rows empty).
  const q = table(html, "quarters");
  const g = q?.rows.get("Gross NPA %");
  const n = q?.rows.get("Net NPA %");
  let qi = -1;
  if (q) for (let i = q.cols.length - 1; i >= 0 && qi < 0; i--) if (g?.[i] != null || n?.[i] != null) qi = i;

  return {
    gnpa: qi < 0 ? null : (g?.[qi] ?? null),
    nnpa: qi < 0 ? null : (n?.[qi] ?? null),
    finMargin: atYear("Financing Margin %"),
    finMarginYear: lastYear == null ? null : periodOf(pl.cols[lastYear]),
    netProfit: atYear("Net Profit"),
    totalAssets: lastTwo("Total Assets") ?? [null, null],
    deposits: lastTwo("Deposits"),
    bsYear: ends.length && bs ? periodOf(bs.cols[ends.at(-1)!]) : null,
    quarter: qi < 0 ? null : periodOf(q!.cols[qi]),
  };
}

/** The block stored for a lender whose standalone page could not be read: nothing, rather than consolidated figures. */
export const EMPTY_LENDER: LenderFigures = {
  gnpa: null, nnpa: null, finMargin: null, finMarginYear: null, netProfit: null,
  totalAssets: [null, null], deposits: null, bsYear: null, quarter: null,
};

/** A lender's block from its standalone page as fetched (null: request failed; "missing": 404). */
export function lenderFromStandalone(html: string | "missing" | null): LenderFigures {
  return (html && html !== "missing" ? parseLenderFigures(html) : null) ?? EMPTY_LENDER;
}
