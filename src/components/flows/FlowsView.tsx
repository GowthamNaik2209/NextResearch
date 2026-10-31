import Link from "next/link";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { getFlowsData, getWatchlistFlows, type FlowsData, type WatchlistFlows } from "@/lib/flows/query";
import { PERIOD_LABEL, periodMonths, type Period } from "@/lib/flows/periods";
import { SECTOR_SHORT } from "@/lib/flows/sectors";
import { fmtDay, fmtMonth } from "@/lib/format";
import { ToneLight } from "@/components/ToneLight";
import { FlowCard, NotYet } from "./FlowCard";
import { CashChart } from "./CashChart";
import { FuturesChart } from "./FuturesChart";
import { StakeTable } from "./StakeTable";
import { DealsTable } from "./DealsTable";
import { Company, arrow, titleCase, toneText } from "./parts";
import { holding, shortMonth, signedCr, signedPp } from "./format";

/**
 * The FII / DII view on /updates for one period (?period=): the user's watchlist first, then
 * market-wide cash flows, FII index-futures positioning and NSDL's sector flows, then quarterly stake
 * changes and FII/DII bulk and block deals. The industry picked narrows only the last two, which are
 * per company and exact; the rest is the whole market.
 *
 * Phones: one column. From tablet width FII index futures and sector flows sit side by side; on a
 * desktop every block pairs up: watchlist | cash flows, futures | sector flows, stake changes | deals.
 */
export function FlowsView({ period, sectorSlug, sectorName }: { period: Period; sectorSlug?: string; sectorName?: string }) {
  return (
    <Suspense fallback={<FlowsSkeleton />}>
      <FlowsContent period={period} sectorSlug={sectorSlug} sectorName={sectorName} />
    </Suspense>
  );
}

async function FlowsContent({ period, sectorSlug, sectorName }: { period: Period; sectorSlug?: string; sectorName?: string }) {
  const user = await getCurrentUser();
  const data = await getFlowsData(period, sectorSlug);
  const watch = await getWatchlistFlows(user?.id ?? null, period, data.from);
  // "1 Oct – 30 Oct 2026"; one day reads as itself.
  const range = data.from.getTime() === data.latest.getTime() ? fmtDay(data.latest) : `${fmtDay(data.from)} – ${fmtDay(data.latest)}`;
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <WatchlistCard watch={watch} period={period} range={range} />
        <CashCard cash={data.cash} period={period} range={range} />
        <FuturesCard futures={data.futures} period={period} />
        <SectorCard sectors={data.sectors} period={period} />
        <StakeCard stakes={data.stakes} period={period} sectorName={sectorName} />
        <DealsCard deals={data.deals} period={period} range={range} sectorName={sectorName} />
      </div>
      <p className="text-[11px] leading-relaxed text-ink-soft">
        Every block shows its source and the dates it covers. There is no daily FII/DII buying figure for single stocks: the exchanges publish it only for the
        market as a whole.
      </p>
    </div>
  );
}

// Grid spans: a block the full width on a tablet and half on a desktop, or half from tablet width up.
const TABLET_FULL = "sm:col-span-2 lg:col-span-1";
const PAIR = "col-span-1";

// ---------------------------------------------------------------- your watchlist

