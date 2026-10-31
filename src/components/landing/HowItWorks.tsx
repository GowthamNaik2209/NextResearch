import Link from "next/link";
import type { ReactNode } from "react";
import { BLUME_WEIGHT, IC, MARKET, MIN_YEARS, VOL_FLOOR, Z_MAX } from "@/lib/baskets/projection";
import { ResearchFlows } from "./ResearchFlows";

// How it works: example research flows (ResearchFlows), then the maths folded into one panel for
// anyone who wants to check it. Projection constants are read from the model itself, so the panel
// can't drift from what a basket shows.
const pct = (v: number) => `${(v * 100).toFixed(2)}%`;

// Out-of-sample results of the live model (docs/PROJECTIONS-V2-PROTOTYPE.md, three 1-year periods).
const RECORD: { big: string; body: string; verdict: string; tone: "good" | "mid" | "bad" }[] = [
  { big: "78%", body: "of outcomes landed between Bear and Bull. Target: 80%.", verdict: "Range works", tone: "good" },
  { big: "+0.09 · +0.09 · +0.01", body: "Rank correlation with actual returns, three periods. Not significant.", verdict: "Weak ranking", tone: "mid" },
  { big: "−18 pts", body: "Typical gap between the actual return and Base. Most of it is the market’s move that year, which the model can’t foresee.", verdict: "Not a forecast", tone: "bad" },
];
// Ink on a toned border: tinted text on a tint fell under 4.5:1 in the light theme.
const TONE = { good: "border-pos text-ink", mid: "border-line text-ink-soft", bad: "border-danger text-ink" };

function Topic({ title, line, children }: { title: string; line: string; children: ReactNode }) {
  return (
    <details className="group/t rounded-xl border border-line bg-bg">
      <summary className="grid cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 px-4 py-3">
        <span className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
          <span className="font-display text-sm font-semibold text-ink">{title}</span>
          <span className="text-xs text-ink-soft sm:text-sm">{line}</span>
        </span>
        <span aria-hidden className="font-mono text-sm text-ink-soft transition group-open/t:rotate-45">+</span>
      </summary>
      <div className="flex flex-col gap-3 px-4 pb-4 text-sm leading-relaxed text-ink-soft">{children}</div>
    </details>
  );
}

const Formula = ({ children }: { children: ReactNode }) => (
  // Wraps on phones so the whole formula is visible; one line each from sm up.
  <div className="overflow-x-auto border-l-[3px] border-accent bg-panel px-3.5 py-3 font-mono text-[13px] leading-loose text-ink sm:whitespace-nowrap">{children}</div>
);

