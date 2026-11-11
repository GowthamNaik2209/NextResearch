"use client";

import { FEW_TRADES, type Figures, type SignalResult } from "@/lib/signals/engine";
import { verdict } from "@/lib/signals/describe";
import { InfoTip } from "@/components/InfoTip";
import { signedPct } from "@/lib/format";
import { Badge } from "./ui";

// The line over the results: what ₹1 lakh became under the rules and simply held, then the honest
// badges (beat holding or not, too few trades, weaker in the later part of the range: only when both
// parts span a year or more, as a part's yearly return is left out under a year).

// The later part reads as weaker when its yearly return is this many points below the earlier part's.
const WEAKER_BY = 10;

export function ResultHeader({ rules, hold, figures, closed, split }: { rules: number; hold: number; figures: { rules: Figures; hold: Figures }; closed: number; split: SignalResult["split"] }) {
  const v = verdict(rules, hold, figures);
  const a = split.first.cagr, b = split.last.cagr;
  const weaker = a != null && b != null && a - b >= WEAKER_BY;
  return (
    <div className="flex flex-col gap-1.5 rounded-md border border-line bg-panel px-3 py-2">
      <p className="text-sm text-ink">{v.text}</p>
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge kind={v.beat ? "good" : "plain"}>{v.beat ? "Beat holding" : "Didn't beat holding"}</Badge>
        {closed < FEW_TRADES && <Badge kind="warn">Too few trades to trust ({closed})</Badge>}
        {weaker && (
          <span className="inline-flex items-center gap-1">
            <Badge kind="warn">Weaker in recent years</Badge>
            <InfoTip label="About weaker in recent years">
              The rules made {signedPct(a, 1)} a year in the earlier part of the range but {signedPct(b, 1)} in the later part. Rules that only worked earlier were often fitted to those years.
            </InfoTip>
          </span>
        )}
      </div>
    </div>
  );
}