function WatchlistCard({ watch, period, range }: { watch: WatchlistFlows; period: Period; range: string }) {
  const quarterly = periodMonths(period) < 3;
  return (
    <FlowCard
      className={TABLET_FULL}
      mine
      title="Your watchlist"
      info="Every stock you saved, whatever industry is picked: foreign (FII) and domestic (DII) institutions' stake and its change over the period, and their bulk or block deals in it."
      source={`Shareholding filings · deals ${dealsWhen(range)}`}
      note={quarterly ? "Holdings change with quarterly filings: changes are the latest quarter vs the one before" : undefined}
    >
      {!watch.signedIn ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <NotYet>Sign in to see FII and DII moves in the stocks you&rsquo;ve saved.</NotYet>
          <Link href="/login?next=%2Fupdates%3Fview%3Dflows" className="inline-flex h-9 items-center rounded-full bg-accent px-4 text-sm font-semibold text-bg hover:opacity-90">
            Sign in
          </Link>
        </div>
      ) : watch.rows.length === 0 ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <NotYet>Your watchlist is empty. Save companies with the heart beside any ticker and their FII and DII moves show up here.</NotYet>
          <Link href="/watchlist" className="inline-flex h-9 items-center rounded-full border border-line px-4 text-sm font-semibold text-ink hover:border-accent">
            Open watchlist
          </Link>
        </div>
      ) : (
        <div role="table" aria-label="FII and DII holdings of your saved stocks" className="flex flex-col">
          <div role="row" className="grid grid-cols-[minmax(0,1fr)_5rem_5rem] gap-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-ink-soft sm:grid-cols-[minmax(0,1fr)_6.5rem_6.5rem]">
            <span role="columnheader">Stock</span>
            <span role="columnheader" className="text-right">
              FII
            </span>
            <span role="columnheader" className="text-right">
              DII
            </span>
          </div>
          {watch.rows.map((r) => {
            const [deal, ...more] = r.deals;
            return (
              <div role="row" key={r.ticker} className="grid grid-cols-[minmax(0,1fr)_5rem_5rem] items-start gap-2 border-t border-line/60 py-2.5 sm:grid-cols-[minmax(0,1fr)_6.5rem_6.5rem]">
                <div role="cell" className="min-w-0">
                  <Company ticker={r.ticker} name={r.name} sub={r.sectorName || undefined} />
                  {deal && (
                    <div className="mt-1.5 flex items-start gap-1.5 text-[11px] leading-snug text-ink-soft">
                      <ToneLight tone={deal.side === "BUY" ? "pos" : "neg"} small className="mt-px" />
                      <span title={deal.client} className="line-clamp-2 min-w-0 break-words">
                        {titleCase(deal.client)} {deal.side === "BUY" ? "bought" : "sold"} ₹{deal.valueCr < 0.5 ? "<1" : Math.round(deal.valueCr).toLocaleString("en-IN")} cr · {fmtDay(deal.day)}
                        {more.length > 0 && ` · ${more.length} more deal${more.length > 1 ? "s" : ""}`}
                      </span>
                    </div>
                  )}
                  {!r.stake && <div className="mt-1 text-[11px] text-ink-soft">No shareholding filing on record</div>}
                </div>
                <Holding role="cell" value={r.stake?.fii} change={r.stake?.dFii} base={r.stake?.base} />
                <Holding role="cell" value={r.stake?.dii} change={r.stake?.dDii} base={r.stake?.base} />
              </div>
            );
          })}
          <p className="mt-1 text-[11px] text-ink-soft">Holding now, and its change in percentage points of the company&rsquo;s equity since the filing shown.</p>
        </div>
      )}
    </FlowCard>
  );
}

function Holding({ value, change, base, role }: { value?: number | null; change?: number | null; base?: Date; role?: string }) {
  return (
    <div role={role} className="text-right font-mono tabular-nums leading-tight">
      <div className="text-[13px] text-ink">{holding(value)}</div>
      {change != null && (
        <div className={"text-[11px] " + toneText(change)}>
          {arrow(change)}
          {signedPp(change)}
        </div>
      )}
      {base && <div className="whitespace-nowrap text-[10px] text-ink-soft">since {shortMonth(base)}</div>}
    </div>
  );
}

// ---------------------------------------------------------------- market cash

