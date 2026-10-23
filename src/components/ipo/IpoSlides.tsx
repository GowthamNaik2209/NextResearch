"use client";

import type { ReactNode } from "react";
import type { IpoDeck, IpoPeer } from "@/lib/ipo-content";
import type { Tone } from "@/lib/ipo-content/types";
import type { OpenableStock } from "@/components/research/Presentation";
import { BarChart, Chip, MixChart, Panel, SlideHead, TONE_LABEL, TONE_TEXT, ToneBadge, ToneIcon, ToneValueCell } from "@/components/research/slides";
import { NA, croreShort, inr, signedPct } from "@/lib/format";
import { StageChip } from "./StageChip";
import { businessTitle, financialsTitle, fmtCr, industryTitle, issueTitle, kpiTitle, peersTitle, proceedsTitle, revenueGrowth, risksTitle } from "./headlines";

// The ten slides of an IPO deck: a DRHP read the way an analyst would brief it - the issue,
// the business, its numbers, where the money goes, who sells, how it prices against listed
// peers, and what could go wrong. Same visual language as the industry research decks.

type SlideProps = { deck: IpoDeck; openStock: (s: OpenableStock) => void };
export type IpoSlideDef = { id: string; title: string; blurb: string; Component: (p: SlideProps) => ReactNode };

export const IPO_SLIDES: IpoSlideDef[] = [
  { id: "summary", title: "IPO summary", blurb: "Issue at a glance, headline numbers and why it matters", Component: SummarySlide },
  { id: "issue", title: "Issue structure & timeline", blurb: "Fresh issue vs offer for sale, terms and key dates", Component: IssueSlide },
  { id: "business", title: "Business model", blurb: "What the company does and where revenue comes from", Component: BusinessSlide },
  { id: "industry", title: "Industry & opportunity", blurb: "Market size, growth and the competitive set-up", Component: IndustrySlide },
  { id: "financials", title: "Financial performance", blurb: "Revenue, EBITDA and profit from the offer document", Component: FinancialsSlide },
  { id: "kpis", title: "Operating KPIs & balance sheet", blurb: "The operating metric that matters and key ratios", Component: KpiSlide },
  { id: "proceeds", title: "Use of proceeds & shareholding", blurb: "Where the money goes and who owns the company", Component: ProceedsSlide },
  { id: "peers", title: "Peer valuation", blurb: "Implied valuation against listed peers", Component: PeersSlide },
  { id: "risks", title: "Strengths & risk factors", blurb: "The DRHP's case and its key risk factors", Component: RisksSlide },
  { id: "outlook", title: "Outlook & sources", blurb: "Bull, base and bear cases and the documents behind them", Component: OutlookSlide },
];

// ---------- shared pieces ----------

function Foot({ deck, source }: { deck: IpoDeck; source?: string }) {
  return (
    <p className="mt-auto pt-5 text-[10.5px] leading-relaxed text-ink-soft">
      {source ? <>Source: {source}. </> : null}
      NextResearch summary of the offer document and public reporting, {deck.asOf}. Figures can change in the final prospectus. Not investment advice.
    </p>
  );
}

const Eyebrow = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <p className={"mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-soft " + className}>{children}</p>
);
// Glues units to their number ("₹25,583 Cr", "10.3 lakh Cr") so a narrow card never wraps "Cr" alone.
const keepUnits = (t: string) => t.replace(/ (lakh|Cr|bn|mn)\b/g, "\u00a0$1");
const fmtPct = (n: number | null) => (n == null ? "—" : `${n.toFixed(1)}%`);
// Holder colours: four distinct hues, then the same hues lighter, then grey for the remainder.
const HOLDER_COLORS = [
  "var(--accent)",
  "var(--pos)",
  "var(--amber)",
  "var(--ink-soft)",
  "color-mix(in srgb, var(--accent) 45%, var(--panel-2))",
  "color-mix(in srgb, var(--pos) 45%, var(--panel-2))",
  "color-mix(in srgb, var(--amber) 45%, var(--panel-2))",
  "color-mix(in srgb, var(--ink-soft) 45%, var(--panel-2))",
];
const shade = (i: number) => HOLDER_COLORS[i] ?? "var(--line)";

