"use client";

// The stock pop-ups' way into and out of the full-screen Backtest view (StockBacktest): kept apart
// from it, so a pop-up loads the view's charts and panels only when it is opened.

/**
 * Opens the stock's backtest and projections, always on the pop-up's top row so it is in view
 * without scrolling. "tab": at the end of the stock pop-up's tab row (on the Chart tab). "bar":
 * beside the Charts pop-up's dropdowns, as tall as they are.
 */
export function BacktestButton({ onClick, variant }: { onClick: () => void; variant: "tab" | "bar" }) {
  const tab = variant === "tab";
  return (
    <button
      type="button"
      onClick={onClick}
      title="Backtest this stock against the Nifty 50, and project it 1 or 2 years ahead"
      className={
        "inline-flex flex-none items-center gap-1.5 border border-accent bg-accent font-semibold text-bg hover:opacity-90 " +
        (tab
          ? "tap-target rounded-full px-2.5 py-1 text-xs sm:px-4 sm:py-1.5 sm:text-sm pointer-coarse:min-h-10"
          : "min-h-9 justify-center self-end rounded-lg px-3 text-xs sm:min-h-[38px] sm:text-sm pointer-coarse:min-h-10")
      }
    >
      <svg aria-hidden viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="max-sm:hidden">
        <path d="M3 3v18h18" />
        <path d="M7 15l4-4 3 3 6-7" />
      </svg>
      <span>
        Backtest<span className="max-sm:hidden"> &amp; project</span>
      </span>
    </button>
  );
}

/** In the full view's header, left of the name: back to the pop-up's chart. */
export function BackToChartButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Back to chart"
      className="flex h-10 flex-none items-center gap-1 rounded-full border border-line bg-panel-2 pl-2 pr-3 text-sm font-semibold text-ink hover:border-accent"
    >
      <svg aria-hidden viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 18l-6-6 6-6" />
      </svg>
      <span>Chart</span>
    </button>
  );
}
