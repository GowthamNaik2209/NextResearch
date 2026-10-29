// Past windows read from the price store: each stock's close-to-close move between two days, and
// the Nifty 50's over the same days, for the explorer's "last time this happened" episodes. Only the
// Nifty 50's stocks and the index keep history that old (refresh.ts `deep`); others answer for the
// last five years. Past prices don't change, so an answer is kept for a day.
import { prisma } from "@/lib/prisma";
import { cached } from "@/lib/live/cache";
import { HISTORY_FROM } from "@/lib/live/yahoo";
import { BENCHMARKS } from "@/lib/sector-content/benchmarks";

const DAY = 86_400_000;
// A stock whose first stored close is more than this after the window opens wasn't trading yet.
const LISTED_SLACK_DAYS = 7;

export type EpisodeWindow = { from: string; to: string };
export type EpisodeResult = EpisodeWindow & {
  /** The Nifty 50's move over the window, %, or null where the index has no history then (before Sep 2007). */
  index: number | null;
  /** Each stock's move, %; absent for a stock not trading through the whole window. */
  stocks: Record<string, number>;
};

type Close = { key: string; day: Date; close: number };

/** The window's move for every key that traded through it (first close on/after `from`, last on/before `to`). */
export function windowMoves(firsts: Close[], lasts: Close[], w: EpisodeWindow): Map<string, number> {
  const from = Date.parse(`${w.from}T00:00:00Z`);
  const end = new Map(lasts.map((r) => [r.key, r]));
  const out = new Map<string, number>();
  for (const a of firsts) {
    const b = end.get(a.key);
    if (!b || b.day <= a.day || a.close <= 0) continue;
    // Listed after the window opened, or a history cut (a demerged business's old prices) falls inside it.
    if (a.day.getTime() - from > LISTED_SLACK_DAYS * DAY) continue;
    const cut = HISTORY_FROM[a.key];
    if (cut && w.from < cut) continue;
    out.set(a.key, (b.close / a.close - 1) * 100);
  }
  return out;
}

async function readWindow(keys: string[], w: EpisodeWindow): Promise<Map<string, number>> {
  const from = new Date(`${w.from}T00:00:00Z`);
  const to = new Date(`${w.to}T00:00:00Z`);
  const [firsts, lasts] = await Promise.all([
    prisma.$queryRaw<Close[]>`SELECT DISTINCT ON ("key") "key", "day", "close" FROM "PriceBar" WHERE "key" = ANY(${keys}) AND "day" >= ${from} AND "day" <= ${to} ORDER BY "key", "day" ASC`,
    prisma.$queryRaw<Close[]>`SELECT DISTINCT ON ("key") "key", "day", "close" FROM "PriceBar" WHERE "key" = ANY(${keys}) AND "day" >= ${from} AND "day" <= ${to} ORDER BY "key", "day" DESC`,
  ]);
  return windowMoves(firsts, lasts, w);
}

/** Every given stock's move, and the Nifty 50's, over each window. */
export async function episodeMoves(tickers: string[], windows: EpisodeWindow[]): Promise<EpisodeResult[]> {
  const index = BENCHMARKS.nifty50.symbol;
  const keys = [...new Set([...tickers, index])].sort();
  return Promise.all(
    windows.map((w) =>
      cached(`episode1:${w.from}:${w.to}:${keys.join(",")}`, DAY, async () => {
        const moves = await readWindow(keys, w);
        const stocks: Record<string, number> = {};
        for (const t of tickers) {
          const m = moves.get(t);
          if (m != null) stocks[t] = m;
        }
        return { ...w, index: moves.get(index) ?? null, stocks };
      }),
    ),
  );
}
