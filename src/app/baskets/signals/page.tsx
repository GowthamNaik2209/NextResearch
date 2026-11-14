import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ensureFinancials } from "@/lib/financials/load";
import { listFinancials } from "@/lib/financials/store";
import { ordinal, rankIn, sortedReturns, trendDetail, trendLabel } from "@/lib/financials/trend";
import { listBasketUniverse } from "@/lib/baskets/industry";
import { isReit } from "@/components/stock/merge";
import { BAND_LABEL, MIN_INDEX_PEERS, MIN_MONTHS, MIN_PEERS, bandOf, versus } from "@/lib/valuation/pe-context";
import { peWorking, type PeWorking } from "@/lib/valuation/pe-data";
import { PeContextView } from "@/components/stock/PeContextView";
import { NA, fmtDay, inr, signedPct } from "@/lib/format";
import { shareMeta } from "@/lib/site";
import { JsonLd, breadcrumbLd, webPageLd } from "@/components/JsonLd";
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
const cr = (v: number | null | undefined) => (v == null || !Number.isFinite(v) ? NA : `${v < 0 ? "−" : ""}${Math.abs(Math.round(v)).toLocaleString("en-IN")}`);
/** A 1Y return as the pop-up writes it: whole numbers without a decimal. */
const ret1y = (v: number) => signedPct(v, Number.isInteger(v) ? 0 : 1);
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthYear = (iso: string) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;

const SECTIONS = [
  ["trend", "Trend"],
  ["pe", "P/E in context"],
  ["limits", "What they don't do"],
  ["example", "Worked example"],
] as const;

// Walk-forward test over covered stocks, month-end snapshots Oct 2022 – Jul 2026 (docs/FACTOR-BACKTEST.md,
// scripts/validate-factors.ts). IC = rank correlation of the signal with the stock's return afterwards.
const EVIDENCE = [
  { signal: "Past-year return (what Trend ranks)", ic3: "+0.088", ic12: "+0.123" },
  { signal: "Return 12 months to 1 month ago", ic3: "+0.090", ic12: "+0.113" },
  { signal: "Earnings yield (1 ÷ P/E)", ic3: "0.000", ic12: "−0.019" },
  { signal: "Net margin", ic3: "−0.028", ic12: "−0.067" },
  { signal: "Beta (what orders a projection's Base)", ic3: "−0.002", ic12: "−0.006" },
] as const;

