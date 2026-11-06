"use client";

import { Suspense, use, useId, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { HeatGrid, HeatLegend, heatScale, shortName, type HeatCell } from "@/components/charts/Heatmap";
import { InfoTip } from "@/components/InfoTip";
import { LANDING_UP_PANEL_ENABLED } from "@/lib/feature-flags";
import { StockLink } from "@/components/stock/StockLink";
import { subscribeWatchlist, watchlistSignedIn, watchlistSnapshot } from "@/components/sector-explorer/WatchlistButton";
import { PERIODS, PERIOD_WORDS, type Period } from "@/lib/baskets/periods";
import { MOVERS_SHOWN, type Mover, type PeriodMovers } from "@/lib/baskets/movers";
import { signedPct } from "@/lib/format";
import { pulseHeading, pulseItems } from "@/lib/landing/pulse";
import type { MarketFigures, MarketStocks, MarketTile } from "@/lib/landing/market-data";

// The landing page's market block, under the hero: the pulse line, your watchlist (signed in only),
// the industry & policy heatmap, the top movers and the % of stocks up in each industry, all on one
// period control. The tiles render at once; the figures stream in (the server passes promises) and
// whatever isn't ready reads "updating", never a stale or made-up number.

type Filter = "all" | "sector" | "policy";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "sector", label: "Industries" },
  { id: "policy", label: "Policies" },
];
// Under this share of tiles with a figure, a period reads as updating rather than a half-empty map.
const MIN_TILE_COVERAGE = 0.5;

const toneText = (v: number | null | undefined) => {
  const s = signedPct(v);
  return s.startsWith("+") ? "text-pos" : s.startsWith("−") ? "text-danger" : "text-ink-soft";
};

export function MarketPulse({ tiles, figures, stocks }: { tiles: MarketTile[]; figures: Promise<MarketFigures>; stocks: Promise<MarketStocks | null> }) {
  const [period, setPeriod] = useState<Period>("1D");
  const [filter, setFilter] = useState<Filter>("all");
  const shown = filter === "all" ? tiles : tiles.filter((t) => t.category === filter);
  return (
    <section aria-labelledby="market-h" className="mx-auto flex max-w-page flex-col gap-4 px-4 pt-6 pb-4 sm:px-5 sm:pt-8">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 id="market-h" className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              The market by industry
            </h2>
            <InfoTip label="About these figures">
              Every covered industry and policy as an equal-weight basket of its listed stocks, with the biggest movers among covered companies. Closing prices, updated each trading
              evening. Past returns, not a recommendation.
            </InfoTip>
          </div>
          <p className="mt-1 text-sm text-ink-soft">Pick a period; tap an industry to explore it, or a stock for its chart.</p>
        </div>
        {/* Phones: the period is a dropdown, so it and the filter fit on one row. */}
        <div className="flex flex-nowrap items-center gap-2 sm:flex-wrap">
          <PeriodSelect value={period} onChange={setPeriod} className="sm:hidden" />
          <Segment label="Period" options={PERIODS.map((p) => ({ id: p, label: p }))} value={period} onChange={setPeriod} mono className="max-sm:hidden" />
          <Segment label="Show" options={FILTERS} value={filter} onChange={setFilter} />
        </div>
      </div>

      <Suspense fallback={<PulseLine figures={null} period={period} />}>
        <PulseFrom figures={figures} period={period} />
      </Suspense>

      <WatchlistStrip stocks={stocks} period={period} />

      <Suspense fallback={<MarketHeat tiles={shown} figures={null} period={period} />}>
        <HeatFrom tiles={shown} figures={figures} period={period} />
      </Suspense>

      <Suspense fallback={<MoversAndUp tiles={shown} data={undefined} period={period} filter={filter} />}>
        <MoversFrom tiles={shown} stocks={stocks} period={period} filter={filter} />
      </Suspense>
    </section>
  );
}

