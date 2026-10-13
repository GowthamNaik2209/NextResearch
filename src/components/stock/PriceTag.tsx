import type { Quote } from "@/lib/live/yahoo";
import { fmtNum, fmtSigned } from "./merge";

// Price + day change, coloured by direction. Falls back to the static price
// (no change figure) when the live quote isn't available.
export function PriceTag({ price, quote, size = "md" }: { price: number | null; quote: Quote | null; size?: "sm" | "md" }) {
  if (price == null) return null;
  const up = (quote?.changePct ?? 0) >= 0;
  const tone = quote?.changePct == null ? "text-ink-soft" : up ? "text-pos" : "text-danger";
  return (
    <div className="text-right">
      <div className={"font-mono font-semibold text-ink " + (size === "md" ? "text-lg" : "text-sm")}>₹{fmtNum(price)}</div>
      {quote?.change != null && quote.changePct != null ? (
        <div className={"font-mono text-xs " + tone}>
          {up ? "+" : ""}
          {fmtNum(quote.change)} ({fmtSigned(quote.changePct, 2)})
        </div>
      ) : (
        <div className="text-[10px] text-ink-soft">last known</div>
      )}
    </div>
  );
}
