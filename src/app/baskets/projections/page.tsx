import Link from "next/link";
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ensureFinancials } from "@/lib/financials/load";
import { ensureRiskStats, riskStatsFor } from "@/lib/baskets/projection-risk-data";
import { listBasketUniverse } from "@/lib/baskets/industry";
import { homeIndustryOf, projectionInputFor, projectionScale } from "@/lib/baskets/projection-data";
import {
  BLUME_WEIGHT,
  GROWTH_FADE,
  HORIZONS,
  IC,
  LONG_RUN_GROWTH,
  MARGIN_SHIFT_A_YEAR,
  MARGIN_YEARS,
  MARKET,
  MIN_YEARS,
  VOL_FLOOR,
  Z80,
  Z_MAX,
  casesFor,
  explainStock,
  median,
  type ProjectionContext,
  type ProjectionInput,
} from "@/lib/baskets/projection";
import { getSector } from "@/lib/sector-content";
import { NA, fmtDay, signedPct } from "@/lib/format";
import { ExampleStockSelect } from "./ExampleStockSelect";

// How the basket pages' Projections are worked out (docs/PROJECTIONS.md, section 4), in full, with a
// worked example: any stock's own figures run through each step by the same code the baskets use,
// so the example always matches what a basket shows for it.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "How basket projections are worked out",
  description:
    "The method behind NextResearch's 1- and 2-year basket projections: a market-implied Base (10-year G-sec yield plus beta times India's equity risk premium, less dividend yield) tilted slightly by fundamentals, a Bear–Bull range from each stock's own volatility, the out-of-sample evidence, and a worked example for any stock.",
  alternates: { canonical: "/baskets/projections" },
};

const DISCLAIMER = "Model projection from market pricing, past prices and reported financials, not a forecast or a recommendation.";
const DEFAULT = "M&M";
const pct = (v: number, dp = 1) => `${v < 0 ? "−" : ""}${Math.abs(v * 100).toFixed(dp)}%`;
const sPct = (v: number, dp?: number) => signedPct(v * 100, dp);
const f4 = (v: number) => v.toFixed(4);
/** A term added in a formula: "+ 1.23%" or "− 1.23%" (or as a fraction, "+ 0.0123"), never "+ −". */
const plus = (v: number, dp = 2, frac = false) => `${v < 0 ? "−" : "+"} ${frac ? Math.abs(v).toFixed(dp) : `${Math.abs(v * 100).toFixed(dp)}%`}`;
const n2 = (v: number) => `${v < 0 ? "−" : ""}${Math.abs(v).toFixed(2)}`;
const n3 = (v: number) => `${v < 0 ? "−" : ""}${Math.abs(v).toFixed(3)}`;
const cr = (v: number | null | undefined) => (v == null || !Number.isFinite(v) ? NA : Math.round(v).toLocaleString("en-IN"));
const RANGE_TO_VOL = Math.sqrt(8 / Math.PI);

function H2({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} className="scroll-mt-20 font-display text-lg font-bold text-ink sm:text-xl">
      {children}
    </h2>
  );
}
const H3 = ({ children }: { children: ReactNode }) => <h3 className="font-semibold text-ink">{children}</h3>;
const P = ({ children }: { children: ReactNode }) => <p className="max-w-3xl text-sm leading-relaxed text-ink-soft">{children}</p>;
const B = ({ children }: { children: ReactNode }) => <b className="text-ink">{children}</b>;
const Note = ({ children }: { children: ReactNode }) => <p className="max-w-3xl text-[11px] leading-relaxed text-ink-soft">{children}</p>;
const Formula = ({ children }: { children: ReactNode }) => (
  <p className="max-w-3xl overflow-x-auto rounded border border-line bg-panel-2/60 px-3 py-2 font-mono text-[12px] leading-relaxed text-ink">{children}</p>
);
const Bullets = ({ children }: { children: ReactNode }) => <ul className="flex max-w-3xl list-disc flex-col gap-1 pl-5 text-sm leading-relaxed text-ink-soft">{children}</ul>;
const Th = ({ children, left }: { children: ReactNode; left?: boolean }) => (
  <th scope="col" className={"whitespace-nowrap px-2 py-1.5 font-semibold " + (left ? "text-left" : "text-right")}>
    {children}
  </th>
);
const Td = ({ children, left, tone, wrap }: { children: ReactNode; left?: boolean; tone?: number; wrap?: boolean }) => (
  <td
    className={
      (wrap ? "" : "whitespace-nowrap ") +
      "px-2 py-1.5 font-mono " +
      (left ? "text-left font-sans" : "text-right") +
      (tone == null ? "" : tone >= 0 ? " text-pos" : " text-danger")
    }
  >
    {children}
  </td>
);
/** A table that scrolls sideways inside its own box on a phone, never the page. */
const Table = ({ min, head, children }: { min: string; head: ReactNode; children: ReactNode }) => (
  <div className="max-w-full overflow-x-auto">
    <table className={`w-full ${min} border-collapse text-xs`}>
      <thead className="border-b border-line text-[10px] uppercase tracking-wider text-ink-soft">
        <tr>{head}</tr>
      </thead>
      <tbody className="text-ink">{children}</tbody>
    </table>
  </div>
);
const Row = ({ children, last }: { children: ReactNode; last?: boolean }) => <tr className={last ? "" : "border-b border-line/60"}>{children}</tr>;

