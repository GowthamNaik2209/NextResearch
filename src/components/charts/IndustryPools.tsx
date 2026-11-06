"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { InfoTip } from "@/components/InfoTip";
import { ScrollX } from "@/components/ScrollX";
import { useSegmentTip } from "@/components/charts/SegmentTip";
import { StockLink } from "@/components/stock/StockLink";
import { NA, croreShort, pct } from "@/lib/format";
import {
  POOL_METRICS,
  companyValue,
  countedCompanies,
  distinctLayerColors,
  groupValue,
  layerPools,
  layerShares,
  poolMetric,
  poolTakeaway,
  shares,
  type IndustryPools as Pools,
  type LayerPool,
  type PoolCompany,
  type PoolMetricId,
  type PoolTakeaway,
  type TakeawayRow,
} from "@/lib/baskets/pools";

// The industry page's "Industry pools" panel: how the industry's revenue, profit and market value
// split across its layers and companies (the maths and its rules are in src/lib/baskets/pools.ts).
// Three 100% bars show where the money sits; under them the chosen metric by layer or by company,
// then the picked layer's companies with every figure.

export type PoolsView = "layer" | "company";
type View = PoolsView;

/** A share as a percent; a sliver reads "<1%", not "0%". */
const sharePct = (s: number, dp = 0) => (s > 0 && s * 100 < 10 ** -dp ? `<${10 ** -dp}%` : pct(s * 100, dp));

// Rates as the panel prints them; pools read in ₹ Cr.
function fmt(id: PoolMetricId, v: number | null): string {
  if (v == null) return NA;
  if (id === "margin" || id === "growth") return pct(v * 100);
  if (id === "pe") return `${v.toFixed(1)}×`;
  if (id === "roce") return pct(v);
  return croreShort(v);
}

/** Axis labels: rates as on the bars; ₹ Cr in one unit across the axis (lakh crore once it reaches one). */
function tickLabel(id: PoolMetricId, t: number, top: number): string {
  if (t === 0) return "0";
  if (id === "margin" || id === "growth") return pct(t * 100, 0);
  if (id === "pe") return `${t}×`;
  if (id === "roce") return pct(t, 0);
  const a = Math.abs(t);
  return `${t < 0 ? "−" : ""}${top >= 100_000 ? `₹${+(a / 100_000).toFixed(2)}L Cr` : `₹${(a / 1000).toLocaleString("en-IN")}k Cr`}`;
}

/** Round steps across [lo, hi], about `n` of them. */
function ticks(lo: number, hi: number, n = 4): number[] {
  const span = hi - lo || 1;
  const mag = 10 ** Math.floor(Math.log10(span / n));
  const step = [1, 2, 2.5, 5, 10].map((k) => k * mag).find((s) => span / s <= n) ?? 10 * mag;
  const out: number[] = [];
  // From the step at or below lo to the one at or above hi, so the axis covers every bar.
  for (let v = Math.floor(lo / step + 1e-9) * step; v < hi + step * (1 - 1e-9); v += step) out.push(Number(v.toFixed(10)));
  return out;
}

/** A scale from the values shown, always taking in zero, rounded out to whole ticks. P/E is capped (a 300× outlier would flatten the rest). */
function scale(id: PoolMetricId, values: number[]) {
  let lo = Math.min(0, ...values);
  let hi = Math.max(0, ...values);
  if (id === "pe") hi = Math.min(hi, 120);
  if (hi === lo) hi = lo + 1;
  const tk = ticks(lo, hi);
  lo = Math.min(lo, tk[0]);
  hi = Math.max(hi, tk[tk.length - 1]);
  return { tk, lo, hi, x: (v: number) => ((Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo)) * 100 };
}

const NONE: ReadonlySet<string> = new Set();

// White on the map's mid-tone layer colours: a dark halo keeps it readable on every one of them.
const SEG_TEXT = "overflow-hidden whitespace-nowrap text-[11px] font-bold text-white [text-shadow:0_0_2px_rgba(0,0,0,.85),0_0_4px_rgba(0,0,0,.6)]";

/** Metric and split can be held by the parent (the full-screen view keeps them across industries,
 * and titles the view in its own header bar, so it passes `titled={false}`). */
