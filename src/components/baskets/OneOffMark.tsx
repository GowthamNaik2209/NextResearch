"use client";

import { InfoTip } from "@/components/InfoTip";

/**
 * The small "one-off" marker on a stock whose figures have a one-off year (src/lib/baskets/outliers.ts):
 * the rule-based baskets and screens leave it out, but a user can still keep it in their own basket,
 * so it says why in a 1-line "i". Inline and no taller than the 10-11px meta line it sits in (the "i"
 * button's negative margin), so a marked row is exactly as tall as any other.
 */
export function OneOffMark({ name, reason }: { name: string; reason: string }) {
  return (
    <span className="inline-flex items-center gap-1 align-middle">
      <span className="whitespace-nowrap font-sans font-semibold text-amber-ink">one-off</span>
      <span className="-my-1 inline-flex">
        <InfoTip label={`Why ${name} is marked one-off`}>
          {reason}. Left out of the rule-based baskets and screens; you can still keep it in yours.
        </InfoTip>
      </span>
    </span>
  );
}