// A listed deck's own figures today, from the company table (same source and date as the peers and
// every industry page), against the authored issue price. Nothing here is typed into the deck.
function NowListed({ deck, openStock, className = "" }: SlideProps & { className?: string }) {
  const n = deck.now;
  if (!n) return null;
  const tone: Tone = n.vsIssuePct == null ? "neutral" : n.vsIssuePct > 0 ? "pos" : n.vsIssuePct < 0 ? "neg" : "neutral";
  const cells: [string, ReactNode, string?][] = [
    ["Share price", n.price != null ? `₹${inr(n.price)}` : NA],
    ["vs issue price", <span key="v" className={TONE_TEXT[tone]}>{signedPct(n.vsIssuePct)}</span>, n.issuePrice != null ? `Issue price ₹${inr(n.issuePrice)}` : undefined],
    ["Market cap", keepUnits(croreShort(n.mcapCr)), deck.issue.valuationCr != null ? `${keepUnits(croreShort(deck.issue.valuationCr))} at the issue` : undefined],
    ["P/E", n.pe != null ? `${n.pe.toFixed(1)}x` : NA, "Trailing earnings"],
  ];
  return (
    <Panel className={"border-accent p-4 " + className}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-accent">
          Now listed · {n.ticker}
        </p>
        <p className="text-[10.5px] text-ink-soft">as of {n.asOf ?? deck.asOf}</p>
      </div>
      <dl className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-3 lg:grid-cols-4">
        {cells.map(([k, v, sub]) => (
          <div key={k} className="min-w-0">
            <dt className="text-[9.5px] uppercase tracking-wide text-ink-soft">{k}</dt>
            <dd className="mt-0.5 font-display text-lg font-bold leading-tight text-ink tabular-nums">{v}</dd>
            {sub && <dd className="text-[10.5px] leading-snug text-ink-soft">{sub}</dd>}
          </div>
        ))}
      </dl>
      <p className="mt-2.5 text-[10.5px] leading-snug text-ink-soft">
        Price, market cap and P/E: Screener.in, as of {n.asOf ?? deck.asOf} - the same figures as the peer table and every industry page. Issue price from the offer document.
        {n.supplier && (
          <>
            {" "}
            <button type="button" onClick={() => openStock({ ticker: n.ticker, supplier: n.supplier! })} className="font-semibold text-accent hover:underline" aria-haspopup="dialog">
              Live price and news &rsaquo;
            </button>
          </>
        )}
      </p>
    </Panel>
  );
}

// ---------- 1. Summary ----------