export default async function SignalsMethodPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  await ensureFinancials();
  const { t } = await searchParams;
  const universe = listBasketUniverse().sort((a, b) => a.name.localeCompare(b.name));
  const stock = universe.find((s) => s.ticker === t) ?? universe.find((s) => s.ticker === DEFAULT) ?? universe[0];
  const rows = listFinancials();
  const ranked = rows.filter((f) => typeof f.cagr?.[0] === "number").length;
  const trend = stock ? trendDetail(rows, stock.ticker) : null;
  // Every ranked stock, highest percentile first: the same rankIn the pop-up's Trend uses.
  const names = new Map(universe.map((s) => [s.ticker, s.name]));
  const sorted = sortedReturns(rows);
  const ranking = rows
    .filter((f) => typeof f.cagr?.[0] === "number" && Number.isFinite(f.cagr[0]))
    .map((f) => ({ ticker: f.ticker, name: names.get(f.ticker) ?? f.ticker, ret: f.cagr![0] as number }))
    .map((r) => ({ ...r, pct: rankIn(sorted, r.ret).pct }))
    .sort((a, b) => b.ret - a.ret || a.name.localeCompare(b.name));
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
            Two signals on every stock pop-up and company page. Both describe the stock; neither is a forecast or a call.
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
          <H2 id="trend">1. Trend</H2>
          <P>
            Where the stock&rsquo;s 1-year price return ranks among the {ranked} covered stocks that have one: the 90th percentile beat 90% of
            them. A stock listed under a year ago has none.
          </P>
          <Formula>percentile = (stocks with a lower return + ½ × ties) ÷ (stocks ranked − 1) × 100, within 1–99</Formula>
          <P>
            Tested at every month-end since Oct 2022, past-year return (with or without the latest month) was the only simple signal that ranked the next 3 months&rsquo; returns
            (rank correlation, 0 = no link):
          </P>
          <Table
            min="min-w-[24rem]"
            head={
              <>
                <Th left>Signal</Th>
                <Th>Next 3 months</Th>
                <Th>Next 12 months</Th>
              </>
            }
          >
            {EVIDENCE.map((e, i) => (
              <Row key={e.signal} last={i === EVIDENCE.length - 1}>
                <Td left wrap>{e.signal}</Td>
                <Td>{e.ic3}</Td>
                <Td>{e.ic12}</Td>
              </Row>
            ))}
          </Table>
          <Note>Useful across many stocks, small for any one. Today&rsquo;s covered companies scored back to 2022, which flatters it a little.</Note>
          <H3>Every covered stock, ranked</H3>
          <P>
            All {ranking.length} ranked stocks from our last data update, highest percentile first. Click a stock for its worked example.
          </P>
          <Table
            tall
            min="min-w-[18rem]"
            head={
              <>
                <Th>#</Th>
                <Th left>Stock</Th>
                <Th>1Y return</Th>
                <Th>Trend</Th>
              </>
            }
          >
            {ranking.map((r, i) => (
              <Row key={r.ticker} last={i === ranking.length - 1}>
                <Td>{i + 1}</Td>
                <Td left wrap>
                  <Link href={`${PATH}?t=${encodeURIComponent(r.ticker)}#example`} className={"hover:underline " + (r.ticker === stock?.ticker ? "font-semibold text-accent" : "")}>
                    {r.name}
                  </Link>{" "}
                  <span className="font-mono text-[10px] text-ink-soft max-sm:block">{r.ticker}</span>
                </Td>
                <Td tone={r.ret}>{ret1y(r.ret)}</Td>
                <Td>{ordinal(r.pct)}</Td>
              </Row>
            ))}
          </Table>
        </section>

        <section className="flex flex-col gap-2">
          <H2 id="pe">2. P/E in context</H2>
          <P>Today&rsquo;s P/E (trailing twelve months) beside two yardsticks.</P>
          <Bullets>
            <li>
              <B>Its own past</B>: its P/E at every month-end since June 2022, on the latest reported year&rsquo;s profit. The shaded band is the
              middle half; below it reads <B>{BAND_LABEL.low}</B>, above it <B>{BAND_LABEL.high}</B>. Needs {MIN_MONTHS} months with a profit.
            </li>
            <li>
              <B>Its industry</B>: the median P/E of covered stocks in its primary industry, the one where it is most central to the supply chain.
              A company with no direct place in an industry is compared within its policy or its Nifty 50 bracket (SBI with Financial Services).
              Needs {MIN_PEERS} stocks with a P/E ({MIN_INDEX_PEERS} in a Nifty 50 bracket). It can differ from Screener&rsquo;s median in the Fundamentals tab.
            </li>
          </Bullets>
          <Formula>P/E then = market cap then ÷ net profit of the latest year reported by then</Formula>
        </section>

        <section className="flex flex-col gap-2">
          <H2 id="limits">3. What they don&rsquo;t do</H2>
          <Bullets>
            <li>Neither is a recommendation, a target or a forecast; a low P/E alone did not predict returns among covered stocks.</li>
            <li>Past P/Es ignore share-count changes, and use today&rsquo;s restated results.</li>
          </Bullets>
        </section>

        <section className="flex flex-col gap-3">
          <H2 id="example">4. Worked example</H2>
          {/* Keyed: a stock picked in the ranked list (a client navigation) must show in the menu too. */}
          <ExampleStockSelect key={stock?.ticker} stocks={universe.map((s) => ({ ticker: s.ticker, name: s.name }))} value={stock?.ticker} path={PATH} />
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
        <JsonLd
          graph={[
            breadcrumbLd([
              ["Baskets", "/baskets"],
              ["Trend and P/E in context", PATH],
            ]),
            webPageLd({ type: "TechArticle", path: PATH, name: metadata.title, description: metadata.description }),
          ]}
        />
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
        The 1-year price return of <B>{name}</B> is <B>{ret1y(trend.ret)}</B>. Of the {trend.n} companies ranked, {trend.below} had a lower return
        {others > 0 ? ` and ${others} other${others > 1 ? "s" : ""} the same` : ""}.
      </P>
      <Formula>
        ({trend.below} + ½ × {others}) ÷ ({trend.n} − 1) × 100 = {(((trend.below + others / 2) / (trend.n - 1)) * 100).toFixed(1)} → {ordinal(trend.pct)}{" "}
        percentile{trend.pct === 1 || trend.pct === 99 ? " (kept within 1–99)" : ""}
      </Formula>
      <P>
        Trend: <B>{trendLabel(trend.pct)}</B>.
      </P>
    </div>
  );
}

