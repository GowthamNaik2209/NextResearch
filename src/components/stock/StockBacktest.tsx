"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChartRange } from "@/lib/live/yahoo";
import type { BasketStock } from "@/lib/baskets/industry";
import { HORIZONS, SCENARIOS, type Scenario } from "@/lib/baskets/projection";
import type { ProjectionSettings } from "@/lib/baskets/projection-basket";
import { heldStrategy } from "@/lib/baskets/strategy";
import { BENCHMARKS } from "@/lib/sector-content/benchmarks";
import { InfoTip } from "@/components/InfoTip";
import { BasketChart, type ChartProjection, type ChartSelection } from "@/components/baskets/BasketChart";
import { BasketStats } from "@/components/baskets/BasketStats";
import { BasketAnalysis } from "@/components/baskets/BasketAnalysis";
import { ReturnCards } from "@/components/baskets/ReturnCards";
import { ProjectionCards } from "@/components/baskets/ProjectionCards";
import { ProjectionStats } from "@/components/baskets/ProjectionStats";
import { ProjectionAnalysis } from "@/components/baskets/ProjectionAnalysis";
import { MINI_SEG, Panel } from "@/components/baskets/Panel";
import { useProjection } from "@/components/baskets/use-projection";
import { HORIZON_LONG, PROJECTION_DISCLAIMER, SCENARIO_LABEL } from "@/components/baskets/projection-view";

// The stock pop-up's full-screen Backtest view: one stock run through the basket pages' own
// backtest and projection panels (single mode), against the Nifty 50 only. The stock is bought on
// the first day and held, so the basket-only parts (weighting, rebalancing, picks, contributors)
// don't apply. Its line is the same price series the pop-up's Chart tab draws ("s:TICKER").

const RANGES: { id: ChartRange; long: string }[] = [
  { id: "1M", long: "1 month" },
  { id: "6M", long: "6 months" },
  { id: "1Y", long: "1 year" },
  { id: "2Y", long: "2 years" },
  { id: "3Y", long: "3 years" },
  { id: "5Y", long: "5 years" },
];
const NIFTY = { key: "b:nifty50", label: "Nifty 50" };
const MARKET = [BENCHMARKS.nifty50];
const NO_STOCKS: BasketStock[] = [];
const DEFAULT_PROJECTION: ProjectionSettings = { h: 1, scenario: "base" };
const noop = () => {};
const notProjectedReason = (s: BasketStock | undefined) => (s?.proj && !s.proj.ok ? s.proj.reason.replace(/^./, (c) => c.toLowerCase()) : "no figures in our last data update");
const HELD = heldStrategy();

const segBtn = (on: boolean) =>
  "min-h-9 border-r border-line px-2.5 font-mono text-[11px] font-semibold last:border-r-0 sm:min-h-7 pointer-coarse:min-h-9 pointer-coarse:min-w-9 " + (on ? "bg-ink text-bg" : "text-ink-soft hover:text-ink");
const modeBtn = (on: boolean) =>
  "min-h-9 border-r border-line px-3 text-xs font-semibold last:border-r-0 sm:min-h-8 pointer-coarse:min-h-10 " + (on ? "bg-ink text-bg" : "text-ink-soft hover:text-ink");
const ctlLabel = "text-[10px] font-semibold uppercase tracking-wider text-ink-soft";

type Rec = { stock: BasketStock; statsLoading: boolean };
// One request per stock per visit; a failed one is asked again next time.
const recs = new Map<string, Promise<Rec | null>>();
function fetchRec(ticker: string, fresh = false): Promise<Rec | null> {
  let p = fresh ? undefined : recs.get(ticker);
  if (!p) {
    p = fetch(`/api/stock/${encodeURIComponent(ticker)}/projection`)
      .then((r) => (r.ok ? (r.json() as Promise<Rec>) : null))
      .catch(() => null)
      .then((r) => {
        if (!r || r.statsLoading) recs.delete(ticker);
        return r;
      });
    recs.set(ticker, p);
  }
  return p;
}
// While the server is still loading price statistics, ask again: quick at first, then further apart.
const WAITS_MS = [5_000, 10_000, 20_000, 40_000];

/**
 * The stock's projection record, once Projection is first opened. A failed load holds only for the
 * `attempt` it was made in: opening Projection again (a new attempt) asks again.
 */