export function IndustryPools({
  pools: raw,
  metric: metricIn,
  onMetric,
  view: viewIn,
  onView,
  titled = true,
}: {
  pools: Pools;
  titled?: boolean;
  metric?: PoolMetricId;
  onMetric?: (m: PoolMetricId) => void;
  view?: View;
  onView?: (v: View) => void;
}) {
  // Layers the map gives one domain colour get a shade each, used by the bars, legend and rows alike.
  const pools = useMemo(() => ({ ...raw, layers: distinctLayerColors(raw.layers) }), [raw]);
  const [metricOwn, setMetricOwn] = useState<PoolMetricId>("rev");
  const [viewOwn, setViewOwn] = useState<View>("layer");
  const metric = metricIn ?? metricOwn;
  const view = viewIn ?? viewOwn;
  const setMetric = onMetric ?? setMetricOwn;
  const setView = onView ?? setViewOwn;
  // Low-exposure companies the viewer added. Not kept: every visit starts from the same default.
  const [added, setAdded] = useState<ReadonlySet<string>>(() => new Set());
  const layers = layerPools(pools, added);
  const [picked, setPicked] = useState<string | null>(null);
  // The picked layer, or the one with the most revenue before anything is added (so adding a
  // company doesn't move the table to another layer).
  const sel =
    layers.find((l) => l.name === picked && l.all.length)?.name ??
    [...layerPools(pools, NONE)].sort((a, b) => (groupValue(b.counted, "rev") ?? -1) - (groupValue(a.counted, "rev") ?? -1))[0]?.name;
  const selCounted = !!layers.find((l) => l.name === sel)?.counted.length;
  const m = poolMetric(metric);
  const lowCos = pools.companies.filter((c) => c.lowExposure);
  const counted = countedCompanies(pools, added);
  const colorOf = new Map(pools.layers.map((l) => [l.name, l.color]));
  const take = poolTakeaway(layers);

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-line bg-panel p-3 sm:gap-5 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        {titled && (
          <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-ink-soft">
            Industry pools
            <InfoTip label="About industry pools">
              How the industry&rsquo;s revenue, profit and value split across its layers and companies, from the covered companies&rsquo; {pools.year} results. Tap a layer to see who earns it.
            </InfoTip>
          </h2>
        )}
        <p className="text-[11px] text-ink-soft tabular-nums sm:text-xs">
          {pools.year} · {counted.length} of {pools.companies.length} covered companies{pools.asOf && ` · as of ${pools.asOf}`}
        </p>
      </div>

      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
        <div role="group" aria-label="Metric" className="scrollbar-none -mx-3 flex gap-1.5 overflow-x-auto px-3 sm:mx-0 sm:flex-wrap sm:px-0">
          {POOL_METRICS.map((x) => (
            <button
              key={x.id}
              type="button"
              aria-pressed={metric === x.id}
              onClick={() => setMetric(x.id)}
              className={"min-h-8 flex-none rounded-full border px-3 text-xs transition sm:text-[13px] " + (metric === x.id ? "border-accent bg-accent font-semibold text-bg" : "border-btn text-ink-soft hover:bg-accent/10 hover:text-ink")}
            >
              {metricLabel(x, pools.year)}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div role="group" aria-label="Split by" className="flex flex-none gap-0.5 rounded-full border border-btn p-0.5">
            {(["layer", "company"] as const).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                onClick={() => setView(v)}
                className={"min-h-7 rounded-full px-3 text-[11px] font-semibold transition pointer-coarse:min-h-8 sm:text-xs " + (view === v ? "bg-accent text-bg" : "text-ink-soft hover:text-ink")}
              >
                By {v}
              </button>
            ))}
          </div>
          {lowCos.length > 0 && (
            <span className="flex items-center gap-2">
              <LowExposurePicker companies={lowCos} added={added} onChange={setAdded} />
              <InfoTip label="About low-exposure companies">
                The figures are company-wide. Companies whose link to this industry the map rates low, and large groups that earn most of their money elsewhere, are left out unless you add them.
              </InfoTip>
            </span>
          )}
        </div>
      </div>

      <ShareBars layers={layers} view={view} active={m.kind === "pool" ? metric : null} sel={sel} onPick={setPicked} take={take} />

      {/* The picked layer's companies sit under the chart, out of sight: say so, and take you there. */}
      {sel && selCounted && (
        <button
          type="button"
          onClick={() => {
            const t = document.getElementById("pools-companies");
            t?.scrollIntoView({ block: "start" });
            t?.focus({ preventScroll: true });
          }}
          className="flex min-h-9 w-fit max-w-full items-center gap-2 rounded-lg border border-btn px-3 text-left text-xs font-semibold text-ink hover:bg-accent/10 sm:text-[13px]"
        >
          <span aria-hidden className="h-2.5 w-2.5 flex-none rounded-sm" style={{ backgroundColor: colorOf.get(sel) }} />
          <span className="min-w-0">
            <span className="hidden sm:inline">Scroll down for the companies</span>
            <span className="sm:hidden">Companies</span> in {sel}
          </span>
          <span aria-hidden className="text-accent">&darr;</span>
        </button>
      )}

      {view === "layer" ? (
        <LayerRows layers={layers} metric={metric} year={pools.year} sel={sel} onPick={setPicked} />
      ) : (
        <CompanyRows companies={counted} colorOf={colorOf} metric={metric} year={pools.year} />
      )}

      {sel && <LayerTable layer={layers.find((l) => l.name === sel)!} metric={metric} year={pools.year} />}

      <p className="max-w-4xl text-[11px] leading-relaxed text-ink-soft sm:text-xs">
        Company-wide {pools.year} figures, not segment revenue: each company counts in full in its main layer here. A one-off profit year is left out of profit, margin and P/E. P/E ({pools.year}) is today&rsquo;s market cap over {pools.year} net profit, so it differs from the trailing-twelve-month P/E in stock pop-ups and decks. ROCE is the layer&rsquo;s median.
      </p>
    </div>
  );
}

