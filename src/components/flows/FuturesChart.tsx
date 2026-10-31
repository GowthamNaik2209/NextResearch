import type { FuturesPoint } from "@/lib/flows/query";
import { fmtDay } from "@/lib/format";

/**
 * The FII long share of index futures across the period, 0-100% with the 50% line marked (above it
 * they are net long). An SVG stretched to the box's width; the line keeps its thickness.
 */
export function FuturesChart({ points }: { points: FuturesPoint[] }) {
  if (points.length < 2) return null;
  const n = points.length - 1;
  const xy = points.map((p, i) => `${(i / n) * 100},${100 - p.longPct}`).join(" ");
  const last = points[points.length - 1];
  return (
    <div className="mt-3">
      <div className="relative h-24 pl-8">
        {[100, 50, 0].map((t) => (
          <span key={t} aria-hidden="true" className="absolute left-0 w-6 -translate-y-1/2 text-right font-mono text-[10px] text-ink-soft" style={{ top: `${100 - t}%` }}>
            {t}%
          </span>
        ))}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={`FII long share from ${Math.round(points[0].longPct)}% on ${fmtDay(points[0].day)} to ${Math.round(last.longPct)}% on ${fmtDay(last.day)}`} className="h-full w-full overflow-visible">
          <line x1="0" x2="100" y1="50" y2="50" className="stroke-ink-soft/50" strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />
          <line x1="0" x2="100" y1="0" y2="0" className="stroke-line" vectorEffect="non-scaling-stroke" />
          <line x1="0" x2="100" y1="100" y2="100" className="stroke-line" vectorEffect="non-scaling-stroke" />
          <polyline points={xy} fill="none" className="stroke-fii" strokeWidth="1.75" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
      <div aria-hidden="true" className="mt-1 flex justify-between pl-8 font-mono text-[10px] text-ink-soft">
        <span>{fmtDay(points[0].day)}</span>
        <span>{fmtDay(last.day)}</span>
      </div>
    </div>
  );
}
