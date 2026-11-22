// Pure arithmetic behind scripts/check-index-coverage.ts: how much of an index list (the Nifty 500)
// is covered by the tickers in the live modules, per NSE industry and in total.

export type IndexRow = { symbol: string; industry: string; name: string };
export type IndustryCoverage = { industry: string; covered: number; total: number; missing: string[] };
export type IndexCoverage = { industries: IndustryCoverage[]; covered: number; total: number; percent: number };

/** Placeholder rows NSE pads the list with (a DUMMY* symbol; real members trade in series other than EQ too, e.g. REITs in RR, HFCL in BE) are not companies. */
const isPlaceholder = (r: IndexRow) => r.symbol.startsWith("DUMMY");

/** Per industry (most missing first, then name) and overall. A symbol listed twice counts once. */
export function indexCoverage(rows: readonly IndexRow[], covered: ReadonlySet<string>): IndexCoverage {
  const seen = new Set<string>();
  const by = new Map<string, IndustryCoverage>();
  for (const r of rows) {
    if (isPlaceholder(r) || seen.has(r.symbol)) continue;
    seen.add(r.symbol);
    const e = by.get(r.industry) ?? { industry: r.industry, covered: 0, total: 0, missing: [] };
    e.total++;
    if (covered.has(r.symbol)) e.covered++;
    else e.missing.push(r.symbol);
    by.set(r.industry, e);
  }
  const industries = [...by.values()].sort((a, b) => b.missing.length - a.missing.length || a.industry.localeCompare(b.industry));
  const total = industries.reduce((n, i) => n + i.total, 0);
  const cov = industries.reduce((n, i) => n + i.covered, 0);
  return { industries, covered: cov, total, percent: total ? Math.round((cov / total) * 100) : 0 };
}
