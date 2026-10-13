"use client";

import { useState } from "react";
import type { SectorSupplier } from "@/lib/sector-content";
import { StockModalHost } from "./StockModalHost";

// Wraps a server-rendered card so a click anywhere on it (except its own links and
// buttons, e.g. the watchlist heart or "view in map") opens the stock pop-up directly —
// no detour through the 3D explorer. `ticker` is passed in so this client component
// never needs the (large) sector content module.
export function OpenStockCard({
  ticker,
  supplier,
  className = "",
  children,
}: {
  ticker: string;
  supplier: SectorSupplier;
  className?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div
        role="button"
        tabIndex={0}
        aria-haspopup="dialog"
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("a,button,input")) return;
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={"cursor-pointer " + className}
      >
        {children}
      </div>
      {open && <StockModalHost ticker={ticker} supplier={supplier} onClose={() => setOpen(false)} />}
    </>
  );
}
