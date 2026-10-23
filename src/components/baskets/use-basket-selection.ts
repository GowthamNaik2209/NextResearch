"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import { initSelection, selectionReducer, type ChartSelection, type SelectionAction, type SelectionState } from "@/lib/baskets/selection";
import type { BasketStock } from "@/lib/baskets/industry";

// The basket page's one stock selection (see lib/baskets/selection.ts): state for rendering, plus
// `current()` for event handlers and a save's reply that lands after more taps (the latest, even
// before React has re-rendered).
export function useBasketSelection(init: () => { stocks: BasketStock[]; unlisted?: string[]; custom: Record<string, number> | null; chart: ChartSelection }) {
  const [state, dispatch] = useReducer(selectionReducer, undefined, () => initSelection(init()));
  const latest = useRef<SelectionState>(state);
  useEffect(() => {
    latest.current = state;
  }, [state]);
  // Every change also lands in the ref at once, so two taps in one frame read each other.
  const act = useCallback((a: SelectionAction) => {
    latest.current = selectionReducer(latest.current, a);
    dispatch(a);
  }, []);
  const tickers = useMemo(() => state.stocks.map((s) => s.ticker), [state.stocks]);
  const current = useCallback(() => latest.current, []);
  return { sel: state, act, current, tickers };
}
