"use client";

import type { ReactNode } from "react";
import { croreShort } from "@/lib/format";
import type { Deck, DeckCompany, Tone } from "@/lib/sector-content/reports";
import type { PestleKey, SeriesPoint } from "@/lib/sector-content/reports/types";
import {
  beneficiariesTitle,
  companyNewsTitle,
  developmentsTitle,
  driversTitle,
  outlookTitle,
  overviewTitle,
  pestleTitle,
  scorecardTitle,
  valueChainTitle,
} from "./headlines";

// The ten slides of a research deck, in order. Each slide leads with an "action
// title" — the one-sentence takeaway — derived from the deck's data where it
// can be, the way consulting decks are written, then the evidence below it.

type SlideProps = { deck: Deck; openCompany: (c: DeckCompany) => void };
export type SlideDef = {
  id: string;
  title: string;
  blurb: string;
  Component: (p: SlideProps) => ReactNode;
  cta?: (deck: Deck) => { href: string; label: string };
  /** Optional second, outlined link next to the page button. */
  extra?: (deck: Deck) => { href: string; label: string };
};

const pageLabel = (d: Deck) => (d.category === "policy" ? "policy" : "industry");

export const SLIDES: SlideDef[] = [
  { id: "summary", title: "Investor summary", blurb: "Stance, headline numbers and the three-point thesis", Component: SummarySlide },
  { id: "developments", title: "Latest developments", blurb: "Dated policy, demand and supply-chain moves", Component: DevelopmentsSlide },
  { id: "overview", title: "Industry overview", blurb: "Market size, growth and the industry snapshot", Component: OverviewSlide },
  {
    id: "value-chain",
    title: "Value chain & profit pools",
    blurb: "Where margins and moats sit along the chain",
    Component: ValueChainSlide,
    extra: (d) => ({ href: `/sector/${d.slug}/explore`, label: "Explore in 3D" }),
  },
  { id: "drivers", title: "Growth drivers", blurb: "What pulls demand and how the market splits", Component: DriversSlide },
  { id: "pestle", title: "PESTLE analysis", blurb: "Political, economic, social, technological, legal, environmental", Component: PestleSlide },
  {
    id: "beneficiaries",
    title: "Key beneficiaries",
    blurb: "Listed companies best placed, by how directly they benefit",
    Component: BeneficiariesSlide,
    cta: (d) => ({ href: `/sector/${d.slug}#companies`, label: `See every company on the ${pageLabel(d)} page` }),
  },
  {
    id: "scorecard",
    title: "Financial scorecard",
    blurb: "Growth, margins and valuation of the beneficiaries",
    Component: ScorecardSlide,
    cta: (d) => ({ href: `/sector/${d.slug}#companies`, label: `Compare companies on the ${pageLabel(d)} page` }),
  },
  { id: "company-news", title: "Company developments", blurb: "What companies did and what it means for the industry", Component: CompanyNewsSlide },
  { id: "outlook", title: "Risks, outlook & further reading", blurb: "Key risks, bull/base/bear cases and reports to read next", Component: OutlookSlide },
];

// ---------- shared pieces ----------

export const TONE_TEXT: Record<Tone, string> = { pos: "text-pos", neg: "text-danger", neutral: "text-ink-soft" };
export const TONE_LABEL: Record<Tone, string> = { pos: "Tailwind", neg: "Headwind", neutral: "Neutral" };

export function ToneIcon({ tone, className = "" }: { tone: Tone; className?: string }) {
  return (
    <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden className={"flex-none " + TONE_TEXT[tone] + " " + className} fill="currentColor">
      {tone === "pos" ? <path d="M6 1.5l4.5 7.5h-9z" /> : tone === "neg" ? <path d="M6 10.5L1.5 3h9z" /> : <circle cx="6" cy="6" r="3.2" />}
    </svg>
  );
}