function Segment<T extends string>({
  label,
  options,
  value,
  onChange,
  mono,
  className = "",
}: {
  label: string;
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={"flex flex-none gap-0.5 rounded-full border border-btn bg-panel p-0.5 " + className}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
          className={
            "min-h-8 rounded-full px-2.5 text-xs font-semibold transition pointer-coarse:min-h-9 " + (mono ? "font-mono " : "") + (value === o.id ? "bg-accent text-bg" : "text-ink-soft hover:text-ink")
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function PeriodSelect({ value, onChange, className = "" }: { value: Period; onChange: (v: Period) => void; className?: string }) {
  return (
    <label className={"relative flex-none " + className}>
      <span className="sr-only">Period</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Period)}
        className="min-h-9 appearance-none rounded-full border border-btn bg-accent py-0 pr-7 pl-3 font-mono text-xs font-semibold text-bg pointer-coarse:min-h-10"
      >
        {PERIODS.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
      <svg aria-hidden viewBox="0 0 12 12" className="pointer-events-none absolute top-1/2 right-2.5 size-3 -translate-y-1/2 text-bg">
        <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </label>
  );
}

const Shimmer = ({ w = "w-12" }: { w?: string }) => <span aria-label="Loading" className={"inline-block h-3 animate-pulse rounded bg-line/80 align-middle " + w} />;

// ---------------------------------------------------------------- pulse line

function PulseFrom({ figures, period }: { figures: Promise<MarketFigures>; period: Period }) {
  return <PulseLine figures={use(figures)} period={period} />;
}

function PulseLine({ figures, period }: { figures: MarketFigures | null; period: Period }) {
  const items = figures ? pulseItems(figures.indices, figures.flows, period, figures.asOf) : null;
  return (
    // Phones: the heading on its own line over a 2x2 grid, each cell a label above its value. From sm up: one line.
    <div className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-md border border-line bg-panel px-3 py-2 text-xs sm:flex sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-1.5">
      <span className="col-span-2 font-semibold text-ink">{figures ? pulseHeading(figures.asOf) : "Market pulse"}</span>
      {items
        ? items.map((i) => (
            <span key={i.key} title={i.title} className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-1.5 sm:whitespace-nowrap">
              <span className="truncate text-[11px] text-ink-soft sm:text-xs">{i.label}</span>
              <span className={"font-mono font-semibold tabular-nums " + (i.tone === "pos" ? "text-pos" : i.tone === "neg" ? "text-danger" : "text-ink-soft")}>{i.value === "—" ? "updating" : i.value}</span>
            </span>
          ))
        : ["Nifty 50", "Sensex", "FII net", "DII net"].map((l) => (
            <span key={l} className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-1.5 sm:whitespace-nowrap">
              <span className="text-[11px] text-ink-soft sm:text-xs">{l}</span>
              <Shimmer />
            </span>
          ))}
    </div>
  );
}

// ---------------------------------------------------------------- watchlist strip

const watchSnap = () => {
  const list = watchlistSnapshot();
  return list == null ? null : `${watchlistSignedIn() ? "1" : "0"}|${list}`;
};

/** Signed-in visitors only: nothing at all (not even a heading) for everyone else. */
function WatchlistStrip({ stocks, period }: { stocks: Promise<MarketStocks | null>; period: Period }) {
  const snap = useSyncExternalStore(subscribeWatchlist, watchSnap, () => null);
  if (!snap || !snap.startsWith("1|")) return null;
  const tickers = snap.slice(2).split(",").filter(Boolean);
  if (!tickers.length)
    return (
      <p className="text-xs text-ink-soft">
        Your watchlist is empty: tap the heart on any stock to follow it here.{" "}
        <Link href="/watchlist" className="font-semibold text-accent hover:underline">
          How it works
        </Link>
      </p>
    );
  return (
    <div className="flex flex-col gap-1.5">
      {/* Phones: right padding so a floating button at the screen's edge (the Vercel toolbar on previews) never covers the link. */}
      <div className="flex items-center justify-between gap-2 max-sm:pr-12">
        <h3 className="text-xs font-bold uppercase tracking-widest text-ink-soft">Your watchlist · {period}</h3>
        <Link href="/watchlist" className="text-xs font-semibold text-accent hover:underline">
          Open watchlist
        </Link>
      </div>
      <Suspense fallback={<WatchChips tickers={tickers} data={undefined} period={period} />}>
        <WatchFrom tickers={tickers} stocks={stocks} period={period} />
      </Suspense>
    </div>
  );
}

function WatchFrom({ tickers, stocks, period }: { tickers: string[]; stocks: Promise<MarketStocks | null>; period: Period }) {
  return <WatchChips tickers={tickers} data={use(stocks)} period={period} />;
}

const WATCH_MAX = 12;

function WatchChips({ tickers, data, period }: { tickers: string[]; data: MarketStocks | null | undefined; period: Period }) {
  const i = PERIODS.indexOf(period);
  const rows = tickers
    .map((t) => ({ t, name: data?.stocks[t]?.n ?? t, ret: data?.stocks[t]?.r[i] ?? null }))
    .sort((a, b) => (a.ret == null ? 1 : b.ret == null ? -1 : b.ret - a.ret) || a.name.localeCompare(b.name));
  return (
    // Phones: two equal columns, the name truncated and the return always whole; from sm up a flowing row.
    <ul aria-label={`Your watchlist over ${PERIOD_WORDS[period]}`} className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap">
      {rows.slice(0, WATCH_MAX).map((r) => (
        <li key={r.t} className="min-w-0 sm:max-w-full">
          <StockLink
            ticker={r.t}
            title={`${r.name}${r.ret != null ? `: ${signedPct(r.ret)} over ${PERIOD_WORDS[period]}` : ""} · open its chart`}
            className="flex min-h-9 w-full max-w-full items-center justify-between gap-2 rounded-full border border-btn bg-panel px-3 text-xs hover:bg-accent/10 pointer-coarse:min-h-10 sm:w-auto sm:justify-start"
          >
            <span className="min-w-0 truncate font-semibold text-ink sm:max-w-[11rem]">{r.name}</span>
            <span className={"flex-none font-mono font-semibold tabular-nums " + toneText(r.ret)}>
              {r.ret != null ? signedPct(r.ret) : data === undefined ? <Shimmer w="w-8" /> : "updating"}
            </span>
          </StockLink>
        </li>
      ))}
      {rows.length > WATCH_MAX && (
        <li>
          <Link href="/watchlist" className="flex min-h-9 items-center justify-center rounded-full border border-btn px-3 text-xs font-semibold text-accent hover:bg-accent/10 pointer-coarse:min-h-10">
            +{rows.length - WATCH_MAX} more
          </Link>
        </li>
      )}
    </ul>
  );
}

// ---------------------------------------------------------------- heatmap

function HeatFrom({ tiles, figures, period }: { tiles: MarketTile[]; figures: Promise<MarketFigures>; period: Period }) {
  return <MarketHeat tiles={tiles} figures={use(figures)} period={period} />;
}

function MarketHeat({ tiles, figures, period }: { tiles: MarketTile[]; figures: MarketFigures | null; period: Period }) {
  const byslug = figures?.byPeriod[period];
  const have = byslug ? tiles.filter((t) => byslug[t.slug] != null).length : 0;
  const updating = !!figures && have < tiles.length * MIN_TILE_COVERAGE;
  const nifty = figures?.indices[0]?.ret[period];
  const cells = useMemo(
    () =>
      tiles.map((t): HeatCell => {
        const v = updating ? null : (byslug?.[t.slug] ?? null);
        return {
          key: t.slug,
          label: shortName(t.name),
          value: v,
          pending: !figures,
          sub: t.category === "policy" ? "Policy" : undefined,
          href: `/sector/${t.slug}`,
          title: `${t.name}${v != null ? `: ${signedPct(v)} over ${PERIOD_WORDS[period]}` : figures ? `: ${period} figure updating` : ""} · open it`,
        };
      })
        // Best first, as on the Baskets page (a tile still without a figure keeps its A-Z place at the end).
        .sort((a, b) => (a.value == null ? (b.value == null ? 0 : 1) : b.value == null ? -1 : b.value - a.value)),
    [tiles, byslug, figures, updating, period],
  );
  const scale = heatScale(cells.map((c) => c.value));
  return (
    <div className="flex flex-col gap-2 rounded-md border border-line bg-panel p-2 sm:p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[11px] text-ink-soft sm:text-xs">
          Industries &amp; policies · return over <b className="font-semibold text-ink">{PERIOD_WORDS[period]}</b>, best first
        </h3>
        <span title="The Nifty 50 over the same days, for reference" className="flex items-baseline gap-1.5 rounded-full border border-line px-2.5 py-0.5 text-[11px] sm:text-xs">
          <span className="text-ink-soft">Nifty 50 · {period}</span>
          <span className={"font-mono font-semibold tabular-nums " + toneText(nifty)}>{figures ? (nifty != null ? signedPct(nifty) : "updating") : <Shimmer w="w-8" />}</span>
        </span>
      </div>
      {updating && (
        <p role="status" className="text-[11px] text-ink-soft sm:text-xs">
          The {period} figures are updating; they appear here after the evening refresh.
        </p>
      )}
      <HeatGrid
        cells={cells}
        scale={scale}
        label={`Industries and policies by ${period} return`}
        className="grid grid-cols-3 auto-rows-[3.5rem] gap-1 min-[480px]:grid-cols-4 md:grid-cols-7"
      />
      <HeatLegend scale={scale} note="Each tile: the industry's listed stocks at equal weight · tap to explore" />
    </div>
  );
}

// ---------------------------------------------------------------- movers and % up

function MoversFrom({ tiles, stocks, period, filter }: { tiles: MarketTile[]; stocks: Promise<MarketStocks | null>; period: Period; filter: Filter }) {
  return <MoversAndUp tiles={tiles} data={use(stocks)} period={period} filter={filter} />;
}

// Which companies the movers rank under each filter (the info tip and the empty lines say it).
const MOVER_POOL: Record<Filter, string> = { all: "covered companies", sector: "covered companies in an industry", policy: "covered companies in a policy" };

/** `data`: undefined while it streams in, null while the day's figures are still being worked out. */
function MoversAndUp({ tiles, data, period, filter }: { tiles: MarketTile[]; data: MarketStocks | null | undefined; period: Period; filter: Filter }) {
  const m = data?.movers[filter]?.[period];
  const state = data === undefined ? "loading" : !m ? "updating" : "ready";
  // One control for both lists: the top 5 each, or every row the server ranked (20).
  const [more, setMore] = useState(false);
  const moreRef = useRef<HTMLButtonElement>(null);
  const ids = useId();
  const n = more ? Infinity : MOVERS_SHOWN;
  const canMore = state === "ready" && !!m && (m.gainers.length > MOVERS_SHOWN || m.losers.length > MOVERS_SHOWN);
  const longest = m ? Math.max(m.gainers.length, m.losers.length) : 0;
  return (
    <>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <h3 className="font-display text-lg font-bold text-ink sm:text-xl">Top movers · {period}</h3>
          <InfoTip label="About top movers">
            The {more ? longest : MOVERS_SHOWN} {MOVER_POOL[filter]} that rose and fell most over {PERIOD_WORDS[period]}, from closing prices
            {filter === "all" ? "" : filter === "sector" ? ", each with its industry" : ", each with its policy"}. Every covered company is counted. A one-off tag marks a company whose
            results have a one-off year (the stock screens leave those out).
          </InfoTip>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <MoverList id={`${ids}-g`} title="Gainers" list={m?.gainers.slice(0, n)} state={state} empty={`No ${filter === "all" ? "covered stock" : filter === "sector" ? "industry stock" : "policy stock"} rose over this period.`} />
          <MoverList id={`${ids}-l`} title="Losers" list={m?.losers.slice(0, n)} state={state} empty={`No ${filter === "all" ? "covered stock" : filter === "sector" ? "industry stock" : "policy stock"} fell over this period.`} />
        </div>
        {canMore && (
          <button
            ref={moreRef}
            type="button"
            aria-expanded={more}
            aria-controls={`${ids}-g ${ids}-l`}
            onClick={() => {
              setMore((v) => !v);
              // Collapsing pulls the button up past the shortened lists: keep it (and its focus) in view.
              if (more) requestAnimationFrame(() => moreRef.current?.scrollIntoView({ block: "nearest" }));
            }}
            className="min-h-9 self-center rounded-full border border-btn bg-panel px-4 text-xs font-semibold text-accent hover:bg-accent/10 pointer-coarse:min-h-10"
          >
            {more ? "Show less" : "Show more"}
          </button>
        )}
      </div>
      {LANDING_UP_PANEL_ENABLED && <UpPanel tiles={tiles} data={data} period={period} />}
    </>
  );
}

function MoverList({ id, title, list, state, empty }: { id: string; title: string; list: PeriodMovers["gainers"] | undefined; state: "loading" | "updating" | "ready"; empty: string }) {
  return (
    <div id={id} className="overflow-hidden rounded-md border border-line bg-panel">
      <h4 className="border-b border-line px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-ink-soft">{title}</h4>
      {state === "ready" && list && list.length ? (
        <ol className="divide-y divide-line">
          {list.map((r, n) => (
            <li key={r.ticker}>
              <MoverRow r={r} n={n + 1} />
            </li>
          ))}
        </ol>
      ) : (
        <Placeholder rows={5}>{state === "loading" ? null : state === "updating" ? "Updating: the day’s figures are being worked out. Check back in a minute." : empty}</Placeholder>
      )}
    </div>
  );
}

function MoverRow({ r, n }: { r: Mover; n: number }) {
  return (
    <StockLink ticker={r.ticker} title={`${r.name} (${r.ticker})${r.oneOff ? ` · one-off: ${r.oneOff}` : ""} · open its chart`} className="flex min-h-12 items-center gap-3 px-3 py-2 hover:bg-panel-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent">
      <span className="w-4 flex-none text-right font-mono text-[11px] text-ink-soft">{n}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-ink">{r.name}</span>
        <span className="block truncate text-[11px] text-ink-soft">
          <span className="font-mono">{r.ticker}</span> · {r.industry}
        </span>
      </span>
      {r.oneOff && (
        <span
          role="img"
          title={`One-off: ${r.oneOff}`}
          aria-label={`One-off: ${r.oneOff}`}
          className="flex-none rounded-full border border-line px-1.5 py-px text-[10px] font-semibold whitespace-nowrap text-amber-ink"
        >
          one-off
        </span>
      )}
      <span className={"flex-none font-mono text-sm font-semibold tabular-nums " + toneText(r.ret)}>{signedPct(r.ret)}</span>
    </StockLink>
  );
}

function Placeholder({ rows, children }: { rows: number; children: ReactNode }) {
  if (children) return <p className="px-3 py-4 text-xs leading-relaxed text-ink-soft">{children}</p>;
  return (
    <ul aria-label="Loading" className="divide-y divide-line">
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="flex min-h-12 items-center gap-3 px-3 py-2">
          <span className="h-3 flex-1 animate-pulse rounded bg-line/70" />
          <span className="h-3 w-10 animate-pulse rounded bg-line/70" />
        </li>
      ))}
    </ul>
  );
}