function CashCard({ cash, period, range }: { cash: FlowsData["cash"]; period: Period; range: string }) {
  const short = cash && cash.firstStored > cash.from;
  return (
    <FlowCard
      className={TABLET_FULL}
      title="Market cash flows"
      info="Net buying (buys minus sells) in the cash market by foreign (FII/FPI) and domestic (DII: mutual funds, insurers, banks) institutions. From 30 Oct 2026, NSE's evening figures for NSE, BSE and MSEI together; before that, the official confirmed figures from NSDL and, for DII before Jun 2026, SEBI's mutual-fund figures. Daily bars up to three months, weekly beyond."
      source={`${cash ? [...new Set(cash.sources.map((s) => SOURCE_SHORT[s.source]))].join(", ") : "NSE"} · ${range} · ₹ crore`}
      note="Market-wide"
    >
      {!cash ? (
        <NotYet>Collected each trading day from NSE after the close; the first figures appear after the next update.</NotYet>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Kpi series="bg-fii" label={`FII · ${period}`} value={cash.total.fiiNetCr} />
            <Kpi series="bg-dii" label={`DII · ${period}`} value={cash.total.diiNetCr} />
            <Kpi series="bg-fii" label={`FII · ${dayMonth(cash.latest.day)}`} value={cash.latest.fiiNetCr} />
            <Kpi series="bg-dii" label={`DII · ${dayMonth(cash.latest.day)}`} value={cash.latest.diiNetCr} />
          </dl>
          <div className="mt-4">
            <CashChart bars={cash.bars} grain={cash.grain} />
          </div>
          <SourceNote sources={cash.sources} />
          {short && (
            <p className="mt-1 text-[11px] text-ink-soft">
              History starts on {fmtDay(cash.firstStored)}: the {PERIOD_LABEL[period]} total covers the {cash.total.sessions} session
              {cash.total.sessions === 1 ? "" : "s"} stored since then.
            </p>
          )}
        </>
      )}
    </FlowCard>
  );
}

const SOURCE_SHORT: Record<string, string> = { nse: "NSE provisional", nsdl: "NSDL", "sebi-mf": "SEBI" };
const SOURCE_NAME: Record<string, string> = {
  nse: "NSE provisional",
  nsdl: "NSDL confirmed",
  "sebi-mf": "mutual funds only (SEBI)",
};

/**
 * Which source covers which dates, when the period mixes them: NSE publishes only the latest day, so
 * earlier days use the official confirmed figures (NSDL; for DII before Jun 2026, SEBI's mutual-fund
 * figures, which leave out insurers and banks).
 */
function SourceNote({ sources }: { sources: NonNullable<FlowsData["cash"]>["sources"] }) {
  if (sources.every((s) => s.source === "nse")) return null;
  const line = (who: "FII" | "DII") =>
    sources
      .filter((s) => s.who === who)
      .map((s) => `${SOURCE_NAME[s.source]} ${s.from.getTime() === s.to.getTime() ? fmtDay(s.from) : `${fmtDay(s.from)} – ${fmtDay(s.to)}`}${s.filled ? ` (${s.filled} day${s.filled > 1 ? "s" : ""} it missed from the source before)` : ""}`)
      .join("; ");
  return (
    <p className="mt-2 text-[11px] leading-relaxed text-ink-soft">
      FII: {line("FII")}. DII: {line("DII")}. NSDL figures are dated by the trade day.
    </p>
  );
}

// The dot ties a figure to its bars in the chart (FII / DII colours); the figure's own colour is its
// direction (net buying green, net selling red), as everywhere else on the site.
function Kpi({ label, value, series }: { label: string; value: number; series: string }) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
        <span aria-hidden="true" className={"h-2 w-2 flex-none rounded-full " + series} />
        {label}
      </dt>
      <dd className={"whitespace-nowrap font-mono text-lg tabular-nums " + toneText(value)}>{signedCr(value)}</dd>
    </div>
  );
}

// ---------------------------------------------------------------- FII index futures

