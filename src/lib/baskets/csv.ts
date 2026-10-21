// The basket's CSV export: our own figures only (the stats, each holding's weights, return and
// contribution, and the basket's value line with the benchmark rebased beside it), never the
// raw vendor prices. Sections are separated by a blank line so a spreadsheet reads them as blocks.
// Pure (no DOM), so it is unit-tested on its own.
import type { BacktestExcluded, BacktestHolding, PricePoint } from "./backtest";
import type { RelativeStats, SeriesStats } from "./stats";

export type CsvStock = { ticker: string; name: string; layer: string; pe: number | null; mcapCr: number | null };

const cell = (v: string | number | null | undefined) => {
  if (v == null) return "";
  const s = typeof v === "number" ? (Number.isFinite(v) ? String(Number(v.toFixed(4))) : "") : v;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const row = (...cells: (string | number | null | undefined)[]) => cells.map(cell).join(",");

export function basketCsv(input: {
  name: string;
  range: string;
  weighting: "equal" | "mcap";
  benchName: string;
  points: PricePoint[];
  bench: PricePoint[] | null;
  stats: SeriesStats | null;
  rel: RelativeStats | null;
  holdings: BacktestHolding[];
  /** Stocks in the basket but not in the backtest (no price data, or listed during the period). */
  excluded?: BacktestExcluded[];
  stocks: CsvStock[];
  exportedAt: Date;
}): string {
  const { stats: s, rel: r } = input;
  const lines: string[] = [
    row("Basket", input.name),
    row("Range", input.range),
    row("Weighting", input.weighting === "mcap" ? "Market cap" : "Equal"),
    row("From", input.points[0]?.t.slice(0, 10), "To", input.points[input.points.length - 1]?.t.slice(0, 10)),
    row("Exported", input.exportedAt.toISOString().slice(0, 10)),
    row("Note", "Bought on day one and held, no rebalancing. Price change only: no dividends, costs or taxes. Research tool, not investment advice."),
    "",
    row("Statistic", "Value"),
    row("Return %", s?.ret),
    row("CAGR %", s?.cagr),
    row("Volatility % (annualised)", s?.vol),
    row("Max drawdown %", s?.maxDd),
    row("Drawdown peak", s?.ddPeak?.slice(0, 10)),
    row("Drawdown trough", s?.ddTrough?.slice(0, 10)),
    row("Recovered", s?.ddRecovered?.slice(0, 10) ?? (s?.ddPeak ? "not yet" : "")),
    row("Sortino", s?.sortino),
    row("Best month", s?.bestMonth?.month),
    row("Best month %", s?.bestMonth?.ret),
    row("Worst month", s?.worstMonth?.month),
    row("Worst month %", s?.worstMonth?.ret),
    row("Months up", s ? `${s.upMonths} of ${s.months}` : null),
    row(`${input.benchName} return %`, r?.benchRet),
    row(`Beta vs ${input.benchName}`, r?.beta),
    row("Up capture %", r?.upCapture),
    row("Down capture %", r?.downCapture),
    "",
    row("Ticker", "Name", "Layer", "Start weight %", "Weight now %", "Return %", "Contribution pts", "P/E", "Mcap Rs Cr"),
  ];
  const byTicker = new Map(input.stocks.map((x) => [x.ticker, x]));
  for (const h of [...input.holdings].sort((a, b) => b.contribution - a.contribution)) {
    const st = byTicker.get(h.ticker);
    lines.push(row(h.ticker, st?.name, st?.layer, h.weight * 100, h.endWeight * 100, h.ret, h.contribution, st?.pe, st?.mcapCr));
  }

  if (input.excluded?.length) {
    lines.push("", row("Not in the backtest", "Name", "Reason"));
    for (const e of input.excluded) {
      const why = e.reason === "late" ? `listed during the period${e.from ? ` (from ${e.from.slice(0, 10)})` : ""}` : "no price data";
      lines.push(row(e.ticker, byTicker.get(e.ticker)?.name, why));
    }
  }

  // The value line, 100 on day one, with the benchmark read at the same dates and rebased to 100.
  lines.push("", input.bench ? row("Date", "Basket (100 = start)", `${input.benchName} (100 = start)`) : row("Date", "Basket (100 = start)"));
  let j = -1;
  let base: number | null = null;
  for (const p of input.points) {
    let b: number | null = null;
    if (input.bench) {
      while (j + 1 < input.bench.length && input.bench[j + 1].t <= p.t) j++;
      if (j >= 0) {
        base ??= input.bench[j].c;
        b = (input.bench[j].c / base) * 100;
      }
    }
    lines.push(input.bench ? row(p.t.slice(0, 10), p.c, b) : row(p.t.slice(0, 10), p.c));
  }
  return lines.join("\r\n") + "\r\n";
}

/** A file name from the basket's name: "EV 4W basket" -> "ev-4w-basket-1Y.csv". */
export function csvFileName(name: string, range: string) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "basket";
  return `${slug}-${range}.csv`;
}
