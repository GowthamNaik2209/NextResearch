import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { getCurrentUser } from "@/lib/auth";
import { getFlowsData, getWatchlistFlows, DEAL_DAYS, type DealRow, type FlowsData, type StakeRow, type WatchlistFlows } from "@/lib/flows/query";
import { NSDL_SECTORS, SECTOR_SHORT } from "@/lib/flows/sectors";
import { fmtDay } from "@/lib/format";
import { StockLink } from "@/components/stock/StockLink";
import { ToneLight } from "@/components/ToneLight";
import { FlowCard, NotYet } from "./FlowCard";
import { CashChart } from "./CashChart";
import { StakeTabs } from "./StakeTabs";
import { fortnight, holding, quarterName, signedCr, signedPp, streakText } from "./format";

/**
 * The FII / DII view on /updates: the user's watchlist first, then market-wide cash flows, FII
 * index-futures positioning, NSDL's sector flows, quarterly stake changes and bulk/block deals.
 * With an industry picked, every per-company block narrows to its companies; the market-wide ones
 * can't be split and say so.
 */
export function FlowsView({ sectorSlug, sectorName }: { sectorSlug?: string; sectorName?: string }) {
  return (
    <Suspense fallback={<FlowsSkeleton />}>
      <FlowsContent sectorSlug={sectorSlug} sectorName={sectorName} />
    </Suspense>
  );
}

async function FlowsContent({ sectorSlug, sectorName }: { sectorSlug?: string; sectorName?: string }) {
  const user = await getCurrentUser();
  const [data, watch] = await Promise.all([getFlowsData(sectorSlug), getWatchlistFlows(user?.id ?? null, sectorSlug)]);
  const where = sectorName ?? "these themes";
  const marketWide = sectorSlug ? "Market-wide · not split by industry" : undefined;
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <WatchlistCard watch={watch} sectorName={sectorName} />
        <CashCard cash={data.cash} note={marketWide} />
        <FuturesCard futures={data.futures} note={marketWide} />
        <SectorCard sectors={data.sectors} highlight={sectorSlug ? NSDL_SECTORS[sectorSlug] ?? [] : []} nifty={sectorSlug === "nifty50"} />
        <StakeCard stakes={data.stakes} where={sectorName} />
        <DealsCard deals={data.deals} where={where} />
      </div>
      <p className="text-[11px] leading-relaxed text-ink-soft">
        Every block shows its source and how often it changes. There is no daily FII/DII buying figure for single stocks: the exchanges publish it only for the
        market as a whole.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------- your watchlist

function WatchlistCard({ watch, sectorName }: { watch: WatchlistFlows; sectorName?: string }) {
  return (
    <FlowCard
      wide
      mine
      title="Your watchlist"
      info="Foreign (FII) and domestic (DII) institutions' stake in each stock you saved, the change since the previous quarter, and any bulk or block deal in it in the last 30 days."
      source={`Shareholding filings, quarterly · deals, last ${DEAL_DAYS} days`}
    >
      {!watch.signedIn ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <NotYet>Sign in to see FII and DII moves in the stocks you&rsquo;ve saved.</NotYet>
          <Link href="/login?next=%2Fupdates%3Fview%3Dflows" className="inline-flex h-9 items-center rounded-full bg-accent px-4 text-sm font-semibold text-bg hover:opacity-90">
            Sign in
          </Link>
        </div>
      ) : watch.total === 0 ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <NotYet>Your watchlist is empty. Save companies with the heart beside any ticker and their FII and DII moves show up here.</NotYet>
          <Link href="/watchlist" className="inline-flex h-9 items-center rounded-full border border-line px-4 text-sm font-semibold text-ink hover:border-accent">
            Open watchlist
          </Link>
        </div>
      ) : watch.rows.length === 0 ? (
        <NotYet>
          None of your {watch.total} saved stock{watch.total > 1 ? "s are" : " is"} in {sectorName}. Pick All themes to see {watch.total > 1 ? "them" : "it"}.
        </NotYet>
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
          {watch.rows.map((r) => (
            <div role="row" key={r.ticker} className="grid grid-cols-[minmax(0,1fr)_5rem_5rem] items-center gap-2 border-t border-line/60 py-2.5 sm:grid-cols-[minmax(0,1fr)_6.5rem_6.5rem]">
              <div role="cell" className="min-w-0">
                {/* With an industry picked every row is in it, so the name would only repeat. */}
                <Company ticker={r.ticker} name={r.name} sub={sectorName ? undefined : r.sectorName || undefined} />
                {r.deal && (
                  <div className="mt-1 flex items-start gap-1.5 text-[11px] leading-snug text-ink-soft">
                    <ToneLight tone={r.deal.side === "BUY" ? "pos" : "neg"} small className="mt-px" />
                    <span className="min-w-0 break-words">
                      {titleCase(r.deal.client)} {r.deal.side === "BUY" ? "bought" : "sold"} ₹{Math.round(r.deal.valueCr).toLocaleString("en-IN")} cr · {fmtDay(r.deal.day)}
                    </span>
                  </div>
                )}
                {!r.stake && <div className="mt-0.5 text-[11px] text-ink-soft">No shareholding filing on record yet</div>}
              </div>
              <Holding role="cell" value={r.stake?.fii} change={r.stake?.dFii} />
              <Holding role="cell" value={r.stake?.dii} change={r.stake?.dDii} />
            </div>
          ))}
          {watch.rows.some((r) => r.stake) && (
            <p className="mt-1 text-[11px] text-ink-soft">Change since the previous quarter, in percentage points of the company&rsquo;s equity.</p>
          )}
        </div>
      )}
    </FlowCard>
  );
}

