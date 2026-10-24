// The basket page's Excel export: everything the page shows, in sheets. Our own figures only (the
// statistics, each stock's weights, returns and contribution, the basket's value line with the
// Nifty 50 rebased beside it, and the projections with every stock's assumptions), never raw vendor
// prices. Pure, so it is unit-tested; the page gathers the inputs and saves the file.
import type { BacktestExcluded, BacktestHolding, PricePoint } from "./backtest";
import type { BasketStock } from "./industry";
import type { Rebalance } from "./rebalance";
import type { RelativeStats, SeriesStats } from "./stats";
import { rebalanceLabel, weightingLabel, type Strategy } from "./strategy";
import { ANNUAL_MAX, ANNUAL_MIN, HORIZONS, MIN_YEARS, SCENARIOS, caseReturn, type ExitBasis } from "./projection";
import { projectBasket, type ProjectionSettings, type Simulation } from "./projection-basket";
import type { Cell, Sheet } from "@/lib/xlsx";

export type WorkbookInput = {
  name: string;
  /** "Industry basket", "Rule-based basket", "Your basket", "New basket (not saved)". */
  kind: string;
  description: string | null;
  url: string;
  exportedAt: Date;
  strategy: Strategy;
  /** The backtest's period ("1Y"). */
  range: string;
  benchName: string;
  stocks: BasketStock[];
  /** Each stock's layer as the page shows it. */
  layerOf: (s: BasketStock) => string;
  /** Each stock's target share (0-1) under the weighting. */
  shares: Map<string, number>;
  /** The stocks with a line on the chart, when some (not all) are. */
  picks: string[] | null;
  backtest: {
    points: PricePoint[];
    holdings: BacktestHolding[];
    excluded?: BacktestExcluded[];
    turnover?: number;
    trades?: number;
    rebalances?: Rebalance[];
  } | null;
  bench: PricePoint[] | null;
  stats: SeriesStats | null;
  rel: RelativeStats | null;
  /** The projection settings on the page (or the defaults while it is off), its simulation and the volatility behind it. */
  projection: { settings: ProjectionSettings; on: boolean; sim: Simulation | null; vol: number | null; dates: string[]; path: number[] } | null;
  disclaimer: string;
};

const r2 = (v: number | null | undefined) => (v == null || !Number.isFinite(v) ? null : Math.round(v * 100) / 100);
const pct = (v: number | null | undefined) => (v == null ? null : r2(v * 100));
const CASE = { bear: "Bear", base: "Base", bull: "Bull" } as const;
const EXIT: Record<ExitBasis, string> = { own: "Own P/E", ind: "Industry P/E" };

function sheet(name: string, rows: Cell[][], bold: number[], widths?: number[], freezeTop = false): Sheet {
  return { name, rows, bold, widths, freezeTop };
}

