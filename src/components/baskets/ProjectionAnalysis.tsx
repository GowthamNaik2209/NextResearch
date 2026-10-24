"use client";

import Link from "next/link";
import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { StockLink } from "@/components/stock/StockLink";
import { fmtDay, NA, pct, signedPct } from "@/lib/format";
import { caseReturn, SCENARIOS, type Scenario, type StockProjection } from "@/lib/baskets/projection";
import { stockPath } from "@/lib/baskets/projection-basket";
import { MINI_SEG, Panel, miniSegBtn } from "./Panel";
import { EXIT_LABEL, HORIZON_LONG, PROJECTION_DISCLAIMER, SCENARIO_LABEL, type ProjectionView } from "./projection-view";

// Projection analysis, in the backtest analysis' place with Projections on (docs/PROJECTIONS.md):
// how far the simulated paths fall from a high, the chosen case beside the other cases and the
// likely range, and every stock's assumptions (growth, margin, multiple, method, years of data).
// Built like BasketAnalysis: the same tabs, small SVG charts and tables.
type View = "dd" | "paths" | "assumptions";
const VIEWS: { id: View; label: string }[] = [
  { id: "dd", label: "Drawdown" },
  { id: "paths", label: "Paths" },
  { id: "assumptions", label: "Assumptions" },
];

const signed = signedPct;
const day = (t: string) => fmtDay(t, { short: true });
const week = (t: string) => `Week of ${day(t)}`;
const tone = (v: number | null | undefined) => (v == null ? "text-ink-soft" : v >= 0 ? "text-pos" : "text-danger");
const NOTHING = "No stock in this basket has 3 years of results, so nothing is projected.";

export function ProjectionAnalysis({ view: data, heading, empty }: { view: ProjectionView | null; heading: "h2" | "h3"; empty: boolean }) {
  const [view, setView] = useState<View>("dd");
  const h = data?.settings.h ?? 1;
  const nothing = !!data && data.basket.ret == null;

  return (
    <Panel
      heading={heading}
      title={
        <>
          Projection analysis · <span className="sm:hidden">{h}Y</span>
          <span className="max-sm:hidden">next {HORIZON_LONG[h]}</span>
          {data ? ` · ${data.caseLabel}` : ""}
        </>
      }
      label={`Projection analysis, next ${HORIZON_LONG[h]}${data ? `, ${data.caseLabel}` : ""}`}
      infoLabel="About the projection analysis"
      info={
        <ul className="flex flex-col gap-1">
          <li><b>Drawdown</b>: how far below its high a typical and a bad (1 in 10) simulated path fall.</li>
          <li><b>Paths</b>: the chosen case, the other cases and the range 8 in 10 simulated paths stay within.</li>
          <li><b>Assumptions</b>: each stock&rsquo;s growth, margin, multiple, method and years of results.</li>
          <li>{PROJECTION_DISCLAIMER}</li>
        </ul>
      }
      tools={
        <div role="tablist" aria-label="Analysis view" className={MINI_SEG}>
          {VIEWS.map((v) => (
            <button key={v.id} type="button" role="tab" aria-selected={view === v.id} onClick={() => setView(v.id)} className={miniSegBtn(view === v.id)}>
              {v.label}
            </button>
          ))}
        </div>
      }
    >
      {empty || nothing ? (
        <div className="flex h-[13rem] items-center justify-center px-4 text-center text-xs text-ink-soft">{empty ? "Add stocks to see the projection analysis." : NOTHING}</div>
      ) : !data ? (
        <div aria-busy className="h-[13rem] animate-pulse bg-line/40" />
      ) : view === "dd" ? (
        <DrawdownView view={data} />
      ) : view === "paths" ? (
        <PathsView view={data} />
      ) : (
        <AssumptionsView view={data} />
      )}
    </Panel>
  );
}

