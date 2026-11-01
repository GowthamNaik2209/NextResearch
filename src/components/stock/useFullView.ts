"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type FullState = { nrStockFull?: boolean } | null;
/** The current history entry is a full view's (see enter). */
export const onFullEntry = () => typeof window !== "undefined" && !!(window.history.state as FullState)?.nrStockFull;

/**
 * A stock pop-up's full-screen view (Backtest), on its own history entry at the same URL, so the
 * phone's back gesture and the browser's Back step back to the chart instead of closing the
 * pop-up. `exit` is the view's own Back button; `close` (✕, Esc, the backdrop) first steps off
 * that entry, then closes as the pop-up always does (ReturnToStock steps back from `?stock=`).
 * `restore`: Forward onto that entry, or a reload while on it, opens the view again (the stock
 * pop-up, whose stock is in the URL). The Charts pop-up can't tell which stock was picked then,
 * so it stays on its chart.
 */
export function useFullView(onClose: () => void, { restore = false }: { restore?: boolean } = {}) {
  const [full, setFull] = useState(() => restore && onFullEntry());
  const closing = useRef(false);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!full && !restore) return;
    const onPop = () => {
      const on = onFullEntry();
      setFull(on && (restore || full));
      if (closing.current && !on) {
        closing.current = false;
        onCloseRef.current();
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [full, restore]);

  const enter = useCallback(() => {
    window.history.pushState({ nrStockFull: true }, "");
    setFull(true);
  }, []);
  const exit = useCallback(() => {
    if (onFullEntry()) window.history.back();
    else setFull(false);
  }, []);
  const close = useCallback(() => {
    if (full && onFullEntry()) {
      closing.current = true;
      window.history.back();
    } else onCloseRef.current();
  }, [full]);

  return { full, enter, exit, close };
}
