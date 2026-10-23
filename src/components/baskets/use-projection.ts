"use client";

import { useMemo } from "react";
import type { BasketStock } from "@/lib/baskets/industry";
import { basketWeights } from "@/lib/baskets/backtest";
import { customTargets, type WeightScheme } from "@/lib/baskets/strategy";
import { SCENARIOS, type Scenario } from "@/lib/baskets/projection";
import { annualVol, basketPath, projectBasket, seedOf, simulate, weeklyDates, type ProjectionSettings } from "@/lib/baskets/projection-basket";
import { useSeries } from "./use-series";
import { HORIZON_LONG, SCENARIO_LABEL, type ProjectionView } from "./projection-view";

/** Each stock's share (fractions summing to 1) under a weighting, as the backtest sets it. */
export function schemeShares(stocks: BasketStock[], scheme: WeightScheme, custom?: Record<string, number>): Map<string, number> {
  if (!stocks.length) return new Map();
  if (scheme === "custom") return customTargets(stocks.map((s) => s.ticker), custom);
  const raw = basketWeights(stocks, scheme);
  const sum = [...raw.values()].reduce((a, b) => a + b, 0);
  return new Map([...raw].map(([t, v]) => [t, v / sum]));
}

const today = () => new Date().toISOString().slice(0, 10);

/**
 * The page's projection (docs/PROJECTIONS.md): the basket, the chart's picks and the table's scope
 * at the backtest's own weights (the last valid custom ones), in the chosen case, plus simulated
 * paths that swing like the basket did over the past year (its 1Y backtest, `volKey`). Null while
 * the switch is off, so nothing extra loads.
 */
export function useProjection({
  on,
  settings,
  stocks,
  weighting,
  weights,
  picked,
  picksChosen,
  scopePicks,
  volKey,
  reload,
}: {
  on: boolean;
  settings: ProjectionSettings;
  stocks: BasketStock[];
  weighting: WeightScheme;
  /** The custom weights the backtest uses (%), when custom. */
  weights: Record<string, number> | undefined;
  /** The stocks with a line on the chart. */
  picked: BasketStock[];
  /** The reader has ticked or unticked a line (Your picks applies from then on). */
  picksChosen: boolean;
  /** The table shows just the picks. */
  scopePicks: boolean;
  /** The basket's backtest key: its past year sets the simulated paths' swings. */
  volKey: string | null;
  reload: number;
}): ProjectionView | null {
  const { get } = useSeries(on && stocks.length && volKey ? [volKey] : [], "1Y", { reload });
  const volLoad = on && volKey ? get(volKey) : undefined;
  const points = volLoad?.status === "ok" ? volLoad.data.points : null;
  const vol = useMemo(() => (points ? annualVol(points) : null), [points]);
  const start = points?.length ? points[points.length - 1].t : today();

  const core = useMemo(() => {
    if (!on) return null;
    const shares = schemeShares(stocks, weighting, weights);
    const items = stocks.map((s) => ({ ticker: s.ticker, weight: shares.get(s.ticker) ?? 0, proj: s.proj }));
    const basket = projectBasket(items, settings);
    const cases = Object.fromEntries(SCENARIOS.map((sc) => [sc, sc === settings.scenario ? basket.ret : projectBasket(items, { ...settings, scenario: sc }).ret])) as Record<Scenario, number | null>;
    // Your picks: the picked stocks as their own basket at the same weighting (custom: the whole
    // basket's %s scaled up within the picks), as the backtest's picks card does.
    const some = picksChosen && picked.length > 0 && picked.length < stocks.length;
    const pickShares = some ? schemeShares(picked, weighting, weights) : null;
    const picks = some && pickShares ? projectBasket(picked.map((s) => ({ ticker: s.ticker, weight: pickShares.get(s.ticker) ?? 0, proj: s.proj })), settings) : null;
    return { shares, basket, cases, picks };
  }, [on, stocks, weighting, weights, settings, picked, picksChosen]);

  const steps = 52 * settings.h;
  const seed = useMemo(() => seedOf(`${stocks.map((s) => `${s.ticker}:${core?.shares.get(s.ticker)?.toFixed(6)}`).join(",")}|${settings.h}|${settings.scenario}|${settings.exit}`), [stocks, core, settings]);
  const ret = core?.basket.ret ?? null;
  const sim = useMemo(() => (on && ret != null && vol != null && vol > 0 ? simulate(ret, settings.h, vol, seed) : null), [on, ret, vol, settings.h, seed]);

  const volStatus = volLoad?.status;
  // One object per change that matters, so the chart (which redraws on a new one) doesn't redraw,
  // and lose its zoom, on every render of the page.
  return useMemo((): ProjectionView | null => {
  if (!on || !core) return null;
  const simState: ProjectionView["simState"] = sim ? "ok" : !volStatus || volStatus === "loading" ? "loading" : "none";
  return {
    settings,
    period: `next ${HORIZON_LONG[settings.h]}`,
    caseLabel: `${SCENARIO_LABEL[settings.scenario].toLowerCase()} case`,
    basket: core.basket,
    cases: core.cases,
    picks: core.picks,
    picksCount: picksChosen ? picked.length : 0,
    table: scopePicks && core.picks ? core.picks : core.basket,
    dates: weeklyDates(start, settings.h),
    path: basketPath(core.basket.holdings, steps),
    vol,
    sim,
    simState: ret == null ? "none" : simState,
    stocks,
    shares: core.shares,
  };
  }, [on, core, sim, volStatus, ret, settings, steps, start, vol, stocks, scopePicks, picksChosen, picked.length]);
}