/** The simulated paths' state when they aren't ready: a pulse while the past year loads, else why not. */
function SimPending({ view }: { view: ProjectionView }) {
  if (view.simState === "loading") return <div aria-busy className="h-[13rem] animate-pulse bg-line/40" />;
  return (
    <div className="flex h-[13rem] items-center justify-center px-4 text-center text-xs text-ink-soft">
      The simulated paths need the basket&rsquo;s prices over the past year, which couldn&rsquo;t be loaded. The projection itself still shows.
    </div>
  );
}

/* ---------------------------------------------------------------- Drawdown */

function DrawdownView({ view }: { view: ProjectionView }) {
  const sim = view.simState === "ok" ? view.sim : null;
  if (!sim) return <SimPending view={view} />;
  const series: Line[] = [
    { name: "Typical path", color: "var(--danger)", area: true, values: sim.ddTypical },
    { name: "Bad path (1 in 10)", color: "var(--danger)", dash: true, values: sim.ddBad },
  ];
  const rows = [
    { label: "Typical max drawdown", value: signed(sim.maxDdTypical), cls: sim.maxDdTypical < 0 ? "text-danger" : "text-ink-soft", title: "The median of the simulated paths' worst falls from a high." },
    { label: "Bad case (1 in 10)", value: signed(sim.maxDdBad), cls: sim.maxDdBad < 0 ? "text-danger" : "text-ink-soft", title: "1 in 10 simulated paths fall this far from a high, or further." },
    { label: "Chance of a 10% fall", value: pct(sim.pFall10 * 100, 0), cls: "text-ink", title: "Share of the simulated paths that fall 10% or more from a high at some point." },
    { label: "Volatility used", value: view.vol != null ? pct(view.vol * 100) : NA, cls: "text-ink", title: "The basket's swings over the past year, annualised." },
  ];
  return (
    <div className="grid lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="min-w-0 border-b border-line lg:border-b-0 lg:border-r">
        <SubTitle>% below its high so far, simulated</SubTitle>
        <LineChart dates={view.dates} series={series} dateLabel={week} />
      </div>
      <div className="min-w-0">
        <SubTitle>Falls from a high · {view.caseLabel}</SubTitle>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead className="text-[10px] text-ink-soft">
              <tr className="border-b border-line">
                <Th left>Measure</Th>
                <Th>Figure</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} title={r.title} className="border-b border-line/60 last:border-b-0">
                  <td className="px-2 py-1 text-ink-soft">{r.label}</td>
                  <td className={"px-2 py-1 text-right font-mono font-semibold " + r.cls}>{r.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="px-3 py-1.5 text-[10px] leading-snug text-ink-soft">1,000 simulated weekly paths with the chosen case as the middle, swinging like the basket did over the past year.</p>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Paths */

function PathsView({ view }: { view: ProjectionView }) {
  const series = useMemo(() => {
    const steps = view.dates.length - 1;
    const chosen = view.settings.scenario;
    const sim = view.simState === "ok" ? view.sim : null;
    const out: Line[] = [{ name: `${SCENARIO_LABEL[chosen]} case`, color: "var(--accent)", values: view.path }];
    if (sim) {
      const faint = "color-mix(in srgb, var(--accent) 55%, transparent)";
      out.push({ name: "Likely range high", color: faint, dash: true, values: sim.hi }, { name: "Likely range low", color: faint, dash: true, values: sim.lo });
    }
    SCENARIOS.filter((s): s is Scenario => s !== chosen).forEach((s) => {
      const r = view.cases[s];
      if (r != null && steps > 0) out.push({ name: `${SCENARIO_LABEL[s]} case`, color: "var(--ink-soft)", dash: true, values: stockPath(r, steps) });
    });
    return out;
  }, [view]);
  return (
    <div>
      <SubTitle>The chosen case&rsquo;s path, the other cases, and the range 8 in 10 simulated paths stay within</SubTitle>
      <LineChart dates={view.dates} series={series} dateLabel={week} />
      {view.simState !== "ok" && (
        <p className="border-t border-line px-3 py-1 text-[10px] text-ink-soft">
          {view.simState === "loading" ? "The likely range is on its way." : "The likely range needs the basket’s prices over the past year, which couldn’t be loaded."}
        </p>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- Assumptions */

/** "4 / 9 / 14%": bear / base / bull, whole % (one decimal when all are under 10%, for margins). */
function tri(t: [number, number, number], fine = false): string {
  const dp = fine && t.every((v) => Math.abs(v) < 0.1) ? 1 : 0;
  return t.map((v) => pct(v * 100, dp).replace("%", "")).join(" / ") + "%";
}
const mult = (v: number) => `${v.toFixed(1)}x`;
const why = (reason: string) => (/^[A-Z][a-z]/.test(reason) ? reason[0].toLowerCase() + reason.slice(1) : reason);

function AssumptionsView({ view }: { view: ProjectionView }) {
  const { h, scenario, exit } = view.settings;
  const cols = 7;
  return (
    <div>
      <SubTitle>
        Each stock&rsquo;s assumptions · bear / base / bull · exit at {EXIT_LABEL[exit]}
      </SubTitle>
      {/* Wide on a phone: the table scrolls inside its own box, never the page. */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[46rem] text-[11px]">
          <thead className="text-[10px] text-ink-soft">
            <tr className="border-b border-line">
              <Th left sticky>Stock</Th>
              <Th left title="P/E: earnings times P/E. P/S: revenue times price to sales, for loss-makers.">Method</Th>
              <Th left title="Fiscal years of results used">Years</Th>
              <Th title="Revenue growth a year: bear / base / bull">Growth a year</Th>
              <Th title="Net margin: bear / base / bull (P/E method only)">Net margin</Th>
              <Th title={`Today's multiple and the one it moves toward (${EXIT_LABEL[exit]})`}>Multiple now → target</Th>
              <Th title={`Projected return over the next ${HORIZON_LONG[h]}, ${view.caseLabel}`}>{SCENARIO_LABEL[scenario]} return</Th>
            </tr>
          </thead>
          <tbody>
            {view.stocks.map((s) => (
              <Row key={s.ticker} ticker={s.ticker} name={s.name} proj={s.proj} view={view} cols={cols} notHeld={view.shares.get(s.ticker) === 0} />
            ))}
          </tbody>
        </table>
      </div>
      <ul className="flex flex-col gap-0.5 border-t border-line px-3 py-1.5 text-[10px] leading-snug text-ink-soft">
        <li><b className="font-semibold text-ink">Growth</b>: its median year of revenue growth over the years shown (lower if its latest year slowed), faded part of the way toward 10% a year; bear and bull sit the same distance either side, unless that passes −25% or +40%.</li>
        <li><b className="font-semibold text-ink">Margin</b>: moves from today&rsquo;s toward halfway to its median (bear: its lowest, bull: its highest), by at most 15% of today&rsquo;s a year. A one-off year is left out.</li>
        <li><b className="font-semibold text-ink">Price</b>: today&rsquo;s earnings grown at that rate and margin, times an exit multiple moving a third of the way a year toward the target, held within 0.7× and 1.4× today&rsquo;s (bear 10% lower, bull 10% higher). Loss-makers use price to sales on revenue.</li>
        <li><b className="font-semibold text-ink">Capped</b>: a case kept within −60% to +80% a year.</li>
        <li>{PROJECTION_DISCLAIMER} <Link href="/baskets/projections" className="font-semibold text-accent underline">Full method, with a worked example</Link>.</li>
      </ul>
    </div>
  );
}

function Row({ ticker, name, proj, view, cols, notHeld }: { ticker: string; name: string; proj: StockProjection | undefined; view: ProjectionView; cols: number; notHeld: boolean }) {
  const { h, scenario, exit } = view.settings;
  const stock = (
    <td className="sticky left-0 z-[1] bg-panel px-1.5 py-1 align-middle">
      <StockLink ticker={ticker} className="block max-w-[11rem] font-semibold pointer-coarse:flex pointer-coarse:min-h-9 pointer-coarse:items-center leading-snug text-ink [overflow-wrap:anywhere] hover:text-accent hover:underline">
        {name}
      </StockLink>
      <span className="font-mono text-[10px] text-ink-soft">{ticker}</span>
    </td>
  );
  if (!proj || !proj.ok)
    return (
      <tr className="border-b border-line/60 last:border-b-0">
        {stock}
        <td colSpan={cols - 1} className="px-1.5 py-1 align-middle text-ink-soft">
          Left out: {proj ? why(proj.reason) : "no figures in our last data update"}
        </td>
      </tr>
    );
  const r = caseReturn(proj, h, scenario, exit);
  const ind = exit === "ind" && proj.targetInd != null;
  const target = ind ? proj.targetInd! : proj.targetOwn;
  return (
    <tr className="border-b border-line/60 last:border-b-0">
      {stock}
      <td className="whitespace-nowrap px-1.5 py-1 align-middle">{proj.method === "pe" ? "P/E" : "P/S"}</td>
      <td className="whitespace-nowrap px-1.5 py-1 align-middle font-mono">
        {proj.span}
        {proj.skipped && <span className="text-ink-soft"> · {proj.skipped} left out</span>}
      </td>
      <td className="whitespace-nowrap px-1.5 py-1 text-right align-middle font-mono">{tri(proj.growth)}</td>
      <td className="whitespace-nowrap px-1.5 py-1 text-right align-middle font-mono">{proj.margin ? tri(proj.margin, true) : NA}</td>
      <td className="whitespace-nowrap px-1.5 py-1 text-right align-middle font-mono">
        {mult(proj.multipleNow)} → {mult(target)}
        {exit === "ind" && !ind && <span className="block font-sans text-[10px] text-ink-soft">(own: no industry median)</span>}
      </td>
      <td className="whitespace-nowrap px-1.5 py-1 text-right align-middle font-mono">
        {notHeld ? (
          <span className="font-sans text-ink-soft" title="Set to 0%: not held">
            not held
          </span>
        ) : (
          <span className={"font-semibold " + tone(r == null ? null : r)}>{r == null ? NA : signed(r * 100)}</span>
        )}
        {proj.capped && (
          <span className="block font-sans text-[10px] text-ink-soft" title="A case hit the −60% / +80% a year bound">
            capped
          </span>
        )}
      </td>
    </tr>
  );
}

/* ---------------------------------------------------------------- Shared bits (as in BasketAnalysis) */

function SubTitle({ children }: { children: ReactNode }) {
  return <h4 className="px-3 pt-1.5 text-[10px] font-semibold text-ink-soft">{children}</h4>;
}

function Th({ children, left, title, sticky }: { children: ReactNode; left?: boolean; title?: string; /** Kept in view while the table scrolls sideways (the stock names). */ sticky?: boolean }) {
  return (
    <th scope="col" title={title} className={"whitespace-nowrap px-1.5 py-1 font-semibold " + (left ? "text-left" : "text-right") + (sticky ? " sticky left-0 z-[1] bg-panel" : "")}>
      {children}
    </th>
  );
}

type Line = { name: string; color: string; values: (number | null)[]; area?: boolean; dash?: boolean };
const W = 1000;
const H = 100;

/**
 * A small line chart over shared dates (BasketAnalysis' LineChart): SVG stretched to the box
 * (strokes stay 1.5px via non-scaling-stroke), axis labels in HTML so text never stretches. Hover
 * or drag reads out a date; `dateLabel` names it ("Week of 2 Nov 26").
 */
function LineChart({ dates, series, height = 150, dateLabel = day }: { dates: string[]; series: Line[]; height?: number; dateLabel?: (t: string) => string }) {
  const box = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const all = series.flatMap((s) => s.values.filter((v): v is number => v != null));
  let lo = Math.min(0, ...all);
  let hi = Math.max(0, ...all);
  if (hi - lo < 1) hi = lo + 1;
  const pad = (hi - lo) * 0.06;
  lo -= lo < 0 ? pad : 0;
  hi += hi > 0 ? pad : 0;
  const last = dates.length - 1;
  const xs = (i: number) => (last > 0 ? (i / last) * W : W / 2);
  const ys = (v: number) => ((hi - v) / (hi - lo)) * H;

  const path = (vals: (number | null)[]) => {
    let d = "";
    let pen = false;
    vals.forEach((v, i) => {
      if (v == null) return void (pen = false);
      d += `${pen ? "L" : "M"}${xs(i).toFixed(1)},${ys(v).toFixed(2)}`;
      pen = true;
    });
    return d;
  };
  const area = (vals: (number | null)[]) => {
    const idx = vals.map((v, i) => (v == null ? -1 : i)).filter((i) => i >= 0);
    if (idx.length < 2) return "";
    const y0 = ys(0).toFixed(2);
    return `M${xs(idx[0]).toFixed(1)},${y0}` + idx.map((i) => `L${xs(i).toFixed(1)},${ys(vals[i]!).toFixed(2)}`).join("") + `L${xs(idx[idx.length - 1]).toFixed(1)},${y0}Z`;
  };

  const pick = (e: ReactPointerEvent) => {
    const r = box.current?.getBoundingClientRect();
    if (!r || r.width === 0 || last < 0) return;
    setHover(Math.max(0, Math.min(last, Math.round(((e.clientX - r.left) / r.width) * last))));
  };
  const at = hover ?? last;
  const fmt = (v: number) => signedPct(v);
  const ticks = [hi, 0, lo].filter((v, i, a) => a.indexOf(v) === i && (v === 0 || Math.abs(v) > (hi - lo) * 0.12));

  return (
    <div className="px-3 pb-2">
      <div className="flex min-h-5 flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] sm:text-[11px]" aria-live="polite">
        <span className="font-mono text-ink-soft">{dates[at] ? dateLabel(dates[at]) : ""}</span>
        {series.map((s) => {
          const v = s.values[at];
          return (
            <span key={s.name} className="inline-flex items-center gap-1">
              <span className="inline-block h-0.5 w-3" style={{ background: s.color }} aria-hidden />
              <span className="text-ink-soft">{s.name}</span>
              <span className="font-mono font-semibold text-ink">{v == null ? NA : fmt(v)}</span>
            </span>
          );
        })}
      </div>
      <div className="relative mt-1 flex">
        <div
          ref={box}
          className="relative min-w-0 flex-1 cursor-crosshair touch-pan-y select-none"
          style={{ height }}
          onPointerDown={pick}
          onPointerMove={pick}
          onPointerLeave={(e) => e.pointerType === "mouse" && setHover(null)}
          onPointerCancel={() => setHover(null)}
          role="img"
          aria-label={series.map((s) => `${s.name} ${s.values[last] == null ? NA : fmt(s.values[last]!)}`).join(", ")}
        >
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
            {ticks.map((v) => (
              <line key={v} x1={0} x2={W} y1={ys(v)} y2={ys(v)} stroke={v === 0 ? "var(--line)" : "var(--grid)"} strokeWidth={1} vectorEffect="non-scaling-stroke" />
            ))}
            {series.map((s) =>
              s.area ? <path key={s.name + "-a"} d={area(s.values)} fill={`color-mix(in srgb, ${s.color} 22%, transparent)`} stroke="none" /> : null,
            )}
            {series.map((s) => (
              <path
                key={s.name}
                d={path(s.values)}
                fill="none"
                stroke={s.color}
                strokeWidth={1.5}
                strokeDasharray={s.dash ? "4 3" : undefined}
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {hover != null && <line x1={xs(hover)} x2={xs(hover)} y1={0} y2={H} stroke="var(--ink-soft)" strokeWidth={1} vectorEffect="non-scaling-stroke" />}
          </svg>
        </div>
        <div className="relative w-11 flex-none font-mono text-[10px] text-ink-soft" style={{ height }} aria-hidden>
          {ticks.map((v) => (
            <span key={v} className="absolute right-0 -translate-y-1/2" style={{ top: `${(ys(v) / H) * 100}%` }}>
              {fmt(v)}
            </span>
          ))}
        </div>
      </div>
      <div className="mr-11 flex justify-between font-mono text-[10px] text-ink-soft" aria-hidden>
        <span>{dates[0] ? day(dates[0]) : ""}</span>
        <span>{dates[last] ? day(dates[last]) : ""}</span>
      </div>
    </div>
  );
}
