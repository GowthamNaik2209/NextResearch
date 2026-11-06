import { InfoTip } from "@/components/InfoTip";
import { MethodLink } from "./MethodLink";
import { BAND_LABEL, bandOf, PE_NOTE, versus, type PeContext } from "@/lib/valuation/pe-context";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthYear = (iso: string) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;
const x = (v: number) => `${v.toFixed(1)}x`;

// "P/E in context": today's P/E on a bar of the stock's own past P/Es (the shaded middle half is its
// usual range, the tick its median) with the primary industry's median as a second tick. No hooks, so
// the company page renders it on the server and the pop-up inside its client tree.
export function PeContextView({ ctx, ticker, className = "" }: { ctx: PeContext; /** Links the "i" note to this stock's worked example; left out on the method page itself. */ ticker?: string; className?: string }) {
  const { pe, history: h, industry: ind } = ctx;
  if (pe == null || (!h && !ind)) return null;
  const vals = [pe, ...(h ? [h.p10, h.p90] : []), ...(ind ? [ind.median] : [])];
  const lo = Math.min(...vals) * 0.9;
  const hi = Math.max(...vals) * 1.1;
  const at = (v: number) => `${((Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo)) * 100}%`;
  return (
    <div className={className}>
      <div className="flex items-center gap-1.5">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">P/E in context</div>
        <InfoTip label="About P/E in context">
          {PE_NOTE}
          {ticker && <MethodLink ticker={ticker} />}
        </InfoTip>
      </div>
      <div className="relative mt-3 h-2 rounded-full bg-line" role="img" aria-label={`P/E ${x(pe)}${h ? `, its usual range ${x(h.p25)} to ${x(h.p75)}` : ""}${ind ? `, industry median ${x(ind.median)}` : ""}`}>
        {h && <div className="absolute inset-y-0 rounded-full bg-accent/35" style={{ left: at(h.p25), right: `calc(100% - ${at(h.p75)})` }} />}
        {h && <div className="absolute -top-1 h-4 w-0.5 -translate-x-1/2 bg-ink-soft" style={{ left: at(h.median) }} />}
        {ind && <div className="absolute -top-1 h-4 w-0.5 -translate-x-1/2 border-l-2 border-dotted border-ink" style={{ left: at(ind.median) }} />}
        <div className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-panel bg-accent ring-1 ring-line" style={{ left: at(pe) }} />
      </div>
      <ul className="mt-2.5 space-y-1 text-xs leading-snug text-ink">
        {h && (
          <li>
            <span className="font-semibold">{BAND_LABEL[bandOf(pe, h)]}</span>
            <span className="text-ink-soft">
              {" "}
              · P/E {x(pe)} is {versus(pe, h.median)} its own median of {x(h.median)} since {monthYear(h.from)} (usual {x(h.p25)}–{x(h.p75)})
            </span>
          </li>
        )}
        {ind && (
          <li className="text-ink-soft">
            {h ? "It" : `P/E ${x(pe)}`} is {versus(pe, ind.median)} the median of {ind.n} covered {ind.name} stocks ({x(ind.median)})
          </li>
        )}
      </ul>
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-ink-soft">
        <span><span aria-hidden className="mr-1 inline-block h-2 w-2 rounded-full bg-accent align-middle" />Today</span>
        {h && <span><span aria-hidden className="mr-1 inline-block h-2 w-3 rounded-sm bg-accent/35 align-middle" />Usual range</span>}
        {h && <span><span aria-hidden className="mr-1 inline-block h-2.5 w-0.5 bg-ink-soft align-middle" />Own median</span>}
        {ind && <span><span aria-hidden className="mr-1 inline-block h-2.5 border-l-2 border-dotted border-ink align-middle" />Industry median</span>}
      </div>
    </div>
  );
}