export function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-20 border-y border-line">
      <div className="mx-auto flex max-w-page flex-col gap-7 px-5 py-16">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">Start with a question. We&rsquo;ll show you the path.</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
            Pick the question closest to yours and follow it step by step. The bar shows which parts of the site each flow uses, from industry to basket.
          </p>
        </div>

        <ResearchFlows />

        <details className="group rounded-2xl border border-line bg-panel">
          <summary className="grid cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-5 py-4">
            <span className="font-display text-base font-semibold text-ink">How the numbers are made</span>
            <span aria-hidden className="row-span-2 grid size-7 place-items-center rounded-full border border-ink-soft font-mono text-ink-soft transition group-open:rotate-45">+</span>
            <span className="text-sm text-ink-soft">Data, the one-off filter, backtests, projections and how our model has done when tested.</span>
          </summary>
          <div className="flex flex-col gap-2.5 px-5 pb-5">
            <Topic title="Data" line="One snapshot of results, 5 years of daily prices">
              <ul className="list-disc space-y-1 pl-5">
                <li>Annual results FY22 to FY26 from one company table, refreshed together, so a figure is the same on every page.</li>
                <li>Daily closing prices for 5 years, updated each trading evening and fully reloaded weekly. Full history for the Nifty 50.</li>
              </ul>
            </Topic>
            <Topic title="Exposure and scenarios" line="How companies are ranked inside a chain">
              <ul className="list-disc space-y-1 pl-5">
                <li>Each listed company is tagged by how it takes part in a layer (direct or indirect supplier, operator, owner, enabler, emerging entrant) and how strongly: high, medium or low.</li>
                <li>A what-if scenario names the layers it touches and how hard. Companies in them are ranked by that severity times their exposure. It is a reading of the chain, not a price forecast.</li>
              </ul>
            </Topic>
            <Topic title="One-off filter" line="Why some companies are left out of screens">
              <ul className="list-disc space-y-1 pl-5">
                <li>A company is left out of screens and rule-based baskets when its results show a one-off: a lone loss year between profitable ones, or profit moving by more rupees than revenue did.</li>
                <li>You can still add it to your own basket. It carries a &ldquo;one-off&rdquo; note with the reason.</li>
              </ul>
            </Topic>
            <Topic title="Backtests" line="Bought once, held, price change only">
              <Formula>
                value(t) = &Sigma; w<sub>i</sub> &times; P<sub>i</sub>(t) / P<sub>i</sub>(0) <span className="text-ink-soft">&nbsp;// bought at target weights, then held</span>
              </Formula>
              <ul className="list-disc space-y-1 pl-5">
                <li>Weights drift with prices, the way a real holding does. Rebalancing (monthly, quarterly, or on drift) is optional and counts trades and turnover.</li>
                <li>Dividends, taxes and costs are not included.</li>
              </ul>
            </Topic>
            <Topic title="Projections" line="Bear, Base and Bull for 1 and 2 years">
              <Formula>
                <span className="text-ink-soft">Base: what the market prices in for the stock&rsquo;s risk, nudged by fundamentals</span>
                <br />
                Base<sub>1Y</sub> = rf + &beta; &times; ERP &minus; dividend yield + {IC} &times; &sigma; &times; z
                <br />
                Base<sub>2Y</sub> = (1 + Base<sub>1Y</sub>) &times; (1 + rf + &beta; &times; ERP &minus; dividend yield) &minus; 1 <span className="text-ink-soft">&nbsp;// year two without the tilt</span>
                <br />
                <span className="text-ink-soft">Bear, Bull: 10th and 90th percentile at the stock&rsquo;s own 1-year volatility</span>
                <br />
                (1 + Base) &middot; e<sup>&minus;&sigma;&sup2;h/2 &#8723; 1.28 &sigma;&radic;h</sup> &minus; 1 <span className="text-ink-soft">&nbsp;// h = 1 or 2 years</span>
              </Formula>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  rf {pct(MARKET.rf)} (10-year G-sec, {MARKET.rfAsOf}), ERP {pct(MARKET.erp)} (Damodaran, {MARKET.erpAsOf}), &beta; pulled {Math.round((1 - BLUME_WEIGHT) * 100)}% of the way to 1, &sigma; never below {Math.round(VOL_FLOOR * 100)}%.
                </li>
                <li>z is the stock&rsquo;s growth-and-margin score against every covered company, capped at &plusmn;{Z_MAX}.</li>
                <li>Needs {MIN_YEARS} years of results and {MIN_YEARS} years of trading. Loss-makers get the market return only.</li>
              </ul>
              <Link href="/baskets/projections" className="self-start font-semibold text-accent hover:underline">
                Full method, with any stock as a worked example &rarr;
              </Link>
            </Topic>
            <Topic title="Track record" line="We test our own model and publish the misses">
              <div className="grid gap-2.5 lg:grid-cols-3">
                {RECORD.map((r) => (
                  <div key={r.verdict} className="flex flex-col items-start gap-1 rounded-lg border border-line p-3">
                    <span className="font-display text-xl font-semibold text-ink tabular-nums">{r.big}</span>
                    <p className="text-xs leading-relaxed">{r.body}</p>
                    <span className={`mt-1 rounded border px-2 py-0.5 font-mono text-[11px] font-semibold ${TONE[r.tone]}`}>{r.verdict}</span>
                  </div>
                ))}
              </div>
            </Topic>
          </div>
        </details>
      </div>
    </section>
  );
}
