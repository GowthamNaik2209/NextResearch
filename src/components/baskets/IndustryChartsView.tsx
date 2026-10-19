"use client";

import { useEffect, useState } from "react";
import type { Benchmark } from "@/lib/sector-content/benchmarks";
import type { BasketStock } from "@/lib/baskets/industry";
import { BasketDetail } from "./BasketDetail";
import type { CompareBasket } from "./BasketChart";

// The Analysis page's Charts view: an industry's basket page (cards, chart, stock list and a
// "Customise this basket" button) with a picker to switch industries. The same component as
// /baskets/industry/<slug>, so the two never drift apart.
export type ChartsIndustry = {
  slug: string;
  name: string;
  tagline: string;
  category: "sector" | "policy";
  stocks: BasketStock[];
  indices: Benchmark[];
};

export function IndustryChartsView({
  baskets,
  industries,
  market,
  signedIn,
  initialSlug,
}: {
  baskets: ChartsIndustry[];
  industries: CompareBasket[];
  market: Benchmark[];
  signedIn: boolean;
  initialSlug?: string;
}) {
  const [slug, setSlug] = useState(() => (baskets.some((b) => b.slug === initialSlug) ? initialSlug! : baskets[0]?.slug));
  const b = baskets.find((x) => x.slug === slug) ?? baskets[0];

  // Keeps ?sector= in step, so a reload or a shared link opens the same industry.
  useEffect(() => {
    if (!b) return;
    const url = new URL(window.location.href);
    url.searchParams.set("sector", b.slug);
    window.history.replaceState(window.history.state, "", url);
  }, [b]);

  if (!b) return null;
  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-wrap items-center gap-2 text-xs text-ink-soft">
        <span className="font-bold uppercase tracking-wider">{b.category === "policy" ? "Policy" : "Industry"}</span>
        <select
          value={b.slug}
          onChange={(e) => setSlug(e.target.value)}
          className="min-w-0 max-w-full rounded-lg border border-line bg-panel px-3 py-2 text-base font-semibold text-ink sm:text-sm"
        >
          {baskets.map((x) => (
            <option key={x.slug} value={x.slug}>
              {x.name}
            </option>
          ))}
        </select>
      </label>
      <BasketDetail
        key={b.slug}
        mode="industry"
        id={b.slug}
        name={`${b.name} basket`}
        description={`Every listed company in the ${b.name} map: ${b.tagline}`}
        stocks={b.stocks}
        addPrices={{}}
        weighting="equal"
        isOwner={false}
        isPublic
        signedIn={signedIn}
        universe={null}
        watchlist={[]}
        industries={industries}
        compareSlug={b.slug}
        compareName={b.name}
        indices={b.indices}
        market={market}
        viewParam="bview"
        titleAs="h2"
      />
    </div>
  );
}