// A snapshot/ratio table's value cell. The arrow is inline text glued to the value's first word,
// so when a long value wraps on a phone the arrow stays beside it instead of floating at the
// cell's left edge (an inline-flex box put "▲" a column away from "38.9%" on the OYO deck).
export function ToneValueCell({ tone, value }: { tone?: Tone; value: string }) {
  const v = value;
  const sp = v.indexOf(" ");
  const [first, rest] = sp < 0 ? [v, ""] : [v.slice(0, sp), v.slice(sp)];
  return (
    <td className={"px-4 py-2 text-right font-mono font-semibold tabular-nums " + (tone ? TONE_TEXT[tone] : "text-ink")}>
      {tone && tone !== "neutral" ? (
        <>
          <span className="whitespace-nowrap">
            <ToneIcon tone={tone} className="mr-1.5 inline-block align-[-0.05em]" />
            {first}
          </span>
          {rest}
        </>
      ) : (
        v
      )}
    </td>
  );
}

export function ToneBadge({ tone, label }: { tone: Tone; label?: string }) {
  return (
    <span className={"inline-flex items-center gap-1.5 rounded-full border border-line bg-bg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide " + TONE_TEXT[tone]}>
      <ToneIcon tone={tone} />
      {label ?? TONE_LABEL[tone]}
    </span>
  );
}

export function Chip({ children }: { children: ReactNode }) {
  return <span className="inline-flex items-center rounded-full border border-line bg-bg px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-soft">{children}</span>;
}

export function SlideHead({ n, eyebrow, title }: { n: number; eyebrow: string; title: string }) {
  return (
    <header className="mb-5 sm:mb-6">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent">
        <span className="font-mono">{String(n).padStart(2, "0")}</span> · {eyebrow}
      </p>
      <h3 className="mt-1.5 max-w-4xl font-display text-xl font-bold leading-tight text-ink sm:text-[1.65rem]">{title}</h3>
      <div className="mt-3 h-px w-full border-t border-dashed border-line" />
    </header>
  );
}

function SlideFoot({ deck, source }: { deck: Deck; source?: string }) {
  return (
    <p className="mt-auto pt-5 text-[10.5px] leading-relaxed text-ink-soft">
      {source ? <>Source: {source}. </> : null}
      NextResearch analysis, {deck.report.asOf}. Compiled from public reporting; industry figures are approximate. Not investment advice.
    </p>
  );
}

