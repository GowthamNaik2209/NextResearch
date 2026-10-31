import type { CashBar, CashGrain } from "@/lib/flows/query";
import { fmtDay, inr } from "@/lib/format";
import { signedCr } from "./format";

// Round scale tops (₹ crore), so the gridlines land on readable numbers.
const STEPS = [500, 1000, 2000, 2500, 5000, 7500, 10_000, 15_000, 20_000, 25_000, 30_000, 40_000, 50_000, 75_000, 100_000, 150_000, 200_000, 250_000, 500_000];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
// Labels under the bars: this many, evenly spaced back from the latest; on a phone every other one
// is hidden so they never run into each other.
const LABELS = 8;

const tickLabel = (v: number) => {
  if (v === 0) return "0";
  const a = Math.abs(v);
  return `${v > 0 ? "+" : "−"}${a >= 100_000 ? `${a / 100_000}L` : a >= 1000 ? `${a / 1000}k` : inr(a)}`;
};

/** A bar's label: its day ("30"), its week ("26 Oct"), or over many weeks its month and year ("Oct ’24"). */
function barLabel(b: CashBar, grain: CashGrain, many: boolean): string {
  const d = b.start;
  if (grain === "day") return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
  return many ? `${MONTHS[d.getUTCMonth()]} ’${String(d.getUTCFullYear()).slice(2)}` : `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

const barName = (b: CashBar, grain: CashGrain) => (grain === "day" ? fmtDay(b.start) : `week of ${fmtDay(b.start)}`);

/**
 * Net FII and DII cash flows as paired bars around a zero line: one pair per weekday or week across the
 * whole period, a slot with nothing stored left empty.
 * Plain HTML laid out in percentages from one scale, so it fits any width without measuring the
 * screen; the latest bar is drawn at full strength.
 */
export function CashChart({ bars, grain }: { bars: CashBar[]; grain: CashGrain }) {
  const peak = Math.max(1, ...bars.flatMap((d) => [Math.abs(d.fiiNetCr), Math.abs(d.diiNetCr)]));
  const top = STEPS.find((s) => s >= peak * 1.05) ?? Math.ceil((peak * 1.05) / 100_000) * 100_000;
  const y = (v: number) => 50 - (v / top) * 50; // % from the top of the plot
  const ticks = [top, top / 2, 0, -top / 2, -top];
  const every = Math.max(1, Math.ceil(bars.length / LABELS));
  const labelled = bars.map((_, i) => i).filter((i) => (bars.length - 1 - i) % every === 0);

  return (
    <div role="img" aria-label={`Net buying by ${grain}, ₹ crore: ${bars.filter((b) => b.sessions).map((b) => `${barName(b, grain)} FII ${signedCr(b.fiiNetCr)}, DII ${signedCr(b.diiNetCr)}`).join("; ")}`}>
      <div className="relative h-44 pl-11">
        {ticks.map((t) => (
          <div key={t} aria-hidden="true" className="absolute left-0 right-0" style={{ top: `${y(t)}%` }}>
            <span className="absolute left-0 w-9 -translate-y-1/2 text-right font-mono text-[10px] text-ink-soft">{tickLabel(t)}</span>
            <span className={"absolute left-11 right-0 border-t " + (t === 0 ? "border-ink-soft/50" : "border-line/60")} />
          </div>
        ))}
        <div aria-hidden="true" className="relative flex h-full">
          {bars.map((d, i) => (
            <div key={d.start.toISOString()} title={d.sessions ? `${barName(d, grain)}: FII ${signedCr(d.fiiNetCr)}, DII ${signedCr(d.diiNetCr)} cr` : `${barName(d, grain)}: not stored`} className="relative flex-1">
              {d.sessions > 0 &&
                [
                  { v: d.fiiNetCr, side: "right-1/2 mr-px", color: "bg-fii" },
                  { v: d.diiNetCr, side: "left-1/2 ml-px", color: "bg-dii" },
                ].map((b, j) => (
                  <span
                    key={j}
                    className={"absolute w-[min(14px,40%)] rounded-[2px] " + b.side + " " + b.color + (i === bars.length - 1 ? "" : " opacity-75")}
                    style={{ top: `${Math.min(y(b.v), 50)}%`, height: `max(1px, ${Math.abs(y(b.v) - 50)}%)` }}
                  />
                ))}
            </div>
          ))}
        </div>
      </div>
      {/* Each label sits under its bar's centre (the very first bar's is left-aligned, so it clears the axis
          labels); the last one may reach into the card's padding, never past the screen. */}
      <div aria-hidden="true" className="relative mt-1 h-4 pl-11">
        <div className="relative h-full">
          {labelled.map((i, k) => {
            const edge = i === 0 ? "translate-x-0" : "-translate-x-1/2";
            const left = i === 0 ? 0 : ((i + 0.5) / bars.length) * 100;
            // Phones show every other label, always keeping the latest.
            const phone = (labelled.length - 1 - k) % 2 === 1 ? "max-sm:hidden" : "";
            return (
              <span key={i} className={"absolute top-0 whitespace-nowrap font-mono text-[10px] text-ink-soft " + edge + " " + phone} style={{ left: `${left}%` }}>
                {barLabel(bars[i], grain, bars.length > 30)}
              </span>
            );
          })}
        </div>
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
