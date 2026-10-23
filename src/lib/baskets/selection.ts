// One basket's stock selection while it is being looked at or edited: the stocks, their custom
// weights, which ones are drawn on the chart, where each was picked from and what was just taken
// off (for Undo). Every list on the basket page (the stock picker, the stock table with its line
// ticks and weight boxes, the chart's Stocks menu) reads this one state, and every change goes through
// this reducer, so a stock taken off anywhere is gone everywhere at once and its weight and chart
// line go with it. Pure, so it is unit-tested without a browser (selection.test.ts).
import type { BasketStock } from "./industry";
import { MAX_BASKET_STOCKS } from "./limits";
import { addToWeights, customTargets, removeFromWeights, toPercents } from "./strategy";

/** Chart lines a basket page can draw for single stocks (six colours, three dash styles). */
export const MAX_CHART_STOCKS = 18;
/** What the page says when a line is asked for with every line slot taken (table tick or Stocks menu). */
export const LINES_FULL = `Up to ${MAX_CHART_STOCKS} lines at a time. Switch one off to show another.`;

/** What the reader has switched on in the chart: indices, other industry baskets, and stocks (ticker -> line slot). */
export type ChartSelection = { benches: string[]; compare: string[]; picks: Record<string, number> };

/** What a stock had when it was taken off, so Undo (or adding it back this visit) restores it. */
export type TakenOff = { index: number; stock: BasketStock; weight?: number; slot?: number; from?: string };

export type SelectionState = {
  stocks: BasketStock[];
  /** The tickers the server has saved (a saved basket); the id backtest runs only on these. */
  confirmed: string[];
  /** Saved tickers no longer in the maps: kept as "No longer listed" rows so they can be taken off. */
  unlisted: string[];
  /** Custom weights, % per stock, always over exactly the current stocks; null when never custom. */
  custom: Record<string, number> | null;
  chart: ChartSelection;
  /** The reader has switched a stock's line on or off: lines are theirs, never moved for them. */
  picksChosen: boolean;
  /** The industry each stock was added from this visit (its layer and chip are read in it). */
  pickedFrom: Record<string, string>;
  takenOff: Record<string, TakenOff>;
  /** The last stock taken off, offered for Undo. */
  lastRemoved: string | null;
  /** Every stock taken off while the Undo offer was open (oldest first): one Undo brings them all back. */
  burst: string[];
};

export type SelectionAction =
  | { type: "add"; stocks: BasketStock[]; from?: string }
  | { type: "remove"; ticker: string }
  | { type: "restore"; ticker: string }
  | { type: "removeUnlisted"; ticker: string }
  | { type: "sync"; items: string[]; known: ReadonlyMap<string, BasketStock>; weights?: Record<string, number> | null }
  | { type: "setCustom"; weights: Record<string, number> | null }
  | { type: "chart"; next: ChartSelection | ((s: ChartSelection) => ChartSelection) }
  | { type: "choosePicks" }
  /** A stock's chart line on or off (the table's tick, the Stocks menu's switch): the reader's own pick. */
  | { type: "togglePick"; ticker: string }
  /** Every stock's line on, as many as there are line slots (lines already on keep theirs). */
  | { type: "pickAll" }
  /** Every stock's line off (the basket and what it is compared with stay). */
  | { type: "pickNone" }
  | { type: "dismissUndo" };

export function initSelection(o: {
  stocks: BasketStock[];
  unlisted?: string[];
  custom: Record<string, number> | null;
  chart: ChartSelection;
  /** Where each stock was picked from, as saved with the basket (stocks not in it are ignored). */
  pickedFrom?: Record<string, string>;
}): SelectionState {
  const stocks = dedupe(o.stocks);
  const inIt = new Set(stocks.map((s) => s.ticker));
  return {
    stocks,
    confirmed: stocks.map((s) => s.ticker),
    unlisted: o.unlisted ?? [],
    custom: o.custom,
    chart: o.chart,
    picksChosen: false,
    pickedFrom: Object.fromEntries(Object.entries(o.pickedFrom ?? {}).filter(([t]) => inIt.has(t))),
    takenOff: {},
    lastRemoved: null,
    burst: [],
  };
}

/** The Undo offer after some of the burst came back another way: the rest, latest last. */
const offerAfter = (burst: string[], back: (t: string) => boolean) => {
  const rest = burst.filter((t) => !back(t));
  return { burst: rest, lastRemoved: rest.length ? rest[rest.length - 1] : null };
};

function dedupe(list: BasketStock[]): BasketStock[] {
  const seen = new Set<string>();
  return list.filter((s) => !seen.has(s.ticker) && !!seen.add(s.ticker));
}

