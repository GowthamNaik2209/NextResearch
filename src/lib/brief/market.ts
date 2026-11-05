// The morning brief's market part for the latest trading day's close: the Nifty 50 and Sensex from
// the price store, FII / DII from the stored cash days (the /updates view's), the best themes from
// the stored 1D basket returns, breadth from NSE's bhavcopy, the morning's market headlines, the IPO
// decks still to list and the market-wide dates ahead. Every source is read on its own and a failed
// one leaves its section out; the brief goes out with what there is.
import { prisma } from "@/lib/prisma";
import { BENCHMARKS } from "@/lib/sector-content/benchmarks";
import { readBasketReturns } from "@/lib/baskets/basket-returns";
import { listIndustryBaskets } from "@/lib/baskets/industry";
import { lastTradingDay } from "@/lib/baskets/ideas-data";
import { storedCashDays, type CashDay } from "@/lib/flows/query";
import { listIpos } from "@/lib/ipo-content";
import { istToday } from "@/lib/ipo-content/status";
import { ensureFinancials } from "@/lib/financials/load";
import { croreShort } from "@/lib/format";
import { breadth, fetchBhavcopy } from "./bhavcopy";
import { fetchMarketHeadlines } from "./headlines";
import { summaryLine } from "./highlights";
import { keyDates } from "./key-dates";
import type { BriefFlows, BriefIpo, IndexClose, MarketBrief, Theme } from "./types";

const dayDate = (day: string) => new Date(`${day}T00:00:00Z`);
const isoDay = (d: Date) => d.toISOString().slice(0, 10);

/** An index's close on `day` and its move from the bar before, from the price store. */
async function indexClose(name: string, key: string, day: string): Promise<IndexClose | null> {
  const bars = await prisma.priceBar.findMany({ where: { key, day: { lte: dayDate(day) } }, orderBy: { day: "desc" }, take: 2, select: { day: true, close: true } });
  if (bars.length < 2 || isoDay(bars[0].day) !== day) return null;
  const [now, before] = bars;
  return { name, close: now.close, change: now.close - before.close, pct: ((now.close - before.close) / before.close) * 100 };
}

/** The latest day's FII and DII net, how long FIIs have been on the same side, and DII's month so far. */
export function briefFlows(days: CashDay[]): BriefFlows | null {
  const last = days[days.length - 1];
  if (!last) return null;
  const sign = Math.sign(last.fiiNetCr);
  let fiiStreak = 0;
  for (let i = days.length - 1; i >= 0 && Math.sign(days[i].fiiNetCr) === sign; i--) fiiStreak++;
  const month = isoDay(last.day).slice(0, 7);
  const diiMonthCr = days.filter((d) => isoDay(d.day).slice(0, 7) === month).reduce((s, d) => s + d.diiNetCr, 0);
  return { day: isoDay(last.day), fiiNetCr: last.fiiNetCr, diiNetCr: last.diiNetCr, fiiStreak, diiMonthCr };
}

/** The industry and policy baskets that did best over 1D, best first (only ones that rose). */
async function bestThemes(n = 3): Promise<Theme[]> {
  const oneDay = (await readBasketReturns(prisma))["1D"] ?? {};
  return listIndustryBaskets()
    .filter((b) => (b.category === "sector" || b.category === "policy") && oneDay[b.slug] != null)
    .map((b): Theme => ({ slug: b.slug, name: b.name, kind: b.category === "policy" ? "Policy" : "Industry", ret: oneDay[b.slug].ret }))
    .filter((t) => t.ret > 0)
    .sort((a, b) => b.ret - a.ret)
    .slice(0, n);
}

/** IPO decks open now or dated to open; with none, the SEBI-approved ones (`dated` says which). At most three. */
function upcomingIpos(): { dated: boolean; ipos: BriefIpo[] } {
  const all = listIpos();
  const dated = all.filter((r) => r.status.stage === "open" || r.status.stage === "upcoming");
  const list = dated.length ? dated : all.filter((r) => r.status.stage === "approved");
  return {
    dated: dated.length > 0,
    // The issue's total, not the authored size line (which can run to a sentence).
    ipos: list.slice(0, 3).map((r) => ({ slug: r.slug, name: r.name, label: r.status.label, size: r.issue.totalCr ? croreShort(r.issue.totalCr) : "" })),
  };
}

const settle = <T>(p: Promise<T>, fallback: T, what: string): Promise<T> =>
  p.catch((e: unknown) => {
    console.warn(`[brief] ${what}:`, e instanceof Error ? e.message : e);
    return fallback;
  });

/** The market part for the latest close, or null when the price store has no close to go by. */
export async function buildMarketBrief(): Promise<MarketBrief | null> {
  const day = (await lastTradingDay().catch(() => null))?.slice(0, 10);
  if (!day) return null;
  await ensureFinancials();
  const [nifty, sensex, cash, themes, bhav, headlines] = await Promise.all([
    settle(indexClose(BENCHMARKS.nifty50.name, BENCHMARKS.nifty50.symbol, day), null, "nifty"),
    settle(indexClose(BENCHMARKS.sensex.name, BENCHMARKS.sensex.symbol, day), null, "sensex"),
    settle(storedCashDays(), null, "flows"),
    settle(bestThemes(), [], "themes"),
    fetchBhavcopy(day),
    fetchMarketHeadlines(),
  ]);
  const indices = [nifty, sensex].filter((x): x is IndexClose => x != null);
  // The flows only when they're for the brief's day: yesterday's figures under today's heading would mislead.
  const flowDays = cash?.filter((d) => isoDay(d.day) <= day) ?? [];
  const flows = flowDays.length && isoDay(flowDays[flowDays.length - 1].day) === day ? briefFlows(flowDays) : null;
  const br = bhav ? breadth(bhav) : null;
  const ipo = upcomingIpos();
  return {
    day,
    indices,
    flows,
    breadth: br,
    themes,
    headlines,
    ipos: ipo.ipos,
    iposDated: ipo.dated,
    keyDates: keyDates(isoDay(new Date(istToday()))),
    summary: summaryLine({ indices, breadth: br, themes }),
  };
}
