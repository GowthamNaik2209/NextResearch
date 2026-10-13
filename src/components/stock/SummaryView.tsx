import type { SectorSupplier } from "@/lib/sector-content";
import type { StaticFin, StockApi, StockTab } from "./types";
import { fmtNum, fmtSigned, mergeStats, revenueSeries } from "./merge";

const Label = ({ children }: { children: React.ReactNode }) => (
  <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">{children}</div>
);

function BulletList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <Label>{title}</Label>
      <ul className="mt-1.5 list-disc space-y-1.5 pl-4 text-[13px] leading-relaxed text-ink">
        {items.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
    </div>
  );
}

export function ExtLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between gap-2 rounded-lg border border-line bg-panel-2 px-3 py-2 text-xs text-ink transition-colors hover:border-accent"
    >
      <span>{children}</span>
      <span className="font-mono text-accent">&rarr;</span>
    </a>
  );
}

// The company "Summary": key stats, revenue trend, price CAGR, 52-week range and
// research links. Used both inline in the explorer's side panel and as the
// pop-up's Summary tab (`showNarrative` adds the strengths/risks the panel
// already renders above its tab strip).
export function SummaryView({
  ticker,
  supplier,
  api,
  loading,
  showNarrative,
  onOpenTab,
}: {
  ticker: string;
  supplier: SectorSupplier;
  api: StockApi | null;
  loading: boolean;
  showNarrative?: boolean;
  onOpenTab?: (tab: StockTab) => void;
}) {
  const f = supplier.f as unknown as StaticFin | undefined;
  const s = mergeStats(f, api);
  const rev = revenueSeries(f, api);
  const maxRev = Math.max(1, ...rev.map((r) => r.revenue ?? 0));
  const tl = f?.tl;

  const chips: [string, string][] = [
    ["Mkt Cap", s.marketCap?.replace("Rs ", "₹") ?? "—"],
    ["Price", s.price != null ? `₹${fmtNum(s.price)}` : "—"],
    ["High / Low", s.high52w != null && s.low52w != null ? `${fmtNum(s.high52w, 0)} / ${fmtNum(s.low52w, 0)}` : "—"],
    ["Stock P/E", fmtNum(s.pe, 1)],
    ["Book Value", fmtNum(s.bookValue, 1)],
    ["Div Yield", s.divYield != null ? `${s.divYield}%` : "—"],
    ["ROCE", s.roce != null ? `${s.roce}%` : "—"],
    ["ROE", s.roe != null ? `${s.roe}%` : "—"],
    ["Face Value", fmtNum(s.faceValue, 2)],
  ];

  return (
    <div className="flex flex-col gap-4">
      {showNarrative && supplier.strengths && supplier.strengths.length > 0 && <BulletList title="Strengths" items={supplier.strengths} />}
      {showNarrative && supplier.risks && supplier.risks.length > 0 && <BulletList title="Risks" items={supplier.risks} />}

      <div>
        <Label>
          Key stats —{" "}
          {s.liveScreener ? (
            <span className="text-pos">live · Screener.in{s.liveQuote ? " & Yahoo Finance" : ""}</span>
          ) : s.liveQuote ? (
            <span>
              price <span className="text-pos">live</span> · ratios cached (Screener.in unreachable right now)
            </span>
          ) : loading ? (
            "fetching live data…"
          ) : (
            "cached figures (live data unavailable right now)"
          )}
        </Label>
        <div className="mt-2 grid grid-cols-3 gap-1.5 sm:grid-cols-5">
          {chips.map(([k, v]) => (
            <div key={k} className="rounded-lg border border-line bg-panel-2 px-2.5 py-2">
              <div className="text-[9px] uppercase tracking-wide text-ink-soft">{k}</div>
              <div className="mt-0.5 font-mono text-[13px] font-semibold text-ink">{v}</div>
            </div>
          ))}
        </div>
      </div>

      {rev.some((r) => r.revenue != null) && (
        <div>
          <Label>Revenue, ₹ Cr (5-yr)</Label>
          <div className="mt-2 flex h-28 items-end gap-2">
            {rev.map((r, i) => (
              <div key={r.label} className="flex flex-1 flex-col items-center justify-end gap-1">
                <span className="font-mono text-[9px] font-semibold text-ink">{r.revenue != null ? fmtNum(r.revenue, 0) : "n/a"}</span>
                <div
                  className={"w-full rounded-t " + (i === rev.length - 1 ? "bg-amber" : "bg-accent")}
                  style={{ height: `${r.revenue != null ? Math.max(4, (r.revenue / maxRev) * 72) : 4}px` }}
                />
                <span className="font-mono text-[9px] text-ink-soft">{r.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {(s.cagr1y != null || s.cagr3y != null || s.cagr5y != null) && (
        <div>
          <Label>Stock price CAGR</Label>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {(
              [
                ["1Y", s.cagr1y],
                ["3Y", s.cagr3y],
                ["5Y", s.cagr5y],
              ] as const
            ).map(([k, v]) => (
              <div key={k} className="rounded-lg border border-line bg-panel-2 px-2 py-2.5 text-center">
                <div className="text-[9.5px] uppercase tracking-wide text-ink-soft">{k}</div>
                <div className={"mt-1 font-mono text-base font-bold " + (v == null ? "text-ink-soft" : v >= 0 ? "text-pos" : "text-danger")}>
                  {fmtSigned(v, 1)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {s.low52w != null && s.high52w != null && s.price != null && (
        <div>
          <Label>52-week range vs current price</Label>
          <div className="relative mt-3 h-2 rounded-full bg-gradient-to-r from-danger/50 via-line to-pos/50">
            <div
              className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-panel bg-accent ring-1 ring-line"
              style={{ left: `${s.high52w > s.low52w ? Math.max(0, Math.min(1, (s.price - s.low52w) / (s.high52w - s.low52w))) * 100 : 50}%` }}
            />
          </div>
          <div className="mt-1.5 flex justify-between font-mono text-[10px] text-ink-soft">
            <span>₹{fmtNum(s.low52w, 0)}</span>
            <span>₹{fmtNum(s.price, 0)}</span>
            <span>₹{fmtNum(s.high52w, 0)}</span>
          </div>
        </div>
      )}

      {(api?.news.length ?? 0) > 0 && (
        <div>
          <Label>Recent news</Label>
          <ul className="mt-2 flex flex-col gap-1.5">
            {api!.news.slice(0, 3).map((n) => (
              <li key={n.url + n.headline} className="rounded-lg border border-line bg-panel-2 px-3 py-2">
                <a href={n.url} target="_blank" rel="noopener noreferrer" className="text-[12.5px] font-semibold leading-snug text-ink hover:text-accent">
                  {n.headline}
                </a>
                <div className="mt-0.5 font-mono text-[10.5px] text-ink-soft">
                  {n.source} · {n.date}
                </div>
              </li>
            ))}
          </ul>
          {onOpenTab && (
            <button type="button" onClick={() => onOpenTab("news")} className="mt-2 text-xs font-semibold text-accent hover:underline">
              All news &amp; links &rarr;
            </button>
          )}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <ExtLink href={`https://www.screener.in/company/${encodeURIComponent(ticker)}/consolidated/`}>View on Screener.in (consolidated financials)</ExtLink>
        {tl && (
          <>
            <ExtLink href={`https://trendlyne.com/research-reports/stock/${tl[0]}/${encodeURIComponent(ticker)}/${tl[1]}/`}>All broker / research reports (Trendlyne)</ExtLink>
            <ExtLink href={`https://trendlyne.com/equity/consensus-estimates/${tl[0]}/${encodeURIComponent(ticker)}/${tl[1]}/`}>Analyst ratings &amp; target price consensus</ExtLink>
          </>
        )}
      </div>
      {f?.note && <p className="text-[11px] text-ink-soft">Note: {f.note}</p>}
      <p className="border-t border-dashed border-line pt-2 text-[10.5px] text-ink-soft">
        Ratios: <b>Screener.in (consolidated)</b>, {s.liveScreener ? "live" : "cached"}. Price: {s.liveQuote ? "Yahoo Finance, live" : "cached"}. Not investment advice.
      </p>
    </div>
  );
}
