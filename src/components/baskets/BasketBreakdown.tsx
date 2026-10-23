"use client";

import { StockLink } from "@/components/stock/StockLink";
import type { BacktestHolding } from "@/lib/baskets/backtest";
import type { BasketStock } from "@/lib/baskets/industry";
import {
  contributionHeadline,
  contributionRows,
  industryHeadline,
  industryRows,
  returnHeadline,
  returnRows,
  weightHeadline,
  weightRows,
  type BarRow,
} from "@/lib/baskets/breakdown";

// The charts under the basket chart: who made the return, how each stock moved, how the weights
// drifted and, for a mix, which industries carried it. Each opens with a one-line takeaway. They
// follow the table's All / Your picks switch, so they can describe just the stocks picked.
export type BreakdownTab = "contribution" | "returns" | "weights" | "industries";
type Tab = BreakdownTab;

export function BasketBreakdown({
  holdings,
  stockOf,
  rangeLong,
  picks,
  byIndustry,
  tab,
  onTab,
  ahead = false,
}: {
  holdings: BacktestHolding[];
  stockOf: (ticker: string) => BasketStock | undefined;
  rangeLong: string;
  /** Measured within just the stocks picked on the chart, not the whole basket. */
  picks: boolean;
  /** Offer the by-industry chart (not on an industry's own basket, where it says little). */
  byIndustry: boolean;
  /** The open tab, kept by the page so it survives the charts reloading (range or weighting changes). */
  tab: Tab;
  onTab: (t: Tab) => void;
  /** A projection (Projections on): `rangeLong` is the horizon ahead ("1 year") and the words look forward. */
  ahead?: boolean;
}) {
  const over = ahead ? `the next ${rangeLong}` : `the past ${rangeLong}`;
  const nameOf = (t: string) => stockOf(t)?.name ?? t;
  const industryOf = (t: string) => stockOf(t)?.industries[0]?.name ?? null;
  const whose = picks ? "your picks\u2019" : "the basket\u2019s";
  const inds = industryRows(holdings, industryOf);
  const tabs: { id: Tab; label: string }[] = [
    { id: "contribution", label: "Pts added" },
    { id: "returns", label: "Returns" },
    { id: "weights", label: "Weights" },
    ...(byIndustry && inds.length > 1 ? [{ id: "industries" as const, label: "By industry" }] : []),
  ];
  const active = tabs.some((t) => t.id === tab) ? tab : "contribution";

  const view = {
    contribution: {
      headline: contributionHeadline(holdings, nameOf, whose, ahead),
      sub: `What each stock ${ahead ? "adds" : "added"} to ${whose} ${ahead ? "projected " : ""}return over ${over}, in percentage points.`,
      rows: contributionRows(holdings),
      unit: "pts",
      legend: true,
    },
    returns: {
      headline: returnHeadline(holdings, rangeLong, ahead),
      sub: ahead ? `Each stock's own projected price change over ${over}.` : `Each stock's own price change over ${over}.`,
      rows: returnRows(holdings),
      unit: "%",
      legend: false,
    },
    weights: {
      headline: weightHeadline(holdings, nameOf, picks ? "your picks" : "the basket", ahead),
      sub: ahead
        ? `Share of ${picks ? "your picks" : "the basket"} at the end of ${over} if held, against today's target (left-out stocks' share spread over the rest).`
        : `Share of ${picks ? "your picks" : "the basket"} at the end, against its target. Winners grow, losers shrink.`,
      rows: weightRows(holdings),
      unit: "%",
      legend: false,
    },
    industries: {
      headline: industryHeadline(inds, whose, ahead),
      sub: `Contribution by each stock's main industry, in percentage points.`,
      rows: inds,
      unit: "pts",
      legend: true,
    },
  }[active];

  const seg = (on: boolean) => "min-h-8 pointer-coarse:min-h-9 rounded-full px-3 text-[11px] font-semibold transition sm:text-xs " + (on ? "bg-accent text-bg" : "text-ink-soft hover:text-ink");
  return (
    <section aria-label="Breakdown" className="flex flex-col gap-3 p-3 sm:p-4">
      <div role="tablist" aria-label="Breakdown" className="-mx-1 flex gap-0.5 overflow-x-auto px-1">
        {tabs.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={active === t.id} onClick={() => onTab(t.id)} className={seg(active === t.id) + " flex-none"}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="border-l-4 border-accent pl-3">
        {view.headline && <h3 className="text-balance font-display text-lg font-bold leading-snug text-ink sm:text-xl">{view.headline}</h3>}
        <p className="mt-1 text-xs text-ink-soft">{view.sub}</p>
      </div>
      {view.legend && (
        <div className="flex gap-4 text-[11px] text-ink-soft">
          {view.rows.some((r) => r.kind !== "gap" && r.value >= 0) && (
            <span className="flex items-center gap-1.5">
              <span aria-hidden className="h-2.5 w-2.5 rounded-sm bg-pos" />
              {ahead ? "Adds" : "Added"}
            </span>
          )}
          {view.rows.some((r) => r.kind !== "gap" && r.value < 0) && (
            <span className="flex items-center gap-1.5">
              <span aria-hidden className="h-2.5 w-2.5 rounded-sm bg-danger" />
              {ahead ? "Takes away" : "Took away"}
            </span>
          )}
        </div>
      )}
      {active === "weights" ? <WeightBars rows={view.rows} stockOf={stockOf} ahead={ahead} /> : <Bars rows={view.rows} unit={view.unit} stockOf={stockOf} />}
    </section>
  );
}

const fmt = (v: number, unit: string) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(Math.abs(v) >= 1000 ? 0 : 1)}${unit === "%" ? "%" : " pts"}`;

function Label({ row, stockOf }: { row: BarRow; stockOf: (t: string) => BasketStock | undefined }) {
  if (row.kind === "gap") return <span className="text-[11px] italic text-ink-soft">{row.count} more in between</span>;
  if (row.kind === "group")
    return (
      <span className="block min-w-0 text-right">
        <span className="block text-balance break-words text-xs font-semibold leading-snug text-ink sm:text-sm">{row.label}</span>
        <span className="block text-[10px] text-ink-soft">{row.count > 1 ? `${row.count} stocks combined` : "1 stock"}</span>
      </span>
    );
  const s = stockOf(row.ticker);
  return (
    <span className="block min-w-0 text-right">
      {/* Names and layers wrap rather than cut off; the link's tap area reaches 10px above and below. */}
      <StockLink ticker={row.ticker} className="relative block text-balance break-words text-xs font-semibold leading-snug text-ink before:absolute before:inset-x-0 before:-inset-y-2.5 before:content-[''] hover:text-accent hover:underline sm:text-sm">
        {s?.name ?? row.ticker}
      </StockLink>
      {s?.layer && <span className="block text-balance break-words text-[10px] leading-snug text-ink-soft">{s.layer}</span>}
    </span>
  );
}

// Bars either side of a zero line, gains right in green and losses left in red, all on one scale
// so a bar's length is its size. Values sit in their own column on the right, so they never run
// into the names however narrow the screen.
const ROW = "grid grid-cols-[minmax(0,36%)_minmax(0,1fr)_4.25rem] items-center gap-2 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_4.75rem] sm:gap-3";

function Bars({ rows, unit, stockOf }: { rows: BarRow[]; unit: string; stockOf: (t: string) => BasketStock | undefined }) {
  const vals = rows.flatMap((r) => (r.kind === "gap" ? [] : [r.value]));
  const maxPos = Math.max(0, ...vals);
  const maxNeg = Math.max(0, ...vals.map((v) => -v));
  const span = maxPos + maxNeg || 1;
  const zero = (maxNeg / span) * 100;
  return (
    <ul className="flex flex-col gap-1.5">
      {rows.map((r, i) => (
        <li key={r.kind === "stock" ? r.ticker : `${r.kind}-${i}`} className={ROW}>
          <Label row={r} stockOf={stockOf} />
          {r.kind === "gap" ? (
            <span aria-hidden className="col-span-2 border-t border-dashed border-line" />
          ) : (
            <>
              <span className="relative h-7">
                <span aria-hidden className="absolute inset-y-0 w-px bg-ink-soft/50" style={{ left: `${zero}%` }} />
                <span
                  className={"absolute top-1 h-5 " + (r.value >= 0 ? "rounded-r-sm bg-pos" : "rounded-l-sm bg-danger")}
                  style={{
                    left: `${r.value >= 0 ? zero : zero - (-r.value / span) * 100}%`,
                    width: `max(2px, ${(Math.abs(r.value) / span) * 100}%)`,
                  }}
                />
              </span>
              <span className={"whitespace-nowrap text-right font-mono text-[11px] font-semibold " + (r.value >= 0 ? "text-pos" : "text-danger")}>{fmt(r.value, unit)}</span>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}

// Weights now as bars on a faint track, with a dashed marker at the weight each started on (a
// key above says so; at equal weights the markers line up). Scaled to the single stocks, so a
// combined "others" row (which can be large) doesn't flatten them.
function WeightBars({ rows, stockOf, ahead = false }: { rows: BarRow[]; stockOf: (t: string) => BasketStock | undefined; ahead?: boolean }) {
  const stocks = rows.filter((r) => r.kind === "stock");
  const max = Math.max(1, ...(stocks.length ? stocks : rows).flatMap((r) => (r.kind === "gap" ? [] : [r.value, r.start ?? 0])));
  const at = (v: number) => `${Math.min(100, (v / max) * 100)}%`;
  const starts = stocks.flatMap((r) => (r.kind === "stock" && r.start != null ? [r.start] : []));
  const same = starts.length > 1 && Math.max(...starts) - Math.min(...starts) < 0.05;
  return (
    <>
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-soft">
      <span className="flex items-center gap-1.5">
        <span aria-hidden className="h-2.5 w-4 rounded-sm bg-accent/70" />
        {ahead ? "Weight at the end" : "Weight now"}
      </span>
      <span className="flex items-center gap-1.5">
        <span aria-hidden className="h-3.5 border-l-2 border-dashed border-ink-soft" />
        {ahead ? (same ? `Today (${starts[0].toFixed(1)}% each)` : "Today") : same ? `Where each started (${starts[0].toFixed(1)}% each)` : "Where it started"}
      </span>
    </div>
    <ul className="flex flex-col gap-1.5">
      {rows.map((r, i) =>
        r.kind === "gap" ? null : (
          <li key={r.kind === "stock" ? r.ticker : `g-${i}`} className={ROW}>
            <Label row={r} stockOf={stockOf} />
            <span className="relative h-7">
              <span aria-hidden className="absolute inset-x-0 top-1 h-5 rounded-sm bg-line/50" />
              <span className="absolute left-0 top-1 h-5 rounded-r-sm bg-accent/70" style={{ width: at(r.value) }} />
              {r.start != null && <span aria-hidden title={`Started at ${r.start.toFixed(1)}%`} className="absolute -top-1 h-9 border-l-2 border-dashed border-ink-soft" style={{ left: `calc(${at(r.start)} - 1px)` }} />}
            </span>
            <span className="whitespace-nowrap text-right font-mono text-[11px] font-semibold text-ink">
              {r.value.toFixed(1)}%
              {r.start != null && <span className="block font-normal text-[10px] text-ink-soft">from {r.start.toFixed(1)}%</span>}
            </span>
          </li>
        ),
      )}
    </ul>
    </>
  );
}