/** The read of the bars, in the bars' own shares. One line under them from tablet width up; the
 * full read (with where a one-off year makes the bases differ) sits in the heading's "i", which is
 * all a phone gets, so no paragraph comes between the charts. */
function takeawayParts(take: PoolTakeaway) {
  // Small shares to a decimal, so a small layer's "1.2% on 0.4%" doesn't read "1% on <1%".
  const sh = (s: number) => sharePct(s, s < 0.1 ? 1 : 0);
  const profitOn = (r: TakeawayRow, long: boolean) => (r.profit != null ? `${sh(r.profit)}${long ? " of the profit" : ""}` : `a loss of ${croreShort(Math.abs(r.profitCr))}`);
  const list = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);
  const notes = [take.more, take.less].filter((r) => r.oneOff.length);
  const sk = take.skipped;
  const skCos = sk.flatMap((x) => x.companies);
  const main = (
    <>
      Most profit for its revenue: <b className="font-semibold">{take.more.layer}</b>, {profitOn(take.more, true)} on {sh(take.more.revenue)} of the revenue. Least:{" "}
      <b className="font-semibold">{take.less.layer}</b>, {profitOn(take.less, false)} on {sh(take.less.revenue)}.
    </>
  );
  const extra =
    notes.map((r) => ` ${list(r.oneOff)} ${r.oneOff.length > 1 ? "have" : "has"} a one-off year, counted in ${r.layer}’s revenue share but not its profit share.`).join("") +
    (sk.length > 0 ? ` Not ranked, as a one-off year (${list(skCos)}) is a large part of ${sk.length > 1 ? "their" : "its"} revenue but left out of profit: ${list(sk.map((x) => x.layer))}.` : "");
  return { main, extra };
}

