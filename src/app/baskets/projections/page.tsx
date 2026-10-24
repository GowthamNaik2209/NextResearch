import Link from "next/link";
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ensureFinancials } from "@/lib/financials/load";
import { listBasketUniverse } from "@/lib/baskets/industry";
import { projectionInputFor } from "@/lib/baskets/projection-data";
import { ANNUAL_MAX, ANNUAL_MIN, MIN_YEARS, SCENARIOS, caseDetail, explainStock, type ExitBasis, type Horizon } from "@/lib/baskets/projection";
import { NA, signedPct } from "@/lib/format";
import { ExampleStockSelect } from "./ExampleStockSelect";

// How the basket pages' Projections are worked out (docs/PROJECTIONS.md), in full, with a worked
// example: any stock's own figures run through each step by the same code the baskets use, so the
// example always matches what a basket shows for it.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "How basket projections are worked out",
  description: "The method behind NextResearch's 1- and 2-year basket projections: which stocks, growth, margin, valuation, the Bear, Base and Bull cases, and the simulated range, with a worked example for any stock.",
  alternates: { canonical: "/baskets/projections" },
};

const DEFAULT = "M&M";
const pct = (v: number, dp = 1) => `${(v * 100).toFixed(dp)}%`;
const sPct = (v: number) => signedPct(v * 100);
const x1 = (v: number) => `${v.toFixed(1)}×`;
const CASE = { bear: "Bear", base: "Base", bull: "Bull" } as const;

function H2({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} className="scroll-mt-20 font-display text-lg font-bold text-ink sm:text-xl">
      {children}
    </h2>
  );
}
const P = ({ children }: { children: ReactNode }) => <p className="max-w-3xl text-sm leading-relaxed text-ink-soft">{children}</p>;
const Formula = ({ children }: { children: ReactNode }) => (
  <p className="max-w-3xl overflow-x-auto rounded border border-line bg-panel-2/60 px-3 py-2 font-mono text-[12px] leading-relaxed text-ink">{children}</p>
);
const Th = ({ children, left }: { children: ReactNode; left?: boolean }) => (
  <th scope="col" className={"whitespace-nowrap px-2 py-1.5 font-semibold " + (left ? "text-left" : "text-right")}>
    {children}
  </th>
);
const Td = ({ children, left, tone }: { children: ReactNode; left?: boolean; tone?: number }) => (
  <td className={"whitespace-nowrap px-2 py-1.5 font-mono " + (left ? "text-left font-sans" : "text-right") + (tone == null ? "" : tone >= 0 ? " text-pos" : " text-danger")}>{children}</td>
);

const SECTIONS = [
  ["what", "What a projection is"],
  ["which", "Which stocks are projected"],
  ["steps", "Step by step"],
  ["cases", "Bear, Base and Bull"],
  ["options", "The options"],
  ["basket", "From stocks to the basket"],
  ["range", "Likely range, drawdown and chance of a loss"],
  ["stats", "The statistics"],
  ["limits", "What it doesn't do"],
  ["example", "Worked example"],
] as const;

