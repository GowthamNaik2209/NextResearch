"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { ChartRange } from "@/lib/live/yahoo";
import type { BacktestHolding } from "@/lib/baskets/backtest";
import { forgetSeries, industrySeriesKey, loadSeries } from "@/components/baskets/series";
import { CloseButton } from "@/components/stock/StockModal";
import { InfoTip } from "@/components/InfoTip";
import { HEAT_GRID_FULL, HeatGrid, HeatLegend, heatScale, type HeatCell } from "./Heatmap";
import { actionClass } from "./action-class";
import { IndustryPools, type PoolsView } from "./IndustryPools";
import { IndustryPicker } from "./IndustryPicker";
import type { IndustryPools as Pools, PoolMetricId } from "@/lib/baskets/pools";

// An industry page's Stock heatmap and Industry pools: two buttons in the page's first row, each
// opening its view full screen (?view=heatmap|pools&sector=<slug>, so a link opens it and Back
// closes it). The header's picker switches to another industry in place; its data comes from
// /api/industry/<slug> (built on the server, like the page's own).
//
// The heatmap: every listed stock on the industry's map, grouped by the layer it plays in, coloured
// by its own price change over the period picked. It reads the industry basket's own backtest (the
// same request and cache the basket page uses), so a tile here and the stock's line there agree.

export type HeatStock = { ticker: string; name: string; layer: string; mcapCr: number | null };
/** What the two views show for one industry (src/lib/baskets/industry-views.ts builds it). */
export type IndustryViewData = { slug: string; name: string; stocks: HeatStock[]; pools: Pools | null; basketHref: string | null };
/** One row of the picker: which of the two views the industry has. */
export type IndustryViewOption = { slug: string; name: string; group: "industry" | "policy" | "index"; heat: boolean; pools: boolean };
type ViewId = "heatmap" | "pools";

const RANGES: { id: ChartRange; label: string; long: string }[] = [
  { id: "1M", label: "1M", long: "month" },
  { id: "6M", label: "6M", long: "6 months" },
  { id: "1Y", label: "1Y", long: "year" },
  { id: "3Y", label: "3Y", long: "3 years" },
];

/** The page URL with the view's params set (or, with `view` null, taken off). */
function viewUrl(view: ViewId | null, sector?: string) {
  const p = new URLSearchParams(window.location.search);
  if (view) {
    p.set("view", view);
    p.set("sector", sector!);
  } else {
    p.delete("view");
    p.delete("sector");
    p.delete("pick");
  }
  const qs = p.toString();
  return window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash;
}

/**
 * The page's first row of buttons: `lead` (the map), then the Stock heatmap and Industry pools
 * buttons, then `children`. Phones get one row of short labels that scrolls sideways, without the
 * panel around it; from desktop width the row sits on one line.
 */
export function IndustryActions({ lead, children, data, options }: { lead: ReactNode; children: ReactNode; data: IndustryViewData; options: IndustryViewOption[] }) {
  // The entry marks itself, so closing steps back rather than stacking history.
  const open = (v: ViewId) => window.history.pushState({ nrView: true }, "", viewUrl(v, data.slug));
  return (
    <section className="flex flex-col gap-3 sm:rounded-2xl sm:border sm:border-line sm:bg-panel-2 sm:p-4 lg:p-5">
      <div className="scrollbar-none -mx-5 flex gap-1.5 overflow-x-auto px-5 max-sm:*:flex-none sm:mx-0 sm:flex-wrap sm:gap-2 sm:overflow-visible sm:px-0 lg:flex-nowrap">
        {lead}
        {data.stocks.length > 0 && (
          <button type="button" aria-haspopup="dialog" onClick={() => open("heatmap")} className={actionClass(false)}>
            <span className="sm:hidden">Heatmap</span>
            <span className="hidden sm:inline">Stock heatmap</span>
          </button>
        )}
        {/* The page's own button is tablet and desktop only (the phone row stays at its few
            buttons); the full-screen view itself works on phones too (the landing page links to it). */}
        {data.pools && (
          <button type="button" aria-haspopup="dialog" onClick={() => open("pools")} className={actionClass(false) + " max-sm:hidden"}>
            Industry pools
          </button>
        )}
        {children}
      </div>
      {/* Reads ?view= (useSearchParams), so it needs its own boundary on this static page. */}
      <Suspense fallback={null}>
        <IndustryFullView data={data} options={options} />
      </Suspense>
    </section>
  );
}