function FuturesCard({ futures, period }: { futures: FlowsData["futures"]; period: Period }) {
  const change = futures?.base ? futures.longPct - futures.base.longPct : null;
  return (
    <FlowCard
      className={PAIR}
      title="FII index futures"
      info="Of all the index-futures contracts foreign institutions hold, the share that are long (betting on a rise). Below 50% means they are net short the index. The change compares with the last trading day before the period."
      source={futures ? `NSE participant open interest · ${fmtDay(futures.day)}` : "NSE participant open interest · daily"}
      note="Market-wide"
    >
      {!futures ? (
        <NotYet>Collected each trading day from NSE&rsquo;s participant-wise open interest file.</NotYet>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-3">
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">Long now</dt>
              <dd className="font-mono text-lg tabular-nums text-ink">{Math.round(futures.longPct)}%</dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">{futures.base ? `vs ${fmtDay(futures.base.day)}` : `Change · ${period}`}</dt>
              <dd className={"font-mono text-lg tabular-nums " + (change == null ? "text-ink-soft" : toneText(change))}>{change == null ? "—" : signedPp(change, 0)}</dd>
            </div>
          </dl>
          <div aria-hidden="true" className="mt-3 flex h-3 overflow-hidden rounded-full">
            <div className="bg-pos" style={{ width: `${futures.longPct}%` }} />
            <div className="flex-1 bg-danger" />
          </div>
          <div className="mt-1.5 flex justify-between text-[11px] text-ink-soft">
            <span>Long {Math.round(futures.longPct)}%</span>
            <span>Short {100 - Math.round(futures.longPct)}%</span>
          </div>
          <FuturesChart points={futures.points} />
          {!futures.base && (
            <p className="mt-2 text-[11px] text-ink-soft">History is stored from {fmtDay(futures.firstStored)}, so there is nothing to compare with before then.</p>
          )}
        </>
      )}
    </FlowCard>
  );
}

// ---------------------------------------------------------------- NSDL sector flows

const SHOW_EACH_SIDE = 5;