export default async function ProjectionMethodPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  await ensureFinancials();
  const { t } = await searchParams;
  const universe = listBasketUniverse().sort((a, b) => a.name.localeCompare(b.name));
  const stock = universe.find((s) => s.ticker === t) ?? universe.find((s) => s.ticker === DEFAULT) ?? universe[0];
  const home = stock?.industries[0] ?? null;
  const input = stock ? projectionInputFor(stock.ticker, home?.slug ?? null) : null;
  const ex = input ? explainStock(input) : null;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-5 py-14">
        <nav aria-label="Back" className="-my-1 flex flex-wrap items-center gap-x-4 text-xs font-semibold text-accent">
          <Link href="/baskets" className="inline-flex min-h-8 items-center hover:underline pointer-coarse:min-h-9">
            &larr; Baskets
          </Link>
        </nav>
        <header className="flex flex-col gap-2">
          <h1 className="text-balance font-display text-2xl font-bold text-ink sm:text-3xl">How basket projections are worked out</h1>
          <P>
            Every basket page has a <b className="text-ink">Projections</b> switch. With it on, the basket and its stocks are projected 1 or 2 years
            ahead from today, in a Bear, Base and Bull case. This page sets out the whole method and works it through for any stock, using the same
            code the basket pages use.
          </P>
          <ol className="mt-1 grid gap-x-6 gap-y-1 text-xs sm:grid-cols-2">
            {SECTIONS.map(([id, label], i) => (
              <li key={id}>
                <a href={`#${id}`} className="tap-y text-accent hover:underline">
                  {i + 1}. {label}
                </a>
              </li>
            ))}
          </ol>
        </header>

        <section className="flex flex-col gap-2">
          <H2 id="what">1. What a projection is</H2>
          <P>
            A model of where each stock&rsquo;s price could be if its business carries on as its own reported figures suggest, and its valuation moves
            part of the way toward a usual level. It uses only figures shown elsewhere on NextResearch: five fiscal years of revenue and net profit, and
            today&rsquo;s price, market cap and P/E from our last data update.
          </P>
          <P>
            It is a model output, not a forecast or a recommendation. It doesn&rsquo;t know about orders, management guidance, news, interest rates or
            the market&rsquo;s mood, and it doesn&rsquo;t include dividends, costs or taxes.
          </P>
        </section>

        <section className="flex flex-col gap-2">
          <H2 id="which">2. Which stocks are projected</H2>
          <P>
            A stock needs at least <b className="text-ink">{MIN_YEARS} fiscal years in a row</b> of both revenue and net profit, ending at its latest
            reported year, at least 3 years of trading (a recent listing&rsquo;s earlier results are from before it listed, and it has no valuation history to judge a usual P/E by), and a price and market cap in our last data update. Anything less is too little to judge growth and margins on, so the stock
            is <b className="text-ink">left out</b>: its share of the basket is spread over the projected stocks in proportion to their own weights, so
            the weights still total 100%. A short note names the stocks left out and why; their rows in the table say so too. Leaving a stock out
            changes only the projection, never the backtest.
          </P>
          <P>
            A year that looks like a one-off (a single loss between profits, or a profit swing far bigger than the change in sales, as on the rule-based
            baskets) is left out of the margins when at least two other years remain.
          </P>
        </section>

        <section className="flex flex-col gap-3">
          <H2 id="steps">3. Step by step</H2>
          <div className="flex flex-col gap-2">
            <h3 className="font-semibold text-ink">a. Revenue growth</h3>
            <P>
              Each year&rsquo;s revenue growth over the years used. The stock&rsquo;s usual growth is the <b className="text-ink">median year</b>, or lower
              if either its overall rate over those years is lower (FY22 was a low post-Covid base for many companies, which flatters a rate measured
              from it) or its latest year slowed: then the latest year is averaged with the median, so a business whose sales just fell isn&rsquo;t
              projected on its past. Fast
              growth rarely lasts, so it is faded 40% of the way toward 10% a year, about India&rsquo;s nominal GDP growth. Bear and Bull sit the same
              distance either side: a quarter of the range of its yearly growth (best year minus worst, each faded the same way), at least 3 points. Every
              case is kept between −25% and +40% a year.
            </P>
            <Formula>usual = lowest of (median year, overall rate, (median + latest year) ÷ 2) → faded = usual + 0.4 × (10% − usual) → Bear / Bull = faded ∓ max(3 pts, range ÷ 4)</Formula>
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="font-semibold text-ink">b. Net margin</h3>
            <P>
              Net profit as a share of revenue in each year used. Today&rsquo;s margin is the latest year&rsquo;s. Each case has an aim: <b className="text-ink">Base</b>{" "}
              halfway between today&rsquo;s margin and its median, <b className="text-ink">Bear</b> its lowest year, <b className="text-ink">Bull</b> its
              highest. The margin moves a third of the way a year toward its aim, and by no more than 15% of today&rsquo;s margin a year, so a thin margin
              can&rsquo;t double in the model.
            </P>
            <Formula>margin then = today + (aim − today) × min(1, years ÷ 3) · margin factor = margin then ÷ today, kept within 1 ÷ (1 + 0.15 × years) … 1 + 0.15 × years</Formula>
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="font-semibold text-ink">c. Valuation</h3>
            <P>
              Today&rsquo;s P/E (on trailing earnings) moves toward a target: its <b className="text-ink">own</b> median P/E (today, 1 year ago and 3 years
              ago: the price then, from its price growth, over that year&rsquo;s profit), or its <b className="text-ink">industry&rsquo;s</b> median P/E
              (every listed company mapped in its home industry with a profit). The target is kept between 0.7× and 1.4× today&rsquo;s P/E, so a past
              year&rsquo;s tiny profit can&rsquo;t set an absurd target. It moves a third of the way a year (fully over 3 years). Bear takes 10% off the
              exit P/E, Bull adds 10%.
            </P>
            <Formula>exit P/E = today + (target − today) × min(1, years ÷ 3), then × 0.9 (Bear) or × 1.1 (Bull)</Formula>
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="font-semibold text-ink">d. Price and return</h3>
            <P>
              Earnings grow from today&rsquo;s with revenue and the margin. The price is those earnings times the exit P/E, so the return is the change
              in P/E times the change in earnings. Share count drops out, so dilution data isn&rsquo;t needed. Each case is kept between{" "}
              {pct(ANNUAL_MIN, 0)} and +{pct(ANNUAL_MAX, 0)} a year; a stock that hits a bound is marked &ldquo;capped&rdquo;.
            </P>
            <Formula>return = (exit P/E ÷ today&rsquo;s P/E) × (1 + growth)^years × margin factor − 1</Formula>
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="font-semibold text-ink">e. Loss-makers</h3>
            <P>
              A stock with a loss in its latest year, no positive P/E or no positive usual margin is valued on <b className="text-ink">price to sales</b>{" "}
              instead: revenue in place of earnings (moved up from its fiscal year to today at its Base growth), P/S in place of P/E, no margin step, and
              ±20% on the exit multiple for Bear and Bull. Marked &ldquo;P/S&rdquo; in the Assumptions tab.
            </P>
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <H2 id="cases">4. Bear, Base and Bull</H2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] border-collapse text-xs">
              <thead className="border-b border-line text-[10px] uppercase tracking-wider text-ink-soft">
                <tr>
                  <Th left>Case</Th>
                  <Th left>Growth</Th>
                  <Th left>Margin aims at</Th>
                  <Th left>Exit multiple</Th>
                </tr>
              </thead>
              <tbody className="text-ink">
                <tr className="border-b border-line/60">
                  <Td left>Bear</Td>
                  <Td left>usual − max(3 pts, range ÷ 4)</Td>
                  <Td left>its lowest year</Td>
                  <Td left>target × 0.9 (P/S × 0.8)</Td>
                </tr>
                <tr className="border-b border-line/60">
                  <Td left>Base</Td>
                  <Td left>usual (faded toward 10%)</Td>
                  <Td left>halfway, today to median</Td>
                  <Td left>target</Td>
                </tr>
                <tr>
                  <Td left>Bull</Td>
                  <Td left>usual + max(3 pts, range ÷ 4)</Td>
                  <Td left>its highest year</Td>
                  <Td left>target × 1.1 (P/S × 1.2)</Td>
                </tr>
              </tbody>
            </table>
          </div>
          <P>A case never lands the wrong side of Base: if a bound squeezes them, Bear is held at or below Base and Bull at or above.</P>
        </section>

        <section className="flex flex-col gap-2">
          <H2 id="options">5. The options</H2>
          <ul className="flex max-w-3xl flex-col gap-1.5 text-sm leading-relaxed text-ink-soft">
            <li>
              <b className="text-ink">Next 1Y / 2Y</b>: how far ahead. Margins and P/E cover a third of the way to their aims in 1 year, two thirds in 2;
              growth compounds over the years.
            </li>
            <li>
              <b className="text-ink">Case</b>: Bear, Base or Bull, as above. The cards also show the other two cases beside the one picked.
            </li>
            <li>
              <b className="text-ink">Exit at Own P/E or Industry P/E</b>: the target multiple. With no industry median known, Industry uses its own.
            </li>
            <li>
              <b className="text-ink">Weighting</b>: Equal, M-cap and Custom set each stock&rsquo;s share exactly as in the backtest; the projection follows
              a change at once. Custom weights that don&rsquo;t total 100% keep the last ones that did.
            </li>
            <li>
              <b className="text-ink">Rebalancing</b> doesn&rsquo;t apply: a projection is bought today and held.
            </li>
            <li>
              <b className="text-ink">Chart lines, Your picks, Compare with</b>: as in the backtest. Each ticked stock is drawn from 0% today to its own
              return; Your picks is the ticked stocks as their own basket; compared industry baskets are projected the same way (at equal weight when this
              basket is custom). Indices aren&rsquo;t projected.
            </li>
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <H2 id="basket">6. From stocks to the basket</H2>
          <P>
            The basket is bought today at its target weights (after spreading any left-out stock&rsquo;s share) and held. Its return is the weighted sum
            of its stocks&rsquo; returns. Each stock&rsquo;s <b className="text-ink">points added</b> is its weight times its return, so they add up to the
            basket&rsquo;s return. Its <b className="text-ink">end weight</b> is where its share would be if held: weight × (1 + its return) ÷ (1 + the
            basket&rsquo;s).
          </P>
          <Formula>basket return = Σ weight × return · points added = weight × return × 100 · end weight = weight × (1 + return) ÷ (1 + basket return)</Formula>
          <P>On the chart, each line grows smoothly from 0% today to its return, one point a week: value at week k of n = (1 + return)^(k ÷ n) − 1.</P>
        </section>

        <section className="flex flex-col gap-2">
          <H2 id="range">7. Likely range, drawdown and chance of a loss</H2>
          <P>
            A smooth line never falls, so the risk figures come from <b className="text-ink">1,000 simulated weekly paths</b>. Each path&rsquo;s middle
            outcome is the basket&rsquo;s return in the chosen case, and it swings as much as the basket did over the past year (its volatility, from its
            1-year backtest). The same settings always draw the same paths.
          </P>
          <ul className="flex max-w-3xl list-disc flex-col gap-1 pl-5 text-sm leading-relaxed text-ink-soft">
            <li><b className="text-ink">Likely range</b>: where 8 in 10 paths are each week (10th to 90th percentile); the dotted lines on the chart.</li>
            <li><b className="text-ink">Max drawdown</b>: the deepest fall from a high on the typical path (the median of every path&rsquo;s worst fall).</li>
            <li><b className="text-ink">Bad drawdown</b>: the fall that 1 in 10 paths reach or pass.</li>
            <li><b className="text-ink">Chance of loss</b>: the share of paths that end below today. <b className="text-ink">10% fall</b>: the share that fall 10% or more from a high at some point.</li>
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <H2 id="stats">8. The statistics</H2>
          <ul className="flex max-w-3xl list-disc flex-col gap-1 pl-5 text-sm leading-relaxed text-ink-soft">
            <li><b className="text-ink">Projected return</b> and <b className="text-ink">Per year</b> (compounded, for 2 years); Bear and Bull cases beside it.</li>
            <li><b className="text-ink">Volatility</b>: the basket&rsquo;s swings over the past year, a yearly figure; it sets how widely the paths spread.</li>
            <li><b className="text-ink">Return / risk</b>: the projected return a year divided by that volatility.</li>
            <li><b className="text-ink">Top contributor</b>: the stock adding the most points; <b className="text-ink">Stocks projected</b>: how many, and how many were left out.</li>
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <H2 id="limits">9. What it doesn&rsquo;t do</H2>
          <ul className="flex max-w-3xl list-disc flex-col gap-1 pl-5 text-sm leading-relaxed text-ink-soft">
            <li>It reads only five fiscal years and today&rsquo;s figures; anything not in them (a new order book, a merger, a change in rates) is outside the model.</li>
            <li>Growth and margins are the company&rsquo;s own history, faded and bounded; a business at a turning point will be wrong in the model.</li>
            <li>The simulated paths assume the past year&rsquo;s swings carry on and that weekly moves are independent; real markets have fatter tails.</li>
            <li>Price change only: no dividends, brokerage, taxes or slippage.</li>
          </ul>
          <P>Model projection from reported financials and past prices, not a forecast or a recommendation.</P>
        </section>

        <section className="flex flex-col gap-3">
          <H2 id="example">10. Worked example</H2>
          <ExampleStockSelect stocks={universe.map((s) => ({ ticker: s.ticker, name: s.name }))} value={stock?.ticker} />
          {!stock || !ex ? (
            <P>No figures for this stock in our last data update.</P>
          ) : !ex.ok ? (
            <P>
              <b className="text-ink">{stock.name}</b> is left out of projections: {ex.reason.charAt(0).toLowerCase() + ex.reason.slice(1)}.
            </P>
          ) : (
            <Example name={stock.name} home={home?.name ?? null} ctx={ex.ctx} />
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function Example({ name, home, ctx }: { name: string; home: string | null; ctx: Extract<ReturnType<typeof explainStock>, { ok: true }>["ctx"] }) {
  const pe = ctx.method === "pe";
  const mult = pe ? "P/E" : "P/S";
  const base1 = caseDetail(ctx, "own", 1, "base");
  const rows: { h: Horizon; basis: ExitBasis }[] = [
    { h: 1, basis: "own" },
    { h: 1, basis: "ind" },
    { h: 2, basis: "own" },
    { h: 2, basis: "ind" },
  ];
  return (
    <div className="flex flex-col gap-4">
      <P>
        <b className="text-ink">{name}</b>, valued on <b className="text-ink">{pe ? "P/E" : "price to sales (a loss-maker)"}</b>, using {ctx.years} years of
        results ({ctx.span}){ctx.skipped ? `, ${ctx.skipped} left out of the margins as a one-off` : ""}
        {home ? `, against its home industry, ${home}` : ""}.
      </P>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <h3 className="font-semibold text-ink">Growth</h3>
          <p className="font-mono text-[12px] text-ink-soft">Yearly: {ctx.yoy.map((g) => sPct(g)).join(" · ") || NA}</p>
          <p className="font-mono text-[12px] text-ink">
            Bear {pct(ctx.growth[0])} · Base {pct(ctx.growth[1])} · Bull {pct(ctx.growth[2])} a year
          </p>
        </div>
        {pe && (
          <div className="flex flex-col gap-1">
            <h3 className="font-semibold text-ink">Net margin</h3>
            <p className="font-mono text-[12px] text-ink-soft">Years used: {ctx.margins.map((m) => pct(m)).join(" · ")}</p>
            <p className="font-mono text-[12px] text-ink">
              Today {pct(ctx.marginNow)} · lowest {pct(ctx.margin[0])} · median {pct(ctx.margin[1])} · highest {pct(ctx.margin[2])}
            </p>
          </div>
        )}
        <div className="flex flex-col gap-1">
          <h3 className="font-semibold text-ink">{mult}</h3>
          <p className="font-mono text-[12px] text-ink-soft">{ctx.ownPoints.map(([l, v]) => `${l} ${x1(v)}`).join(" · ")}</p>
          <p className="font-mono text-[12px] text-ink">
            Own median {x1(ctx.ownMedian)} → target {x1(ctx.targetOwn)}
            {ctx.indMedian != null ? ` · industry median ${x1(ctx.indMedian)} → target ${x1(ctx.targetInd!)}` : " · no industry median"}
          </p>
          <p className="text-[11px] text-ink-soft">Targets are kept within 0.7× and 1.4× today&rsquo;s {x1(ctx.now)}.</p>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <h3 className="font-semibold text-ink">Base case, next 1 year, own {mult}, worked through</h3>
        <Formula>
          exit {mult} = {x1(ctx.now)} + ({x1(base1.target)} − {x1(ctx.now)}) × {base1.step.toFixed(2)} = {x1(base1.exit)}
          <br />
          growth factor = (1 + {pct(ctx.growth[1])})^1 = {base1.growthFactor.toFixed(3)}
          {pe && base1.marginThen != null && (
            <>
              <br />
              margin then = {pct(ctx.marginNow, 2)} + ({pct((ctx.marginNow + ctx.margin[1]) / 2, 2)} − {pct(ctx.marginNow, 2)}) × {base1.step.toFixed(2)} ={" "}
              {pct(base1.marginThen, 2)} → factor {base1.marginFactor.toFixed(3)}
            </>
          )}
          <br />
          return = ({x1(base1.exit)} ÷ {x1(ctx.now)}) × {base1.growthFactor.toFixed(3)}
          {pe ? ` × ${base1.marginFactor.toFixed(3)}` : ""} − 1 = {sPct(base1.ret)}
          {base1.capped ? " (capped)" : ""}
        </Formula>
      </div>

      <div className="flex flex-col gap-1">
        <h3 className="font-semibold text-ink">Every case</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse text-xs">
            <thead className="border-b border-line text-[10px] uppercase tracking-wider text-ink-soft">
              <tr>
                <Th left>Horizon · exit at</Th>
                <Th left>Case</Th>
                <Th>Exit {mult}</Th>
                <Th>Growth factor</Th>
                {pe && <Th>Margin factor</Th>}
                <Th>Return</Th>
              </tr>
            </thead>
            <tbody className="text-ink">
              {rows.flatMap(({ h, basis }) =>
                SCENARIOS.map((sc) => {
                  const d = caseDetail(ctx, basis, h, sc);
                  return (
                    <tr key={`${h}${basis}${sc}`} className={"border-b border-line/60 " + (sc === "bull" ? "border-line" : "")}>
                      <Td left>{sc === "bear" ? `${h} year${h === 1 ? "" : "s"} · ${basis === "own" ? `own ${mult}` : `industry ${mult}`}` : ""}</Td>
                      <Td left>{CASE[sc]}</Td>
                      <Td>{x1(d.exit)}</Td>
                      <Td>{d.growthFactor.toFixed(3)}</Td>
                      {pe && <Td>{d.marginFactor.toFixed(3)}</Td>}
                      <Td tone={d.ret}>
                        {sPct(d.ret)}
                        {d.capped ? " ·capped" : ""}
                      </Td>
                    </tr>
                  );
                }),
              )}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-ink-soft">
          The same figures the basket pages use for this stock (after Bear and Bull are held either side of Base).
        </p>
      </div>
    </div>
  );
}