const SECTIONS = [
  ["what", "What a projection is"],
  ["which", "Which stocks are projected"],
  ["market", "The market inputs"],
  ["steps", "Step by step"],
  ["cases", "Bear, Base and Bull"],
  ["options", "The options"],
  ["basket", "From stocks to the basket"],
  ["range", "Likely range, drawdown and chance of a loss"],
  ["stats", "The statistics"],
  ["evidence", "What changed, and the evidence"],
  ["limits", "What it doesn't do"],
  ["example", "Worked example"],
] as const;

// The out-of-sample check of the model as built (projection.ts, dividend yield subtracted): "Built
// v2" rows of scripts/validate-projections-v2.ts; design and the other variants in
// docs/PROJECTIONS-V2-PROTOTYPE.md. Inside = share of actual 1-year outcomes between Bear and Bull.
const PERIODS = [
  { period: "24 Oct 2024 → 24 Oct 2025", nifty: "+5.7%", stocks: 241, oldInside: "47%", inside: "91%", baseIc: "+0.01", scoreIc: "+0.09" },
  { period: "24 Apr 2025 → 24 Apr 2026", nifty: "−1.4%", stocks: 248, oldInside: "48%", inside: "90%", baseIc: "+0.01", scoreIc: "+0.09" },
  { period: "24 Oct 2025 → 23 Oct 2026", nifty: "−12.4%", stocks: 259, oldInside: "33%", inside: "81%", baseIc: "−0.11", scoreIc: "+0.01" },
] as const;