export function basketWorkbook(x: WorkbookInput): Sheet[] {
  const sheets: Sheet[] = [];
  const byTicker = new Map(x.stocks.map((s) => [s.ticker, s]));
  const hold = new Map((x.backtest?.holdings ?? []).map((h) => [h.ticker, h]));
  const ps = x.projection?.settings;

  // ---- Overview
  {
    const rows: Cell[][] = [
      [x.name],
      [x.kind],
      ...(x.description ? [[x.description]] : []),
      [],
      ["Exported", x.exportedAt.toISOString().slice(0, 16).replace("T", " ") + " UTC"],
      ["Link", x.url],
      ["Stocks", x.stocks.length],
      ["Weighting", weightingLabel(x.strategy)],
      ["Rebalancing (backtest)", rebalanceLabel(x.strategy)],
      ["Backtest period", x.range],
      ["Backtest from", x.backtest?.points[0]?.t.slice(0, 10) ?? null, "to", x.backtest?.points[x.backtest.points.length - 1]?.t.slice(0, 10) ?? null],
      ["Benchmark", x.benchName],
      ...(x.picks ? [["Your picks", x.picks.join(", ")]] : []),
      ...(ps
        ? [
            ["Projection (as on the page)", `${x.projection?.on ? "" : "Projections switched off; defaults: "}next ${ps.h} year${ps.h === 1 ? "" : "s"}, ${CASE[ps.scenario]} case, exit at ${EXIT[ps.exit]}`],
          ]
        : []),
      [],
      ["Sheets"],
      ["Stocks", "Every stock: weights, backtest return and contribution, projection inputs and returns"],
      ["Backtest stats", "The statistics panel, stocks left out of the backtest, rebalances"],
      ["Backtest series", "The basket's value each bar (100 at the start) beside the benchmark"],
      ["Projection", "The basket's projected return in every case, the simulation's risk figures, stocks left out"],
      ["Projection path", "The chosen case's weekly path and likely range"],
      ["Method", "How the backtest and the projections are worked out"],
      [],
      [x.disclaimer],
    ];
    sheets.push(sheet("Overview", rows, [0, rows.findIndex((r) => r[0] === "Sheets")], [28, 90]));
  }

  // ---- Stocks
  {
    const head: Cell[] = [
      "Ticker",
      "Name",
      "Layer",
      "Industry",
      "Target weight %",
      `Backtest ${x.range}: start %`,
      "End %",
      "Return %",
      "Pts added",
      "P/E",
      "Mcap Rs Cr",
      "Projected?",
      "Left out because",
      "Method",
      "Years used",
      "One-off year left out",
      "Growth bear %",
      "Growth base %",
      "Growth bull %",
      "Margin bear %",
      "Margin base %",
      "Margin bull %",
      "Multiple now",
      "Target (own)",
      "Target (industry)",
    ];
    for (const h of HORIZONS) for (const e of ["own", "ind"] as const) for (const s of SCENARIOS) head.push(`${h}Y ${CASE[s]} · ${EXIT[e]} %`);
    head.push("Capped");
    const rows: Cell[][] = [head];
    for (const s of x.stocks) {
      const b = hold.get(s.ticker);
      const p = s.proj;
      const row: Cell[] = [
        s.ticker,
        s.name,
        x.layerOf(s),
        s.industries[0]?.name ?? null,
        pct(x.shares.get(s.ticker) ?? null),
        pct(b?.weight),
        pct(b?.endWeight),
        r2(b?.ret),
        r2(b?.contribution),
        r2(s.pe),
        r2(s.mcapCr),
        p?.ok ? "Yes" : "No",
        p && !p.ok ? p.reason : p ? null : "No figures in our last data update",
      ];
      if (p?.ok) {
        row.push(p.method === "pe" ? "P/E" : "P/S", p.span, p.skipped ?? null, ...p.growth.map(pct), ...(p.margin ? p.margin.map(pct) : [null, null, null]), r2(p.multipleNow), r2(p.targetOwn), r2(p.targetInd));
        for (const h of HORIZONS) for (const e of ["own", "ind"] as const) for (const sc of SCENARIOS) row.push(pct(caseReturn(p, h, sc, e)));
        row.push(p.capped ? "Yes" : null);
      }
      rows.push(row);
    }
    sheets.push(sheet("Stocks", rows, [0], [12, 32, 28, 22, 10, 12, 8, 9, 9, 8, 12, 10, 34, 8, 12, 10], true));
  }

  // ---- Backtest stats
  {
    const s = x.stats;
    const r = x.rel;
    const rows: Cell[][] = [
      ["Statistic", "Value", "Note"],
      ["Return %", r2(s?.ret)],
      ["CAGR %", r2(s?.cagr), s && s.cagr == null ? "not for 1 year or less" : null],
      ["Volatility % (annualised)", r2(s?.vol)],
      ["Max drawdown %", r2(s?.maxDd)],
      ["Drawdown peak", s?.ddPeak?.slice(0, 10) ?? null],
      ["Drawdown trough", s?.ddTrough?.slice(0, 10) ?? null],
      ["Recovered", s?.ddRecovered?.slice(0, 10) ?? (s?.ddPeak ? "not yet" : null)],
      ["Sortino", r2(s?.sortino), "target 0%"],
      [`Beta vs ${x.benchName}`, r2(r?.beta)],
      ["Up capture %", r2(r?.upCapture)],
      ["Down capture %", r2(r?.downCapture)],
      ["Best month", s?.bestMonth?.month ?? null, r2(s?.bestMonth?.ret)],
      ["Worst month", s?.worstMonth?.month ?? null, r2(s?.worstMonth?.ret)],
      [`${x.benchName} return %`, r2(r?.benchRet), "same dates"],
      ["Months up", s ? `${s.upMonths} of ${s.months}` : null],
      ...(x.strategy.rebalance === "never" ? [] : [["Rebalances", x.backtest?.rebalances?.length ?? 0], ["Trades", x.backtest?.trades ?? null], ["Turnover % (one way)", r2(x.backtest?.turnover)]]),
    ];
    const bold = [0];
    if (x.backtest?.excluded?.length) {
      rows.push([]);
      bold.push(rows.length);
      rows.push(["Not in the backtest", "Name", "Reason"]);
      for (const e of x.backtest.excluded) {
        const why = e.reason === "late" ? `listed during the period${e.from ? ` (from ${e.from.slice(0, 10)})` : ""}` : e.reason === "zero" ? "set to 0%" : "no price data";
        rows.push([e.ticker, byTicker.get(e.ticker)?.name ?? null, why]);
      }
    }
    if (x.backtest?.rebalances?.length) {
      rows.push([]);
      bold.push(rows.length);
      rows.push(["Rebalance date", "Turnover % (one way)", "Trades"]);
      for (const rb of x.backtest.rebalances) rows.push([rb.t.slice(0, 10), r2(rb.turnover), rb.trades]);
    }
    sheets.push(sheet("Backtest stats", rows, bold, [28, 14, 30]));
  }

  // ---- Backtest series: the value line, 100 at the start, the benchmark read at the same dates.
  {
    const rows: Cell[][] = [["Date", "Basket (100 = start)", `${x.benchName} (100 = start)`]];
    let j = -1;
    let base: number | null = null;
    for (const p of x.backtest?.points ?? []) {
      let b: number | null = null;
      if (x.bench) {
        while (j + 1 < x.bench.length && x.bench[j + 1].t <= p.t) j++;
        if (j >= 0) {
          base ??= x.bench[j].c;
          b = (x.bench[j].c / base) * 100;
        }
      }
      rows.push([p.t.slice(0, 10), r2(p.c), r2(b)]);
    }
    sheets.push(sheet("Backtest series", rows, [0], [12, 20, 22], true));
  }

  // ---- Projection: every case for the basket (and the picks), the chosen case's risk figures.
  {
    const items = x.stocks.map((s) => ({ ticker: s.ticker, weight: x.shares.get(s.ticker) ?? 0, proj: s.proj }));
    const pickSet = x.picks ? new Set(x.picks) : null;
    const rows: Cell[][] = [];
    const bold: number[] = [];
    const table = (title: string, list: typeof items) => {
      bold.push(rows.length);
      rows.push([title, "Bear %", "Base %", "Bull %", "Per year (base) %"]);
      for (const h of HORIZONS)
        for (const e of ["own", "ind"] as const) {
          const out = SCENARIOS.map((sc) => projectBasket(list, { h, scenario: sc, exit: e }).ret);
          const base = out[1];
          rows.push([`Next ${h} year${h === 1 ? "" : "s"} · exit at ${EXIT[e]}`, pct(out[0]), pct(out[1]), pct(out[2]), base == null ? null : pct(Math.pow(1 + base, 1 / h) - 1)]);
        }
      rows.push([]);
    };
    table("This basket", items);
    if (pickSet) {
      const tot = items.filter((i) => pickSet.has(i.ticker)).reduce((a, i) => a + i.weight, 0);
      table(`Your ${pickSet.size} picks`, items.filter((i) => pickSet.has(i.ticker)).map((i) => ({ ...i, weight: tot > 0 ? i.weight / tot : 0 })));
    }
    if (ps) {
      const b = projectBasket(items, ps);
      bold.push(rows.length);
      rows.push([`Chosen case: next ${ps.h} year${ps.h === 1 ? "" : "s"}, ${CASE[ps.scenario]}, exit at ${EXIT[ps.exit]}`, "Value", "Note"]);
      const sim = x.projection?.sim ?? null;
      const last = sim ? sim.lo.length - 1 : 0;
      rows.push(
        ["Projected return %", pct(b.ret)],
        ["Per year %", pct(b.cagr)],
        ["Likely range low %", sim ? r2(sim.lo[last]) : null, "10th percentile of 1,000 simulated paths at the end"],
        ["Likely range high %", sim ? r2(sim.hi[last]) : null, "90th percentile"],
        ["Chance of loss %", sim ? r2(sim.pLoss * 100) : null, "share of paths ending below today"],
        ["Chance of a 10% fall %", sim ? r2(sim.pFall10 * 100) : null, "share of paths falling 10% from a high at some point"],
        ["Max drawdown % (typical)", sim ? r2(sim.maxDdTypical) : null, "median of the paths' worst falls"],
        ["Max drawdown % (1 in 10)", sim ? r2(sim.maxDdBad) : null],
        ["Volatility % (past year)", pct(x.projection?.vol), "sets how widely the paths spread"],
        ["Return / risk", b.cagr != null && x.projection?.vol ? r2(b.cagr / x.projection.vol) : null, "per-year return ÷ volatility"],
        ["Stocks projected", `${b.holdings.length} of ${b.holdings.length + b.leftOut.length}`],
        ["Share spread from left-out stocks %", pct(b.spread)],
      );
      if (!sim) rows.push(["", "", "No past year of prices to simulate from: risk figures left blank"]);
      rows.push([]);
      bold.push(rows.length);
      rows.push(["Left out", "Name", "Reason", "Share before spreading %"]);
      for (const l of b.leftOut) rows.push([l.ticker, byTicker.get(l.ticker)?.name ?? null, l.reason, pct(l.share)]);
      if (!b.leftOut.length) rows.push(["None"]);
      rows.push([]);
      bold.push(rows.length);
      rows.push(["Stock", "Name", "Weight after spreading %", "Return %", "Pts added", "End weight %"]);
      for (const h of [...b.holdings].sort((p, q) => q.contribution - p.contribution)) rows.push([h.ticker, byTicker.get(h.ticker)?.name ?? null, pct(h.weight), r2(h.ret), r2(h.contribution), pct(h.endWeight)]);
    }
    sheets.push(sheet("Projection", rows, bold, [44, 30, 30, 22, 18, 14]));
  }

  // ---- Projection path
  if (x.projection && x.projection.dates.length) {
    const { dates, path, sim } = x.projection;
    const rows: Cell[][] = [["Week of", "Basket, chosen case %", "Likely range low %", "Likely range high %", "Drawdown, typical path %", "Drawdown, 1 in 10 %"]];
    dates.forEach((t, k) => rows.push([t, r2(path[k]), sim ? r2(sim.lo[k]) : null, sim ? r2(sim.hi[k]) : null, sim ? r2(sim.ddTypical[k]) : null, sim ? r2(sim.ddBad[k]) : null]));
    sheets.push(sheet("Projection path", rows, [0], [12, 20, 18, 18, 22, 18], true));
  }

  // ---- Method
  {
    const lines: Cell[][] = [
      ["Backtest"],
      [`Bought on the first day of the period at the weighting's target weights and ${x.strategy.rebalance === "never" ? "held without rebalancing" : rebalanceLabel(x.strategy)}. Price change only: no dividends, costs or taxes. Stocks listed during the period are left out of it.`],
      [],
      ["Projection"],
      [`Only stocks with at least ${MIN_YEARS} consecutive fiscal years of revenue and net profit, ${MIN_YEARS} years of trading, and a price and market cap are projected; a left-out stock's share is spread over the rest in proportion.`],
      ["Growth: the median year of revenue growth (lower if its overall rate is lower or its latest year slowed), faded 40% of the way toward 10% a year; Bear and Bull the same distance either side (a quarter of the range of its years, at least 3 points); kept within −25% and +40% a year."],
      ["Margin: moves from today's a third of the way a year toward its aim (Base: halfway to the median; Bear: lowest year; Bull: highest), by at most 15% of today's a year. A one-off year is left out."],
      ["Valuation: today's P/E moves a third of the way a year toward its target (own: median of today, 1 and 3 years ago; industry: its home industry's median), held within 0.7× and 1.4× today's; Bear −10%, Bull +10%. Loss-makers use price to sales (±20%)."],
      [`Return = (exit multiple ÷ today's) × (1 + growth)^years × margin factor − 1, kept within ${Math.round(ANNUAL_MIN * 100)}% and +${Math.round(ANNUAL_MAX * 100)}% a year.`],
      ["Basket: bought today at the target weights and held; return = Σ weight × return; points added = weight × return."],
      ["Risk figures: 1,000 simulated weekly paths whose middle ends at the chosen case's return and which swing like the basket's past year; the likely range is the 10th to 90th percentile."],
      [`Full method with a worked example: ${x.url.replace(/\/baskets\/.*$/, "")}/baskets/projections`],
      [],
      [x.disclaimer],
    ];
    sheets.push(sheet("Method", lines, [0, 3], [140]));
  }
  return sheets;
}

/** "ev-4w-basket-1Y.xlsx" from the basket's name and period. */
export function workbookFileName(name: string, range: string, extra?: string) {
  const slugOf = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${slugOf(name) || "basket"}-${range}${extra ? `-${slugOf(extra)}` : ""}.xlsx`;
}