function UpPanel({ tiles, data, period }: { tiles: MarketTile[]; data: MarketStocks | null | undefined; period: Period }) {
  const shares = data?.up[period];
  const rows = shares
    ? tiles
        .flatMap((t) => (shares[t.slug] ? [{ t, s: shares[t.slug], pct: (shares[t.slug].up / shares[t.slug].n) * 100 }] : []))
        .sort((a, b) => b.pct - a.pct || b.s.n - a.s.n || a.t.name.localeCompare(b.t.name))
    : null;
  const ready = !!rows?.length && !!data?.movers.all?.[period];
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <h3 className="font-display text-lg font-bold text-ink sm:text-xl">% of stocks up in each industry · {period}</h3>
        <InfoTip label="About % of stocks up">
          The share of each industry&rsquo;s or policy&rsquo;s covered listed stocks that rose over {PERIOD_WORDS[period]}. Only stocks with prices for the whole period are counted.
        </InfoTip>
      </div>
      <div className="rounded-md border border-line bg-panel">
        {ready ? (
          <ul className="grid gap-x-6 p-1.5 md:grid-cols-2 md:p-2">
            {rows!.map(({ t, s, pct }) => {
              const words = `${t.name}: ${s.up} of ${s.n} stocks up over ${PERIOD_WORDS[period]}`;
              return (
                <li key={t.slug} className="min-w-0">
                  <Link
                    href={`/sector/${t.slug}`}
                    aria-label={words}
                    title={words}
                    className="flex min-h-10 items-center gap-3 rounded px-1.5 hover:bg-panel-2 focus-visible:outline-2 focus-visible:outline-accent"
                  >
                    <span className="w-28 flex-none truncate text-xs font-semibold text-ink sm:w-40">{shortName(t.name)}</span>
                    <span aria-hidden className="relative h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-danger/25">
                      <span className="absolute inset-y-0 left-0 rounded-full bg-pos" style={{ width: `${pct}%` }} />
                    </span>
                    <span className="w-10 flex-none text-right font-mono text-xs font-semibold tabular-nums text-ink">{Math.round(pct)}%</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <Placeholder rows={4}>{data === undefined ? null : "Updating: the day’s figures are being worked out. Check back in a minute."}</Placeholder>
        )}
      </div>
    </div>
  );
}