export default async function ProjectionMethodPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  await ensureFinancials();
  await ensureRiskStats();
  const { t } = await searchParams;
  const universe = listBasketUniverse().sort((a, b) => a.name.localeCompare(b.name));
  const stock = universe.find((s) => s.ticker === t) ?? universe.find((s) => s.ticker === DEFAULT) ?? universe[0];
  // The same home industry the basket pages judge the stock against (where its company page places it).
  const homeSlug = stock ? homeIndustryOf(stock.ticker) : null;
  const homeName = homeSlug ? (stock?.industries.find((i) => i.slug === homeSlug)?.name ?? getSector(homeSlug)?.name ?? null) : null;
  const input = stock ? projectionInputFor(stock.ticker, homeSlug) : null;
  const scale = projectionScale();
  const ex = input ? explainStock(input, scale) : null;
  const riskAsOf = stock ? (riskStatsFor(stock.ticker)?.asOf ?? null) : null;
  const tiltMax = IC * 0.35 * Z_MAX;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full min-w-0 max-w-4xl flex-1 flex-col gap-6 px-4 py-14 sm:px-5">
        <nav aria-label="Back" className="-my-1 flex flex-wrap items-center gap-x-4 text-xs font-semibold text-accent">
          <Link href="/baskets" className="inline-flex min-h-8 items-center hover:underline pointer-coarse:min-h-9">
            &larr; Baskets
          </Link>
        </nav>
        <header className="flex flex-col gap-2">
          <h1 className="text-balance font-display text-2xl font-bold text-ink sm:text-3xl">How basket projections are worked out</h1>
          <P>
            Every basket page has a <B>Projections</B> switch. With it on, the basket and its stocks are projected 1 or 2 years ahead from today, in a
            Bear, Base and Bull case. This page sets out the whole method, the evidence behind it, and works it through for any stock using the same
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
            <B>Base</B> is the price return the market prices in for the stock&rsquo;s risk, adjusted slightly for its fundamentals.{" "}
            <B>Bear</B> and <B>Bull</B> are the range 8 in 10 one-year outcomes fall in for a stock as volatile as this one has been over the past
            year. Base is an average outcome: the typical (median) outcome sits below it, because a volatile stock&rsquo;s typical year is below its
            average one.
          </P>
          <P>
            It uses the 10-year government bond yield, India&rsquo;s equity risk premium, two years of the stock&rsquo;s and the Nifty 50&rsquo;s
            daily prices, and figures shown elsewhere on NextResearch: five fiscal years of revenue and net profit, and today&rsquo;s price, market
            cap, P/E, dividend yield and 52-week range from our last data update, plus its home industry&rsquo;s median net margin.
          </P>
          <P>
            It is a model projection, not a forecast, a target price, a ranking of stocks or a recommendation. Base differs between stocks mostly
            because their betas differ, so a higher Base is not a better stock (section 10). The model doesn&rsquo;t know about orders, management
            guidance, news or the market&rsquo;s mood, and it is a price return: no dividends, costs or taxes.
          </P>
        </section>

        <section className="flex flex-col gap-2">
          <H2 id="which">2. Which stocks are projected</H2>
          <P>
            A stock needs at least <B>{MIN_YEARS} fiscal years in a row</B> of both revenue and net profit, ending at its latest reported year, with
            revenue in that year; at least <B>3 years of trading</B> (a 3-year price change: a recent listing&rsquo;s earlier results are from
            before it listed); and a price and market cap in our last data update. Anything less and the stock is <B>left out</B>: its share of
            the basket is spread over the projected stocks in proportion to their own weights, so the weights still total 100%. A short note names
            the stocks left out and why; their rows in the table say so too. Leaving a stock out changes only the projection, never the backtest.
          </P>
          <P>
            A year that looks like a one-off (a single loss between profits, or a profit swing far bigger than the change in sales, as on the
            rule-based baskets) is left out of the margins when at least two other years remain.
          </P>
        </section>

        <section className="flex flex-col gap-2">
          <H2 id="market">3. The market inputs</H2>
          <P>Two inputs are the same for every stock and are set by hand when they move materially.</P>
          <Table
            min="min-w-[36rem]"
            head={
              <>
                <Th left>Input</Th>
                <Th>Value</Th>
                <Th left>As of</Th>
                <Th left>Source</Th>
              </>
            }
          >
            <Row>
              <Td left wrap>
                rf: India 10-year G-sec yield
              </Td>
              <Td>{pct(MARKET.rf, 2)}</Td>
              <Td left>{MARKET.rfAsOf}</Td>
              <Td left wrap>
                Trading Economics, India 10-year benchmark close
              </Td>
            </Row>
            <Row last>
              <Td left wrap>
                ERP: India&rsquo;s equity risk premium
              </Td>
              <Td>{pct(MARKET.erp, 2)}</Td>
              <Td left>{MARKET.erpAsOf}</Td>
              <Td left wrap>
                Aswath Damodaran, country default spreads and risk premiums (January 2026 update): mature-market premium 4.23% plus India&rsquo;s
                country risk premium 2.85% (Moody&rsquo;s Baa3)
              </Td>
            </Row>
          </Table>
          <P>
            rf is updated after a big move in the G-sec yield and the ERP after each of Damodaran&rsquo;s January and July updates. Strictly,
            Damodaran adds his country premium to a default-free rate, and the G-sec yield already carries India&rsquo;s default spread (about 1.9
            points), so rf + ERP counts that spread twice. It raises every stock&rsquo;s Base by the same amount for a given beta; it never changes
            the width of the range.
          </P>
        </section>

        <section className="flex flex-col gap-3">
          <H2 id="steps">4. Step by step</H2>
          <div className="flex flex-col gap-2">
            <H3>a. Beta</H3>
            <P>
              The slope of the stock&rsquo;s weekly returns (last close of each Monday-to-Sunday week) on the Nifty 50&rsquo;s over the last 2 years,
              by least squares; at least 52 weekly returns are needed. Measured betas overshoot, so it is pulled a third of the way toward 1
              (Blume&rsquo;s adjustment). With no usable price history the beta is 1.
            </P>
            <Formula>
              beta = {BLUME_WEIGHT} × measured beta + {n2(1 - BLUME_WEIGHT)}
            </Formula>
          </div>
          <div className="flex flex-col gap-2">
            <H3>b. Volatility σ</H3>
            <P>
              Realised over the last year from daily closes (at least 40 daily returns), annualised, and never counted below{" "}
              {pct(VOL_FLOOR, 0)} a year. In the first visits after the price statistics are refreshed, a stock whose statistics aren&rsquo;t loaded
              yet has σ estimated from its 52-week range (Parkinson&rsquo;s estimate) and a beta of 1; the Assumptions tab says so.
            </P>
            <Formula>
              σ = max({pct(VOL_FLOOR, 0)}, √(250 × mean of squared daily log returns))
              <br />
              while loading: σ = max({pct(VOL_FLOOR, 0)}, ln(52-week high ÷ 52-week low) ÷ √(8/π))
            </Formula>
          </div>
          <div className="flex flex-col gap-2">
            <H3>c. Market return</H3>
            <P>
              The return CAPM says the market prices in for that beta, less the dividend yield, because this is a price projection and CAPM&rsquo;s
              figure includes dividends. A stock with a beta of 1 and no dividend gets rf + ERP, {pct(MARKET.rf + MARKET.erp)} a year.
            </P>
            <Formula>market return = rf + beta × ERP − dividend yield</Formula>
          </div>
          <div className="flex flex-col gap-2">
            <H3>d. Fundamentals score</H3>
            <P>
              One year&rsquo;s return on the business with <B>today&rsquo;s P/E held</B>: no move toward a past or industry multiple. Only for a
              stock with a positive P/E, a profit in its latest year and a positive usual margin.
            </P>
            <Bullets>
              <li>
                <B>Growth.</B> Each year&rsquo;s revenue growth over the years used. The usual rate is the lowest of the median year, the compound
                rate over the years (FY22 was a low post-Covid base for many companies, which flatters a rate measured from it), and the average of
                the median and the latest year (so a recent slowdown counts). Fast growth rarely lasts, so it is faded {pct(GROWTH_FADE, 0)} of the
                way toward {pct(LONG_RUN_GROWTH, 0)} a year, about India&rsquo;s nominal GDP growth, and kept between −25% and +40%.
              </li>
              <li>
                <B>Margin.</B> Net profit as a share of revenue each year used (each kept between −50% and +60%; a one-off year left out). Its aim
                is the average of its own median margin and its home industry&rsquo;s median (the latest year&rsquo;s, over every listed company the
                industry maps); with no positive industry median, its own. Today&rsquo;s margin moves a third of the way toward the aim in a year,
                and by no more than {pct(MARGIN_SHIFT_A_YEAR, 0)} of itself, so a thin margin can&rsquo;t double in the model.
              </li>
            </Bullets>
            <Formula>
              usual = lowest of (median year, compound rate, (median + latest year) ÷ 2)
              <br />
              growth = usual + {GROWTH_FADE} × ({pct(LONG_RUN_GROWTH, 0)} − usual), within −25% … +40%
              <br />
              aim = (own median margin + industry median margin) ÷ 2
              <br />
              margin a year on = today + (aim − today) ÷ {MARGIN_YEARS}
              <br />
              margin factor = margin a year on ÷ today, within 1 ÷ {1 + MARGIN_SHIFT_A_YEAR} … {1 + MARGIN_SHIFT_A_YEAR}
              <br />
              score = (1 + growth) × margin factor − 1
            </Formula>
          </div>
          <div className="flex flex-col gap-2">
            <H3>e. Standardised score z and the tilt</H3>
            <P>
              The score is measured against the scores of every listed company we cover that has one ({scale.n} today): z is how many standard
              deviations it sits above or below their median, kept within ±{Z_MAX}. The tilt follows Grinold and Kahn: a forecast is the
              signal&rsquo;s skill (its information coefficient, IC) times the stock&rsquo;s volatility times its score. With IC at {IC}, a weak
              signal barely moves the projection: at σ 35% the tilt is at most about ±{(tiltMax * 100).toFixed(1)} points.
            </P>
            <Formula>
              z = (score − median score) ÷ standard deviation of scores, within ±{Z_MAX}
              <br />
              tilt = IC × σ × z, IC = {IC}
            </Formula>
          </div>
          <div className="flex flex-col gap-2">
            <H3>f. Loss-makers</H3>
            <P>
              A stock with a loss in its latest year, no positive P/E or no positive usual margin has no fundamentals score: z and the tilt are 0,
              and it is projected on the market return and its own volatility alone. Marked &ldquo;market&rdquo; in the Assumptions tab.
            </P>
          </div>
          <div className="flex flex-col gap-2">
            <H3>g. Base</H3>
            <P>
              A year: the market return plus the tilt. Two years: the market return compounded over both years, with the tilt once, since a one-year
              signal isn&rsquo;t carried into the second year.
            </P>
            <Formula>
              Base, 1 year = market return + tilt
              <br />
              Base, 2 years = (1 + market return) × (1 + market return + tilt) − 1
            </Formula>
          </div>
          <div className="flex flex-col gap-2">
            <H3>h. Bear and Bull</H3>
            <P>
              The 10th and 90th percentiles of a lognormal outcome whose average is Base and whose spread is the stock&rsquo;s σ over h years (1 or
              2). The middle of that range, the median, is (1 + Base) × e^(−σ²h/2) − 1, below Base. The return itself has no cap (the
              previous model&rsquo;s −60% … +80% a year bound is gone); only the inputs above have limits.
            </P>
            <Formula>
              Bear = (1 + Base) × e^(−σ²h/2 − {Z80.toFixed(4)} × σ × √h) − 1
              <br />
              Bull = (1 + Base) × e^(−σ²h/2 + {Z80.toFixed(4)} × σ × √h) − 1
            </Formula>
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <H2 id="cases">5. Bear, Base and Bull</H2>
          <Table
            min="min-w-[30rem]"
            head={
              <>
                <Th left>Case</Th>
                <Th left>What it is</Th>
                <Th left>Formula, h years</Th>
              </>
            }
          >
            <Row>
              <Td left>Bear</Td>
              <Td left wrap>1 in 10 outcomes are below it</Td>
              <Td left>(1 + Base) e^(−σ²h/2 − 1.28σ√h) − 1</Td>
            </Row>
            <Row>
              <Td left>Base</Td>
              <Td left wrap>the average outcome: market return plus tilt</Td>
              <Td left>1 year: market + tilt · 2 years: (1 + market) × (1 + market + tilt) − 1</Td>
            </Row>
            <Row last>
              <Td left>Bull</Td>
              <Td left wrap>1 in 10 outcomes are above it</Td>
              <Td left>(1 + Base) e^(−σ²h/2 + 1.28σ√h) − 1</Td>
            </Row>
          </Table>
          <P>
            All three come from the same Base and σ, so Bear is always below Base and Bull above. A more volatile stock gets a wider range, and over 2
            years the range widens with the square root of time.
          </P>
        </section>

        <section className="flex flex-col gap-2">
          <H2 id="options">6. The options</H2>
          <ul className="flex max-w-3xl flex-col gap-1.5 text-sm leading-relaxed text-ink-soft">
            <li>
              <B>Next 1Y / 2Y</B>: how far ahead. Over 2 years Base compounds the market return with the tilt once, and the range widens with √2.
            </li>
            <li>
              <B>Case</B>: Bear, Base or Bull, as above. The cards also show the other two cases beside the one picked.
            </li>
            <li>
              <B>Weighting</B>: Equal, M-cap and Custom set each stock&rsquo;s share exactly as in the backtest; the projection follows a change at
              once. Custom weights that don&rsquo;t total 100% keep the last ones that did.
            </li>
            <li>
              <B>Rebalancing</B> doesn&rsquo;t apply: a projection is bought today and held.
            </li>
            <li>
              <B>Chart lines, Your picks, Compare with</B>: as in the backtest. Each ticked stock is drawn from 0% today to its own return; Your
              picks is the ticked stocks as their own basket; compared industry baskets are projected the same way (at equal weight when this basket
              is custom). Indices aren&rsquo;t projected.
            </li>
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <H2 id="basket">7. From stocks to the basket</H2>
          <P>
            The basket is bought today at its target weights (after spreading any left-out stock&rsquo;s share) and held. Its return in each case is
            the weighted sum of its stocks&rsquo; returns in that case. Each stock&rsquo;s <B>points added</B> is its weight times its return, so
            they add up to the basket&rsquo;s return. Its <B>end weight</B> is where its share would be if held.
          </P>
          <Formula>
            basket return = Σ weight × return · points added = weight × return × 100 · end weight = weight × (1 + return) ÷ (1 + basket return)
          </Formula>
          <P>
            So the basket&rsquo;s <B>Bear</B> and <B>Bull</B> assume every stock at its own 10th (or 90th) percentile at once. Stocks don&rsquo;t all
            have a bad year together, so this is wider than the basket&rsquo;s own range; the <B>likely range</B> below, from the basket&rsquo;s
            own volatility, is the basket-level range.
          </P>
          <P>On the chart, each line grows smoothly from 0% today to its return, one point a week: value at week k of n = (1 + return)^(k ÷ n) − 1.</P>
        </section>

        <section className="flex flex-col gap-2">
          <H2 id="range">8. Likely range, drawdown and chance of a loss</H2>
          <P>
            A smooth line never falls, so the risk figures come from <B>1,000 simulated weekly paths</B>. Their average outcome is the
            basket&rsquo;s <B>Base</B> return whichever case is chosen (so the median path ends a little below it, as each stock&rsquo;s range is
            centred): Bear and Bull are already the basket&rsquo;s two extremes, and a simulation around Bear would stack a bad year on a bad year. Each
            path swings as much as the basket did over the past year (its volatility, from its 1-year
            backtest). The same settings always draw the same paths.
          </P>
          <Bullets>
            <li>
              <B>Likely range</B>: where 8 in 10 paths are each week (10th to 90th percentile); the dotted lines on the chart.
            </li>
            <li>
              <B>Max drawdown</B>: the deepest fall from a high on the typical path (the median of every path&rsquo;s worst fall).
            </li>
            <li>
              <B>Bad drawdown</B>: the fall that 1 in 10 paths reach or pass.
            </li>
            <li>
              <B>Chance of loss</B>: the share of paths that end below today. <B>10% fall</B>: the share that fall 10% or more from a high at some
              point.
            </li>
          </Bullets>
        </section>

        <section className="flex flex-col gap-2">
          <H2 id="stats">9. The statistics</H2>
          <Bullets>
            <li>
              <B>Projected return</B> and <B>Per year</B> (compounded, for 2 years); Bear and Bull cases beside it.
            </li>
            <li>
              <B>Volatility</B>: the basket&rsquo;s swings over the past year, a yearly figure; it sets how widely the paths spread.
            </li>
            <li>
              <B>Return / risk</B>: the projected return a year divided by that volatility.
            </li>
            <li>
              <B>Top contributor</B>: the stock adding the most points; <B>Stocks projected</B>: how many, and how many were left out.
            </li>
          </Bullets>
        </section>

        <section className="flex flex-col gap-2">
          <H2 id="evidence">10. What changed, and the evidence</H2>
          <P>
            The first model moved each stock&rsquo;s P/E part of the way toward its own or its industry&rsquo;s usual level, and set Bear and Bull
            from fixed scenario shifts in growth, margin and multiple. Tested out of sample, its range was far too narrow and the multiple reversion
            leaned toward stocks that had just fallen. This model changes four things:
          </P>
          <Bullets>
            <li>
              <B>Base is anchored on the market</B> (rf + beta × ERP − dividend yield) instead of a P/E reverting to a past or industry level, so the
              &ldquo;Exit at own or industry P/E&rdquo; option is gone.
            </li>
            <li>
              <B>Fundamentals are a small tilt</B> with today&rsquo;s P/E held, sized at an IC of {IC}.
            </li>
            <li>
              <B>Bear and Bull come from the stock&rsquo;s own 1-year volatility</B>, centred on the lognormal median, instead of scenario shifts.
              The return itself has no cap.
            </li>
            <li>
              <B>Loss-makers</B> get the market return and their own volatility instead of a price-to-sales reversion.
            </li>
          </Bullets>
          <P>
            We rebuilt every input as it stood on three start dates and compared each model&rsquo;s 1-year projection with what each stock actually
            did (price only). &ldquo;Inside&rdquo; is the share of actual outcomes between Bear and Bull; the target is 80%. The rank correlation
            (Spearman) measures whether a higher Base went with a higher actual return.
          </P>
          <Table
            min="min-w-[44rem]"
            head={
              <>
                <Th left>Period</Th>
                <Th>Nifty 50</Th>
                <Th>Stocks</Th>
                <Th>Inside, first model</Th>
                <Th>Inside, this model</Th>
                <Th>Base rank corr.</Th>
                <Th>Score rank corr.</Th>
              </>
            }
          >
            {PERIODS.map((r, i) => (
              <Row key={r.period} last={i === PERIODS.length - 1}>
                <Td left>{r.period}</Td>
                <Td>{r.nifty}</Td>
                <Td>{r.stocks}</Td>
                <Td>{r.oldInside}</Td>
                <Td>{r.inside}</Td>
                <Td>{r.baseIc}</Td>
                <Td>{r.scoreIc}</Td>
              </Row>
            ))}
          </Table>
          <Bullets>
            <li>
              <B>The range now fits.</B> Bear–Bull held 91%, 90% and 81% of outcomes (87% pooled) against the first model&rsquo;s 47%, 48% and 33%. It
              held up in the year the Nifty fell 12%, and is a little wide in calmer years; it was not narrowed to fit these periods.
            </li>
            <li>
              <B>Base is not a stock-picking signal.</B> Its rank correlation with outcomes was +0.01, +0.01 and −0.11. Across stocks it mostly
              reflects beta, so it follows the market&rsquo;s direction. The fundamentals score alone was +0.09, +0.09 and +0.01: positive in every
              period, never statistically significant, which is why its weight is small.
            </li>
            <li>
              <B>The level still misses by the market&rsquo;s year.</B> No model of this kind foresees whether the market rises or falls; the median
              stock&rsquo;s Base was typically well above its actual return over these years.
            </li>
            <li>
              <B>The evidence is thin.</B> The middle period overlaps the other two by six months, so there are two independent years, both in one
              stretch for Indian small and mid caps. No parameter was tuned on the results. The 2-year horizon hasn&rsquo;t been tested.
            </li>
          </Bullets>
        </section>

        <section className="flex flex-col gap-2">
          <H2 id="limits">11. What it doesn&rsquo;t do</H2>
          <Bullets>
            <li>It doesn&rsquo;t foresee the market&rsquo;s year: every Base assumes the market earns its usual premium, and it often doesn&rsquo;t.</li>
            <li>It doesn&rsquo;t rank stocks. A higher Base mostly means a higher beta, which means more risk, not a better stock.</li>
            <li>
              The range assumes the past year&rsquo;s volatility carries on and returns are lognormal; real markets have fatter tails and calm years
              before sharp falls. Over 2 years it assumes years are independent (√2 scaling), which is untested.
            </li>
            <li>
              Beta and volatility come from past prices; a business that has changed (a merger, a new segment) may be priced differently from now
              on.
            </li>
            <li>
              The fundamentals score reads only five fiscal years and today&rsquo;s figures; orders, guidance and news are outside it. A business at
              a turning point will be wrong in the model.
            </li>
            <li>rf and the ERP are set by hand and dated above; rf + ERP counts India&rsquo;s default spread twice (section 3).</li>
            <li>Price change only: no dividends, brokerage, taxes or slippage.</li>
          </Bullets>
          <P>{DISCLAIMER}</P>
        </section>

        <section className="flex flex-col gap-3">
          <H2 id="example">12. Worked example</H2>
          <ExampleStockSelect stocks={universe.map((s) => ({ ticker: s.ticker, name: s.name }))} value={stock?.ticker} />
          {!stock || !ex || !input ? (
            <P>No figures for this stock in our last data update.</P>
          ) : !ex.ok ? (
            <P>
              <B>{stock.name}</B> is left out of projections: {ex.reason.charAt(0).toLowerCase() + ex.reason.slice(1)}.
            </P>
          ) : (
            <Example name={stock.name} home={homeName} ctx={ex.ctx} input={input} riskAsOf={riskAsOf} />
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function Example({ name, home, ctx, input, riskAsOf }: { name: string; home: string | null; ctx: ProjectionContext; input: ProjectionInput; riskAsOf: string | null }) {
  const f = ctx.fundamentals;
  const firstFy = Number(/^FY(\d\d)/.exec(ctx.span)?.[1] ?? 22);
  const runYears = Array.from({ length: ctx.years }, (_, i) => firstFy + i);
  const at = (fy: number) => fy - 22;
  const fyLabel = (fy: number) => `FY${fy}`;
  const volFromPrices = typeof input.risk?.vol === "number" && Number.isFinite(input.risk.vol) && input.risk.vol > 0;
  const [lo, hi] = [input.range?.[0] ?? null, input.range?.[1] ?? null];
  const cases = HORIZONS.map((h) => ({ h, c: casesFor(ctx, h) }));
  const base2 = cases[1].c[1];

  // Why a stock has no fundamentals score (the same tests as projection.ts, in its order).
  const npLast = input.np[at(runYears[runYears.length - 1])];
  const noScoreWhy = input.pe == null ? "it has no positive P/E" : typeof npLast === "number" && npLast <= 0 ? "it made a loss in its latest year" : "its usual margin isn't positive";

  // Growth's three candidates (as usualGrowth in projection.ts).
  const g = f
    ? (() => {
        const mid = median(f.yoy);
        const first = f.revs[0];
        const last = f.revs[f.revs.length - 1];
        const cagr = first > 0 && last > 0 ? Math.pow(last / first, 1 / (f.revs.length - 1)) - 1 : null;
        const latest = f.yoy.length ? f.yoy[f.yoy.length - 1] : null;
        const recent = mid != null && latest != null ? (mid + latest) / 2 : null;
        const faded = f.histGrowth + (LONG_RUN_GROWTH - f.histGrowth) * GROWTH_FADE;
        return { mid, cagr, recent, faded };
      })()
    : null;
  // The years whose margins were used (one-off left out, revenue positive), in order.
  const marginYears = runYears.filter((fy) => fyLabel(fy) !== ctx.skipped && (input.rev[at(fy)] ?? 0) > 0);
  const marginCapped = f ? Math.abs(f.marginFactor - f.marginThen / f.marginNow) > 1e-12 : false;
  const zRaw = f && ctx.scale.sd > 0 ? (f.score - ctx.scale.median) / ctx.scale.sd : 0;
  const zCapped = Math.abs(zRaw - ctx.z) > 1e-12;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <P>
        <B>{name}</B>: {ctx.method === "pe" ? "profitable, so its fundamentals tilt the market return" : "projected on the market return alone (no fundamentals score)"}
        , using {ctx.years} years of results ({ctx.span}){ctx.skipped ? `, ${ctx.skipped} left out of the margins as a one-off` : ""}
        {home ? `, against its home industry, ${home}` : ""}. Figures from our data update of {input.asOf ?? NA}
        {riskAsOf ? `; prices to ${fmtDay(riskAsOf)}` : "; price statistics not loaded yet"}.
      </P>

      <div className="flex flex-col gap-1">
        <H3>Inputs</H3>
        <Table
          min="min-w-[22rem]"
          head={
            <>
              <Th left>Input</Th>
              <Th>Value</Th>
            </>
          }
        >
          <Row>
            <Td left>rf, 10-year G-sec ({MARKET.rfAsOf})</Td>
            <Td>{pct(ctx.rf, 2)}</Td>
          </Row>
          <Row>
            <Td left>ERP, India ({MARKET.erpAsOf})</Td>
            <Td>{pct(ctx.erp, 2)}</Td>
          </Row>
          <Row>
            <Td left>Measured beta (2Y weekly vs Nifty 50)</Td>
            <Td>{ctx.betaRaw == null ? "none" : n3(ctx.betaRaw)}</Td>
          </Row>
          <Row>
            <Td left>{volFromPrices ? "Realised volatility, last year" : "52-week low / high"}</Td>
            <Td>{volFromPrices ? pct(ctx.volRaw!, 1) : lo != null && hi != null ? `${lo} / ${hi}` : "none"}</Td>
          </Row>
          <Row>
            <Td left>Dividend yield</Td>
            <Td>{pct(ctx.divYield, 2)}</Td>
          </Row>
          <Row last={!f}>
            <Td left>P/E today</Td>
            <Td>{input.pe == null ? "none" : `${input.pe.toFixed(1)}×`}</Td>
          </Row>
          {f && (
            <Row last>
              <Td left>Home industry median net margin</Td>
              <Td>{f.indMargin == null ? "none" : pct(f.indMargin, 2)}</Td>
            </Row>
          )}
        </Table>
      </div>

      <div className="flex flex-col gap-1">
        <H3>1. Beta</H3>
        <Formula>
          {ctx.betaRaw == null ? (
            <>no measured beta (too little price history, or not loaded yet) → beta = 1</>
          ) : (
            <>
              beta = {BLUME_WEIGHT} × {n3(ctx.betaRaw)} + {n2(1 - BLUME_WEIGHT)} = {n3(ctx.beta)}
            </>
          )}
        </Formula>
      </div>

      <div className="flex flex-col gap-1">
        <H3>2. Volatility σ</H3>
        <Formula>
          {volFromPrices ? (
            <>realised over the last year = {pct(ctx.volRaw!, 2)}</>
          ) : ctx.volRaw != null && lo != null && hi != null ? (
            <>
              from the 52-week range (prices not loaded yet): ln({hi} ÷ {lo}) ÷ {RANGE_TO_VOL.toFixed(3)} = {pct(ctx.volRaw, 2)}
            </>
          ) : (
            <>no volatility estimate</>
          )}
          <br />σ = max({pct(VOL_FLOOR, 0)}, {ctx.volRaw == null ? "none" : pct(ctx.volRaw, 2)}) = {pct(ctx.vol, 2)}
          {ctx.volSource === "floor" ? " (the floor)" : ""}
        </Formula>
      </div>

      <div className="flex flex-col gap-1">
        <H3>3. Market return</H3>
        <Formula>
          rf + beta × ERP − dividend yield = {pct(ctx.rf, 2)} + {n3(ctx.beta)} × {pct(ctx.erp, 2)} − {pct(ctx.divYield, 2)} = {pct(ctx.market, 2)}
        </Formula>
      </div>

      {f && g ? (
        <>
          <div className="flex flex-col gap-1">
            <H3>4. Fundamentals score</H3>
            <Table
              min="min-w-[28rem]"
              head={
                <>
                  <Th left>Year</Th>
                  <Th>Revenue, Rs Cr</Th>
                  <Th>Net profit, Rs Cr</Th>
                  <Th>Net margin</Th>
                  <Th>Revenue growth</Th>
                </>
              }
            >
              {runYears.map((fy, i) => {
                const rev = input.rev[at(fy)];
                const np = input.np[at(fy)];
                const m = typeof rev === "number" && typeof np === "number" && rev > 0 ? np / rev : null;
                const used = marginYears.includes(fy);
                const prev = i > 0 ? input.rev[at(fy) - 1] : null;
                const yoy = typeof prev === "number" && prev > 0 && typeof rev === "number" ? rev / prev - 1 : null;
                return (
                  <Row key={fy} last={i === runYears.length - 1}>
                    <Td left>{fyLabel(fy)}</Td>
                    <Td>{cr(rev)}</Td>
                    <Td>{cr(np)}</Td>
                    <Td>
                      {m == null ? NA : pct(m, 2)}
                      {!used ? " (left out)" : ""}
                    </Td>
                    <Td tone={yoy ?? undefined}>{yoy == null ? NA : sPct(yoy)}</Td>
                  </Row>
                );
              })}
            </Table>
            <Formula>
              median year = {g.mid == null ? NA : sPct(g.mid, 2)} · compound rate = {g.cagr == null ? NA : sPct(g.cagr, 2)} · (median + latest) ÷ 2 ={" "}
              {g.recent == null ? NA : sPct(g.recent, 2)}
              <br />
              usual = lowest = {sPct(f.histGrowth, 2)}
              <br />
              growth = {pct(f.histGrowth, 2)} + {GROWTH_FADE} × ({pct(LONG_RUN_GROWTH, 0)} {plus(-f.histGrowth)}) = {sPct(g.faded, 2)}
              {Math.abs(g.faded - f.growth) > 1e-12 ? ` → kept within −25% … +40%: ${sPct(f.growth, 2)}` : ""}
              <br />
              <br />
              margins used: {f.margins.map((m, i) => `${marginYears[i] != null ? fyLabel(marginYears[i]) + " " : ""}${pct(m, 2)}`).join(" · ")}
              <br />
              own median = {pct(f.ownMargin, 2)} · industry median = {f.indMargin == null ? "none" : pct(f.indMargin, 2)}
              <br />
              aim = {f.indMargin == null ? `own median = ${pct(f.aimMargin, 2)}` : `(${pct(f.ownMargin, 2)} + ${pct(f.indMargin, 2)}) ÷ 2 = ${pct(f.aimMargin, 2)}`}
              <br />
              margin a year on = {pct(f.marginNow, 2)} + ({pct(f.aimMargin, 2)} − {pct(f.marginNow, 2)}) ÷ {MARGIN_YEARS} = {pct(f.marginThen, 2)}
              <br />
              margin factor = {pct(f.marginThen, 2)} ÷ {pct(f.marginNow, 2)} = {(f.marginThen / f.marginNow).toFixed(4)}
              {marginCapped ? ` → kept within 1 ÷ ${1 + MARGIN_SHIFT_A_YEAR} … ${1 + MARGIN_SHIFT_A_YEAR}: ${f.marginFactor.toFixed(4)}` : ""}
              <br />
              <br />
              score = {f4(1 + f.growth)} × {f.marginFactor.toFixed(4)} − 1 = {sPct(f.score, 2)}
            </Formula>
          </div>

          <div className="flex flex-col gap-1">
            <H3>5. z and the tilt</H3>
            <Formula>
              z = ({pct(f.score, 2)} {plus(-ctx.scale.median)}) ÷ {pct(ctx.scale.sd, 2)} = {n2(zRaw)}
              {zCapped ? ` → kept within ±${Z_MAX}: ${n2(ctx.z)}` : ""}
              <br />
              tilt = {IC} × {pct(ctx.vol, 2)} × {n2(ctx.z)} = {sPct(ctx.tilt, 2)}
            </Formula>
            <Note>
              Median and standard deviation over the {ctx.scale.n} listed companies we cover that have a fundamentals score.
            </Note>
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-1">
          <H3>4–5. Fundamentals score, z and the tilt</H3>
          <Formula>no fundamentals score ({noScoreWhy}) → z = 0, tilt = 0</Formula>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <H3>6. Base</H3>
        <Formula>
          1 year: {pct(ctx.market, 2)} {plus(ctx.tilt)} = {sPct(ctx.base1, 2)}
          <br />2 years: {f4(1 + ctx.market)} × ({f4(1 + ctx.market)} {plus(ctx.tilt, 4, true)}) − 1 = {sPct(base2, 2)}
        </Formula>
      </div>

      <div className="flex flex-col gap-1">
        <H3>7. Bear and Bull</H3>
        <Formula>
          {cases.map(({ h, c }, i) => {
            const mid = (1 + c[1]) * Math.exp((-ctx.vol * ctx.vol * h) / 2) - 1;
            const w = Z80 * ctx.vol * Math.sqrt(h);
            return (
              <span key={h}>
                {i > 0 && <br />}
                {h} year{h === 1 ? "" : "s"}: median = {f4(1 + c[1])} × e^(−{pct(ctx.vol, 2)}² × {h} ÷ 2) − 1 = {sPct(mid, 2)}; spread ={" "}
                {Z80.toFixed(4)} × {pct(ctx.vol, 2)} × √{h} = {w.toFixed(4)}
                <br />
                {"  "}Bear = {f4(1 + mid)} × e^(−{w.toFixed(4)}) − 1 = {sPct(c[0], 2)} · Bull = {f4(1 + mid)} × e^({w.toFixed(4)}) − 1 ={" "}
                {sPct(c[2], 2)}
              </span>
            );
          })}
        </Formula>
      </div>

      <div className="flex flex-col gap-1">
        <H3>Every case</H3>
        <Table
          min="min-w-[26rem]"
          head={
            <>
              <Th left>Horizon</Th>
              <Th>Bear</Th>
              <Th>Base</Th>
              <Th>Bull</Th>
              <Th>Median</Th>
            </>
          }
        >
          {cases.map(({ h, c }, i) => (
            <Row key={h} last={i === cases.length - 1}>
              <Td left>
                Next {h} year{h === 1 ? "" : "s"}
              </Td>
              <Td tone={c[0]}>{sPct(c[0])}</Td>
              <Td tone={c[1]}>{sPct(c[1])}</Td>
              <Td tone={c[2]}>{sPct(c[2])}</Td>
              <Td>{sPct((1 + c[1]) * Math.exp((-ctx.vol * ctx.vol * h) / 2) - 1)}</Td>
            </Row>
          ))}
        </Table>
        <Note>
          The same figures the basket pages use for this stock. Each step is shown rounded; the sums use full precision, so a step worked by hand
          from the rounded figures can differ in the last digit. {DISCLAIMER}
        </Note>
      </div>
    </div>
  );
}
