import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ensureFinancials } from "@/lib/financials/load";
import { listFinancials } from "@/lib/financials/store";
import { ordinal, trendDetail, trendLabel } from "@/lib/financials/trend";
import { listBasketUniverse } from "@/lib/baskets/industry";
import { isReit } from "@/components/stock/merge";
import { BAND_LABEL, MIN_MONTHS, MIN_PEERS, bandOf, versus } from "@/lib/valuation/pe-context";
import { peWorking, type PeWorking } from "@/lib/valuation/pe-data";
import { PeContextView } from "@/components/stock/PeContextView";
import { NA, fmtDay, signedPct } from "@/lib/format";
import { shareMeta } from "@/lib/site";
import { ExampleStockSelect } from "../projections/ExampleStockSelect";
import { B, Bullets, Formula, H2, H3, Note, P, Row, Table, Td, Th } from "../method-ui";

// How a stock's Trend percentile and its P/E in context are worked out (src/lib/financials/trend.ts,
// src/lib/valuation/pe-context.ts), with a worked example: any stock's own figures run through each
// step by the same code the pop-up, company page and baskets use, so the example always matches them.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "How Trend and P/E in context are worked out",
  description:
    "The method behind NextResearch's Trend percentile (a stock's past-year return ranked among covered stocks) and P/E in context (today's P/E against the stock's own past P/Es and its industry's median), the evidence, and a worked example for any stock.",
  alternates: { canonical: "/baskets/signals" },
  ...shareMeta({ title: "Trend and P/E in context", line: "Two stock signals, explained.", path: "/baskets/signals" }),
};

const PATH = "/baskets/signals";
const DEFAULT = "BEL";
const x1 = (v: number) => `${v.toFixed(1)}x`;
const cr = (v: number | null | undefined) => (v == null || !Number.isFinite(v) ? NA : Math.round(v).toLocaleString("en-IN"));
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthYear = (iso: string) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;

const SECTIONS = [
  ["what", "What the two signals are"],
  ["trend", "Trend: how the percentile is ranked"],
  ["evidence", "Trend: the evidence"],
  ["pe", "P/E in context: the stock's own past"],
  ["industry", "P/E in context: the industry median"],
  ["limits", "What they don't do"],
  ["example", "Worked example"],
] as const;

// Walk-forward test over covered stocks, month-end snapshots Oct 2022 – Jul 2026 (docs/FACTOR-BACKTEST.md,
// scripts/validate-factors.ts). IC = rank correlation of the signal with the stock's return afterwards.
const EVIDENCE = [
  { signal: "Past-year return (what Trend ranks)", ic3: "+0.088", t3: "3.0", pos3: "72%", ic12: "+0.123", t12: "1.8" },
  { signal: "Return 12 months to 1 month ago", ic3: "+0.090", t3: "3.3", pos3: "78%", ic12: "+0.113", t12: "1.7" },
  { signal: "Earnings yield (1 ÷ P/E)", ic3: "0.000", t3: "0.0", pos3: "43%", ic12: "−0.019", t12: "−1.0" },
  { signal: "Net margin", ic3: "−0.028", t3: "−1.3", pos3: "33%", ic12: "−0.067", t12: "−2.1" },
  { signal: "Beta (what orders a projection's Base)", ic3: "−0.002", t3: "−0.1", pos3: "43%", ic12: "−0.006", t12: "−0.1" },
] as const;

