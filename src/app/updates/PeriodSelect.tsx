"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { PERIODS, PERIOD_LABEL, type Period } from "@/lib/flows/periods";
import { updatesHref } from "./controls";

// The FII / DII view's period: one choice for every block. Picking one reloads the view in place;
// without JavaScript the form's Show button does the same.
export function PeriodSelect({ period, sector }: { period: Period; sector?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <form method="get" action="/updates" className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="view" value="flows" />
      {sector && <input type="hidden" name="sector" value={sector} />}
      <label htmlFor="period" className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
        Period
      </label>
      <select
        id="period"
        name="period"
        defaultValue={period}
        aria-busy={pending}
        onChange={(e) => start(() => router.replace(updatesHref({ sector, view: "flows", period: e.target.value as Period }), { scroll: false }))}
        className={
          "h-9 cursor-pointer appearance-none rounded-full border border-line bg-panel pl-3.5 pr-8 text-base font-semibold text-ink hover:border-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:text-sm " +
          (pending ? "opacity-70" : "")
        }
      >
        {PERIODS.map((p) => (
          <option key={p} value={p}>
            {p} · {PERIOD_LABEL[p]}
          </option>
        ))}
      </select>
      <span role="status" className="text-xs text-ink-soft">
        {pending ? "Updating…" : ""}
      </span>
      <noscript>
        <button type="submit" className="inline-flex min-h-9 items-center rounded-full bg-accent px-4 text-sm font-semibold text-bg">
          Show
        </button>
      </noscript>
    </form>
  );
}
