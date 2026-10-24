"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

// The worked example's stock list: picking a stock shows its working at once (the page reads the
// stock from ?t=), keeping the reader where they are. Without JavaScript the form's Show button does it.
export function ExampleStockSelect({ stocks, value }: { stocks: { ticker: string; name: string }[]; value: string | undefined }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <form method="get" action="/baskets/projections#example" className="flex flex-wrap items-center gap-2">
      <label htmlFor="t" className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
        Stock
      </label>
      <select
        id="t"
        name="t"
        defaultValue={value}
        onChange={(e) => {
          const t = e.target.value;
          start(() => router.replace(`/baskets/projections?t=${encodeURIComponent(t)}#example`, { scroll: false }));
        }}
        className="min-h-10 max-w-full rounded border border-line bg-bg px-2 text-base text-ink sm:text-sm"
      >
        {stocks.map((s) => (
          <option key={s.ticker} value={s.ticker}>
            {s.name} ({s.ticker})
          </option>
        ))}
      </select>
      <span role="status" className="text-xs text-ink-soft">
        {pending ? "Working it out…" : ""}
      </span>
      <noscript>
        <button type="submit" className="inline-flex min-h-10 items-center rounded bg-accent px-4 text-sm font-semibold text-bg hover:opacity-90">
          Show
        </button>
      </noscript>
    </form>
  );
}