/** Revenue, profit and market cap as three 100% bars, split by layer or by company. */
function ShareBars({ layers, view, active, sel, onPick, take }: { layers: LayerPool[]; view: View; active: PoolMetricId | null; sel?: string; onPick: (l: string) => void; take: PoolTakeaway | null }) {
  const { tipFor, tipNode } = useSegmentTip();
  const read = take && takeawayParts(take);
  const bars: ["rev" | "np" | "mcap", string][] = [
    ["rev", "Revenue"],
    ["np", "Net profit"],
    ["mcap", "Market cap"],
  ];
  const losses: string[] = [];
  const rows = bars.map(([id, label]) => {
    const segs =
      view === "layer"
        ? layerShares(layers, id).map(({ item: l, value, share }) => ({ key: l.name, layer: l.name, color: l.color, label: l.name, name: l.name, value, share }))
        : shares(
            layers.flatMap((l) => [...l.counted].sort((a, b) => (companyValue(b, id) ?? 0) - (companyValue(a, id) ?? 0)).map((c) => ({ c, l }))),
            ({ c }) => companyValue(c, id),
          ).map(({ item: { c, l }, value, share }) => ({ key: c.ticker, layer: l.name, color: l.color, label: c.ticker, name: `${c.name} (${l.name})`, value, share }));
    if (id === "np") for (const s of segs) if (s.value != null && s.value < 0) losses.push(`${s.label} ${croreShort(s.value)}`);
    // What the shares are of: the bar's own slices (a loss has none, and is named under the bar).
    const total = segs.reduce((t, s) => t + (s.share != null ? s.value! : 0), 0);
    return { id, label, segs, total };
  });

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-ink-soft sm:text-[11px]">Where the money sits</h3>
        {read && (
          <InfoTip label="What the bars show">
            {read.main}
            {read.extra}
          </InfoTip>
        )}
      </div>
      <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-x-3 gap-y-2 sm:grid-cols-[6rem_minmax(0,1fr)]">
        {rows.map((r) => (
          <div key={r.id} className="contents">
            <div className={"text-[11px] leading-tight sm:text-xs " + (r.id === active ? "font-semibold text-ink" : "text-ink-soft")}>
              {r.label}
              <span className="block font-normal text-ink-soft tabular-nums">{croreShort(r.total)}</span>
            </div>
            <div className={"flex gap-0.5 overflow-hidden rounded-md bg-bg " + (r.id === active ? "h-10" : "h-8")}>
              {r.segs.map((s) =>
                s.share == null ? null : (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => onPick(s.layer)}
                    {...tipFor(`${s.name}: ${pct(s.share * 100, 1)} of ${r.label.toLowerCase()}`)}
                    className={"flex min-w-[3px] items-center justify-center transition-opacity " + SEG_TEXT + (sel === s.layer ? " shadow-[inset_0_0_0_2px_var(--ink)]" : "")}
                    style={{ flex: `${s.share} 1 0`, backgroundColor: s.color }}
                  >
                    {/* Only the share fits in a slice; its name shows on hover or tap. */}
                    <span className="hidden sm:inline">{s.share >= 0.06 ? pct(s.share * 100, 0) : ""}</span>
                    <span className="sm:hidden">{s.share >= 0.13 ? pct(s.share * 100, 0) : ""}</span>
                  </button>
                ),
              )}
            </div>
          </div>
        ))}
      </div>
      {tipNode}
      {losses.length > 0 && (
        <p className="text-[11px] text-danger sm:text-xs">
          The profit bar is the profit-makers&rsquo; total; {view === "layer" ? "loss-making layers" : "loss-makers"} are left off it: {losses.join(" · ")}
        </p>
      )}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {layers
          .filter((l) => l.all.length)
          .map((l) => (
            <button key={l.name} type="button" aria-pressed={sel === l.name} onClick={() => onPick(l.name)} className={"tap-y flex items-center gap-1.5 text-[11px] pointer-coarse:min-h-8 sm:text-xs " + (sel === l.name ? "font-semibold text-ink" : "text-ink-soft hover:text-ink")}>
              <span aria-hidden className="h-2.5 w-2.5 flex-none rounded-sm" style={{ backgroundColor: l.color }} />
              {l.name}
            </button>
          ))}
      </div>
      {read && <p className="hidden text-[13px] text-ink sm:block">{read.main}</p>}
    </div>
  );
}

const ROW = "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)_8rem] lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)_8rem]";
/** The width of the rows' bar track, in px, kept current as the panel resizes. */
function useTrackWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [px, setPx] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setPx((el.querySelector("[data-track]") as HTMLElement | null)?.clientWidth ?? 0);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, px] as const;
}

const TRACK = "relative col-span-2 row-start-2 h-6 rounded bg-bg sm:col-span-1 sm:col-start-2 sm:row-start-1";

function Grid({ tk, x }: { tk: number[]; x: (v: number) => number }) {
  return (
    <>
      {tk.map((t) => (
        <span key={t} aria-hidden className={"absolute inset-y-0 w-px " + (t === 0 ? "bg-ink-soft/60" : "bg-line/60")} style={{ left: `${x(t)}%` }} />
      ))}
    </>
  );
}