function useStockRecord(ticker: string, on: boolean, attempt: number) {
  const [rec, setRec] = useState<{ ticker: string; rec: Rec | null; attempt: number } | null>(null);
  const mine = rec?.ticker === ticker && (rec.rec || rec.attempt === attempt) ? rec : null;
  const loaded = !!mine;
  const waiting = !!mine?.rec?.statsLoading;
  useEffect(() => {
    if (!on || loaded) return;
    let live = true;
    void fetchRec(ticker).then((r) => live && setRec({ ticker, rec: r, attempt }));
    return () => {
      live = false;
    };
  }, [ticker, on, loaded, attempt]);
  useEffect(() => {
    if (!waiting) return;
    let live = true;
    let step = 0;
    let timer: number | undefined;
    const next = () => {
      if (step >= WAITS_MS.length) return;
      timer = window.setTimeout(() => {
        step += 1;
        void fetchRec(ticker, true).then((r) => {
          if (!live || !r) return;
          setRec((x) => ({ ticker, rec: r, attempt: x?.attempt ?? 0 }));
          if (r.statsLoading) next();
        });
      }, WAITS_MS[step]);
    };
    next();
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [ticker, waiting]);
  return { rec: mine?.rec ?? null, loaded, failed: loaded && !mine?.rec };
}

export function StockBacktest({ ticker, name }: { ticker: string; name: string }) {
  const [mode, setMode] = useState<"backtest" | "projection">("backtest");
  // Bumped each time Projection is opened, so a failed load is tried again.
  const [attempt, setAttempt] = useState(0);
  const openProjection = () => {
    if (mode === "projection") return;
    setMode("projection");
    setAttempt((a) => a + 1);
  };
  const [range, setRange] = useState<ChartRange>("1Y");
  const [projSet, setProjSet] = useState<ProjectionSettings>(DEFAULT_PROJECTION);
  const [selection, setSelection] = useState<ChartSelection>({ benches: ["nifty50"], compare: [], picks: {} });
  const projOn = mode === "projection";
  const key = `s:${ticker}`;
  const rangeLong = RANGES.find((r) => r.id === range)!.long;

  const { rec, failed } = useStockRecord(ticker, projOn, attempt);
  const stocks = useMemo(() => (rec ? [rec.stock] : NO_STOCKS), [rec]);
  const projection = useProjection({
    on: projOn && stocks.length > 0,
    settings: projSet,
    stocks,
    weighting: "equal",
    weights: undefined,
    picked: NO_STOCKS,
    picksChosen: false,
    scopePicks: false,
    volKey: key,
    reload: 0,
  });
  const chartProjection = useMemo((): ChartProjection | null => {
    if (!projection) return null;
    return {
      label: projection.period,
      settings: projection.settings,
      compareWeighting: "equal",
      dates: projection.dates,
      values: projection.basket.ret != null ? { [key]: projection.path } : {},
      why: {},
      band: projection.sim ? { lo: projection.sim.lo, hi: projection.sim.hi } : null,
    };
  }, [projection, key]);

  const projSeg = <K extends keyof ProjectionSettings>(label: string, field: K, choices: readonly ProjectionSettings[K][], text: (v: ProjectionSettings[K]) => string, help: (v: ProjectionSettings[K]) => string) => (
    <div className="flex items-center gap-1.5">
      <span className={ctlLabel}>{label}</span>
      <div className={MINI_SEG} role="group" aria-label={label}>
        {choices.map((c) => (
          <button key={String(c)} type="button" aria-pressed={projSet[field] === c} onClick={() => setProjSet((s) => ({ ...s, [field]: c }))} title={help(c)} className={segBtn(projSet[field] === c)}>
            {text(c)}
          </button>
        ))}
      </div>
    </div>
  );
  const caseHelp = (c: Scenario) =>
    c === "bear"
      ? "The stock's 10th-percentile outcome at its own volatility: 1 year in 10 for a stock this volatile ends lower"
      : c === "bull"
        ? "The stock's 90th-percentile outcome at its own volatility: 1 year in 10 for a stock this volatile ends higher"
        : "The return the market prices in for the stock's risk, plus a small tilt from its fundamentals";

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="inline-flex flex-none overflow-hidden rounded border border-line bg-bg" role="group" aria-label="View">
          <button type="button" aria-pressed={!projOn} onClick={() => setMode("backtest")} className={modeBtn(!projOn)}>
            Backtest
          </button>
          <button type="button" aria-pressed={projOn} onClick={openProjection} className={modeBtn(projOn)}>
            Projection
          </button>
        </div>
        {projOn ? (
          <>
            {projSeg("Next", "h", HORIZONS, (h) => `${h}Y`, (h) => `Project ${HORIZON_LONG[h]} ahead`)}
            <div className="flex items-center gap-1.5">
              {projSeg("Case", "scenario", SCENARIOS, (c) => SCENARIO_LABEL[c], caseHelp)}
              <InfoTip label="How the projection works">
                Base is the return the market prices in for the stock&rsquo;s risk (G-sec yield plus beta times India&rsquo;s equity risk premium, less its dividend
                yield), plus a small tilt from its fundamentals. Bear and Bull are its 10th and 90th percentiles at its own volatility. Bought today and held.
              </InfoTip>
            </div>
          </>
        ) : (
          <>
            <div className={MINI_SEG} role="group" aria-label="Time range">
              {RANGES.map((r) => (
                <button key={r.id} type="button" onClick={() => setRange(r.id)} aria-pressed={range === r.id} className={segBtn(range === r.id)}>
                  {r.id}
                </button>
              ))}
            </div>
            <span className="text-xs text-ink-soft">
              against the <b className="font-semibold text-ink">Nifty 50</b>
            </span>
          </>
        )}
      </div>

      {projOn && rec?.statsLoading && (
        <p className="rounded-md border border-line bg-panel px-3 py-1.5 text-[11px] text-ink-soft">Price statistics are still loading, so beta and volatility are estimates for now. The figures update by themselves.</p>
      )}
      {projOn && failed && (
        <p className="rounded-md border border-line bg-panel px-3 py-1.5 text-[11px] text-ink-soft">
          The projection couldn&rsquo;t load right now.{" "}
          <button type="button" onClick={() => setAttempt((a) => a + 1)} className="font-semibold text-accent underline pointer-coarse:min-h-9">
            Try again
          </button>
        </p>
      )}

      {projOn ? (
        <ProjectionCards view={projection} empty={failed} dense single={{ label: ticker }} />
      ) : (
        <ReturnCards range={range} basket={{ key, label: `${ticker} · past ${rangeLong}` }} picks={null} benches={[{ ...NIFTY, note: "same days" }]} dense subject={ticker} />
      )}

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Panel
          title={projOn ? `${ticker} · projected, ${projection?.period ?? `next ${HORIZON_LONG[projSet.h]}`}` : `${ticker} vs Nifty 50 · past ${rangeLong}`}
          className="min-w-0"
          bodyClassName="p-3"
        >
          {/* Projection with nothing to draw (loading, failed, or the stock isn't projected): a short
              box saying so, not an empty chart with its axis, zoom and notes. */}
          {projOn && (!projection || projection.basket.ret == null) ? (
            <div aria-busy={!projection && !failed ? true : undefined} className={"flex min-h-24 items-center justify-center px-4 py-6 text-center text-xs text-ink-soft " + (!projection && !failed ? "animate-pulse" : "")}>
              {!projection
                ? failed
                  ? "The projection couldn’t load right now."
                  : "Loading the projection…"
                : `Not projected: ${notProjectedReason(stocks[0])}. A projection needs 3 years of results and of trading.`}
            </div>
          ) : (
          <BasketChart
            range={range}
            rangeLong={projOn ? HORIZON_LONG[projSet.h] : rangeLong}
            basketKey={key}
            basketName={name}
            strategy="w=equal"
            industries={[]}
            indices={[]}
            market={MARKET}
            stocks={NO_STOCKS}
            selection={selection}
            onSelection={setSelection}
            onToggleStock={noop}
            onPickAll={noop}
            onPickNone={noop}
            projection={projOn ? chartProjection : null}
            single
          />
          )}
        </Panel>
        {projOn ? (
          <ProjectionStats view={projection} compact heading="h3" empty={failed} single />
        ) : (
          <BasketStats range={range} basketKey={key} strategy={HELD} compact heading="h3" single />
        )}
      </div>

      {projOn ? <ProjectionAnalysis view={projection} heading="h3" empty={failed} single /> : <BasketAnalysis range={range} basketKey={key} heading="h3" single={ticker} />}

      <p className="text-[11px] leading-relaxed text-ink-soft">
        {projOn
          ? `Bought today and held, price only (dividends not added). ${PROJECTION_DISCLAIMER}`
          : "Bought on the first day and held. Price change only: dividends are not added back. Past returns don't promise future ones."}
      </p>
    </div>
  );
}
