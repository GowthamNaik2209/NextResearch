import type { Quote } from "@/lib/live/yahoo";
import { quoteTiming } from "@/lib/live/freshness";
import { fmtPrice, fmtSigned, freshQuote } from "./merge";
import { sep } from "@/lib/format";

const MINUS = "−";

// "live · 3:29 pm" for today's quote, "live · 21 Oct" for the last trading day's close (IST).
function liveWhen(asOf: string): string {
  const t = new Date(asOf);
  const ist = (d: Date, o: Intl.DateTimeFormatOptions) => sep(d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", ...o }));
  const day = (d: Date) => ist(d, { day: "numeric", month: "short" });
  return day(t) === day(new Date()) ? ist(t, { hour: "numeric", minute: "2-digit" }) : day(t);
}

// Price + day change, coloured by direction and labelled "live" - the one figure live data may
// change (everything else is the dated company-table snapshot). Without a live quote it shows the
// snapshot price, labelled as such.
export function PriceTag({ price, quote: rawQuote, size = "md", asOf }: { price: number | null; quote: Quote | null; size?: "sm" | "md"; asOf?: string | null }) {
  // A frozen symbol's quote must never be labelled live (callers may pass the raw one).
  const quote = freshQuote(rawQuote);
  if (price == null && !quote) return null;
  const up = (quote?.changePct ?? 0) >= 0;
  const tone = quote?.changePct == null ? "text-ink-soft" : up ? "text-pos" : "text-danger";
  return (
    <div className="text-right">
      <div className={"font-mono font-semibold text-ink " + (size === "md" ? "text-lg" : "text-sm")}>{fmtPrice(quote?.price ?? price)}</div>
      {quote?.change != null && quote.changePct != null ? (
        <div className={"font-mono text-xs " + tone}>
          {up ? "+" : MINUS}
          {Math.abs(quote.change).toFixed(2)} ({fmtSigned(quote.changePct, 2)})
        </div>
      ) : null}
      <div className="text-[10px] text-ink-soft" title={quote ? `Yahoo Finance, ${quoteTiming(quote)}` : undefined}>
        {quote ? (
          <>
            <span className="text-pos">live</span> · {liveWhen(quote.asOf)}
          </>
        ) : (
          `snapshot${asOf ? ` ${asOf}` : ""}`
        )}
      </div>
    </div>
  );
}