function SummarySlide({ deck, openStock }: SlideProps) {
  const i = deck.issue;
  const glance: [string, string][] = [
    ["Price band", i.priceBand ?? "Not yet set"],
    ["Lot size", i.lotSize ?? "Not yet set"],
    ["Face value", i.faceValue ?? "Not disclosed"],
    ["Listing on", i.exchanges],
  ];
  return (
    <>
      <div className="relative overflow-hidden rounded-2xl border border-line bg-panel p-5 sm:p-7">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{ backgroundImage: "linear-gradient(var(--grid) 1px, transparent 1px), linear-gradient(90deg, var(--grid) 1px, transparent 1px)", backgroundSize: "28px 28px", maskImage: "linear-gradient(90deg, transparent 30%, #000 100%)", WebkitMaskImage: "linear-gradient(90deg, transparent 30%, #000 100%)" }}
        />
        <div className="relative grid grid-cols-1 gap-6 lg:grid-cols-[1.25fr_1fr] lg:items-center">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent">NextResearch IPO brief · {deck.asOf}</p>
            <h3 className="mt-2 font-display text-2xl font-bold leading-[1.1] text-ink sm:text-4xl">{deck.name} IPO</h3>
            <p className="mt-1 text-xs text-ink-soft">{deck.legalName} · {deck.sectorLabel}</p>
            <p className="mt-2 text-sm text-ink-soft sm:text-base">{deck.tagline}</p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <StageChip deck={deck} />
              <ToneBadge tone={deck.stance.tone} label={deck.stance.label} />
            </div>
            <p className="mt-2.5 max-w-xl text-[13px] leading-relaxed text-ink">{deck.stance.line}</p>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {deck.keyStats.map((s) => (
              <div key={s.label} className="rounded-xl border border-line bg-bg/70 p-3.5">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-soft">{s.label}</div>
                <div className="mt-1 font-display text-lg font-bold leading-tight text-ink [overflow-wrap:anywhere] sm:text-2xl">{keepUnits(s.value)}</div>
                {s.sub && <div className="mt-0.5 text-[11px] leading-snug text-ink-soft">{s.sub}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-2 overflow-hidden rounded-xl border border-line bg-panel lg:grid-cols-4">
        {glance.map(([k, v], n) => (
          <div key={k} className={"min-w-0 p-3 " + (n % 2 ? "border-l border-line " : "") + (n >= 2 ? "border-t border-line lg:border-t-0 " : "") + (n === 2 ? "lg:border-l" : "")}>
            <dt className="text-[9.5px] uppercase tracking-wide text-ink-soft">{k}</dt>
            <dd className="mt-0.5 text-[13px] font-semibold leading-snug text-ink">{v}</dd>
          </div>
        ))}
      </dl>

      <NowListed deck={deck} openStock={openStock} className="mt-3" />

      <Eyebrow className="mt-6">Why this IPO matters</Eyebrow>
      <ol className="grid grid-cols-1 gap-2.5 lg:grid-cols-3">
        {deck.thesis.map((t, n) => (
          <li key={t.title} className="flex gap-3 rounded-xl border border-line bg-panel p-4">
            <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-accent font-display text-sm font-bold text-bg">{n + 1}</span>
            <div>
              <h4 className="font-display text-sm font-semibold leading-snug text-ink">{t.title}</h4>
              <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">{t.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <Foot deck={deck} source={deck.sources[0]?.source} />
    </>
  );
}

// ---------- 2. Issue structure & timeline ----------

function IssueSplit({ deck }: { deck: IpoDeck }) {
  const { freshCr, ofsCr, ofsShares, totalCr } = deck.issue;
  const parts = [
    { label: "Fresh issue", sub: "New shares; money goes to the company", value: freshCr, color: "var(--accent)" },
    { label: "Offer for sale", sub: "Existing holders sell; company gets nothing", value: ofsCr, color: "var(--amber)", text: ofsCr == null ? ofsShares : undefined },
  ].filter((p) => (p.value ?? 0) > 0 || p.text);
  const known = parts.reduce((a, p) => a + (p.value ?? 0), 0);
  const allKnown = parts.every((p) => p.value != null);
  return (
    <figure>
      {allKnown && known > 0 ? (
        <div className="flex h-4 w-full gap-[2px] overflow-hidden rounded-full" role="img" aria-label={parts.map((p) => `${p.label} ${fmtCr(p.value)}`).join(", ")}>
          {parts.map((p) => (
            <span key={p.label} style={{ width: `${((p.value ?? 0) / known) * 100}%`, background: p.color }} />
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-line px-3 py-2 text-[11.5px] text-ink-soft">The rupee split is not fixed yet; it depends on the final price band.</p>
      )}
      <ul className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {parts.map((p) => (
          <li key={p.label} className="rounded-xl border border-line bg-bg/60 p-3.5">
            <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-ink-soft">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: p.color }} />
              {p.label}
            </span>
            <div className="mt-1 font-display text-xl font-bold text-ink">{p.value != null ? fmtCr(p.value) : p.text}</div>
            {p.value != null && totalCr ? <div className="font-mono text-[11px] text-ink-soft">{Math.round((p.value / totalCr) * 100)}% of the issue</div> : null}
            <p className="mt-1 text-[11.5px] leading-snug text-ink-soft">{p.sub}</p>
          </li>
        ))}
      </ul>
    </figure>
  );
}

function IssueSlide({ deck }: SlideProps) {
  const i = deck.issue;
  const rows: [string, string | null][] = [
    ["Total issue", i.size],
    ["Price band", i.priceBand],
    ["Lot size", i.lotSize],
    ["Face value", i.faceValue],
    ["Implied valuation", i.valuation],
    ["Reservation", i.reservation],
    ["Exchanges", i.exchanges],
    ["Registrar", i.registrar],
  ];
  return (
    <>
      <SlideHead n={2} eyebrow="Issue structure & timeline" title={issueTitle(deck)} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="flex flex-col gap-4">
          <Panel className="p-4 sm:p-5">
            <h4 className="mb-3 font-display text-sm font-semibold text-ink">Where the money goes</h4>
            <IssueSplit deck={deck} />
          </Panel>
          <Panel className="overflow-hidden">
            <div className="border-b border-line bg-panel-2 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-ink">Issue details</div>
            <table className="w-full text-[12.5px]">
              <tbody>
                {rows.map(([k, v]) => (
                  <tr key={k} className="border-b border-line last:border-0">
                    <td className="px-4 py-2 align-top text-ink-soft">{k}</td>
                    <td className={"px-4 py-2 text-right font-semibold " + (v ? "text-ink" : "text-ink-soft")}>{v ?? "Not yet disclosed"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-line px-4 py-3">
              <p className="text-[9.5px] uppercase tracking-wide text-ink-soft">Book-running lead managers</p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {i.leadManagers.map((m) => (
                  <Chip key={m}>{m}</Chip>
                ))}
              </div>
            </div>
          </Panel>
        </div>
        <Panel className="p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h4 className="font-display text-sm font-semibold text-ink">Timeline</h4>
            <StageChip deck={deck} />
          </div>
          <p className="mt-2 text-[12px] leading-relaxed text-ink-soft">{deck.status.detail}</p>
          <ol className="mt-4">
            {deck.timeline.map((t, n) => {
              const last = n === deck.timeline.length - 1;
              return (
                <li key={t.event + t.date} className="relative flex gap-3 pb-4 last:pb-0">
                  {!last && <span aria-hidden className={"absolute left-[7px] top-4 h-full w-px " + (t.done ? "bg-accent" : "border-l border-dashed border-line")} />}
                  <span
                    aria-hidden
                    className={"relative z-[1] mt-0.5 h-[15px] w-[15px] flex-none rounded-full border-2 " + (t.done ? "border-accent bg-accent" : "border-line bg-bg")}
                  />
                  <div className="min-w-0">
                    <span className={"font-mono text-[11px] font-semibold " + (t.done ? "text-accent" : "text-ink-soft")}>{t.date}</span>
                    <p className={"text-[12.5px] leading-snug " + (t.done ? "text-ink" : "text-ink-soft")}>
                      {t.event}
                      <span className="sr-only">{t.done ? " (done)" : " (upcoming)"}</span>
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </Panel>
      </div>
      <Foot deck={deck} />
    </>
  );
}

// ---------- 3. Business ----------

function BusinessSlide({ deck }: SlideProps) {
  const b = deck.business;
  return (
    <>
      <SlideHead n={3} eyebrow="Business model" title={businessTitle(deck)} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {b.segments.map((s, n) => (
            <div key={s.title} className={"flex flex-col rounded-xl border border-line bg-panel p-4 " + (b.segments.length % 2 && n === b.segments.length - 1 ? "sm:col-span-2" : "")}>
              <span className="font-mono text-[10px] font-bold text-accent">SEGMENT {n + 1}</span>
              <div className="mt-1.5 font-display text-xl font-bold text-ink">{s.metric}</div>
              <h4 className="mt-1 font-display text-sm font-semibold text-ink">{s.title}</h4>
              <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">{s.body}</p>
            </div>
          ))}
        </div>
        <Panel className="p-4 sm:p-5">
          <h4 className="font-display text-sm font-semibold text-ink">{b.mix.title}</h4>
          <p className="mb-4 text-[10.5px] text-ink-soft">Share, %</p>
          <MixChart mix={b.mix} />
        </Panel>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[repeat(var(--n),minmax(0,1fr))]" style={{ ["--n" as string]: b.narrative.length }}>
        {b.narrative.map((p, n) => (
          <p key={n} className="border-l-2 border-accent pl-3 text-[12.5px] leading-relaxed text-ink">
            {p}
          </p>
        ))}
      </div>
      <Foot deck={deck} source={b.mix.source} />
    </>
  );
}

// ---------- 4. Industry ----------

function IndustrySlide({ deck }: SlideProps) {
  const o = deck.industry;
  return (
    <>
      <SlideHead n={4} eyebrow="Industry & opportunity" title={industryTitle(deck)} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.35fr_1fr]">
        <Panel className="p-4 sm:p-5">
          <div className="flex items-baseline justify-between gap-3">
            <h4 className="font-display text-sm font-semibold text-ink">{o.chart.title}</h4>
            <span className="flex-none text-[10.5px] text-ink-soft">{o.chart.unit}</span>
          </div>
          <div className="mt-4">
            <BarChart points={o.chart.points} unit={o.chart.unit} />
          </div>
        </Panel>
        <Panel className="overflow-hidden">
          <div className="border-b border-line bg-panel-2 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-ink">Market snapshot</div>
          <table className="w-full text-[12.5px]">
            <tbody>
              {o.snapshot.map((row) => (
                <tr key={row.label} className="border-b border-line last:border-0">
                  <td className="px-4 py-2 text-ink-soft">{row.label}</td>
                  <ToneValueCell tone={row.tone} value={row.value} />
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[repeat(var(--n),minmax(0,1fr))]" style={{ ["--n" as string]: o.narrative.length }}>
        {o.narrative.map((p, n) => (
          <p key={n} className="border-l-2 border-accent pl-3 text-[12.5px] leading-relaxed text-ink">
            {p}
          </p>
        ))}
      </div>
      <Foot deck={deck} source={o.chart.source} />
    </>
  );
}

// ---------- 5. Financials ----------

const SERIES = [
  { key: "revenue", label: "Revenue", color: "var(--accent)", loss: "var(--danger)" },
  { key: "ebitda", label: "EBITDA", color: "color-mix(in srgb, var(--accent) 45%, var(--panel-2))", loss: "color-mix(in srgb, var(--danger) 50%, var(--panel-2))" },
  { key: "pat", label: "PAT", color: "var(--series-3)", loss: "var(--danger)" },
] as const;

// A part-year period is drawn hatched (outlined, striped) in its series colour, so it never reads as another series.
const barFill = (color: string, partial?: boolean) =>
  partial ? { border: `1px solid ${color}`, background: `repeating-linear-gradient(135deg, ${color} 0 3px, transparent 3px 6px)` } : { background: color };

// Grouped bars with a shared zero line, so losses hang below it on the same scale.
function FinChart({ deck }: { deck: IpoDeck }) {
  const ys = deck.financials.years;
  const vals = ys.flatMap((y) => [y.revenue, y.ebitda ?? 0, y.pat ?? 0]);
  const maxPos = Math.max(...vals, 1);
  const maxNeg = Math.max(...vals.map((v) => -v), 0);
  const posShare = maxPos / (maxPos + maxNeg);
  // Every bar label in the unit of the largest value, so "1.1L" never sits next to "55k".
  const lakh = Math.max(maxPos, maxNeg) >= 100000;
  const compact = (v: number) => {
    const a = Math.abs(v);
    const s = lakh ? `${(a / 100000).toFixed(a >= 1000000 ? 0 : 1)}L` : a >= 10000 ? `${Math.round(a / 1000)}k` : a >= 1000 ? `${(a / 1000).toFixed(1)}k` : `${Math.round(a)}`;
    return (v < 0 ? "-" : "") + s;
  };
  const shown = SERIES.filter((s) => ys.some((y) => (y[s.key] ?? -1) >= 0));
  const anyLoss = ys.some((y) => (y.ebitda ?? 0) < 0 || (y.pat ?? 0) < 0);
  const label = ys.map((y) => `${y.label}: revenue ${fmtCr(y.revenue)}, EBITDA ${fmtCr(y.ebitda)}, PAT ${fmtCr(y.pat)}`).join("; ");
  return (
    <figure>
      <div className="relative flex h-52 gap-3 sm:h-60 sm:gap-6" role="img" aria-label={label}>
        <span aria-hidden className="absolute inset-x-0 border-t border-line" style={{ top: `${posShare * 100}%` }} />
        {ys.map((y) => (
          <div key={y.label} className="flex h-full min-w-0 flex-1 justify-center gap-1 sm:gap-1.5">
            {SERIES.map((s) => {
              const v = y[s.key];
              const neg = v != null && v < 0;
              const color = neg ? s.loss : s.color;
              return (
                <div key={s.key} className="group relative flex h-full w-full max-w-[34px] flex-col">
                  <div className="flex flex-col justify-end" style={{ height: `${posShare * 100}%` }}>
                    {v != null && v >= 0 && (
                      <>
                        <span className="mb-0.5 hidden text-center font-mono text-[9px] tabular-nums text-ink-soft sm:block">{compact(v)}</span>
                        <div className="rounded-t-[3px]" style={{ height: `${(v / maxPos) * 100}%`, minHeight: 2, ...barFill(color, y.partial) }} />
                      </>
                    )}
                  </div>
                  <div className="flex flex-col" style={{ height: `${(1 - posShare) * 100}%` }}>
                    {neg && (
                      <>
                        <div className="rounded-b-[3px]" style={{ height: `${(-v / Math.max(maxNeg, 1)) * 100}%`, minHeight: 2, ...barFill(color, y.partial) }} />
                        <span className="mt-0.5 hidden text-center font-mono text-[9px] tabular-nums text-danger sm:block">{compact(v)}</span>
                      </>
                    )}
                  </div>
                  {v == null && <span className="absolute inset-x-0 text-center text-[9px] text-ink-soft" style={{ top: `calc(${posShare * 100}% - 14px)` }}>n/a</span>}
                  <span className="pointer-events-none absolute -top-7 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-line bg-bg px-2 py-1 text-[10.5px] text-ink shadow-lg group-hover:block">
                    {y.label} {s.label}: {fmtCr(v)}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-3 border-t border-line pt-1.5 sm:gap-6">
        {ys.map((y) => (
          <span key={y.label} className={"min-w-0 flex-1 truncate text-center font-mono text-[10.5px] " + (y.partial ? "text-ink-soft" : "text-ink")}>
            {y.label}
          </span>
        ))}
      </div>
      <figcaption className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10.5px] text-ink-soft">
        {shown.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} /> {s.label}
          </span>
        ))}
        {anyLoss && (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-danger" /> Loss
          </span>
        )}
        {ys.some((y) => y.partial) && (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={barFill("var(--ink-soft)", true)} /> Part-year
          </span>
        )}
        <span>₹ Cr</span>
      </figcaption>
    </figure>
  );
}


function FinancialsSlide({ deck }: SlideProps) {
  const ys = deck.financials.years;
  const g = revenueGrowth(deck);
  return (
    <>
      <SlideHead n={5} eyebrow="Financial performance" title={financialsTitle(deck)} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Panel className="p-4 sm:p-5">
          <h4 className="mb-8 font-display text-sm font-semibold text-ink">Revenue, EBITDA and profit</h4>
          <FinChart deck={deck} />
        </Panel>
        <Panel className="overflow-x-auto">
          <table className="w-full text-[11px] sm:text-[12px]">
            <thead>
              <tr className="border-b border-line bg-panel-2 text-left text-[9.5px] uppercase tracking-wider text-ink-soft">
                <th className="px-1.5 py-2.5 sm:px-3 font-semibold">₹ Cr</th>
                {ys.map((y) => (
                  <th key={y.label} className="px-1.5 py-2.5 sm:px-3 text-right font-semibold">
                    {y.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="font-mono tabular-nums">
              {(
                [
                  ["Revenue", (y: (typeof ys)[number]) => fmtNum(y.revenue)],
                  ["EBITDA", (y: (typeof ys)[number]) => fmtNum(y.ebitda)],
                  ["EBITDA margin", (y: (typeof ys)[number]) => fmtPct(y.ebitda != null ? (y.ebitda / y.revenue) * 100 : null)],
                  ["PAT", (y: (typeof ys)[number]) => fmtNum(y.pat)],
                  ["PAT margin", (y: (typeof ys)[number]) => fmtPct(y.pat != null ? (y.pat / y.revenue) * 100 : null)],
                ] as const
              ).map(([k, f]) => (
                <tr key={k} className="border-b border-line last:border-0">
                  <td className="px-1.5 py-2 sm:px-3 font-sans text-ink-soft">{k}</td>
                  {ys.map((y) => {
                    const v = f(y);
                    return (
                      <td key={y.label} className={"px-1.5 py-2 sm:px-3 text-right " + (v.startsWith("-") ? "text-danger" : "text-ink")}>
                        {v}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {g && (
            <p className="border-t border-line px-1.5 py-2.5 sm:px-3 text-[11.5px] text-ink-soft">
              Revenue CAGR {g.a.label}-{g.b.label}: <b className="font-mono text-ink">{g.cagr.toFixed(1)}%</b>
            </p>
          )}
        </Panel>
      </div>
      <p className="mt-4 border-l-2 border-accent pl-3 text-[12.5px] leading-relaxed text-ink">{deck.financials.note}</p>
      <Foot deck={deck} source={deck.financials.source} />
    </>
  );
}

const fmtNum = (n: number | null) => (n == null ? "—" : Math.round(n).toLocaleString("en-IN"));

// ---------- 6. KPIs ----------

function KpiSlide({ deck }: SlideProps) {
  return (
    <>
      <SlideHead n={6} eyebrow="Operating KPIs & balance sheet" title={kpiTitle(deck)} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.35fr_1fr]">
        <Panel className="p-4 sm:p-5">
          <div className="flex items-baseline justify-between gap-3">
            <h4 className="font-display text-sm font-semibold text-ink">{deck.kpi.title}</h4>
            <span className="flex-none text-[10.5px] text-ink-soft">{deck.kpi.unit}</span>
          </div>
          <div className="mt-4">
            <BarChart points={deck.kpi.points} unit={deck.kpi.unit} />
          </div>
        </Panel>
        <Panel className="overflow-hidden">
          <div className="border-b border-line bg-panel-2 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-ink">Key ratios</div>
          <table className="w-full text-[12.5px]">
            <tbody>
              {deck.ratios.map((row) => (
                <tr key={row.label} className="border-b border-line last:border-0">
                  <td className="px-4 py-2 text-ink-soft">{row.label}</td>
                  <ToneValueCell tone={row.tone} value={row.value} />
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>
      <Foot deck={deck} source={deck.kpi.source} />
    </>
  );
}


// ---------- 7. Proceeds & shareholding ----------

function Donut({ slices }: { slices: { holder: string; pct: number }[] }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  // Each slice starts where the previous ones end.
  const starts = slices.map((_, i) => slices.slice(0, i).reduce((a, s) => a + (s.pct / 100) * c, 0));
  return (
    <svg viewBox="0 0 140 140" className="h-36 w-36 flex-none -rotate-90" role="img" aria-label={slices.map((s) => `${s.holder} ${s.pct}%`).join(", ")}>
      <circle cx="70" cy="70" r={r} fill="none" stroke="var(--panel-2)" strokeWidth="22" />
      {slices.map((s, i) => (
        <circle key={s.holder} cx="70" cy="70" r={r} fill="none" stroke={shade(i)} strokeWidth="22" strokeDasharray={`${Math.max(0, (s.pct / 100) * c - 1.5)} ${c}`} strokeDashoffset={-starts[i]} />
      ))}
    </svg>
  );
}

function ProceedsSlide({ deck }: SlideProps) {
  const uses = deck.useOfProceeds;
  const fresh = deck.issue.freshCr;
  // Bars show each object's share of the fresh issue (the % beside it), not its size against the largest.
  const base = fresh || Math.max(...uses.map((u) => u.valueCr), 1);
  // Largest first, with the "Other ..." remainder always last.
  const isOther = (h: { holder: string }) => /^others?\b/i.test(h.holder);
  const holders = [...deck.shareholding].sort((a, b) => Number(isOther(a)) - Number(isOther(b)) || b.pct - a.pct);
  return (
    <>
      <SlideHead n={7} eyebrow="Use of proceeds & shareholding" title={proceedsTitle(deck)} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel className="p-4 sm:p-5">
          <h4 className="font-display text-sm font-semibold text-ink">{uses.length ? "Objects of the fresh issue" : "No fresh issue"}</h4>
          {uses.length ? <p className="mb-4 text-[10.5px] text-ink-soft">₹ Cr{fresh ? `, of a ${fmtCr(fresh)} fresh issue` : ""}</p> : null}
          {uses.length ? (
            <ul className="space-y-3">
              {uses.map((u) => (
                <li key={u.label}>
                  <div className="flex items-baseline justify-between gap-3 text-[12px]">
                    <span className="min-w-0 text-ink">{u.label}</span>
                    <span className="flex-none font-mono font-semibold tabular-nums text-ink">
                      {fmtNum(u.valueCr)}
                      {fresh ? <span className="ml-1.5 text-[10.5px] font-normal text-ink-soft">{Math.round((u.valueCr / fresh) * 100)}%</span> : null}
                    </span>
                  </div>
                  <div className="mt-1 h-2 w-full rounded-full bg-panel-2">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, Math.max(2, (u.valueCr / base) * 100))}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
          <p className="mt-4 text-[12px] leading-relaxed text-ink-soft">{deck.proceedsNote}</p>
        </Panel>
        <Panel className="p-4 sm:p-5">
          <h4 className="font-display text-sm font-semibold text-ink">Pre-issue shareholding</h4>
          <p className="mb-4 text-[10.5px] text-ink-soft">% of equity, from the offer document</p>
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
            <Donut slices={holders} />
            <ul className="w-full min-w-0 space-y-2">
              {holders.map((h, i) => (
                <li key={h.holder} className="flex items-baseline justify-between gap-3 text-[12px]">
                  <span className="inline-flex min-w-0 items-center gap-2 text-ink">
                    <span className="h-2.5 w-2.5 flex-none rounded-sm" style={{ background: shade(i) }} />
                    <span>{h.holder}</span>
                  </span>
                  <span className="flex-none font-mono font-semibold tabular-nums text-ink">{h.pct.toFixed(1)}%</span>
                </li>
              ))}
            </ul>
          </div>
          {deck.sellers.length > 0 && (
            <div className="mt-5 border-t border-dashed border-line pt-3">
              <p className="text-[9.5px] uppercase tracking-wide text-ink-soft">Selling in the offer for sale</p>
              <ul className="mt-2 space-y-1.5">
                {deck.sellers.map((s) => (
                  <li key={s.name} className="text-[12px] leading-snug">
                    <span className="font-semibold text-ink">{s.name}</span>
                    <span className="text-ink-soft"> · {s.detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Panel>
      </div>
      <Foot deck={deck} />
    </>
  );
}

// ---------- 8. Peers ----------

function PeerName({ p, openStock }: { p: IpoPeer; openStock: SlideProps["openStock"] }) {
  const inner = (
    <>
      <span className={"block font-display text-sm font-semibold " + (p.supplier ? "text-ink group-hover:text-accent" : "text-ink")}>
        {p.name}
        {p.supplier && (
          <span aria-hidden className="ml-1 text-accent">
            &rsaquo;
          </span>
        )}
      </span>
      <span className="block font-mono text-[10.5px] text-ink-soft">{p.ticker ? `NSE: ${p.ticker}` : "Not NSE-listed"}</span>
    </>
  );
  return p.supplier && p.ticker ? (
    <button type="button" onClick={() => openStock({ ticker: p.ticker!, supplier: p.supplier! })} className="group text-left" aria-haspopup="dialog">
      {inner}
    </button>
  ) : (
    <div>{inner}</div>
  );
}

function PeersSlide({ deck, openStock }: SlideProps) {
  const v = deck.issue.valuationCr;
  const lastRev = deck.financials.years.filter((y) => !y.partial).at(-1);
  const rows = [...deck.peers].sort((a, b) => (b.mcapCr ?? -1) - (a.mcapCr ?? -1));
  // Market cap over latest-year revenue, worked out from the same figures shown in the row.
  const ps = (p: IpoPeer) => (p.mcapCr != null && p.revenueCr ? `${(p.mcapCr / p.revenueCr).toFixed(1)}x` : "—");
  const dates = [...new Set(rows.filter((p) => p.ticker).map((p) => p.asOf))];
  const max = Math.max(v ?? 0, ...rows.map((r) => r.mcapCr ?? 0), 1);
  const bar = (n: number | null, self = false) =>
    n == null ? (
      <span className="text-ink-soft">—</span>
    ) : (
      <div className="flex items-center gap-2">
        <div className="h-2 w-20 flex-none rounded-full bg-panel-2 sm:w-32">
          <div className={"h-full rounded-full " + (self ? "bg-accent" : "bg-ink-soft/60")} style={{ width: `${Math.max(2, (n / max) * 100)}%` }} />
        </div>
        <span className="font-mono tabular-nums text-ink">{fmtCr(n)}</span>
      </div>
    );
  return (
    <>
      <SlideHead n={8} eyebrow="Peer valuation" title={peersTitle(deck)} />
      <Panel className="mb-3 flex flex-col gap-2 border-accent p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-accent">{deck.name} at the IPO</p>
          <p className="mt-0.5 text-[12.5px] text-ink">{deck.issue.valuation ?? "Valuation not yet set"}</p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-[12px]">
          {v != null && <span>{bar(v, true)}</span>}
          {v != null && lastRev && <span className="font-mono text-ink-soft">{(v / lastRev.revenue).toFixed(1)}x {lastRev.label} sales</span>}
        </div>
      </Panel>
      <NowListed deck={deck} openStock={openStock} className="mb-3" />
      {/* Phone and tablet: cards; lg up: a table (it needs ~760px). */}
      <ul className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:hidden">
        {rows.map((p) => (
          <li key={p.name} className="rounded-xl border border-line bg-panel p-3.5">
            <PeerName p={p} openStock={openStock} />
            <div className="mt-2 text-[11px]">{bar(p.mcapCr)}</div>
            <dl className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
              <div>
                <dt className="text-[9.5px] uppercase tracking-wide text-ink-soft">Revenue FY26</dt>
                <dd className="font-mono text-ink">{fmtCr(p.revenueCr)}</dd>
              </div>
              <div>
                <dt className="text-[9.5px] uppercase tracking-wide text-ink-soft">P/E</dt>
                <dd className="font-mono text-ink">{p.pe != null ? p.pe.toFixed(1) : "—"}</dd>
              </div>
              <div>
                <dt className="text-[9.5px] uppercase tracking-wide text-ink-soft">Mcap / sales</dt>
                <dd className="font-mono text-ink">{ps(p)}</dd>
              </div>
            </dl>
            <p className="mt-2 text-[11.5px] leading-snug text-ink-soft">{p.note}</p>
          </li>
        ))}
      </ul>
      <Panel className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[760px] text-[12px]">
          <thead>
            <tr className="border-b border-line bg-panel-2 text-left text-[9.5px] uppercase tracking-wider text-ink-soft">
              <th className="px-4 py-2.5 font-semibold">Company</th>
              <th className="px-3 py-2.5 font-semibold">Market cap</th>
              <th className="px-3 py-2.5 text-right font-semibold">Revenue FY26</th>
              <th className="px-3 py-2.5 text-right font-semibold">P/E</th>
              <th className="px-3 py-2.5 text-right font-semibold">Mcap / sales</th>
              <th className="px-4 py-2.5 font-semibold">Why it compares</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.name} className="border-b border-line align-top last:border-0">
                <td className="whitespace-nowrap px-4 py-2.5">
                  <PeerName p={p} openStock={openStock} />
                </td>
                <td className="whitespace-nowrap px-3 py-2.5">{bar(p.mcapCr)}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono tabular-nums text-ink">{fmtCr(p.revenueCr)}</td>
                <td className="px-3 py-2.5 text-right font-mono tabular-nums text-ink">{p.pe != null ? p.pe.toFixed(1) : "—"}</td>
                <td className="px-3 py-2.5 text-right font-mono tabular-nums text-ink">{ps(p)}</td>
                <td className="px-4 py-2.5 text-[11.5px] leading-snug text-ink-soft">{p.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
      <p className="mt-3 border-l-2 border-accent pl-3 text-[12.5px] leading-relaxed text-ink">{deck.valuationNote}</p>
      <p className="mt-2 text-[10.5px] text-ink-soft">
        NSE peers: Screener.in, as of {dates.join(" / ") || deck.asOf} - the same figures as their industry and policy pages; revenue is the latest full fiscal year (FY26), P/E on trailing earnings and blank for loss-making companies.{rows.some((p) => !p.ticker) ? ` Other peers as of ${deck.asOf}.` : ""}{rows.some((p) => p.supplier) ? " Peers marked › open their live price, financials and news, which can differ from the snapshot." : ""}
      </p>
      <Foot deck={deck} />
    </>
  );
}

// ---------- 9. Strengths & risks ----------

const SEVERITY = { high: "text-danger", medium: "text-amber-ink", low: "text-ink-soft" } as const;
const RISK_ORDER = { high: 0, medium: 1, low: 2 } as const;

function RisksSlide({ deck }: SlideProps) {
  return (
    <>
      <SlideHead n={9} eyebrow="Strengths & risk factors" title={risksTitle(deck)} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section>
          <Eyebrow>Strengths (as the offer document argues them)</Eyebrow>
          <ul className="space-y-2">
            {deck.strengths.map((s) => (
              <li key={s.title} className="flex gap-2.5 rounded-xl border border-line bg-panel p-3.5">
                <ToneIcon tone="pos" className="mt-[5px]" />
                <div>
                  <h4 className="font-display text-sm font-semibold leading-snug text-ink">{s.title}</h4>
                  <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">{s.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <Eyebrow>Key risk factors</Eyebrow>
          <ul className="space-y-2">
            {[...deck.risks].sort((a, b) => RISK_ORDER[a.severity] - RISK_ORDER[b.severity]).map((k) => (
              <li key={k.risk} className="rounded-xl border border-line bg-panel p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <span className="font-display text-sm font-semibold leading-snug text-ink">{k.risk}</span>
                  <span className={"flex-none rounded-full border border-line bg-panel-2 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide " + SEVERITY[k.severity]}>{k.severity}</span>
                </div>
                <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">
                  <span className="font-semibold text-ink">Mitigant: </span>
                  {k.mitigant}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <Foot deck={deck} source="Risk factors section of the offer document" />
    </>
  );
}

// ---------- 10. Outlook & sources ----------

function OutlookSlide({ deck }: SlideProps) {
  const cases: [string, string, Tone][] = [
    ["Bull", deck.outlook.bull, "pos"],
    ["Base", deck.outlook.base, "neutral"],
    ["Bear", deck.outlook.bear, "neg"],
  ];
  return (
    <>
      <SlideHead n={10} eyebrow="Outlook & sources" title={`What would have to go right, and wrong, for ${deck.name} after listing`} />
      <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-3">
        {cases.map(([label, text, tone]) => (
          <div key={label} className={"rounded-xl border bg-panel p-4 " + (label === "Base" ? "border-accent" : "border-line")}>
            <span className={"inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide " + TONE_TEXT[tone]}>
              <ToneIcon tone={tone} /> {label} case
              <span className="sr-only"> ({TONE_LABEL[tone]})</span>
            </span>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink">{text}</p>
          </div>
        ))}
      </div>
      <section className="mt-5">
        <Eyebrow>Offer document & sources</Eyebrow>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {/* Each link once (a repeated URL also gave React a duplicate key). */}
          {deck.sources.filter((l, i, all) => all.findIndex((x) => x.url === l.url) === i).map((l) => (
            <li key={l.url}>
              <a href={l.url} target="_blank" rel="noopener noreferrer" className="group flex h-full items-start gap-3 rounded-xl border border-line bg-panel p-3.5 transition hover:border-accent">
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold leading-snug text-ink group-hover:text-accent">{l.title}</span>
                  <span className="mt-0.5 block text-[11px] text-ink-soft">
                    {l.source}
                    {l.year ? ` · ${l.year}` : ""}
                  </span>
                </span>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-none text-ink-soft group-hover:text-accent" aria-hidden>
                  <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
                </svg>
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </li>
          ))}
        </ul>
      </section>
      <p className="mt-4 rounded-xl border border-dashed border-line p-3 text-[11.5px] leading-relaxed text-ink-soft">
        {deck.status.stage === "listed"
          ? "This is a summary for research, not a recommendation to buy or sell. The shares now trade on the exchange; read the prospectus and the company's filings since listing before investing."
          : deck.status.stage === "open" || deck.status.stage === "upcoming"
            ? "This is a summary for research, not a recommendation to apply. Read the red herring prospectus before investing; the issue size and allotment can still change until the final prospectus is filed."
            : "This is a summary for research, not a recommendation to apply. There is no red herring prospectus yet: price band, issue size and dates will only be fixed when one is filed."}
      </p>
      <Foot deck={deck} />
    </>
  );
}
