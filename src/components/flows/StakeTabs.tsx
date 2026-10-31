"use client";

import { useState, type ReactNode } from "react";

// FII or DII stake changes: both tables come rendered from the server; this only shows one.
export function StakeTabs({ fii, dii }: { fii: ReactNode; dii: ReactNode }) {
  const [tab, setTab] = useState<"fii" | "dii">("fii");
  const btn = (t: "fii" | "dii", label: string) => (
    <button
      type="button"
      aria-pressed={tab === t}
      onClick={() => setTab(t)}
      className={
        "tap-y inline-flex h-8 items-center whitespace-nowrap rounded-full border px-3 text-xs font-semibold " +
        (tab === t ? "border-ink-soft bg-panel-2 text-ink" : "border-line text-ink-soft hover:text-ink")
      }
    >
      {label}
    </button>
  );
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {btn("fii", "FII biggest moves")}
        {btn("dii", "DII biggest moves")}
      </div>
      <div className="mt-2">{tab === "fii" ? fii : dii}</div>
    </div>
  );
}