function PeExample({ name, w }: { name: string; w: PeWorking }) {
  const priceNow = w.price ?? w.lastClose;
  const shares = w.mcapCr && priceNow ? w.mcapCr / priceNow : null;
  const withPe = w.samples.filter((s) => s.pe != null).length;
  const h = w.history;
  return (
    <div className="flex flex-col gap-2">
      <H3>P/E in context</H3>
      {w.pe == null && (
        <P>
          <B>{name}</B> has no positive P/E in our last data update (a loss over the latest twelve months, or none reported), so the pop-up shows
          no P/E in context.{withPe > 0 ? " The working below still shows its past P/Es." : ""}
        </P>
      )}
      <P>
        Today, from our last data update: P/E <B>{w.pe != null ? x1(w.pe) : NA}</B> (trailing twelve months), market cap <B>₹{cr(w.mcapCr)} Cr</B>, price{" "}
        <B>₹{priceNow != null ? inr(priceNow, 2) : NA}</B>.
      </P>
      {shares != null && (
        <Formula>
          shares ≈ ₹{cr(w.mcapCr)} Cr ÷ ₹{inr(priceNow!, 2)} = {shares.toFixed(2)} crore
        </Formula>
      )}
      {w.samples.length === 0 ? (
        <P>No month-end prices since June 2022 in the price store, so no past P/Es.</P>
      ) : (
        <>
          <P>
            The last weekly close of each month since {monthYear(w.samples[0].t)}: {w.samples.length} month{w.samples.length === 1 ? "" : "s"}, {withPe} with a P/E.
          </P>
          <Table
            tall
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
                <Td>{inr(s.close, 2)}</Td>
                <Td>{cr(s.mcapCr)}</Td>
                <Td>FY{String(s.fy).slice(2)}</Td>
                <Td>{cr(s.profitCr)}</Td>
                <Td>{s.pe != null ? x1(s.pe) : s.profitCr != null && s.profitCr <= 0 ? "loss" : NA}</Td>
              </Row>
            ))}
          </Table>
          {w.pe != null && w.samples.at(-1)?.pe != null && (
            <Note>
              The last row is today&rsquo;s price on the latest reported year&rsquo;s profit ({x1(w.samples.at(-1)!.pe!)}); the P/E above ({x1(w.pe)})
              is on the trailing twelve months, which is what the pop-up compares. The two differ when profit has moved since the year ended.
            </Note>
          )}
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
            {w.bracket ? "Nifty 50 bracket" : "Primary industry"}: <B>{w.homeName}</B>, {w.peers.filter((p) => p.pe != null).length} of {w.peers.length} covered stocks with a P/E, low
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
            <P>Fewer than {w.minPeers} with a P/E, so no industry median.</P>
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