function Axis({ tk, x, id }: { tk: number[]; x: (v: number) => number; id: PoolMetricId }) {
  const top = Math.max(...tk.map(Math.abs));
  return (
    <div className={ROW + " mt-1"} aria-hidden>
      <span className="hidden sm:block" />
      <span className="relative col-span-2 h-4 font-mono text-[10px] text-ink-soft sm:col-span-1">
        {tk.map((t) => (
          <span key={t} className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${x(t)}%` }}>
            {tickLabel(id, t, top)}
          </span>
        ))}
      </span>
    </div>
  );
}

/** The metric by layer, in the map's order: a pool split into its companies, a rate as a bar with each company as a dot. */
function LayerRows({ layers, metric, year, sel, onPick }: { layers: LayerPool[]; metric: PoolMetricId; year: string; sel?: string; onPick: (l: string) => void }) {
  const m = poolMetric(metric);
  const shown = layers.filter((l) => l.all.length);
  const rows = shown.map((l) => {
    const items = l.counted.map((c) => ({ c, v: companyValue(c, metric) })).filter((x): x is { c: PoolCompany; v: number } => x.v != null);
    return { l, items, total: groupValue(l.counted, metric) };
  });
  const totalShares = shares(rows, (r) => r.total);
  const extent =
    m.kind === "pool"
      ? rows.flatMap((r) => [r.items.filter((i) => i.v > 0).reduce((t, i) => t + i.v, 0), r.items.filter((i) => i.v < 0).reduce((t, i) => t + i.v, 0)])
      : rows.flatMap((r) => [r.total ?? 0, ...r.items.map((i) => i.v)]);
  const { tk, x, hi } = scale(metric, extent);
  const [box, trackPx] = useTrackWidth();
  const { tipFor, tipNode } = useSegmentTip();
  // A slice wide enough for its share (about 6.5px a character of the 10px mono label, plus padding).
  const fits = (pctWide: number, label: string) => (pctWide / 100) * trackPx >= label.length * 6.5 + 8;

  return (
    <div ref={box} className="flex flex-col gap-1">
      {tipNode}
      <h3 className="mb-1 text-[10px] font-bold uppercase tracking-widest text-ink-soft sm:text-[11px]">
        {metricLabel(m, year)} by layer{m.kind === "rate" && " · dots are companies"}
      </h3>
      {rows.map(({ l, items, total }, i) => {
        const share = totalShares[i].share;
        let pos = 0;
        let neg = 0;
        return (
          <button
            key={l.name}
            type="button"
            aria-pressed={sel === l.name}
            onClick={() => onPick(l.name)}
            className={ROW + " -mx-2 rounded-lg px-2 py-1.5 text-left transition hover:bg-panel-2 " + (sel === l.name ? "bg-panel-2 ring-1 ring-line" : "")}
          >
            <span className={"flex min-w-0 items-center gap-2 text-xs sm:text-[13px] " + (l.counted.length ? "text-ink" : "text-ink-soft")}>
              <span aria-hidden className="h-2.5 w-2.5 flex-none rounded-sm" style={{ backgroundColor: l.color }} />
              <span className="line-clamp-2 leading-tight" title={l.name}>
                {l.name}
              </span>
            </span>
            <span data-track className={TRACK}>
              <Grid tk={tk} x={x} />
              {!l.counted.length ? (
                <span className="absolute left-2 top-1 text-[11px] text-ink-soft">Only low-exposure companies: add them above</span>
              ) : m.kind === "pool" ? (
                [...items]
                  .sort((a, b) => b.v - a.v)
                  .map(({ c, v }) => {
                    const from = v >= 0 ? pos : neg + v;
                    if (v >= 0) pos += v;
                    else neg += v;
                    const w = x(from + Math.abs(v)) - x(from);
                    return (
                      <span
                        key={c.ticker}
                        {...tipFor(`${c.name}: ${croreShort(v)}`)}
                        className={"absolute inset-y-[3px] flex items-center rounded-sm pl-1 font-mono shadow-[inset_-1px_0_0_var(--bg)] " + SEG_TEXT + " text-[10px]"}
                        style={{ left: `${x(from)}%`, width: `${w}%`, backgroundColor: v < 0 ? "var(--danger)" : l.color }}
                      >
                        {v > 0 && total && total > 0 && fits(w, sharePct(v / total)) ? sharePct(v / total) : ""}
                      </span>
                    );
                  })
              ) : (
                <>
                  {total != null && (
                    <span className="absolute inset-y-[5px] rounded-sm opacity-85" style={{ left: `${x(Math.min(0, total))}%`, width: `${x(Math.max(0, total)) - x(Math.min(0, total))}%`, backgroundColor: total < 0 ? "var(--danger)" : l.color }} />
                  )}
                  {items.map(({ c, v }) => (
                    <span
                      key={c.ticker}
                      {...tipFor(`${c.name}: ${fmt(metric, v)}${v > hi ? " (off the scale)" : ""}`)}
                      className="absolute top-1/2 -ml-[5px] -mt-[5px] h-2.5 w-2.5 rounded-full border-2 border-panel bg-ink"
                      style={{ left: `${x(v)}%` }}
                    />
                  ))}
                </>
              )}
            </span>
            <span className="text-right text-xs font-semibold whitespace-nowrap text-ink tabular-nums sm:text-[13px]">
              {!l.counted.length ? NA : fmt(metric, total)}
              <span className="ml-1.5 text-[11px] font-normal text-ink-soft sm:ml-0 sm:block">
                {!l.counted.length
                  ? "not counted"
                  : m.kind === "pool"
                    ? share != null
                      ? `${sharePct(share)} of pool`
                      : total != null && total < 0
                        ? "loss"
                        : ""
                    : items.length
                      ? `${items.length} ${items.length === 1 ? "co" : "cos"}`
                      : "one-off year"}
              </span>
            </span>
          </button>
        );
      })}
      <Axis tk={tk} x={x} id={metric} />
    </div>
  );
}

/** Every counted company ranked on the metric, each bar in its layer's colour. */
function CompanyRows({ companies, colorOf, metric, year }: { companies: PoolCompany[]; colorOf: Map<string, string>; metric: PoolMetricId; year: string }) {
  const m = poolMetric(metric);
  const ranked = companies
    .map((c) => ({ c, v: companyValue(c, metric) }))
    .sort((a, b) => (b.v ?? -Infinity) - (a.v ?? -Infinity));
  const ss = shares(ranked, (r) => r.v);
  const { tk, x, hi } = scale(
    metric,
    ranked.flatMap((r) => (r.v == null ? [] : [r.v])),
  );
  return (
    <div className="flex flex-col gap-0.5">
      <h3 className="mb-1 text-[10px] font-bold uppercase tracking-widest text-ink-soft sm:text-[11px]">
        {metricLabel(m, year)} by company · {ranked.length}
      </h3>
      {ranked.map(({ c, v }, i) => {
        const color = colorOf.get(c.layer) ?? "#64748B";
        const a = v == null ? 0 : x(Math.min(0, v));
        const b = v == null ? 0 : x(Math.max(0, v));
        return (
          <div key={c.ticker} className={ROW + " py-1"} title={c.layer}>
            <span className="flex min-w-0 items-center gap-2 text-xs sm:text-[13px]">
              <span className="w-5 flex-none text-right text-[10px] text-ink-soft tabular-nums">{i + 1}</span>
              <span aria-hidden className="h-2.5 w-2.5 flex-none rounded-sm" style={{ backgroundColor: color }} />
              <StockLink ticker={c.ticker} className="tap-y truncate text-ink hover:text-accent">
                {c.name}
              </StockLink>
            </span>
            <span className={TRACK}>
              <Grid tk={tk} x={x} />
              {v != null && (
                <span className="absolute inset-y-[3px] rounded-sm" style={{ left: `${a}%`, width: `${Math.max(b - a, 0.4)}%`, backgroundColor: v < 0 ? "var(--danger)" : color }} />
              )}
            </span>
            <span className="text-right text-xs font-semibold whitespace-nowrap text-ink tabular-nums sm:text-[13px]">
              {fmt(metric, v)}
              <span className="ml-1.5 text-[11px] font-normal text-ink-soft sm:ml-0 sm:block">
                {v == null
                  ? c.oneOff && (metric === "np" || metric === "margin" || metric === "pe")
                    ? "one-off year"
                    : (metric === "np" || metric === "margin" || metric === "pe") && (c.np[1] ?? 0) < 0
                      ? "loss"
                      : "no figure"
                  : m.kind === "pool"
                    ? ss[i].share != null
                      ? `${sharePct(ss[i].share!, 1)} of pool`
                      : "loss"
                    : v > hi
                      ? "off the scale"
                      : ""}
              </span>
            </span>
          </div>
        );
      })}
      <Axis tk={tk} x={x} id={metric} />
    </div>
  );
}

/** A metric's name as shown: P/E carries its year ("P/E (FY26)"), as it is market cap over that
 * year's profit, not the trailing P/E the stock pop-ups and decks show. */
function metricLabel(m: { id: PoolMetricId; label: string }, year: string): string {
  return m.id === "pe" ? `${m.label} (${year})` : m.label;
}

// The company column stays put while the figures scroll sideways (a phone shows two or three).
const STICKY = "sticky left-0 z-[1] min-w-[8.5rem] max-w-[11rem] bg-panel sm:static sm:max-w-none";

/** The picked layer's companies with every figure; the chosen metric's column is marked. */
function LayerTable({ layer, metric, year }: { layer: LayerPool; metric: PoolMetricId; year: string }) {
  const cols: { id: PoolMetricId; label: string; cell: (c: PoolCompany) => string }[] = [
    { id: "rev", label: "Revenue", cell: (c) => croreShort(c.rev[1]) },
    { id: "np", label: "Net profit", cell: (c) => croreShort(c.np[1]) },
    { id: "margin", label: "Margin", cell: (c) => (c.np[1] != null && c.rev[1] ? pct((c.np[1] / c.rev[1]) * 100) : NA) },
    { id: "growth", label: "Rev growth", cell: (c) => fmt("growth", companyValue(c, "growth")) },
    { id: "mcap", label: "Mkt cap", cell: (c) => croreShort(c.mcapCr) },
    { id: "pe", label: `P/E (${year})`, cell: (c) => (c.np[1] != null && c.np[1] > 0 && c.mcapCr != null ? `${(c.mcapCr / c.np[1]).toFixed(1)}×` : c.np[1] != null && c.np[1] <= 0 ? "loss" : NA) },
    { id: "roce", label: "ROCE", cell: (c) => fmt("roce", c.roce) },
  ];
  const key = (c: PoolCompany) => companyValue(c, metric) ?? -Infinity;
  // Only the companies that count: the rest are in the low-exposure list, to add from there.
  const rows = [...layer.counted].sort((a, b) => key(b) - key(a));
  return (
    <div id="pools-companies" tabIndex={-1} className="flex scroll-mt-20 flex-col gap-2 border-t border-line pt-4 outline-none">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="flex items-center gap-2 font-display text-base font-semibold text-ink">
          <span aria-hidden className="h-3 w-3 flex-none rounded-sm" style={{ backgroundColor: layer.color }} />
          {layer.name}
        </h3>
        <p className="text-[11px] text-ink-soft tabular-nums sm:text-xs">
          {layer.counted.length} counted · {croreShort(groupValue(layer.counted, "rev"))} revenue · {croreShort(groupValue(layer.counted, "np"))} profit
        </p>
      </div>
      {!rows.length && <p className="text-xs text-ink-soft sm:text-[13px]">Only low-exposure companies here. Add them from the low-exposure list above to see them.</p>}
      <div className={rows.length ? "" : "hidden"}>
        <ScrollX hint={<>Scroll sideways for every column &rarr;</>}>
        <table className="w-full min-w-[640px] border-collapse text-xs tabular-nums sm:text-[13px]">
          <thead>
            <tr className="border-b border-line text-[11px] text-ink-soft">
              <th className={STICKY + " py-1.5 pr-2 text-left font-semibold"}>Company</th>
              {cols.map((c) => (
                <th key={c.id} className={"px-2 py-1.5 text-right font-semibold whitespace-nowrap " + (c.id === metric ? "bg-panel-2 text-ink" : "")}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => {
              return (
                <tr key={c.ticker} className="border-b border-line text-ink">
                  <td className={STICKY + " py-1.5 pr-2"}>
                    <StockLink ticker={c.ticker} className="tap-y hover:text-accent">
                      {c.name}
                    </StockLink>
                    <span className="ml-1.5 font-mono text-[10px] text-ink-soft">{c.ticker}</span>
                    {c.oneOff && <Tag title={`${c.oneOff}: its profit, margin and P/E are left out of the pool totals`}>One-off year · profit not in totals</Tag>}
                  </td>
                  {cols.map((col) => (
                    <td key={col.id} className={"px-2 py-1.5 text-right whitespace-nowrap " + (col.id === metric ? "bg-panel-2 font-semibold" : "") + (col.id === "np" && (c.np[1] ?? 0) < 0 ? " text-danger" : "")}>
                      {col.cell(c)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
        </ScrollX>
      </div>
    </div>
  );
}

function Tag({ title, children }: { title: string; children: string }) {
  return (
    <span title={title} className="ml-1.5 inline-block rounded border border-line px-1 align-[1px] text-[9px] font-semibold uppercase tracking-wide text-amber-ink">
      {children}
    </span>
  );
}

/**
 * "Low-exposure: 2 of 4 added": a checklist of the industry's low-exposure companies, each with its
 * layer, revenue and why it is left out by default; ticking one counts it in the pools. Closes on a
 * tap outside or Escape.
 */
function LowExposurePicker({ companies, added, onChange }: { companies: PoolCompany[]; added: ReadonlySet<string>; onChange: (s: ReadonlySet<string>) => void }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Closes just this list, not the full-screen view it sits in.
        e.preventDefault();
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  // Anchored to the button's right edge, then nudged sideways to stay 16px inside the screen (on a
  // phone the button sits near the left, where a right-anchored list would run off the edge).
  const list = useRef<HTMLDivElement>(null);
  const [shift, setShift] = useState(0);
  useLayoutEffect(() => {
    const el = list.current;
    if (!open || !el) return setShift(0);
    el.style.transform = "";
    const r = el.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    setShift(r.left < 16 ? 16 - r.left : r.right > vw - 16 ? vw - 16 - r.right : 0);
  }, [open]);
  const n = companies.filter((c) => added.has(c.ticker)).length;
  const toggle = (t: string) => {
    const next = new Set(added);
    if (next.has(t)) next.delete(t);
    else next.add(t);
    onChange(next);
  };
  // Biggest first: the ones that move the pools most.
  const sorted = [...companies].sort((a, b) => (b.rev[1] ?? -1) - (a.rev[1] ?? -1));
  const small = "min-h-8 rounded border border-btn px-2 text-[11px] font-semibold text-ink hover:bg-accent/10 disabled:border-line disabled:text-ink-soft disabled:hover:bg-transparent pointer-coarse:min-h-9";
  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="pools-low-list"
        onClick={() => setOpen((o) => !o)}
        className={"flex min-h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition " + (open || n ? "border-accent bg-accent/15 text-ink" : "border-btn text-ink-soft hover:bg-accent/10 hover:text-ink")}
      >
        Low-exposure: {n} of {companies.length} added
        <span aria-hidden className={"text-[10px] transition-transform " + (open ? "rotate-180" : "")}>
          &#9662;
        </span>
      </button>
      {open && (
        <div ref={list} id="pools-low-list" style={shift ? { transform: `translateX(${shift}px)` } : undefined} className="absolute right-0 z-30 mt-1.5 w-[min(24rem,calc(100vw-2rem))] rounded-lg border border-line bg-panel p-2 shadow-lg">
          <div className="flex items-center justify-between gap-3 border-b border-line px-1.5 pb-2">
            <span className="text-[11px] text-ink-soft">Tick to count them in the pools</span>
            <span className="flex gap-1.5">
              <button type="button" onClick={() => onChange(new Set([...added, ...companies.map((c) => c.ticker)]))} disabled={n === companies.length} className={small}>
                Add all
              </button>
              <button type="button" onClick={() => onChange(new Set([...added].filter((t) => !companies.some((c) => c.ticker === t))))} disabled={n === 0} className={small}>
                Clear
              </button>
            </span>
          </div>
          <ul className="max-h-80 overflow-y-auto overscroll-contain pt-1">
            {sorted.map((c) => (
              <li key={c.ticker}>
                <label className="flex cursor-pointer items-start gap-2.5 rounded-md px-1.5 py-2 hover:bg-panel-2">
                  <input type="checkbox" checked={added.has(c.ticker)} onChange={() => toggle(c.ticker)} className="mt-0.5 h-4 w-4 flex-none accent-[var(--accent)] pointer-coarse:h-5 pointer-coarse:w-5" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span title={c.name} className="truncate text-xs font-semibold text-ink sm:text-[13px]">{c.name}</span>
                      <span className="flex-none text-[11px] text-ink-soft tabular-nums">{croreShort(c.rev[1])}</span>
                    </span>
                    <span className="block text-[11px] leading-snug text-ink-soft">
                      {c.layer} · {c.lowExposure}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
