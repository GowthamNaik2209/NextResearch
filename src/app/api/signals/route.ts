import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { basketStock } from "@/lib/baskets/industry";
import { MARKET } from "@/lib/baskets/projection";
import { ensureFinancials } from "@/lib/financials/load";
import { PanelPending, loadBasket, loadStock } from "@/lib/signals/data";
import { METRIC_BY_ID } from "@/lib/signals/metrics";
import { rangeStart, runSignals } from "@/lib/signals/engine";
import { runBasketSignals } from "@/lib/signals/basket";
import { HEAT_IDS, readingsNow } from "@/lib/signals/readings";
import { parseStrategy, strategyMetrics } from "@/lib/signals/strategy";
import { isScope, resolveTarget } from "@/lib/signals/targets";

// POST /api/signals { scope, target, strategy } — signed-in only (docs/SIGNALS.md): a rule backtest
// on one covered stock (scope "stock", target its ticker) or a basket (scope "basket", target
// "industry:<slug>" or one of the user's own basket ids), over the price store. A stock comes with
// every indicator's reading on its last close; a basket with each stock's key readings (the heatmap).
// Per user and per strategy, so never cached. `ticker` alone still means one stock.
const NO_STORE = { "Cache-Control": "private, no-store" };
// The first request on a new server instance may build the covered-stock panel, or read a basket's prices.
export const maxDuration = 60;

const fail = (status: number, error: string) => NextResponse.json({ error }, { status, headers: NO_STORE });

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return fail(401, "Sign in to run signal backtests");
  const body = (await req.json().catch(() => null)) as { scope?: unknown; target?: unknown; ticker?: unknown; strategy?: unknown } | null;
  await ensureFinancials();
  const scope = isScope(body?.scope) ? body.scope : "stock";
  const raw = typeof body?.target === "string" ? body.target : typeof body?.ticker === "string" ? body.ticker : "";
  const target = raw ? await resolveTarget(scope, raw, user.id).catch(() => null) : null;
  if (!target) return fail(404, scope === "stock" ? "Pick a covered stock" : "Pick one of your baskets or an industry");
  const parsed = parseStrategy(body?.strategy);
  if (!parsed.ok) return fail(400, parsed.error);
  const used = strategyMetrics(parsed.strategy);
  const needPanel = used.some((id) => METRIC_BY_ID.get(id)?.needs?.includes("panel"));
  try {
    if (scope === "stock") {
      const ticker = target.tickers[0];
      const data = await loadStock(ticker, needPanel);
      if (!data) return fail(503, "Prices for this stock couldn't load right now. Try again shortly.");
      const { mx } = data;
      for (const id of used) {
        const why = mx.unavailable(id);
        if (why) return fail(400, `${METRIC_BY_ID.get(id)?.label ?? id} ${why}`);
      }
      if (parsed.strategy.stops.atr && mx.unavailable("atrPct")) return fail(400, `The ATR stop ${mx.unavailable("atrPct")}`);
      const result = runSignals(mx, parsed.strategy, MARKET.rf);
      if (!result) return fail(422, "Not enough price history in this range");
      return NextResponse.json(
        { kind: "stock", scope, target: target.target, name: target.name, ticker, lastDay: data.lastDay, gaps: mx.ctx.gaps, result, readings: readingsNow(mx, basketStock(ticker)?.trend) },
        { headers: NO_STORE },
      );
    }
    const data = await loadBasket(target.tickers, needPanel);
    if (!data || !data.stocks.length) return fail(503, "Prices for this basket couldn't load right now. Try again shortly.");
    // A stock that can't give an indicator the rules use (no high/low) sits the backtest out, and is named.
    const skipped: { ticker: string; why: string }[] = [];
    const usable = data.stocks.filter(({ ticker, mx }) => {
      const id = used.find((x) => mx.unavailable(x)) ?? (parsed.strategy.stops.atr && mx.unavailable("atrPct") ? "atrPct" : null);
      if (id) skipped.push({ ticker, why: `${METRIC_BY_ID.get(id)?.label ?? id} ${mx.unavailable(id)}` });
      return !id;
    });
    const days = data.nifty.map((p) => p.t);
    const from = rangeStart(days, parsed.strategy.range);
    const result = runBasketSignals(usable, parsed.strategy, MARKET.rf, days.slice(from), data.nifty.slice(from).map((p) => p.c));
    if (!result) return fail(422, "Not enough price history in this range");
    const heat = usable.map(({ ticker, mx }) => ({ ticker, readings: readingsNow(mx, basketStock(ticker)?.trend, HEAT_IDS) }));
    return NextResponse.json(
      { kind: "basket", scope, target: target.target, name: target.name, lastDay: result.to, result, heat, skipped, missing: data.missing },
      { headers: NO_STORE },
    );
  } catch (e) {
    if (e instanceof PanelPending) return fail(503, "Trend percentile and RS vs industry rank every covered stock, and that comparison is still loading. Run again in a minute.");
    console.error(`signals: ${scope} ${raw} failed`, e);
    return fail(500, "The backtest couldn't run right now. Try again shortly.");
  }
}