export function Panel({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={"rounded-2xl border border-line bg-panel " + className}>{children}</div>;
}

export const inr = (n: number, digits = 0) => n.toLocaleString("en-IN", { maximumFractionDigits: digits, minimumFractionDigits: digits });
// Rupee crore in the site's one style ("₹8,420 Cr", "₹1.75L Cr"), as on every other page.
const fmtCr = (n: number | null) => croreShort(n);
const fmtPct = (n: number | null) => (n == null ? "—" : `${n.toFixed(1)}%`);
const shortTicker = (c: DeckCompany) => `NSE: ${c.ticker}`;

function CompanyButton({ c, open, className = "" }: { c: DeckCompany; open: (c: DeckCompany) => void; className?: string }) {
  return (
    <button type="button" onClick={() => open(c)} className={"group text-left " + className} aria-haspopup="dialog">
      <span className="block font-display text-sm font-semibold text-ink group-hover:text-accent">{c.name}</span>
      <span className="block font-mono text-[10.5px] text-ink-soft">{shortTicker(c)}</span>
    </button>
  );
}

// ---------- 1. Investor summary ----------

function SummarySlide({ deck }: SlideProps) {
  const r = deck.report;
  return (
    <>
      <div className="relative overflow-hidden rounded-2xl border border-line bg-panel p-5 sm:p-7">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{ backgroundImage: "linear-gradient(var(--grid) 1px, transparent 1px), linear-gradient(90deg, var(--grid) 1px, transparent 1px)", backgroundSize: "28px 28px", maskImage: "linear-gradient(90deg, transparent 30%, #000 100%)", WebkitMaskImage: "linear-gradient(90deg, transparent 30%, #000 100%)" }}
        />
        <div className="relative grid gap-6 lg:grid-cols-[1.25fr_1fr] lg:items-center">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent">
              NextResearch {deck.category === "policy" ? "policy" : "industry"} report · {r.asOf}
            </p>
            <h3 className="mt-2 font-display text-2xl font-bold leading-[1.1] text-ink sm:text-4xl">{r.title}</h3>
            <p className="mt-2 text-sm text-ink-soft sm:text-base">{r.subtitle}</p>
            <div className="mt-4 flex flex-wrap items-center gap-2.5">
              <ToneBadge tone={r.stance.tone} label={r.stance.label} />
            </div>
            <p className="mt-2.5 max-w-xl text-[13px] leading-relaxed text-ink">{r.stance.line}</p>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {r.keyStats.map((s) => (
              <div key={s.label} className="rounded-xl border border-line bg-bg/70 p-3.5">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-soft">{s.label}</div>
                <div className="mt-1 font-display text-xl font-bold text-ink sm:text-2xl">{s.value}</div>
                {s.sub && <div className="mt-0.5 text-[11px] leading-snug text-ink-soft">{s.sub}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="mb-2.5 mt-6 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-soft">Investment thesis</p>
      <ol className="grid gap-2.5 lg:grid-cols-3">
        {r.thesis.map((t, i) => (
          <li key={t.title} className="flex gap-3 rounded-xl border border-line bg-panel p-4">
            <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-accent font-display text-sm font-bold text-bg">{i + 1}</span>
            <div>
              <h4 className="font-display text-sm font-semibold leading-snug text-ink">{t.title}</h4>
              <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">{t.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <SlideFoot deck={deck} source={r.overview.chart.source} />
    </>
  );
}

// ---------- 2. Latest developments ----------

function DevelopmentsSlide({ deck }: SlideProps) {
  const devs = deck.report.developments;
  return (
    <>
      <SlideHead n={2} eyebrow="Latest developments" title={developmentsTitle(deck)} />
      <ol className="relative grid gap-3 md:grid-cols-2">
        {devs.map((d) => (
          <li key={d.title} className="flex gap-3 rounded-xl border border-line bg-panel p-4">
            <div className="flex w-16 flex-none flex-col items-start">
              <span className="font-mono text-[11px] font-semibold leading-tight text-accent">{d.date}</span>
              <span className="mt-2 h-full w-px bg-line" aria-hidden />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <Chip>{d.tag}</Chip>
                <ToneBadge tone={d.impact} />
              </div>
              <h4 className="mt-2 font-display text-sm font-semibold leading-snug text-ink">{d.title}</h4>
              <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">{d.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <SlideFoot deck={deck} />
    </>
  );
}

// ---------- 3. Industry overview ----------

export function BarChart({ points, unit }: { points: SeriesPoint[]; unit: string }) {
  const max = Math.max(...points.map((p) => p.value), 1);
  const hasProj = points.some((p) => p.projected);
  // One decimal for every small value in the chart if any needs it ("4.4 / 7.0 / 7.7", not "4.4 / 7 / 7.7").
  const dec = points.some((p) => p.value < 100 && p.value % 1 !== 0);
  return (
    <figure>
      <div className="flex h-44 items-end gap-1.5 sm:h-52 sm:gap-2.5" role="img" aria-label={points.map((p) => `${p.label}: ${p.value} ${unit}`).join(", ")}>
        {points.map((p) => (
          <div key={p.label} className="group relative flex h-full min-w-0 flex-1 flex-col items-center justify-end">
            <span className="mb-1 font-mono text-[10px] font-semibold tabular-nums text-ink sm:text-[11px]">{inr(p.value, p.value < 1000 && dec ? 1 : 0)}</span>
            <div
              className={
                "w-full max-w-[56px] rounded-t-[4px] transition-opacity group-hover:opacity-80 " +
                (p.projected ? "border border-dashed border-accent bg-[repeating-linear-gradient(135deg,transparent_0_4px,color-mix(in_srgb,var(--accent)_35%,transparent)_4px_6px)]" : "bg-accent")
              }
              style={{ height: `${Math.max(2, (p.value / max) * 100)}%` }}
            />
            <span className="pointer-events-none absolute -top-7 z-10 hidden whitespace-nowrap rounded-md border border-line bg-bg px-2 py-1 text-[10.5px] text-ink shadow-lg group-hover:block">
              {p.label}: {inr(p.value, 1)} {unit}
              {p.projected ? " (projected)" : ""}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-1.5 border-t border-line pt-1.5 sm:gap-2.5">
        {points.map((p) => (
          <span key={p.label} className={"min-w-0 flex-1 truncate text-center font-mono text-[9.5px] sm:text-[10.5px] " + (p.projected ? "text-ink-soft" : "text-ink")}>
            {p.label}
          </span>
        ))}
      </div>
      {hasProj && (
        <figcaption className="mt-2 flex items-center gap-4 text-[10.5px] text-ink-soft">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-accent" /> Actual
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm border border-dashed border-accent" /> Projected (P)
          </span>
        </figcaption>
      )}
    </figure>
  );
}

function OverviewSlide({ deck }: SlideProps) {
  const o = deck.report.overview;
  const title = overviewTitle(deck);
  return (
    <>
      <SlideHead n={3} eyebrow="Industry overview" title={title} />
      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <Panel className="p-4 sm:p-5">
          <div className="flex items-baseline justify-between gap-3">
            <h4 className="font-display text-sm font-semibold text-ink">{o.chart.title}</h4>
            <span className="flex-none text-[10.5px] text-ink-soft">{o.chart.unit}</span>
          </div>
          <div className="mt-4">
            <BarChart points={o.chart.points} unit={o.chart.unit} />
          </div>
        </Panel>
        <div className="flex flex-col gap-4">
          <Panel className="overflow-hidden">
            <div className="border-b border-line bg-panel-2 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-ink">Industry snapshot</div>
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
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {o.narrative.map((p, i) => (
          <p key={i} className="border-l-2 border-accent pl-3 text-[12.5px] leading-relaxed text-ink">
            {p}
          </p>
        ))}
      </div>
      <SlideFoot deck={deck} source={o.chart.source} />
    </>
  );
}

// ---------- 4. Value chain ----------

const MOAT_PIPS = { low: 1, medium: 2, high: 3 } as const;

function ValueChainSlide({ deck }: SlideProps) {
  const chain = deck.report.valueChain;
  const title = valueChainTitle(deck);
  const cols = chain.length <= 4 ? chain.length : Math.ceil(chain.length / 2);
  return (
    <>
      <SlideHead n={4} eyebrow="Value chain & profit pools" title={title} />
      {/* Up to 4 stages fit one row; 5-6 go two rows of 3, which keeps each card wide enough
          for its chips and the margin line (six columns squeezed them at 1280px). */}
      <ol className="grid gap-2.5 lg:grid-cols-[repeat(var(--n),minmax(0,1fr))]" style={{ ["--n" as string]: cols }}>
        {chain.map((s, i) => (
          <li key={s.stage} className="relative flex flex-col rounded-xl border border-line bg-panel p-3.5">
            {i < chain.length - 1 && i % cols !== cols - 1 && (
              <span aria-hidden className="absolute -right-[11px] top-1/2 z-[1] hidden h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-bg text-[10px] text-accent lg:flex">
                ›
              </span>
            )}
            <span className="font-mono text-[10px] font-bold text-accent">STAGE {i + 1}</span>
            <h4 className="mt-1 font-display text-sm font-semibold leading-snug text-ink">{s.stage}</h4>
            <div className="mt-2 flex flex-wrap gap-1">
              {s.zoneIds.map((z) => (
                <span key={z} className="inline-flex max-w-full items-baseline gap-1 rounded-md bg-panel-2 px-1.5 py-0.5 text-[10px] leading-tight text-ink-soft">
                  <span className="min-w-0">{deck.zoneLabels[z]?.label ?? z}</span>
                  {/* The count stays glued to its label instead of wrapping onto its own line. */}
                  {deck.zoneLabels[z] ? <span className="flex-none whitespace-nowrap font-mono text-ink">· {deck.zoneLabels[z].companies}</span> : null}
                </span>
              ))}
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-dashed border-line pt-2.5 text-[11px]">
              <div>
                <dt className="text-[9.5px] uppercase tracking-wide text-ink-soft">Margin</dt>
                <dd className="mt-0.5 font-semibold text-ink">{s.margin}</dd>
              </div>
              <div>
                <dt className="text-[9.5px] uppercase tracking-wide text-ink-soft">Moat</dt>
                <dd className="mt-1 flex items-center gap-1" aria-label={`${s.moat} moat`}>
                  {[1, 2, 3].map((k) => (
                    <span key={k} className={"h-1.5 w-3.5 rounded-full " + (k <= MOAT_PIPS[s.moat] ? "bg-accent" : "bg-line")} />
                  ))}
                  <span className="ml-1 capitalize text-ink-soft">{s.moat}</span>
                </dd>
              </div>
            </dl>
            <p className="mt-2.5 text-[11.5px] leading-relaxed text-ink-soft">{s.note}</p>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-[10.5px] text-ink-soft">Chips name the layers of the 3D explorer in each stage, with the number of companies mapped to it.</p>
      <SlideFoot deck={deck} />
    </>
  );
}

// ---------- 5. Growth drivers ----------

export function MixChart({ mix }: { mix: { slices: { label: string; value: number }[] } }) {
  const total = mix.slices.reduce((a, s) => a + s.value, 0) || 1;
  const sorted = [...mix.slices];
  // One hue, stepped by share: parts of a single whole, already ranked by the author.
  const shade = (i: number) => `color-mix(in srgb, var(--accent) ${100 - i * 20}%, var(--panel-2))`;
  return (
    <figure>
      <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full" aria-hidden>
        {sorted.map((s, i) => (
          <span key={s.label} style={{ width: `${(s.value / total) * 100}%`, background: shade(i) }} title={`${s.label}: ${s.value}%`} />
        ))}
      </div>
      <ul className="mt-4 space-y-2.5">
        {sorted.map((s, i) => (
          <li key={s.label} className="group">
            <div className="flex items-baseline justify-between gap-3 text-[12px]">
              <span className="inline-flex min-w-0 items-center gap-2 text-ink">
                <span className="h-2.5 w-2.5 flex-none rounded-sm" style={{ background: shade(i) }} />
                <span className="leading-snug">{s.label}</span>
              </span>
              <span className="font-mono font-semibold tabular-nums text-ink">{s.value}%</span>
            </div>
            <div className="mt-1 h-1.5 w-full rounded-full bg-panel-2">
              <div className="h-full rounded-full transition-opacity group-hover:opacity-80" style={{ width: `${(s.value / total) * 100}%`, background: shade(i) }} />
            </div>
          </li>
        ))}
      </ul>
    </figure>
  );
}

function DriversSlide({ deck }: SlideProps) {
  const r = deck.report;
  return (
    <>
      <SlideHead n={5} eyebrow="Growth drivers" title={driversTitle(deck)} />
      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="grid gap-2.5 sm:grid-cols-2">
          {r.drivers.map((d, i) => (
            <div key={d.title} className="flex flex-col rounded-xl border border-line bg-panel p-4">
              <span className="font-mono text-[10px] font-bold text-accent">DRIVER {i + 1}</span>
              <div className="mt-1.5 font-display text-2xl font-bold text-ink">{d.metric}</div>
              <h4 className="mt-1 font-display text-sm font-semibold text-ink">{d.title}</h4>
              <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">{d.body}</p>
            </div>
          ))}
        </div>
        <Panel className="p-4 sm:p-5">
          <h4 className="font-display text-sm font-semibold text-ink">{r.mix.title}</h4>
          <p className="mb-4 text-[10.5px] text-ink-soft">Share, %</p>
          <MixChart mix={r.mix} />
        </Panel>
      </div>
      <SlideFoot deck={deck} source={r.mix.source} />
    </>
  );
}

// ---------- 6. PESTLE ----------

const PESTLE: { key: PestleKey; label: string }[] = [
  { key: "political", label: "Political" },
  { key: "economic", label: "Economic" },
  { key: "social", label: "Social" },
  { key: "technological", label: "Technological" },
  { key: "legal", label: "Legal" },
  { key: "environmental", label: "Environmental" },
];

function PestleSlide({ deck }: SlideProps) {
  return (
    <>
      <SlideHead n={6} eyebrow="PESTLE analysis" title={pestleTitle(deck)} />
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {PESTLE.map((f) => (
          <div key={f.key} className="overflow-hidden rounded-xl border border-line bg-panel">
            <div className="flex items-center gap-2.5 border-b border-line bg-panel-2 px-4 py-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent font-display text-sm font-bold text-bg">{f.label[0]}</span>
              <h4 className="font-display text-sm font-semibold text-ink">{f.label}</h4>
            </div>
            <ul className="space-y-2.5 p-4">
              {deck.report.pestle[f.key].map((p) => (
                <li key={p.point} className="flex gap-2 text-[12.5px] leading-relaxed text-ink">
                  <ToneIcon tone={p.impact} className="mt-[5px]" />
                  <span>{p.point}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="mt-3 flex flex-wrap items-center gap-4 text-[10.5px] text-ink-soft">
        <span className="inline-flex items-center gap-1.5"><ToneIcon tone="pos" /> Tailwind</span>
        <span className="inline-flex items-center gap-1.5"><ToneIcon tone="neg" /> Headwind</span>
        <span className="inline-flex items-center gap-1.5"><ToneIcon tone="neutral" /> Neutral / watch</span>
      </p>
      <SlideFoot deck={deck} />
    </>
  );
}

// ---------- 7. Beneficiaries ----------

const TIERS = [
  { id: "core", label: "Core", desc: "Most direct exposure" },
  { id: "direct", label: "Direct", desc: "Sells into the chain" },
  { id: "indirect", label: "Indirect", desc: "Adjacent / enabling" },
] as const;

function BeneficiariesSlide({ deck, openCompany }: SlideProps) {
  const title = beneficiariesTitle(deck);
  return (
    <>
      <SlideHead n={7} eyebrow="Key beneficiaries" title={title} />
      <ul className="grid grid-cols-1 gap-2 lg:grid-cols-2">
        {TIERS.flatMap((t) =>
          deck.companies
            .filter((c) => c.tier === t.id)
            .map((c) => (
              <li key={c.key} className="min-w-0">
                <button
                  type="button"
                  onClick={() => openCompany(c)}
                  aria-haspopup="dialog"
                  className="group flex h-full w-full min-w-0 gap-3 rounded-xl border border-line bg-panel p-3 text-left transition hover:border-accent"
                >
                  <span
                    className={
                      "mt-0.5 h-fit flex-none rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide " +
                      (t.id === "core" ? "bg-accent text-bg" : t.id === "direct" ? "border border-accent text-accent" : "border border-line text-ink-soft")
                    }
                    title={t.desc}
                  >
                    {t.label}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="min-w-0 font-display text-sm font-semibold leading-snug text-ink [overflow-wrap:anywhere] group-hover:text-accent">{c.name}</span>
                      <span className="flex-none font-mono text-[10.5px] text-ink-soft">{c.mcapCr != null ? fmtCr(c.mcapCr) : ""}</span>
                    </span>
                    <span className="block font-mono text-[10px] text-ink-soft">{shortTicker(c)}</span>
                    <span className="mt-1 block text-[12px] leading-snug text-ink-soft">{c.why}</span>
                  </span>
                </button>
              </li>
            ))
        )}
      </ul>
      <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10.5px] text-ink-soft">
        {TIERS.map((t) => (
          <span key={t.id}>
            <b className="font-semibold text-ink">{t.label}</b>: {t.desc.toLowerCase()}
          </span>
        ))}
      </p>
      <p className="mt-3 text-[10.5px] text-ink-soft">Tap a company for its financials, price chart and news.{snapshotDate(deck) ? ` Market caps as of ${snapshotDate(deck)} (company table snapshot).` : ""}</p>
      <SlideFoot deck={deck} />
    </>
  );
}

// ---------- 8. Scorecard ----------

function MiniBar({ value, max, tone }: { value: number | null; max: number; tone: "accent" | "amber" }) {
  if (value == null) return <span className="text-ink-soft">—</span>;
  const neg = value < 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-20 flex-none rounded-full bg-panel-2 sm:w-28">
        <div
          className={"h-full rounded-full " + (neg ? "bg-danger" : tone === "accent" ? "bg-accent" : "bg-amber")}
          style={{ width: `${Math.max(3, Math.min(100, (Math.abs(value) / max) * 100))}%` }}
        />
      </div>
      <span className={"font-mono tabular-nums " + (neg ? "text-danger" : "text-ink")}>{value.toFixed(1)}%</span>
    </div>
  );
}

// P/E is on trailing-twelve-month earnings, net margin on the latest fiscal year: a recovery quarter
// can make the first positive while the second is negative, which needs flagging, not hiding.
// The date of the company-table snapshot behind the deck's figures (the latest of its companies').
function snapshotDate(deck: Deck): string | null {
  const dates = deck.companies.flatMap((c) => (c.supplier.f?.asOf ? [c.supplier.f.asOf] : []));
  return dates.sort((a, b) => Date.parse(b) - Date.parse(a))[0] ?? null;
}

const ttmMismatch = (c: DeckCompany) => (c.npMargin ?? 0) < 0 && (c.pe ?? 0) > 0;

function ScorecardSlide({ deck, openCompany }: SlideProps) {
  const rows = [...deck.companies].sort((a, b) => (b.revCagr ?? -999) - (a.revCagr ?? -999));
  // Bars are capped so one small-base outlier (e.g. 7 -> 430 Cr) does not flatten the rest.
  const maxCagr = Math.min(60, Math.max(...rows.map((r) => Math.abs(r.revCagr ?? 0)), 1));
  const maxMargin = Math.max(...rows.map((r) => Math.abs(r.npMargin ?? 0)), 1);
  const title = scorecardTitle(deck, rows);
  return (
    <>
      <SlideHead n={8} eyebrow="Financial scorecard" title={title} />
      {/* Phone: one compact card per company instead of a sideways-scrolling table. */}
      <ul className="space-y-2 md:hidden">
        {rows.map((c) => (
          <li key={c.key} className="rounded-xl border border-line bg-panel p-3.5">
            <div className="flex items-start justify-between gap-3">
              <CompanyButton c={c} open={openCompany} />
              <span className="flex-none text-right font-mono text-[11px] text-ink">{c.mcapCr != null ? fmtCr(c.mcapCr) : "—"}</span>
            </div>
            <dl className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-2 text-[11px]">
              <div className="col-span-2">
                <dt className="text-[9.5px] uppercase tracking-wide text-ink-soft">Revenue CAGR {c.cagrSpan ? `(${c.cagrSpan})` : ""}{c.revStart != null && c.revStart < 100 ? " · small base" : ""}{c.cagrNote ? ` · ${c.cagrNote}` : ""}</dt>
                <dd className="mt-0.5"><MiniBar value={c.revCagr} max={maxCagr} tone="accent" /></dd>
              </div>
              <div className="col-span-2">
                <dt className="text-[9.5px] uppercase tracking-wide text-ink-soft">Net margin {c.revYear ?? ""}</dt>
                <dd className="mt-0.5"><MiniBar value={c.npMargin} max={maxMargin} tone="amber" /></dd>
              </div>
              <div>
                <dt className="text-[9.5px] uppercase tracking-wide text-ink-soft">Revenue {c.revYear ?? ""}</dt>
                <dd className="font-mono text-ink">{fmtCr(c.revCr)}</dd>
              </div>
              <div>
                <dt className="text-[9.5px] uppercase tracking-wide text-ink-soft">P/E (TTM) · ROCE</dt>
                <dd className="font-mono text-ink">{c.pe != null ? `${c.pe.toFixed(1)}x` : "—"}{ttmMismatch(c) ? "*" : ""} · {fmtPct(c.roce)}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
      <Panel className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[720px] whitespace-nowrap text-[12px]">
          <thead>
            <tr className="border-b border-line bg-panel-2 text-left text-[9.5px] uppercase tracking-wider text-ink-soft">
              <th className="px-4 py-2.5 font-semibold">Company</th>
              <th className="px-3 py-2.5 text-right font-semibold">Market cap</th>
              <th className="px-3 py-2.5 text-right font-semibold">Revenue</th>
              <th className="px-3 py-2.5 font-semibold">Revenue CAGR</th>
              <th className="px-3 py-2.5 font-semibold">Net margin</th>
              <th className="px-3 py-2.5 text-right font-semibold">P/E (TTM)</th>
              <th className="px-4 py-2.5 text-right font-semibold">ROCE</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.key} className="border-b border-line last:border-0 hover:bg-panel-2/60 [&>td]:py-1.5">
                <td className="px-4 py-2">
                  <CompanyButton c={c} open={openCompany} />
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums text-ink">{c.mcapCr != null ? fmtCr(c.mcapCr) : "—"}</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums text-ink">
                  {fmtCr(c.revCr)}
                  {c.revYear && <span className="block text-[9.5px] text-ink-soft">{c.revYear}</span>}
                </td>
                <td className="px-3 py-2">
                  <MiniBar value={c.revCagr} max={maxCagr} tone="accent" />
                  {c.cagrSpan && (
                    <span className="text-[9.5px] text-ink-soft">
                      {c.cagrSpan}
                      {c.revStart != null && c.revStart < 100 ? " · small base" : ""}
                      {c.cagrNote ? ` · ${c.cagrNote}` : ""}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <MiniBar value={c.npMargin} max={maxMargin} tone="amber" />
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums text-ink">
                  {c.pe != null ? `${c.pe.toFixed(1)}x` : "—"}
                  {ttmMismatch(c) ? "*" : ""}
                </td>
                <td className="px-4 py-2 text-right font-mono tabular-nums text-ink">{fmtPct(c.roce)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
      <p className="mt-3 text-[10.5px] text-ink-soft">
        Sorted by revenue growth; rows marked &ldquo;small base&rdquo; started under ₹100 Cr, which inflates percentage growth. Growth windows differ where a company lacks five reported years; under three years of history no CAGR is shown. Net margin is for the latest fiscal year, while P/E is on trailing-twelve-month profit{rows.some(ttmMismatch) ? " (* marks a company whose TTM profit is positive although its latest fiscal year was a loss)" : ""}. Net margin can include one-offs (e.g. demerger gains). Revenue and net profit are company-wide (not only this segment), from the seed financials behind each stock pop-up; tap a name for live figures.
      </p>
      <SlideFoot deck={deck} source="Company filings via Screener.in seed data" />
    </>
  );
}

// ---------- 9. Company developments ----------

function CompanyNewsSlide({ deck, openCompany }: SlideProps) {
  const title = companyNewsTitle(deck);
  return (
    <>
      <SlideHead n={9} eyebrow="Company developments" title={title} />
      <div className="overflow-hidden rounded-2xl border border-line">
        <div className="hidden grid-cols-[200px_1fr_1fr] gap-4 border-b border-line bg-panel-2 px-4 py-2.5 text-[9.5px] font-semibold uppercase tracking-wider text-ink-soft md:grid">
          <span>Company</span>
          <span>Development</span>
          <span>Impact on the industry</span>
        </div>
        <ul>
          {deck.news.map((n) => (
            <li key={n.key + n.development} className="grid gap-2 border-b border-line bg-panel px-4 py-3.5 last:border-0 md:grid-cols-[200px_1fr_1fr] md:gap-4">
              <div className="flex items-start justify-between gap-2 md:block">
                <CompanyButton c={n.company} open={openCompany} />
                <span className="font-mono text-[10.5px] text-accent md:mt-1 md:block">{n.date}</span>
              </div>
              <p className="text-[12.5px] leading-relaxed text-ink">{n.development}</p>
              <div className="flex gap-2">
                <ToneIcon tone={n.tone} className="mt-[5px]" />
                <p className="text-[12.5px] leading-relaxed text-ink-soft">
                  <span className={"font-semibold " + TONE_TEXT[n.tone]}>{TONE_LABEL[n.tone]}: </span>
                  {n.impact}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <SlideFoot deck={deck} />
    </>
  );
}

// ---------- 10. Risks, outlook, reading ----------

const SEVERITY = { high: "text-danger", medium: "text-amber-ink", low: "text-ink-soft" } as const;

function OutlookSlide({ deck }: SlideProps) {
  const r = deck.report;
  return (
    <>
      <SlideHead
        n={10}
        eyebrow="Risks, outlook & further reading"
        title={outlookTitle(deck)}
      />
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <section>
          <h4 className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-soft">Key risks</h4>
          <ul className="space-y-2">
            {r.risks.map((k) => (
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
        <section>
          <h4 className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-soft">Scenarios</h4>
          <div className="space-y-2">
            {(
              [
                ["Bull", r.outlook.bull, "pos"],
                ["Base", r.outlook.base, "neutral"],
                ["Bear", r.outlook.bear, "neg"],
              ] as const
            ).map(([label, text, tone]) => (
              <div key={label} className={"rounded-xl border bg-panel p-3.5 " + (label === "Base" ? "border-accent" : "border-line")}>
                <span className={"inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide " + TONE_TEXT[tone]}>
                  <ToneIcon tone={tone} /> {label} case
                </span>
                <p className="mt-1 text-[12.5px] leading-relaxed text-ink">{text}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
      <section className="mt-5">
        <h4 className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-soft">Further reading</h4>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {/* Each link once (a repeated URL also gave React a duplicate key). */}
          {r.reading.filter((l, i, all) => all.findIndex((x) => x.url === l.url) === i).map((l) => (
            <li key={l.url}>
              <a
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex h-full items-start gap-3 rounded-xl border border-line bg-panel p-3.5 transition hover:border-accent"
              >
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
      <SlideFoot deck={deck} />
    </>
  );
}