function Holding({ value, change, role }: { value?: number | null; change?: number | null; role?: string }) {
  return (
    <div role={role} className="text-right font-mono tabular-nums leading-tight">
      <div className="text-[13px] text-ink">{holding(value)}</div>
      {change != null && <div className={"text-[11px] " + toneText(change)}>{arrow(change)}{signedPp(change)}</div>}
    </div>
  );
}

// ---------------------------------------------------------------- market cash

function CashCard({ cash, note }: { cash: FlowsData["cash"]; note?: string }) {
  const month = cash ? ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][cash.month.day.getUTCMonth()] : "";
  return (
    <FlowCard
      wide
      title="Market cash flows"
      info="Net buying (buys minus sells) in the cash market by foreign (FII/FPI) and domestic (DII: mutual funds, insurers, banks) institutions, as NSE reports each evening for NSE, BSE and MSEI together."
      source={cash ? `NSE provisional · ${fmtDay(cash.latest.day)} · ₹ crore` : "NSE provisional · daily after close · ₹ crore"}
      note={note}
    >
      {!cash ? (
        <NotYet>Collected each trading day from NSE after the close; the first figures appear after the next update.</NotYet>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Kpi series="bg-fii" label="FII today" value={cash.latest.fiiNetCr} />
            <Kpi series="bg-dii" label="DII today" value={cash.latest.diiNetCr} />
            <Kpi series="bg-fii" label={`FII ${month}`} value={cash.month.fiiNetCr} />
            <Kpi series="bg-dii" label={`DII ${month}`} value={cash.month.diiNetCr} />
          </dl>
          <div className="mt-4">
            <CashChart days={cash.days} />
          </div>
          {cash.days.length < 10 && (
            <p className="mt-2 text-[11px] text-ink-soft">
              NSE publishes only the latest day, so this history starts on {fmtDay(cash.firstDay)} and grows by a bar each trading day.
              {cash.month.sessions > 0 && ` ${month} totals cover the ${cash.month.sessions} session${cash.month.sessions > 1 ? "s" : ""} since then.`}
            </p>
          )}
        </>
      )}
    </FlowCard>
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

function FuturesCard({ futures, note }: { futures: FlowsData["futures"]; note?: string }) {
  const change = futures?.before ? futures.longPct - futures.before.longPct : null;
  return (
    <FlowCard
      title="FII index futures"
      info="Of all the index-futures contracts foreign institutions hold, the share that are long (betting on a rise). Below 50% means they are net short the index. The change compares with five trading sessions earlier."
      source={futures ? `NSE participant open interest · ${fmtDay(futures.day)}` : "NSE participant open interest · daily"}
      note={note}
    >
      {!futures ? (
        <NotYet>Collected each trading day from NSE&rsquo;s participant-wise open interest file.</NotYet>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-3">
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">Long</dt>
              <dd className="font-mono text-lg tabular-nums text-ink">{Math.round(futures.longPct)}%</dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">vs a week ago</dt>
              <dd className={"font-mono text-lg tabular-nums " + (change == null ? "text-ink-soft" : toneText(change))}>{change == null ? "—" : signedPp(change, 0)}</dd>
            </div>
          </dl>
          <div aria-hidden="true" className="mt-3 flex h-3.5 overflow-hidden rounded-full">
            <div className="bg-pos" style={{ width: `${futures.longPct}%` }} />
            <div className="flex-1 bg-danger" />
          </div>
          <div className="mt-1.5 flex justify-between text-[11px] text-ink-soft">
            <span>Long {Math.round(futures.longPct)}%</span>
            <span>Short {100 - Math.round(futures.longPct)}%</span>
          </div>
        </>
      )}
    </FlowCard>
  );
}

// ---------------------------------------------------------------- NSDL sector flows

const SHOW_EACH_SIDE = 5;

function SectorCard({ sectors, highlight, nifty = false }: { sectors: FlowsData["sectors"]; highlight: string[]; nifty?: boolean }) {
  const hit = new Set(highlight);
  // The five highest and five lowest, plus the picked industry's sectors wherever they rank.
  const rows = sectors
    ? sectors.rows.filter((r, i) => i < SHOW_EACH_SIDE || i >= sectors.rows.length - SHOW_EACH_SIDE || hit.has(r.sector))
    : [];
  const peak = Math.max(1, ...rows.map((r) => Math.abs(r.netCr)));
  return (
    <FlowCard
      title="FPI flows by sector"
      info={
        <>
          Net foreign portfolio investment into each sector&rsquo;s shares over the latest fortnight NSDL has published. The five highest and five lowest are shown
          {hit.size ? ", with the sectors your industry falls in highlighted" : ""}.
        </>
      }
      source={sectors ? `NSDL fortnightly · ${fortnight(sectors.periodEnd)} · ₹ crore` : "NSDL fortnightly · ₹ crore"}
      note={nifty ? "The Nifty 50 spans every sector, so none is highlighted" : undefined}
    >
      {!sectors ? (
        <NotYet>Collected from NSDL each fortnight (after the 15th and the month end).</NotYet>
      ) : (
        <>
          <ul className="flex flex-col gap-1.5">
            {rows.map((r) => {
              const w = (Math.abs(r.netCr) / peak) * 50;
              const on = hit.has(r.sector);
              return (
                <li
                  key={r.sector}
                  className={"grid grid-cols-[7.5rem_minmax(0,1fr)_3.75rem] items-center gap-2 text-[12.5px] " + (hit.size && !on ? "opacity-40" : "")}
                >
                  <span title={r.sector} className={"truncate " + (on ? "font-semibold text-ink" : "text-ink")}>
                    {SECTOR_SHORT[r.sector] ?? r.sector}
                  </span>
                  <span aria-hidden="true" className="relative h-2.5 before:absolute before:inset-y-[-2px] before:left-1/2 before:w-px before:bg-line">
                    <span
                      className={"absolute top-0 h-2.5 rounded-[3px] " + (r.netCr >= 0 ? "bg-pos" : "bg-danger")}
                      style={{ left: r.netCr >= 0 ? "50%" : `${50 - w}%`, width: `${w}%` }}
                    />
                  </span>
                  <span className={"text-right font-mono text-xs tabular-nums " + toneText(r.netCr)}>{signedCr(r.netCr)}</span>
                </li>
              );
            })}
          </ul>
          {sectors.totalCr != null && (
            <p className="mt-2 text-[11px] text-ink-soft">
              The {SHOW_EACH_SIDE} highest and {SHOW_EACH_SIDE} lowest of {sectors.rows.length} sectors. All sectors together:{" "}
              <span className={"font-mono " + toneText(sectors.totalCr)}>{signedCr(sectors.totalCr)}</span> crore
            </p>
          )}
        </>
      )}
    </FlowCard>
  );
}

// ---------------------------------------------------------------- stake changes

function StakeCard({ stakes, where }: { stakes: FlowsData["stakes"]; where?: string }) {
  const inWhere = where ? ` in ${where}` : "";
  return (
    <FlowCard
      wide
      title="Stake changes in our companies"
      info="The biggest quarter-on-quarter changes in foreign (FII) and domestic (DII) institutions' holdings among the companies we cover. Companies file this every quarter, so it moves four times a year, not daily."
      source={stakes?.quarter ? `Shareholding filings · ${quarterName(stakes.quarter)} vs the one before · % of equity` : "Shareholding filings · quarterly · % of equity"}
    >
      {!stakes || stakes.covered === 0 ? (
        <NotYet>No shareholding filings are stored yet{inWhere}. They are read from each company&rsquo;s quarterly filing with the daily company update.</NotYet>
      ) : (
        <StakeTabs
          fii={<StakeTable rows={stakes.fii} who="fii" inWhere={inWhere} covered={stakes.covered} />}
          dii={<StakeTable rows={stakes.dii} who="dii" inWhere={inWhere} covered={stakes.covered} />}
        />
      )}
    </FlowCard>
  );
}

function StakeTable({ rows, who, inWhere, covered }: { rows: StakeRow[]; who: "fii" | "dii"; inWhere: string; covered: number }) {
  if (rows.length === 0)
    return (
      <NotYet>
        No {who.toUpperCase()} stake moved by 0.1 percentage points or more last quarter among the {covered} compan{covered === 1 ? "y" : "ies"} with filings
        {inWhere}.
      </NotYet>
    );
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[12.5px]">
        <thead>
          <tr className="border-b border-line text-left text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
            <th className="py-1 pr-2 font-semibold">Company</th>
            <th className="w-px px-2 py-1 text-right font-semibold">Holding</th>
            <th className="w-px py-1 pl-2 text-right font-semibold">QoQ</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const v = who === "fii" ? r.fii : r.dii;
            const d = who === "fii" ? r.dFii : r.dDii;
            const n = who === "fii" ? r.fiiStreak : r.diiStreak;
            return (
              <tr key={r.ticker} className="border-b border-line/50 last:border-0">
                <td className="max-w-0 py-2 pr-2">
                  <Company ticker={r.ticker} name={r.name} sub={inWhere ? undefined : r.sectorName} />
                </td>
                <td className="whitespace-nowrap px-2 py-2 text-right align-top font-mono tabular-nums">{holding(v)}</td>
                <td className="whitespace-nowrap py-2 pl-2 text-right align-top font-mono tabular-nums">
                  <div className={toneText(d)}>
                    {arrow(d)}
                    {signedPp(d)}
                  </div>
                  {/* How many quarters in a row it has moved this way: a one-off vs a trend. */}
                  <div className="text-[11px] text-ink-soft">{streakText(n, d)}</div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------- bulk and block deals

function DealsCard({ deals, where }: { deals: DealRow[] | null; where: string }) {
  return (
    <FlowCard
      wide
      title="Bulk and block deals"
      info="Named large trades by foreign (FII) and domestic (DII) institutions in companies we cover: bulk deals (one client trading over 0.5% of the company's shares in a day) and block deals (big negotiated trades), tagged from the client's name. Brokers' own desks and individuals are left out. Small trades aren't reported, so this isn't total buying."
      source={`NSE bulk and block deals · last ${DEAL_DAYS} days · FII and DII only`}
    >
      {!deals ? (
        <NotYet>Collected each trading day from NSE; the first deals appear after the next update.</NotYet>
      ) : deals.length === 0 ? (
        <NotYet>No FII or DII bulk or block deals in {where} in the last {DEAL_DAYS} days.</NotYet>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr className="border-b border-line text-left text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
                <th className="w-7 py-1">
                  <span className="sr-only">Buy or sell</span>
                </th>
                <th className="py-1 pr-2 font-semibold">Company</th>
                <th className="px-2 py-1 font-semibold">Client</th>
                <th className="whitespace-nowrap py-1 pl-2 text-right font-semibold">₹ cr</th>
              </tr>
            </thead>
            <tbody>
              {deals.map((d, i) => (
                <tr key={`${d.ticker}-${d.client}-${d.day.toISOString()}-${i}`} className="border-b border-line/50 align-top last:border-0">
                  <td className="py-2">
                    <ToneLight tone={d.side === "BUY" ? "pos" : "neg"} reason={d.side === "BUY" ? "Bought" : "Sold"} small />
                  </td>
                  <td className="py-2 pr-2">
                    <Ticker ticker={d.ticker} name={d.name} />
                    <div className="mt-0.5 whitespace-nowrap text-[11px] text-ink-soft">{fmtDay(d.day)}</div>
                  </td>
                  <td className="min-w-[9rem] px-2 py-2">
                    <div className="break-words text-ink">{titleCase(d.client)}</div>
                    <div className="mt-0.5 text-[11px] text-ink-soft">
                      {d.party} · {d.side === "BUY" ? "Buy" : "Sell"} · {d.kind === "BLOCK" ? "Block" : "Bulk"}
                    </div>
                  </td>
                  <td className="whitespace-nowrap py-2 pl-2 text-right font-mono tabular-nums">{Math.round(d.valueCr).toLocaleString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </FlowCard>
  );
}

// ---------------------------------------------------------------- shared bits

function Ticker({ ticker, name }: { ticker: string; name: string }) {
  return (
    <StockLink ticker={ticker} title={name} className="tap-y inline-block flex-none whitespace-nowrap rounded border border-line px-1.5 font-mono text-[11px] text-amber-ink hover:border-accent">
      {ticker}
    </StockLink>
  );
}

/**
 * A company in a table: its name on a line of its own (the whole cell's width, so a phone shows it),
 * then its ticker (opens the stock pop-up) and, when given, its industry.
 */
function Company({ ticker, name, sub }: { ticker: string; name: string; sub?: ReactNode }) {
  return (
    <div className="min-w-0">
      <div title={name} className="truncate text-[12.5px] leading-snug text-ink">
        {shortName(name)}
      </div>
      <div className="mt-1 flex min-w-0 items-center gap-2">
        <Ticker ticker={ticker} name={name} />
        {sub && <span className="min-w-0 truncate text-[11px] text-ink-soft">{sub}</span>}
      </div>
    </div>
  );
}

// "Bharat Forge Ltd" reads as "Bharat Forge" in a narrow row.
const shortName = (name: string) => name.replace(/\s+(Ltd\.?|Limited)$/i, "");

const toneText = (v: number | null | undefined) => (v == null || Math.abs(v) < 0.005 ? "text-ink-soft" : v > 0 ? "text-pos" : "text-danger");
const arrow = (v: number | null | undefined) => (v == null || Math.abs(v) < 0.05 ? "" : v > 0 ? "▲ " : "▼ ");

// Deal clients are published in capitals ("GOLDMAN SACHS (SINGAPORE) PTE"); short words that are
// abbreviations stay upper case.
const KEEP_CAPS = new Set(["LLP", "LLC", "PTE", "PLC", "LP", "SA", "SE", "AG", "BV", "B.V.", "UBS", "HSBC", "BNP", "BOFA", "SBI", "HDFC", "ICICI", "LIC", "UTI", "DSP", "AMC", "MF", "II", "III", "FPI", "JP", "J.P.", "ODI", "CLSA", "ABSL", "EPFO", "NPS", "PSU", "GIC", "ADIA"]);
function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(/(\s+|\(|\))/)
    .map((w) => (KEEP_CAPS.has(w.toUpperCase()) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join("");
}

function FlowsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading FII and DII data" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {["sm:col-span-2 h-40", "sm:col-span-2 h-72", "h-48", "h-48", "sm:col-span-2 h-56"].map((c, i) => (
        <div key={i} className={"animate-pulse rounded-2xl border border-line bg-panel " + c} />
      ))}
    </div>
  );
}
