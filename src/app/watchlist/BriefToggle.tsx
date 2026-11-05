"use client";

import { useState } from "react";
import { InfoTip } from "@/components/InfoTip";

// The 8 am morning brief email, on for every user until they turn it off here or unsubscribe
// (src/lib/brief). Saves on tap; a failed save puts the switch back and says so.
export function BriefToggle({ initial }: { initial: boolean }) {
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = async () => {
    const next = !on;
    setOn(next);
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/brief/pref", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ morningBrief: next }) });
      if (!res.ok) throw new Error(String(res.status));
    } catch {
      setOn(!next);
      setError("Couldn’t save, try again");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        disabled={busy}
        onClick={toggle}
        className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-btn px-3 text-sm font-semibold text-ink hover:bg-accent/10 disabled:opacity-60"
      >
        <span aria-hidden className={"relative h-5 w-9 rounded-full transition " + (on ? "bg-accent" : "bg-line")}>
          <span className={"absolute top-0.5 h-4 w-4 rounded-full bg-bg transition-all " + (on ? "left-[18px]" : "left-0.5")} />
        </span>
        8 am brief email
      </button>
      <InfoTip label="About the morning brief">
        Every trading day at 8 am: the market close, FII / DII flows, the best and worst baskets, your watchlist&rsquo;s moves, key dates and
        upcoming IPOs.
      </InfoTip>
      <a href="/api/brief/preview" target="_blank" rel="noopener" className="text-xs text-accent hover:underline">
        Preview
      </a>
      {error && (
        <span role="alert" className="w-full text-xs text-danger">
          {error}
        </span>
      )}
    </div>
  );
}
