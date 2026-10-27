"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import type { ChartRange } from "@/lib/live/yahoo";
import type { BacktestHolding } from "@/lib/baskets/backtest";
import { industrySeriesKey, loadSeries } from "@/components/baskets/series";
import { HeatGrid, HeatLegend, heatScale, type HeatCell } from "./Heatmap";
import { actionClass } from "./action-class";

// An industry page's heatmap: every listed stock on its map, grouped by the layer it plays in,
// coloured by its own price change over the period picked. It reads the industry basket's own
// backtest (the same request and cache the basket page uses), so a tile here and the stock's line
// there agree. The stocks are fixed to the industry; "Open as a basket" goes on from here.

export type HeatStock = { ticker: string; name: string; layer: string; mcapCr: number | null };

const RANGES: { id: ChartRange; label: string; long: string }[] = [
  { id: "1M", label: "1M", long: "month" },
  { id: "6M", label: "6M", long: "6 months" },
  { id: "1Y", label: "1Y", long: "year" },
  { id: "3Y", label: "3Y", long: "3 years" },
];

/**
 * The page's first row of buttons, with the Heatmap button among them and its panel opening
 * full width under the row. Phones get a compact three-across grid with short labels; from
 * desktop width the row sits on one line.
 */
export function IndustryActions({ children, slug, name, stocks, basketHref }: { children: ReactNode; slug: string; name: string; stocks: HeatStock[]; basketHref: string | null }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-line bg-panel-2 p-3 sm:p-4 lg:p-5">
      <div className="grid grid-cols-3 gap-1.5 sm:flex sm:flex-wrap sm:gap-2 lg:flex-nowrap">
        {children}
        {stocks.length > 0 && (
          <button type="button" aria-expanded={open} aria-controls="industry-heatmap" onClick={() => setOpen((o) => !o)} className={actionClass(false, open)}>
            <span className="sm:hidden">Heatmap</span>
            <span className="hidden sm:inline">{open ? "Hide heatmap" : "Stock heatmap"}</span>
          </button>
        )}
      </div>
      {open && (
        <div id="industry-heatmap">
          <IndustryHeatmap slug={slug} name={name} stocks={stocks} basketHref={basketHref} />
        </div>
      )}
    </section>
  );
}

function IndustryHeatmap({ slug, name, stocks, basketHref }: { slug: string; name: string; stocks: HeatStock[]; basketHref: string | null }) {
  const [range, setRange] = useState<ChartRange>("1Y");
  const [got, setGot] = useState<{ range: ChartRange; holdings: BacktestHolding[] } | "error" | null>(null);
  useEffect(() => {
    let live = true;
    loadSeries(industrySeriesKey(slug), range).then((l) => {
      if (live) setGot(l.status === "ok" ? { range, holdings: l.data.holdings ?? [] } : "error");
    });
    return () => {
      live = false;
    };
  }, [slug, range]);

  const loading = got == null || (got !== "error" && got.range !== range);
  const ret = new Map(got && got !== "error" && !loading ? got.holdings.map((h) => [h.ticker, h.ret]) : []);
  const long = RANGES.find((r) => r.id === range)!.long;
  // Biggest companies take bigger tiles: against the industry's median market cap.
  const caps = stocks.flatMap((s) => (s.mcapCr ? [s.mcapCr] : [])).sort((a, b) => a - b);
  const median = caps.length ? caps[Math.floor(caps.length / 2)] : 0;
  const sizeOf = (c: number | null): HeatCell["size"] => (!c || !median ? 1 : c >= median * 6 ? 3 : c >= median * 2 ? 2 : 1);

  const groups: { layer: string; cells: HeatCell[] }[] = [];
  for (const s of stocks) {
    let g = groups.find((x) => x.layer === s.layer);
    if (!g) groups.push((g = { layer: s.layer, cells: [] }));
    const v = ret.get(s.ticker) ?? null;
    g.cells.push({
      key: s.ticker,
      label: s.name,
      value: v,
      pending: loading,
      size: sizeOf(s.mcapCr),
      ticker: s.ticker,
      title: v != null ? `${s.name}: ${v >= 0 ? "+" : ""}${v.toFixed(1)}% over the past ${long}` : loading ? s.name : `${s.name}: not listed for the whole ${long}`,
    });
  }
  const all = groups.flatMap((g) => g.cells);
  const scale = heatScale(all.map((c) => c.value));
  const up = all.filter((c) => c.value != null && c.value > 0).length;
  const known = all.filter((c) => c.value != null).length;

  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-line bg-panel p-2.5 sm:gap-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="min-w-0 text-xs text-ink-soft sm:text-sm">
          {got === "error" ? (
            "The prices couldn’t load right now. Try again in a moment."
          ) : loading ? (
            `Loading ${name}’s listed stocks…`
          ) : (
            <>
              <b className="font-semibold text-ink">
                {up} of {known}
              </b>{" "}
              listed stocks are up over the past {long}, by layer of the supply chain.
              {all.length > known && ` ${all.length - known} not listed for the whole ${long} (shown —).`}
            </>
          )}
        </p>
        <div role="group" aria-label="Period" className="flex flex-none gap-0.5 rounded-full border border-line p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              aria-pressed={range === r.id}
              onClick={() => setRange(r.id)}
              className={"min-h-7 rounded-full px-2.5 text-[11px] font-semibold transition pointer-coarse:min-h-8 sm:text-xs " + (range === r.id ? "bg-accent text-bg" : "text-ink-soft hover:text-ink")}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:gap-2.5">
        {groups.map((g) => (
          <div key={g.layer} className="flex flex-col gap-1">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-ink-soft sm:text-[11px]">
              {g.layer} <span className="font-normal normal-case tracking-normal">· {g.cells.length}</span>
            </h3>
            <HeatGrid cells={g.cells} scale={scale} label={`${g.layer} stocks`} />
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <HeatLegend scale={scale} note="Bigger tile = bigger company · tap one for the stock" />
        {basketHref && (
          <Link href={basketHref} className="text-xs font-semibold text-accent hover:underline">
            Open as a basket &rarr;
          </Link>
        )}
      </div>
    </div>
  );
}
