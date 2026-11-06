import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ensureFinancials } from "@/lib/financials/load";
import { ensureRiskStats, riskStatsFor, riskStatsLoading } from "@/lib/baskets/projection-risk-data";
import { ProjectionStatsPending } from "@/components/baskets/ProjectionStatsPending";
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
import { allChecks, stockChecks, type AllChecks, type StockCheck } from "@/lib/baskets/projection-check-data";
import type { Landed } from "@/lib/baskets/projection-check";
import { NA, fmtDay, signedPct } from "@/lib/format";
import { ExampleStockSelect } from "./ExampleStockSelect";
import { B, Bullets, Formula, H2, H3, Note, P, Row, Table, Td, Th } from "../method-ui";
import { shareMeta } from "@/lib/site";

// How the basket pages' Projections are worked out (docs/PROJECTIONS.md, section 4), in full, with a
// worked example: any stock's own figures run through each step by the same code the baskets use,
// so the example always matches what a basket shows for it.
export const dynamic = "force-dynamic";
// The first visit of a day works out the check over every covered stock after the response (projection-check-data.ts).
export const maxDuration = 300;

export const metadata = {
  title: "How basket projections are worked out",
  description:
    "The method behind NextResearch's 1- and 2-year basket projections: a market-implied Base (10-year G-sec yield plus beta times India's equity risk premium, less dividend yield) tilted slightly by fundamentals, a Bear–Bull range from each stock's own volatility, the out-of-sample evidence, and a worked example for any stock.",
  alternates: { canonical: "/baskets/projections" },
  ...shareMeta({ title: "How basket projections work", line: "Bear, Base and Bull, explained.", path: "/baskets/projections" }),
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


const SECTIONS = [
  ["what", "In short"],
  ["steps", "Step by step"],
  ["basket", "The basket and its risk"],
  ["evidence", "How well it held up"],
  ["limits", "What it doesn't do"],
  ["example", "Worked example"],
] as const;


export default async function ProjectionMethodPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  await ensureFinancials();
  await ensureRiskStats();
  // Read now: the load can finish during the awaits below, after the stocks were built on stand-ins.
  const statsLoading = riskStatsLoading();
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
  const [all, checks] = await Promise.all([allChecks(), stock ? stockChecks(stock.ticker) : null]);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full min-w-0 max-w-4xl flex-1 flex-col gap-6 px-4 pt-6 pb-14 sm:py-14 sm:px-5">
        {statsLoading && <ProjectionStatsPending />}
        <nav aria-label="Back" className="-my-1 flex flex-wrap items-center gap-x-4 text-xs font-semibold text-accent">
          <Link href="/baskets" className="inline-flex min-h-8 items-center hover:underline pointer-coarse:min-h-9">
            &larr; Baskets
          </Link>
        </nav>
        <header className="flex flex-col gap-2">
          <h1 className="text-balance font-display text-2xl font-bold text-ink sm:text-3xl">How basket projections are worked out</h1>
          <P>
            The <B>Projections</B> switch on a basket page projects the basket and its stocks 1 or 2 years ahead in a Bear, Base and Bull case.
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
          <H2 id="what">1. In short</H2>
          <Bullets>
            <li>
              <B>Base</B>: the return the market prices in for the stock&rsquo;s risk, plus a small tilt from its growth and margin.
            </li>
            <li>
              <B>Bear</B> and <B>Bull</B>: its 1-in-10 low and high years at its own volatility over the past year.
            </li>
            <li>
              <B>Which stocks</B>: those with at least {MIN_YEARS} fiscal years in a row of revenue and profit and 3 years of trading. Any other
              stock is left out and its share spread over the rest.
            </li>
          </Bullets>
        </section>

        <section className="flex flex-col gap-2">
          <H2 id="steps">2. Step by step</H2>
          <Formula>
            beta = {BLUME_WEIGHT} × measured beta + {n2(1 - BLUME_WEIGHT)} &nbsp;(2 years of weekly returns against the Nifty 50; 1 without them)
            <br />
            σ = the past year&rsquo;s volatility, at least {pct(VOL_FLOOR, 0)}
            <br />
            market return = rf + beta × ERP − dividend yield
            <br />
            tilt = IC × σ × z, IC = {IC}
            <br />
            Base = market return + tilt
            <br />
            Bear, Bull = (1 + Base) × e^(−σ²h/2 ∓ {Z80.toFixed(2)} × σ × √h) − 1
          </Formula>
          <Bullets>
            <li>
              <B>rf</B> is the RBI repo rate ({pct(MARKET.rf, 2)}, since {MARKET.rfAsOf}); <B>ERP</B> is India&rsquo;s equity risk premium (
              {pct(MARKET.erp, 2)}, Damodaran, {MARKET.erpAsOf}), which holds India&rsquo;s country risk.
            </li>
            <li>
              <B>z</B> scores a year of the business with today&rsquo;s P/E held: revenue growth at its usual rate, faded {pct(GROWTH_FADE, 0)} of the way to{" "}
              {pct(LONG_RUN_GROWTH, 0)}, and net margin moving a third of the way toward the average of its own and its industry&rsquo;s. It is
              standardised against every covered company (median and spread), within ±{Z_MAX}. Loss-makers get no tilt.
            </li>
            <li>Over 2 years the market return compounds, the tilt counts once, and the range widens with √2.</li>
          </Bullets>
        </section>

        <section className="flex flex-col gap-2">
          <H2 id="basket">3. The basket and its risk</H2>
          <P>
            The basket is bought today at your weights and held; each case is the weighted sum of its stocks&rsquo; same case. The likely range,
            drawdowns and chance of a loss come from 1,000 simulated weekly paths around Base that swing like the basket did over the past year.
          </P>
        </section>

        <section className="flex flex-col gap-2">
          <H2 id="evidence">4. How well it held up</H2>
          <P>
            The model run on every covered stock as it stood 1 and 2 years ago, against what each did since. About 1 in 10 should end below Bear,
            8 in 10 inside and 1 in 10 above Bull.
          </P>
          <AllChecksTable all={all} />
          <Note>
            Actual − Base is the median stock&rsquo;s actual return less its Base; rank correlation is whether a higher Base went with a higher return (0 =
            no link). Each run uses the results and prices of its day, with today&rsquo;s rf, ERP, dividend yields and list of covered stocks.
          </Note>
        </section>

        <section className="flex flex-col gap-2">
          <H2 id="limits">5. What it doesn&rsquo;t do</H2>
          <Bullets>
            <li>It doesn&rsquo;t foresee the market&rsquo;s year or rank stocks: a higher Base mostly means a higher beta.</li>
            <li>It assumes the past year&rsquo;s volatility carries on, and reads only results and prices, not orders, guidance or news.</li>
            <li>Price change only: no dividends, costs or taxes.</li>
          </Bullets>
          <P>{DISCLAIMER}</P>
        </section>

        <section className="flex flex-col gap-3">
          <H2 id="example">6. Worked example</H2>
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
          {stock && checks && <StockChecks name={stock.name} checks={checks} />}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

const LANDED: Record<Landed, string> = { below: "Below Bear", inside: "Inside", above: "Above Bull" };
const shareOf = (v: number) => `${Math.round(v * 100)}%`;
const corr = (v: number | null) => (v == null ? NA : `${v < 0 ? "−" : "+"}${Math.abs(v).toFixed(2)}`);

function AllChecksTable({ all }: { all: AllChecks | null }) {
  if (!all) return <ProjectionStatsPending>This check is being worked out over every covered stock. It appears here by itself in a minute or two.</ProjectionStatsPending>;
  return (
    <Table
      min="sm:min-w-[40rem]"
      head={
        <>
          <Th left>Projection</Th>
          <Th hide>Stocks</Th>
          <Th hide>Nifty 50</Th>
          <Th>Below Bear</Th>
          <Th>Inside</Th>
          <Th>Above Bull</Th>
          <Th hide>Actual − Base</Th>
          <Th hide>Rank corr.</Th>
        </>
      }
    >
      {all.summaries.map((r, i) => {
        const nifty = all.nifty.find((x) => x.h === r.h && Math.abs(Date.parse(x.from) - Date.parse(r.from)) < 8 * 86_400_000)?.ret;
        return (
          <Row key={`${r.from}|${r.h}`} last={i === all.summaries.length - 1}>
            <Td left>
              <span className="max-sm:hidden">
                {r.h} year{r.h === 1 ? "" : "s"} from {fmtDay(r.from)}
              </span>
              <span className="sm:hidden">
                {r.h}Y · {fmtDay(r.from, { short: true })}
              </span>
            </Td>
            <Td hide>{r.n}</Td>
            <Td hide tone={nifty ?? undefined}>
              {nifty == null ? NA : sPct(nifty)}
            </Td>
            <Td>{shareOf(r.below)}</Td>
            <Td>{shareOf(r.inside)}</Td>
            <Td>{shareOf(r.above)}</Td>
            <Td hide tone={r.baseMiss}>
              {sPct(r.baseMiss, 0)}
            </Td>
            <Td hide>{corr(r.rankCorr)}</Td>
          </Row>
        );
      })}
    </Table>
  );
}

function StockChecks({ name, checks }: { name: string; checks: StockCheck[] }) {
  const rows = checks.flatMap((c) => c.checks.map((k) => ({ c, k })));
  const out = checks.filter((c) => !c.ctx);
  if (!rows.length && out.length)
    return (
      <div className="flex flex-col gap-1">
        <H3>Checked against what happened</H3>
        <P>
          {name} wasn&rsquo;t projectable 1 or 2 years ago. {out.map((c) => `${fmtDay(c.from)}: ${c.reason}.`).join(" ")}
        </P>
      </div>
    );
  return (
    <div className="flex flex-col gap-1">
      <H3>Checked against what happened</H3>
      <P>
        The same model run on <B>{name}</B> as it stood 1 and 2 years ago, with the results and prices of that day.
      </P>
      {checks
        .filter((c) => c.ctx)
        .map((c) => (
          <Note key={c.from}>
            {fmtDay(c.from)}: {c.fy} results, beta {n2(c.ctx!.beta)}, σ {pct(c.ctx!.vol, 0)}, market return {pct(c.ctx!.market)}, tilt {sPct(c.ctx!.tilt, 1)}
            {c.ctx!.method === "market" ? " (no fundamentals score)" : ""}.
          </Note>
        ))}
      {rows.length > 0 && (
        <Table
          min="min-w-[34rem]"
          head={
            <>
              <Th left>Projection</Th>
              <Th>Actual</Th>
              <Th left>Landed</Th>
              <Th>Bear</Th>
              <Th>Base</Th>
              <Th>Bull</Th>
            </>
          }
        >
          {rows.map(({ k }, i) => (
            <Row key={`${k.from}|${k.h}`} last={i === rows.length - 1}>
              <Td left>
                {k.h} year{k.h === 1 ? "" : "s"} from {fmtDay(k.from)}
              </Td>
              <Td tone={k.actual}>{sPct(k.actual)}</Td>
              <Td left>{LANDED[k.landed]}</Td>
              <Td tone={k.bear}>{sPct(k.bear)}</Td>
              <Td tone={k.base}>{sPct(k.base)}</Td>
              <Td tone={k.bull}>{sPct(k.bull)}</Td>
            </Row>
          ))}
        </Table>
      )}
      {out.map((c) => (
        <Note key={c.from}>
          {fmtDay(c.from)}: not projected. {c.reason}.
        </Note>
      ))}
    </div>
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
  // A year's margin outside −50% … +60% is used at the limit (projection.ts); says so beside it, as
  // the table above shows the raw figure (a profit 4.5 times revenue reads 450%).
  const capNote = (m: number, fy: number | undefined) => {
    const r = fy == null ? null : input.rev[at(fy)];
    const n = fy == null ? null : input.np[at(fy)];
    const raw = r && n != null ? n / r : null;
    return raw != null && Math.abs(raw - m) > 1e-9 ? ` (kept within −50% … +60%, from ${pct(raw, 2)})` : "";
  };
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
            <Td left>rf, RBI repo rate ({MARKET.rfAsOf})</Td>
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
              margins used: {f.margins.map((m, i) => `${marginYears[i] != null ? fyLabel(marginYears[i]) + " " : ""}${pct(m, 2)}${capNote(m, marginYears[i])}`).join(" · ")}
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
              Median and standard deviation over the {ctx.scale.n} covered listed companies that have a fundamentals score.
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