/** Which of these stocks an add would put in: new ones only, once each, up to the basket's limit. */
export function planAdd(have: readonly { ticker: string }[], list: readonly BasketStock[]): { fresh: BasketStock[]; asked: number } {
  const inIt = new Set(have.map((s) => s.ticker));
  const wanted = dedupe(list.filter((s) => !inIt.has(s.ticker)));
  return { fresh: wanted.slice(0, Math.max(0, MAX_BASKET_STOCKS - have.length)), asked: wanted.length };
}

/** The first chart line slot no stock is using, or null when all are taken. */
const freeSlot = (picks: Record<string, number>, prefer?: number) => {
  const used = new Set(Object.values(picks));
  if (prefer != null && !used.has(prefer)) return prefer;
  for (let i = 0; i < MAX_CHART_STOCKS; i++) if (!used.has(i)) return i;
  return null;
};

export function selectionReducer(state: SelectionState, action: SelectionAction): SelectionState {
  switch (action.type) {
    case "add": {
      const { fresh } = planAdd(state.stocks, action.stocks);
      if (!fresh.length) return state;
      const tickers = fresh.map((s) => s.ticker);
      const earlier = Object.fromEntries(tickers.flatMap((t) => (state.takenOff[t]?.weight != null ? [[t, state.takenOff[t].weight!]] : [])));
      const takenOff = { ...state.takenOff };
      for (const t of tickers) delete takenOff[t];
      // A new stock gets a line only while the lines are still the page's defaults: once the reader
      // has chosen their own, an add never changes the chart under them.
      let picks = state.chart.picks;
      if (!state.picksChosen) {
        picks = { ...picks };
        for (const t of tickers) {
          const slot = freeSlot(picks);
          if (slot == null) break;
          picks[t] = slot;
        }
      }
      return {
        ...state,
        stocks: [...state.stocks, ...fresh],
        custom: state.custom ? addToWeights(state.custom, tickers, earlier) : null,
        chart: picks === state.chart.picks ? state.chart : { ...state.chart, picks },
        pickedFrom: action.from ? { ...state.pickedFrom, ...Object.fromEntries(tickers.map((t) => [t, action.from!])) } : state.pickedFrom,
        takenOff,
        ...offerAfter(state.burst, (x) => tickers.includes(x)),
      };
    }
    case "remove": {
      const t = action.ticker;
      const index = state.stocks.findIndex((s) => s.ticker === t);
      if (index < 0) return state;
      const stocks = state.stocks.filter((s) => s.ticker !== t);
      const slot = state.chart.picks[t];
      const picks = { ...state.chart.picks };
      delete picks[t];
      // Its line is dropped. Only while the lines are the page's defaults does the slot pass to the
      // first stock not drawn yet (so a long basket still opens with its lines full).
      if (slot != null && !state.picksChosen) {
        const next = stocks.find((s) => picks[s.ticker] == null);
        if (next) picks[next.ticker] = slot;
      }
      const pickedFrom = { ...state.pickedFrom };
      delete pickedFrom[t];
      return {
        ...state,
        stocks,
        custom: state.custom ? removeFromWeights(state.custom, [t]) : null,
        chart: { ...state.chart, picks },
        pickedFrom,
        takenOff: { ...state.takenOff, [t]: { index, stock: state.stocks[index], weight: state.custom?.[t], slot, from: state.pickedFrom[t] } },
        lastRemoved: t,
        // A second remove while the offer is open joins the first, so Undo brings both back.
        burst: state.lastRemoved ? [...state.burst.filter((x) => x !== t), t] : [t],
      };
    }
    case "restore": {
      const t = action.ticker;
      const off = state.takenOff[t];
      if (!off || state.stocks.some((s) => s.ticker === t) || state.stocks.length >= MAX_BASKET_STOCKS) return state;
      const stocks = [...state.stocks];
      stocks.splice(Math.min(off.index, stocks.length), 0, off.stock);
      const takenOff = { ...state.takenOff };
      delete takenOff[t];
      let picks = state.chart.picks;
      if (off.slot != null) {
        const slot = freeSlot(picks, off.slot);
        if (slot != null) picks = { ...picks, [t]: slot };
      }
      return {
        ...state,
        stocks,
        custom: state.custom ? addToWeights(state.custom, [t], off.weight != null ? { [t]: off.weight } : {}) : null,
        chart: picks === state.chart.picks ? state.chart : { ...state.chart, picks },
        pickedFrom: off.from ? { ...state.pickedFrom, [t]: off.from } : state.pickedFrom,
        takenOff,
        ...offerAfter(state.burst, (x) => x === t),
      };
    }
    case "removeUnlisted":
      return state.unlisted.includes(action.ticker) ? { ...state, unlisted: state.unlisted.filter((t) => t !== action.ticker) } : state;
    case "sync": {
      // The server's list for a saved basket (the reply to the latest change, or the basket as saved
      // after a failed one). Picks, weights and "picked from" follow it together: a stock the server
      // doesn't have loses its line and weight; one it brought back gets back what it had.
      const known = action.known;
      const stocks = dedupe(action.items.flatMap((t) => (known.has(t) ? [known.get(t)!] : [])));
      const tickers = stocks.map((s) => s.ticker);
      const keep = new Set(tickers);
      const before = new Set(state.stocks.map((s) => s.ticker));
      const back = tickers.filter((t) => !before.has(t));
      const picks: Record<string, number> = {};
      for (const [t, slot] of Object.entries(state.chart.picks)) if (keep.has(t)) picks[t] = slot;
      for (const t of back) {
        const off = state.takenOff[t];
        if (off?.slot == null) continue;
        const slot = freeSlot(picks, off.slot);
        if (slot != null) picks[t] = slot;
      }
      const pickedFrom: Record<string, string> = {};
      for (const [t, from] of Object.entries(state.pickedFrom)) if (keep.has(t)) pickedFrom[t] = from;
      for (const t of back) if (state.takenOff[t]?.from) pickedFrom[t] = state.takenOff[t].from!;
      const takenOff = { ...state.takenOff };
      for (const t of back) delete takenOff[t];
      let custom = state.custom;
      if (action.weights && tickers.length && tickers.every((t) => action.weights![t] != null)) custom = toPercents(customTargets(tickers, action.weights));
      else if (custom) {
        // The others fitted to the server's list, then each stock brought back given its old % (the
        // others shrinking to make room), exactly as Undo would.
        const earlier = Object.fromEntries(back.flatMap((t) => (state.takenOff[t]?.weight != null ? [[t, state.takenOff[t].weight!]] : [])));
        const rest = tickers.filter((t) => earlier[t] == null);
        const base = rest.length ? toPercents(customTargets(rest, custom)) : {};
        custom = Object.keys(earlier).length ? addToWeights(base, Object.keys(earlier), earlier) : base;
      }
      const sameChart = Object.keys(picks).length === Object.keys(state.chart.picks).length && Object.entries(picks).every(([t, s]) => state.chart.picks[t] === s);
      return {
        ...state,
        stocks,
        confirmed: tickers,
        unlisted: action.items.filter((t) => !known.has(t)),
        custom,
        chart: sameChart ? state.chart : { ...state.chart, picks },
        pickedFrom,
        takenOff,
        ...offerAfter(state.burst, (x) => keep.has(x)),
      };
    }
    case "setCustom":
      return { ...state, custom: action.weights };
    case "chart": {
      const next = typeof action.next === "function" ? action.next(state.chart) : action.next;
      // Lines only for stocks in the basket, whatever the caller passed.
      const inIt = new Set(state.stocks.map((s) => s.ticker));
      const stray = Object.keys(next.picks).filter((t) => !inIt.has(t));
      if (!stray.length) return { ...state, chart: next };
      const picks = { ...next.picks };
      for (const t of stray) delete picks[t];
      return { ...state, chart: { ...next, picks } };
    }
    case "choosePicks":
      return state.picksChosen ? state : { ...state, picksChosen: true };
    case "togglePick": {
      const t = action.ticker;
      if (!state.stocks.some((s) => s.ticker === t)) return state;
      const picks = { ...state.chart.picks };
      if (picks[t] != null) delete picks[t];
      else {
        const slot = freeSlot(picks);
        // Every slot taken: nothing changes (the caller says why, with LINES_FULL).
        if (slot == null) return state.picksChosen ? state : { ...state, picksChosen: true };
        picks[t] = slot;
      }
      return { ...state, chart: { ...state.chart, picks }, picksChosen: true };
    }
    case "pickAll": {
      const picks = { ...state.chart.picks };
      for (const s of state.stocks) {
        if (picks[s.ticker] != null) continue;
        const slot = freeSlot(picks);
        if (slot == null) break;
        picks[s.ticker] = slot;
      }
      return { ...state, chart: { ...state.chart, picks }, picksChosen: true };
    }
    case "pickNone":
      return { ...state, chart: { ...state.chart, picks: {} }, picksChosen: true };
    case "dismissUndo":
      return state.lastRemoved || state.burst.length ? { ...state, lastRemoved: null, burst: [] } : state;
  }
}
