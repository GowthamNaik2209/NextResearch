import type { CashDay } from "@/lib/flows/query";
import { inr } from "@/lib/format";
import { signedCr } from "./format";

// Round scale tops (₹ crore), so the gridlines land on readable numbers.
const STEPS = [500, 1000, 2000, 2500, 5000, 7500, 10_000, 15_000, 20_000, 25_000, 30_000, 40_000, 50_000, 75_000, 100_000];

const tickLabel = (v: number) => {
  if (v === 0) return "0";
  const a = Math.abs(v);
  return `${v > 0 ? "+" : "−"}${a >= 1000 ? `${a / 1000}k` : inr(a)}`;
};

/**
 * Daily net FII and DII cash flows as paired bars around a zero line. Plain HTML laid out in
 * percentages from one scale, so it fits any width without measuring the screen; the latest day
 * is drawn at full strength.
 */
export function CashChart({ days }: { days: CashDay[] }) {
  const peak = Math.max(1, ...days.flatMap((d) => [Math.abs(d.fiiNetCr), Math.abs(d.diiNetCr)]));
  const top = STEPS.find((s) => s >= peak * 1.05) ?? Math.ceil((peak * 1.05) / 10_000) * 10_000;
  const y = (v: number) => 50 - (v / top) * 50; // % from the top of the plot
  const ticks = [top, top / 2, 0, -top / 2, -top];

  return (
    <div role="img" aria-label={`Daily net buying, last ${days.length} sessions: ${days.map((d) => `${fmt(d.day)} FII ${signedCr(d.fiiNetCr)}, DII ${signedCr(d.diiNetCr)}`).join("; ")} (₹ crore)`}>
      <div className="relative h-40 pl-10">
        {ticks.map((t) => (
          <div key={t} aria-hidden="true" className="absolute left-0 right-0" style={{ top: `${y(t)}%` }}>
            <span className="absolute left-0 w-8 -translate-y-1/2 text-right font-mono text-[10px] text-ink-soft">{tickLabel(t)}</span>
            <span className={"absolute left-10 right-0 border-t " + (t === 0 ? "border-ink-soft/50" : "border-line/60")} />
          </div>
        ))}
        <div aria-hidden="true" className="relative flex h-full">
          {days.map((d, i) => (
            <div key={d.day.toISOString()} className="relative flex-1">
              {[
                { v: d.fiiNetCr, side: "right-1/2 mr-px", color: "bg-fii" },
                { v: d.diiNetCr, side: "left-1/2 ml-px", color: "bg-dii" },
              ].map((b, j) => (
                <span
                  key={j}
                  className={"absolute w-[min(14px,30%)] rounded-[2px] " + b.side + " " + b.color + (i === days.length - 1 ? "" : " opacity-75")}
                  style={{ top: `${Math.min(y(b.v), 50)}%`, height: `max(1px, ${Math.abs(y(b.v) - 50)}%)` }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div aria-hidden="true" className="mt-1 flex pl-10">
        {days.map((d) => (
          <span key={d.day.toISOString()} className="flex-1 text-center font-mono text-[10px] text-ink-soft">
            {d.day.getUTCDate()}
          </span>
        ))}
      </div>
      <div aria-hidden="true" className="mt-1.5 flex gap-4 text-[11px] text-ink-soft">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-fii" />
          FII net
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-dii" />
          DII net
        </span>
      </div>
    </div>
  );
}

const fmt = (d: Date) => `${d.getUTCDate()} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getUTCMonth()]}`;