const noopSubscribe = () => () => {};
const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
// Fetched industries, kept for the visit: switching back and forth asks once.
const fetched = new Map<string, Promise<IndustryViewData | null>>();
function loadIndustry(slug: string) {
  let p = fetched.get(slug);
  if (!p) {
    p = fetch(`/api/industry/${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? (r.json() as Promise<IndustryViewData>) : null))
      .catch(() => null);
    p.then((d) => d || fetched.delete(slug));
    fetched.set(slug, p);
  }
  return p;
}

function IndustryFullView({ data: own, options }: { data: IndustryViewData; options: IndustryViewOption[] }) {
  const params = useSearchParams();
  const asked = params.get("view");
  const view: ViewId | null = asked === "heatmap" || asked === "pools" ? asked : null;
  const has = (slug: string, v: ViewId) => slug === own.slug ? (v === "heatmap" ? own.stocks.length > 0 : !!own.pools) : !!options.find((o) => o.slug === slug && (v === "heatmap" ? o.heat : o.pools));
  // An unknown or view-less sector in the link falls back to the page's own industry.
  const wanted = params.get("sector") ?? own.slug;
  const slug = view && has(wanted, view) ? wanted : own.slug;
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const shown = view && has(slug, view) ? view : null;
  // ?pick=1 (the landing page's links) opens the picker on arrival; the view reads it once, on opening.
  const pickOnArrival = params.get("pick") === "1";
  if (!shown || !mounted) return null;
  return createPortal(<FullView view={shown} slug={slug} own={own} pickOnArrival={pickOnArrival} options={options.filter((o) => (shown === "heatmap" ? o.heat : o.pools))} />, document.body);
}

/** This visit arrived from another page of the site (not this one, not a fresh tab): Back returns there. */
function cameFromSite() {
  if (window.history.length < 2) return false;
  try {
    const here = window.location.pathname;
    // A soft navigation (a Link on the landing page) leaves the referrer at the first page loaded,
    // so the document's own first URL tells: loaded elsewhere on the site, then came here.
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    const first = nav ? new URL(nav.name) : null;
    if (first && first.pathname !== here) return true;
    const r = document.referrer ? new URL(document.referrer) : null;
    return !!r && r.origin === window.location.origin && r.pathname !== here;
  } catch {
    return false;
  }
}

const LABEL: Record<ViewId, string> = { heatmap: "Stock heatmap", pools: "Industry pools" };

/**
 * The view over the whole screen: a header with the view's name, the industry picker and ✕, and
 * the view under it, scrolling on its own. Esc, ✕ and Back close it; Tab stays inside; the page
 * under it doesn't scroll. A stock pop-up opened from a tile sits on top and is closed first.
 */
function FullView({ view, slug, own, options, pickOnArrival }: { view: ViewId; slug: string; own: IndustryViewData; options: IndustryViewOption[]; pickOnArrival: boolean }) {
  const [got, setGot] = useState<{ slug: string; data: IndustryViewData | null } | null>(null);
  useEffect(() => {
    if (slug === own.slug) return;
    let live = true;
    loadIndustry(slug).then((d) => live && setGot({ slug, data: d }));
    return () => {
      live = false;
    };
  }, [slug, own.slug]);
  // undefined while it loads, null when it couldn't.
  const data = slug === own.slug ? own : got?.slug === slug ? got.data : undefined;
  // Kept across industries, so a switch compares like with like.
  const [range, setRange] = useState<ChartRange>("1Y");
  const [metric, setMetric] = useState<PoolMetricId>("rev");
  const [split, setSplit] = useState<PoolsView>("layer");

  const card = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  // Opened from this page's button: step back. Arrived on a link from another page of the site (the
  // landing page's buttons): back there too. Otherwise (a shared link) stay on the overview page.
  const close = () => {
    if (window.history.state?.nrView || cameFromSite()) window.history.back();
    else window.history.replaceState(null, "", viewUrl(null));
  };
  const closeFn = useRef(close);
  useEffect(() => {
    closeFn.current = close;
  });
  const pick = (s: string) => {
    // In place: Back still closes the view rather than stepping through industries.
    window.history.replaceState({ nrView: !!window.history.state?.nrView }, "", viewUrl(view, s));
    body.current?.scrollTo(0, 0);
  };

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // The picker focuses its own search box when it opens on arrival.
    if (!pickOnArrival) closeRef.current?.focus();
    if (new URLSearchParams(window.location.search).has("pick")) {
      const p = new URLSearchParams(window.location.search);
      p.delete("pick");
      window.history.replaceState({ nrView: !!window.history.state?.nrView }, "", window.location.pathname + `?${p}` + window.location.hash);
    }
    const onKey = (e: KeyboardEvent) => {
      // A stock pop-up on top handles its own keys.
      if (document.querySelector(".nr-pop-backdrop") || !card.current) return;
      if (e.key === "Escape") {
        if (!e.defaultPrevented) closeFn.current();
        return;
      }
      if (e.key !== "Tab") return;
      const items = [...card.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const inside = card.current.contains(document.activeElement);
      if (e.shiftKey && (document.activeElement === first || !inside)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !inside)) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
    // Mount-only, like the stock pop-up's shell.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const name = data?.name ?? options.find((o) => o.slug === slug)?.name ?? "";
  return (
    <div ref={card} role="dialog" aria-modal="true" aria-label={`${LABEL[view]}: ${name}`} className="fixed inset-0 z-[150] flex flex-col bg-bg text-ink">
      <header className="flex flex-none items-center gap-3 border-b border-line bg-panel px-4 py-2.5 sm:px-6 sm:py-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
          <span className="flex flex-none items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-ink-soft sm:text-[11px]">
            {LABEL[view]}
            <InfoTip label={`About the ${LABEL[view].toLowerCase()}`}>
              {view === "heatmap"
                ? "Each listed stock in the industry, grouped by layer and coloured by its price change over the period. Pick another industry above."
                : "How the industry’s revenue, profit and value split across its layers and companies, from the covered companies’ latest results. Tap a layer to see who earns it; pick another industry above."}
            </InfoTip>
          </span>
          <IndustryPicker options={options} current={slug} onPick={pick} openOnMount={pickOnArrival} />
        </div>
        <CloseButton closeRef={closeRef} onClose={close} />
      </header>
      <div ref={body} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-3 py-3 sm:px-6 sm:py-5 lg:px-8">
          {data === undefined ? (
            <p className="text-sm text-ink-soft">Loading {name}&hellip;</p>
          ) : data === null ? (
            <p className="text-sm text-ink-soft">{name} couldn&rsquo;t load right now. Try again in a moment, or pick another industry.</p>
          ) : view === "heatmap" ? (
            <IndustryHeatmap key={data.slug} slug={data.slug} name={data.name} stocks={data.stocks} basketHref={data.basketHref} range={range} onRange={setRange} />
          ) : (
            data.pools && (
              <IndustryPools key={data.slug} pools={data.pools} metric={metric} onMetric={setMetric} view={split} onView={setSplit} titled={false} />
            )
          )}
        </div>
      </div>
    </div>
  );
}

function IndustryHeatmap({ slug, name, stocks, basketHref, range, onRange }: { slug: string; name: string; stocks: HeatStock[]; basketHref: string | null; range: ChartRange; onRange: (r: ChartRange) => void }) {
  const [got, setGot] = useState<{ range: ChartRange; holdings: BacktestHolding[]; pending: Set<string> } | "error" | null>(null);
  // A cold backtest answers before every stock's prices are in (`pending`): those tiles keep their
  // placeholder rather than read as "not listed", and it is asked again a few times until they arrive.
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let live = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const key = industrySeriesKey(slug);
    loadSeries(key, range).then((l) => {
      if (!live) return;
      if (l.status !== "ok") return setGot("error");
      const pending = new Set(l.data.pending ?? []);
      setGot({ range, holdings: l.data.holdings ?? [], pending });
      // The server keeps a part-loaded answer up to a minute, so keep asking for about two.
      if (pending.size && retry < 12)
        timer = setTimeout(() => {
          forgetSeries(key, range);
          setRetry((n) => n + 1);
        }, 10_000);
    });
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [slug, range, retry]);
  const loading = got == null || (got !== "error" && got.range !== range);
  const pending = got && got !== "error" && !loading ? got.pending : new Set<string>();
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
      pending: loading || pending.has(s.ticker),
      size: sizeOf(s.mcapCr),
      ticker: s.ticker,
      title:
        v != null
          ? `${s.name}: ${v >= 0 ? "+" : ""}${v.toFixed(1)}% over the past ${long}`
          : loading || pending.has(s.ticker)
            ? `${s.name}: prices loading`
            : `${s.name}: not listed for the whole ${long}`,
    });
  }
  const all = groups.flatMap((g) => g.cells);
  const scale = heatScale(all.map((c) => c.value));
  const up = all.filter((c) => c.value != null && c.value > 0).length;
  const known = all.filter((c) => c.value != null).length;

  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-line bg-panel p-2.5 sm:gap-3 sm:p-4 lg:p-5">
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
              {pending.size > 0 && ` ${pending.size} still loading.`}
              {all.length - known - pending.size > 0 && ` ${all.length - known - pending.size} not listed for the whole ${long} (shown —).`}
            </>
          )}
        </p>
        <div role="group" aria-label="Period" className="flex flex-none gap-0.5 rounded-full border border-btn p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              aria-pressed={range === r.id}
              onClick={() => onRange(r.id)}
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
            <HeatGrid cells={g.cells} scale={scale} className={HEAT_GRID_FULL} label={`${g.layer} stocks`} />
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
