// The morning brief's per-user part: each saved stock's move on the brief day and since it was
// saved (closes from the price store, the same the Baskets pages read), a since-added level crossed
// that day, and FII / DII bulk and block deals in the saved stocks that day (the /updates view's).
import { prisma } from "@/lib/prisma";
import { inr } from "@/lib/format";
import { companySlug } from "@/lib/sector-content/companies";
import type { DealView } from "@/lib/flows/query";
import type { WatchBrief, WatchDeal, WatchItem } from "./types";

export type Saved = { ticker: string; name: string; priceAtAdd: number };
export type Closes = Map<string, { close: number; prev: number }>;

const DAY_MS = 86_400_000;

/** Each ticker's close on `day` and the close before it (a stock with no bar on `day` is left out). */
export async function closesOn(tickers: string[], day: string): Promise<Closes> {
  const out: Closes = new Map();
  if (!tickers.length) return out;
  const end = new Date(`${day}T00:00:00Z`);
  const bars = await prisma.priceBar.findMany({
    // Two weeks back covers the bar before even across a long holiday break.
    where: { key: { in: tickers }, day: { gte: new Date(end.getTime() - 14 * DAY_MS), lte: end } },
    orderBy: { day: "desc" },
    select: { key: true, day: true, close: true },
  });
  const byKey = new Map<string, { day: Date; close: number }[]>();
  for (const b of bars) byKey.set(b.key, [...(byKey.get(b.key) ?? []), b]);
  for (const [key, list] of byKey) if (list.length >= 2 && list[0].day.getTime() === end.getTime()) out.set(key, { close: list[0].close, prev: list[1].close });
  return out;
}

// Since-added levels worth a line: crossing one on the day is the milestone.
const LEVELS = [100, 50, 25, 10, -50, -25, -10];

/** The level `before` -> `now` crossed (the biggest one), if any. */
export function crossedLevel(before: number, now: number): number | undefined {
  return LEVELS.find((l) => (l > 0 ? before < l && now >= l : before > l && now <= l));
}

const shares = (q: number) => (q >= 1e7 ? `${(q / 1e7).toFixed(1)} cr` : q >= 1e5 ? `${(q / 1e5).toFixed(1)} lakh` : inr(q));

/** One deal as a line: "SBI Mutual Fund bought 1.2 cr shares at ₹449.80 (₹54 cr)". */
export function dealLine(d: Pick<DealView, "client" | "side" | "quantity" | "price" | "valueCr">): string {
  return `${d.client} ${d.side === "BUY" ? "bought" : "sold"} ${shares(d.quantity)} shares at ₹${inr(d.price, 2)} (₹${inr(d.valueCr)} cr)`;
}

const pctMove = (from: number, to: number) => ((to - from) / from) * 100;
const round2 = (v: number) => Math.round(v * 100) / 100;

/** A user's watchlist part: every saved stock with a close on the day, biggest move first. */
export function watchBrief(saved: Saved[], closes: Closes, deals: DealView[], day: string): WatchBrief {
  const items: WatchItem[] = [];
  for (const s of saved) {
    const c = closes.get(s.ticker);
    if (!c) continue;
    const known = s.priceAtAdd > 0;
    const since = known ? pctMove(s.priceAtAdd, c.close) : null;
    const milestone = known ? crossedLevel(pctMove(s.priceAtAdd, c.prev), since!) : undefined;
    items.push({ ticker: s.ticker, slug: companySlug(s.ticker), name: s.name, close: c.close, dayPct: round2(pctMove(c.prev, c.close)), sincePct: since == null ? null : round2(since), ...(milestone != null ? { milestone } : {}) });
  }
  items.sort((a, b) => Math.abs(b.dayPct ?? 0) - Math.abs(a.dayPct ?? 0));
  const names = new Map(saved.map((s) => [s.ticker, s.name]));
  const onDay: WatchDeal[] = deals
    .filter((d) => names.has(d.ticker) && d.day.toISOString().slice(0, 10) === day)
    .map((d) => ({ ticker: d.ticker, name: names.get(d.ticker)!, text: dealLine(d) }));
  // The dates ahead are added by the caller (events.ts reads Yahoo; this stays pure).
  return { items, deals: onDay, events: [] };
}
