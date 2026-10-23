"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { returnToStockPath } from "@/lib/safe-next";

// A company name that opens its stock pop-up in place. It only adds ?stock=TICKER to the URL
// (pushState: no server round trip, and Back closes the pop-up - expected on phones, where it
// fills the screen); ReturnToStock in the root layout opens it. The href keeps the page's
// other params, so a new-tab click lands on the same view with the pop-up open.
export function StockLink({ ticker, className, title, children }: { ticker: string; className?: string; title?: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const href = returnToStockPath(pathname, search, ticker);
  return (
    <a
      href={href}
      className={className}
      title={title}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        // Marks the entry so closing the pop-up steps back instead of stacking history.
        window.history.pushState({ nrStock: true }, "", href);
      }}
    >
      {children}
    </a>
  );
}