export default async function SignalsMethodPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  await ensureFinancials();
  const { t } = await searchParams;
  const universe = listBasketUniverse().sort((a, b) => a.name.localeCompare(b.name));
  const stock = universe.find((s) => s.ticker === t) ?? universe.find((s) => s.ticker === DEFAULT) ?? universe[0];
  const rows = listFinancials();
  const ranked = rows.filter((f) => typeof f.cagr?.[0] === "number").length;
  const trend = stock ? trendDetail(rows, stock.ticker) : null;
  const pe = stock && !isReit(stock.ticker) ? await peWorking(stock.ticker) : null;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full min-w-0 max-w-4xl flex-1 flex-col gap-6 px-4 pt-6 pb-14 sm:py-14 sm:px-5">
        <nav aria-label="Back" className="-my-1 flex flex-wrap items-center gap-x-4 text-xs font-semibold text-accent">
          <Link href="/baskets" className="inline-flex min-h-8 items-center hover:underline pointer-coarse:min-h-9">
            &larr; Baskets
          </Link>
          <Link href="/baskets/projections" className="inline-flex min-h-8 items-center hover:underline pointer-coarse:min-h-9">
            How projections are worked out
          </Link>
        </nav>
        <header className="flex flex-col gap-2">
          <h1 className="text-balance font-display text-2xl font-bold text-ink sm:text-3xl">How Trend and P/E in context are worked out</h1>
          <P>
            Every stock pop-up and company page shows a <B>Trend</B> percentile and <B>P/E in context</B>; basket tables show Trend as a column.
            This page sets out how each is worked out, the evidence behind them, and works both through for any stock using the same code.
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
          <H2 id="what">1. What the two signals are</H2>
          <P>
            <B>Trend</B> says where a stock&rsquo;s price return over the past year ranks among covered stocks: the 90th percentile means it beat
            90% of them. It describes the past year; it is not a forecast and is not part of a basket&rsquo;s projection.
          </P>
          <P>
            <B>P/E in context</B> puts today&rsquo;s P/E beside two yardsticks: the stock&rsquo;s own month-end P/Es since 2022, and the median P/E
            of covered stocks in its home industry. It says whether the multiple is below, within or above its usual range. It is context, not a
            call: a low P/E alone did not predict returns among covered stocks (section 3).
          </P>
        </section>

        <section className="flex flex-col gap-2">
          <H2 id="trend">2. Trend: how the percentile is ranked</H2>
          <P>
            Every company in our last data update with a 1-year price return is ranked, {ranked} today. The return is the same &ldquo;1Y price
            return&rdquo; the stock pop-up shows. A company listed under a year ago has none, so it has no percentile and shows &ldquo;Not enough
            history&rdquo;.
          </P>
          <Formula>
            percentile = (companies with a lower return + ½ × (others with the same return)) ÷ (companies ranked − 1) × 100, rounded
          </Formula>
          <P>
            The highest return is the 100th percentile and the lowest the 0th. It is worked out once per data update over the whole table, so the
            pop-up, the company page, every basket table and the Excel download show the same figure on the same date.
          </P>
        </section>

        <section className="flex flex-col gap-2">
          <H2 id="evidence">3. Trend: the evidence</H2>
          <P>
            We tested simple signals on covered stocks at every month-end from Oct 2022: how well each ranked the returns that followed (rank
            correlation, IC: 0 is no link). Nothing was fitted; each signal was fixed before the test.
          </P>
          <Table
            min="min-w-[36rem]"
            head={
              <>
                <Th left>Signal</Th>
                <Th>IC, next 3M</Th>
                <Th>t</Th>
                <Th>Months positive</Th>
                <Th>IC, next 12M</Th>
                <Th>t</Th>
              </>
            }
          >
            {EVIDENCE.map((e, i) => (
              <Row key={e.signal} last={i === EVIDENCE.length - 1}>
                <Td left wrap>{e.signal}</Td>
                <Td>{e.ic3}</Td>
                <Td>{e.t3}</Td>
                <Td>{e.pos3}</Td>
                <Td>{e.ic12}</Td>
                <Td>{e.t12}</Td>
              </Row>
            ))}
          </Table>
          <P>
            Past-year return was the only signal that held up: stocks at the 80th percentile and up beat those below the 20th by about 7 points per
            3 months on average, and trailed them in 8 of 46 months. Over 12 months it was weaker and reversed for snapshots taken in 2024. Typical
            published signals have an IC of 0.03–0.08, so this is useful across many stocks and small for any one.
          </P>
          <Note>
            46 snapshots for 3 months ahead, 37 for 12 months; t-statistics corrected for overlapping windows (Newey-West). The stocks are
            today&rsquo;s covered companies scored back to 2022, so companies that failed and left the market are missing, which flatters
            momentum. Full write-up: docs/FACTOR-BACKTEST.md in the project.
          </Note>
        </section>

        <section className="flex flex-col gap-2">
          <H2 id="pe">4. P/E in context: the stock&rsquo;s own past</H2>
          <P>
            For the last weekly close of every month since June 2022 (when FY22 results were public), the stock&rsquo;s P/E then is its market cap then divided by the
            latest fiscal year&rsquo;s net profit public on that day. Results for the year to 31 March count from 1 June.
          </P>
          <Formula>
            shares ≈ market cap today ÷ close today · market cap then = shares × close then · P/E then = market cap then ÷ net profit of the latest
            reported year
          </Formula>
          <Bullets>
            <li>A month whose reported year was a loss has no P/E and is left out.</li>
            <li>
              The <B>usual range</B> is the middle half of its own month-end P/Es (25th to 75th percentile); the tick on the bar is their median. At
              least {MIN_MONTHS} months with a P/E are needed.
            </li>
            <li>
              Today&rsquo;s P/E (trailing twelve months) below the 25th percentile reads <B>{BAND_LABEL.low}</B>, above the 75th{" "}
              <B>{BAND_LABEL.high}</B>, otherwise <B>{BAND_LABEL.usual}</B>.
            </li>
            <li>A REIT shows none (P/E isn&rsquo;t meaningful for a trust), nor does a stock without a positive P/E today.</li>
          </Bullets>
        </section>

        <section className="flex flex-col gap-2">
          <H2 id="industry">5. P/E in context: the industry median</H2>
          <P>
            The industry is the company&rsquo;s home industry (where its company page places it). The median is over the covered stocks there with
            a positive P/E in our last data update, the stock itself included; at least {MIN_PEERS} are needed. It is our own snapshot, so it can
            differ from the live Screener median in the pop-up&rsquo;s Fundamentals tab, which uses Screener&rsquo;s industry and peers.
          </P>
          <P>
            Within 5% of a median reads &ldquo;in line with&rdquo;; otherwise the gap is given as a percentage of the median.
          </P>
        </section>

        <section className="flex flex-col gap-2">
          <H2 id="limits">6. What they don&rsquo;t do</H2>
          <Bullets>
            <li>Neither is a recommendation, a target or a forecast. Trend describes the past year; P/E in context describes today&rsquo;s price.</li>
            <li>Past P/Es ignore share-count changes (new issues, buybacks): the market cap then is today&rsquo;s scaled by the price move.</li>
            <li>Today&rsquo;s P/E is on trailing twelve months, past P/Es on the reported year, so the bases differ slightly.</li>
            <li>Fiscal-year figures are the current (restated) ones, not as first published.</li>
          </Bullets>
        </section>

        <section className="flex flex-col gap-3">
          <H2 id="example">7. Worked example</H2>
          <ExampleStockSelect stocks={universe.map((s) => ({ ticker: s.ticker, name: s.name }))} value={stock?.ticker} path={PATH} />
          {!stock ? (
            <P>No figures for this stock in our last data update.</P>
          ) : (
            <>
              <TrendExample name={stock.name} trend={trend} />
              {isReit(stock.ticker) ? (
                <P>
                  <B>{stock.name}</B> is a REIT, so it has no P/E in context.
                </P>
              ) : pe ? (
                <PeExample name={stock.name} w={pe} />
              ) : (
                <P>No figures for this stock in our last data update.</P>
              )}
            </>
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function TrendExample({ name, trend }: { name: string; trend: ReturnType<typeof trendDetail> }) {
  if (!trend)
    return (
      <div className="flex flex-col gap-2">
        <H3>Trend</H3>
        <P>
          <B>{name}</B> has no 1-year price return in our last data update (listed under a year ago), so its Trend reads &ldquo;Not enough
          history&rdquo;.
        </P>
      </div>
    );
  const others = trend.equal - 1;
  return (
    <div className="flex flex-col gap-2">
      <H3>Trend</H3>
      <P>
        <B>{name}</B>&rsquo;s 1-year price return is <B>{signedPct(trend.ret)}</B>. Of the {trend.n} companies ranked, {trend.below} had a lower return
        {others > 0 ? ` and ${others} other${others > 1 ? "s" : ""} the same` : ""}.
      </P>
      <Formula>
        ({trend.below} + ½ × {others}) ÷ ({trend.n} − 1) × 100 = {(((trend.below + others / 2) / (trend.n - 1)) * 100).toFixed(1)} → {ordinal(trend.pct)}{" "}
        percentile
      </Formula>
      <P>
        Trend: <B>{trendLabel(trend.pct)}</B>.
      </P>
    </div>
  );
}

function PeExample({ name, w }: { name: string; w: PeWorking }) {
  const shares = w.mcapCr && w.lastClose ? w.mcapCr / w.lastClose : null;
  const withPe = w.samples.filter((s) => s.pe != null).length;
  const h = w.history;
  return (
    <div className="flex flex-col gap-2">
      <H3>P/E in context</H3>
      {w.pe == null && (
        <P>
          <B>{name}</B> has no positive P/E in our last data update (a loss over the latest twelve months, or none reported), so the pop-up shows
          no P/E in context. The working below still shows its past P/Es.
        </P>
      )}
      <P>
        Today: P/E <B>{w.pe != null ? x1(w.pe) : NA}</B>, market cap <B>₹{cr(w.mcapCr)} Cr</B>, last close <B>₹{w.lastClose?.toFixed(2) ?? NA}</B>
        {w.lastDay ? ` (${fmtDay(w.lastDay)})` : ""}.
      </P>
      {shares != null && (
        <Formula>
          shares ≈ ₹{cr(w.mcapCr)} Cr ÷ ₹{w.lastClose!.toFixed(2)} = {shares.toFixed(2)} crore
        </Formula>
      )}
      {w.samples.length === 0 ? (
        <P>No month-end prices since June 2022 in the price store, so no past P/Es.</P>
      ) : (
        <>
          <P>
            The last weekly close of each month since {monthYear(w.samples[0].t)} (the price store keeps weekly closes beyond two years): {w.samples.length} months, {withPe} with a P/E.
          </P>
          <div className="max-h-[28rem] overflow-y-auto rounded border border-line">
            <Table
              min="min-w-[34rem]"
              head={
                <>
                  <Th left>Week of</Th>
                  <Th>Close ₹</Th>
                  <Th>Market cap then ₹ Cr</Th>
                  <Th>Year used</Th>
                  <Th>Net profit ₹ Cr</Th>
                  <Th>P/E then</Th>
                </>
              }
            >
              {w.samples.map((s, i) => (
                <Row key={s.t} last={i === w.samples.length - 1}>
                  <Td left>{fmtDay(s.t)}</Td>
                  <Td>{s.close.toFixed(2)}</Td>
                  <Td>{cr(s.mcapCr)}</Td>
                  <Td>FY{String(s.fy).slice(2)}</Td>
                  <Td>{cr(s.profitCr)}</Td>
                  <Td>{s.pe != null ? x1(s.pe) : s.profitCr != null && s.profitCr <= 0 ? "loss" : NA}</Td>
                </Row>
              ))}
            </Table>
          </div>
        </>
      )}
      {h ? (
        <>
          <Formula>
            sorted month-end P/Es ({h.n}): 25th percentile {x1(h.p25)} · median {x1(h.median)} · 75th percentile {x1(h.p75)}
          </Formula>
          {w.pe != null && (
            <P>
              {x1(w.pe)} is {w.pe < h.p25 ? `below ${x1(h.p25)}` : w.pe > h.p75 ? `above ${x1(h.p75)}` : `between ${x1(h.p25)} and ${x1(h.p75)}`}:{" "}
              <B>{BAND_LABEL[bandOf(w.pe, h)]}</B>, {versus(w.pe, h.median)} its own median.
            </P>
          )}
        </>
      ) : (
        <P>Fewer than {MIN_MONTHS} month-ends with a P/E, so no usual range: only the industry median is shown.</P>
      )}
      {w.peers.length > 0 && (
        <>
          <P>
            Home industry: <B>{w.homeName}</B>, {w.peers.filter((p) => p.pe != null).length} of {w.peers.length} covered stocks with a P/E, low
            to high:
          </P>
          <div className="max-h-[20rem] overflow-y-auto rounded border border-line">
            <Table
              min="min-w-[20rem]"
              head={
                <>
                  <Th left>Stock</Th>
                  <Th>P/E</Th>
                </>
              }
            >
              {w.peers.map((p, i) => (
                <Row key={p.ticker} last={i === w.peers.length - 1}>
                  <Td left wrap>
                    {p.name === name ? <B>{p.name}</B> : p.name} <span className="font-mono text-[10px] text-ink-soft">{p.ticker}</span>
                  </Td>
                  <Td>{p.pe != null ? x1(p.pe) : NA}</Td>
                </Row>
              ))}
            </Table>
          </div>
          {w.industry ? (
            <P>
              Median of the {w.industry.n} with a P/E: <B>{x1(w.industry.median)}</B>
              {w.pe != null ? <>; {x1(w.pe)} is {versus(w.pe, w.industry.median)} it.</> : "."}
            </P>
          ) : (
            <P>Fewer than {MIN_PEERS} with a P/E, so no industry median.</P>
          )}
        </>
      )}
      {w.pe != null && (h || w.industry) && (
        <>
          <P>What the pop-up and company page show for it:</P>
          <PeContextView ctx={{ pe: w.pe, history: h, industry: w.industry }} className="max-w-md rounded-xl border border-line bg-panel p-4" />
        </>
      )}
    </div>
  );
}