function SectorCard({ sectors, period }: { sectors: FlowsData["sectors"]; period: Period }) {
  // The five highest and five lowest.
  const rows = sectors ? sectors.rows.filter((_, i) => i < SHOW_EACH_SIDE || i >= sectors.rows.length - SHOW_EACH_SIDE) : [];
  const peak = Math.max(1, ...rows.map((r) => Math.abs(r.netCr)));
  return (
    <FlowCard
      className={PAIR}
      title="FPI flows by sector"
      info="Net foreign portfolio investment into each sector's shares, added up over the NSDL fortnights in the period (NSDL publishes after the 15th and the month end; a shorter period shows the latest fortnight). The five highest and five lowest are shown."
      source={sectors ? `NSDL fortnightly · ${fmtDay(sectors.from)} – ${fmtDay(sectors.to)} · ₹ crore` : "NSDL fortnightly · ₹ crore"}
      note={
        !sectors
          ? "Market-wide"
          : sectors.clipped
            ? sectors.beforeSectorList && sectors.storedFrom <= MAY_2022
              ? "Market-wide · from May 2022, when NSDL's current sectors start"
              : `Market-wide · stored from ${fmtDay(sectors.storedFrom)}`
            : periodMonths(period) < 1
              ? "Market-wide · the latest fortnight"
              : `Market-wide · ${sectors.fortnights} fortnight${sectors.fortnights > 1 ? "s" : ""}`
      }
    >
      {!sectors ? (
        <NotYet>Collected from NSDL each fortnight (after the 15th and the month end).</NotYet>
      ) : (
        <>
          <ul className="flex flex-col gap-1.5">
            {rows.map((r) => {
              const w = (Math.abs(r.netCr) / peak) * 50;
              return (
                <li key={r.sector} className="grid grid-cols-[7.5rem_minmax(0,1fr)_4.25rem] items-center gap-2 text-[12.5px]">
                  <span title={r.sector} className="truncate text-ink">
                    {SECTOR_SHORT[r.sector] ?? r.sector}
                  </span>
                  <span aria-hidden="true" className="relative h-2.5 before:absolute before:inset-y-[-2px] before:left-1/2 before:w-px before:bg-line">
                    <span className={"absolute top-0 h-2.5 rounded-[3px] " + (r.netCr >= 0 ? "bg-pos" : "bg-danger")} style={{ left: r.netCr >= 0 ? "50%" : `${50 - w}%`, width: `${w}%` }} />
                  </span>
                  <span className={"text-right font-mono text-xs tabular-nums " + toneText(r.netCr)}>{signedCr(r.netCr)}</span>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-[11px] text-ink-soft">
            The {SHOW_EACH_SIDE} highest and {SHOW_EACH_SIDE} lowest of {sectors.rows.length} sectors.
            {sectors.totalCr != null && (
              <>
                {" "}
                All sectors together: <span className={"font-mono " + toneText(sectors.totalCr)}>{signedCr(sectors.totalCr)}</span> crore.
              </>
            )}
          </p>
        </>
      )}
    </FlowCard>
  );
}

// ---------------------------------------------------------------- stake changes

function StakeCard({ stakes, period, sectorName }: { stakes: FlowsData["stakes"]; period: Period; sectorName?: string }) {
  return (
    <FlowCard
      className={TABLET_FULL}
      title="Stake changes in our companies"
      info="Foreign (FII) and domestic (DII) institutions' holding in each company we cover and its change over the period, biggest moves first; tap Holding or the change heading to sort. Companies file every quarter, so a period under three months shows the latest quarter. Under the change: quarters in a row it has moved that way."
      source={stakes?.quarter ? `Shareholding filings · latest ${fmtMonth(stakes.quarter)} quarter · % of equity` : "Shareholding filings · quarterly · % of equity"}
      note={[sectorName, periodMonths(period) < 3 ? "Latest quarter vs the one before" : null].filter(Boolean).join(" · ") || undefined}
    >
      {!stakes || stakes.rows.length === 0 ? (
        <NotYet>
          No shareholding filings are stored yet{sectorName ? ` for ${sectorName}` : ""}. They are read from each company&rsquo;s quarterly filing with the daily company update.
        </NotYet>
      ) : (
        <StakeTable rows={stakes.rows} where={sectorName} compact={!!sectorName} />
      )}
    </FlowCard>
  );
}

// ---------------------------------------------------------------- bulk and block deals

function DealsCard({ deals, period, range, sectorName }: { deals: FlowsData["deals"]; period: Period; range: string; sectorName?: string }) {
  return (
    <FlowCard
      className={TABLET_FULL}
      title="Bulk and block deals"
      info="Named large trades by foreign (FII) and domestic (DII) institutions in companies we cover: bulk deals (one client trading over 0.5% of the company's shares in a day) and block deals (big negotiated trades), tagged from the client's name. Brokers' own desks, individuals and trades under ₹1 crore are left out. Tap a heading to sort."
      source={`NSE bulk and block deals · ${range} · FII and DII only`}
      note={sectorName}
    >
      {!deals ? (
        <NotYet>Collected each trading day from NSE; the first deals appear after the next update.</NotYet>
      ) : deals.length === 0 ? (
        <NotYet>
          No FII or DII bulk or block deals{sectorName ? ` in ${sectorName}` : ""} in the last {PERIOD_LABEL[period]}.
        </NotYet>
      ) : (
        <DealsTable deals={deals} />
      )}
    </FlowCard>
  );
}

function FlowsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading FII and DII data" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {[`${TABLET_FULL} h-56`, `${TABLET_FULL} h-72`, `${PAIR} h-64`, `${PAIR} h-64`, `${TABLET_FULL} h-64`, `${TABLET_FULL} h-64`].map((c, i) => (
        <div key={i} className={"animate-pulse rounded-2xl border border-line bg-panel " + c} />
      ))}
    </div>
  );
}

// "30 Oct" in a short label (the year is in the block's date line above it).
const dayMonth = (d: Date) => fmtDay(d).replace(/ \d{4}$/, "");

// NSDL's current sector list starts with the fortnight after 30 Apr 2022.
const MAY_2022 = new Date(Date.UTC(2022, 4, 1));

// "from 1 Oct 2026 to 30 Oct 2026", or "on 30 Oct 2026" for one day.
const dealsWhen = (range: string) => (range.includes(" – ") ? `from ${range.replace(" – ", " to ")}` : `on ${range}`);
