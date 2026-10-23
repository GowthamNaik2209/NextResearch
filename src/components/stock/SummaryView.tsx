import Link from "next/link";
import { EXPOSURE_STRENGTH_LABEL, EXPOSURE_TYPE_LABEL, type SectorSupplier } from "@/lib/sector-content/core";
import type { StockApi, StockTab } from "./types";
import { fmtNum, fmtSigned, fmtYield, freshQuote, mergeStats, pctTone, REIT_NOTE, revenueSeries } from "./merge";
import { croreShort, inr, NA, pct } from "@/lib/format";
import { NewsTime } from "./NewsTime";
import { quoteTiming } from "@/lib/live/freshness";

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
      className="flex items-center justify-between gap-2 rounded-lg border border-line bg-panel-2 px-3 py-2 text-xs text-ink transition-colors hover:border-accent pointer-coarse:min-h-9"
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
  compact,
}: {
  ticker: string;
  supplier: SectorSupplier;
  api: StockApi | null;
  loading: boolean;
  showNarrative?: boolean;
  onOpenTab?: (tab: StockTab) => void;
  // Inline side-panel use: on phones keep only the headline stats (the tabs hold the rest).
  compact?: boolean;
}) {
  const phoneHide = compact ? " max-[700px]:hidden" : "";
  const f = supplier.f;
  const s = mergeStats(f, api);
  const quote = freshQuote(api?.quote);
  // REITs: P/E, ROE and dividend yield are shown as "n/m" (not meaningful) with REIT_NOTE below.
  const nm = (v: string) => (s.reit ? "n/m" : v);
  const rev = revenueSeries(f);
  const asOf = s.asOf ? `as of ${s.asOf}` : "snapshot";
  const maxRev = Math.max(1, ...rev.map((r) => r.revenue ?? 0));
  const tl = f?.tl;

  // [label, value, optional] - optional chips are hidden on phones to save space. No snapshot
  // "Price" tile: beside the live price in the header it read as a second, conflicting price. The
  // 52-week range takes two lines (high over low) so it fits the narrow explorer card at any width.
  const chips: [string, React.ReactNode, boolean?][] = [
    ["Mkt Cap", croreShort(s.marketCapCr)],
    [
      "52W High / Low",
      s.high52w != null && s.low52w != null ? (
        <>
          <span className="block">₹{inr(s.high52w)}</span>
          <span className="block font-normal text-ink-soft">₹{inr(s.low52w)}</span>
        </>
      ) : (
        NA
      ),
      true,
    ],
    ["Stock P/E", nm(s.pe != null ? `${s.pe.toFixed(1)}x` : NA)],
    ["Book Value", s.bookValue != null ? `₹${fmtNum(s.bookValue, 1)}` : NA, true],
    ["Div Yield", nm(fmtYield(s.divYield))],
    ["ROCE", pct(s.roce)],
    ["ROE", nm(pct(s.roe))],
    ["Face Value", s.faceValue != null ? `₹${fmtNum(s.faceValue, 2)}` : NA, true],
  ];

  return (
    <div className="flex flex-col gap-4">
      {showNarrative && supplier.strengths && supplier.strengths.length > 0 && <BulletList title="Strengths" items={supplier.strengths} />}
      {showNarrative && supplier.risks && supplier.risks.length > 0 && <BulletList title="Risks" items={supplier.risks} />}

      <div>
        <Label>
          Key stats <span className="font-normal normal-case tracking-normal">— company snapshot {asOf}</span>
        </Label>
        {/* The explorer's side panel is ~400px wide at any viewport, so it keeps three columns. */}
        <div className={"mt-2 grid grid-cols-3 gap-1.5" + (compact ? "" : " sm:grid-cols-5")}>
          {chips.map(([k, v, opt]) => (
            <div key={k} className={"rounded-lg border border-line bg-panel-2 px-2.5 py-2" + (opt ? " max-[640px]:hidden" : "")}>
              <div className="text-[9px] uppercase tracking-wide text-ink-soft">{k}</div>
              <div className={"mt-0.5 font-mono text-[13px] font-semibold leading-snug break-words " + (v === "n/m" ? "text-ink-soft" : "text-ink")} title={v === "n/m" ? "Not meaningful for a REIT" : undefined}>
                {v}
              </div>
            </div>
          ))}
        </div>
        {s.reit && <p className="mt-2 text-[11px] leading-snug text-ink-soft">n/m = not meaningful for a REIT. {REIT_NOTE}</p>}
      </div>

      {(api?.footprint?.sectors.length ?? 0) > 1 && (
        <div>
          {/* The pop-up doesn't know which sector page opened it, so count and list all of them
              (an "N other" heading over a list that included the current sector disagreed). */}
          <Label>Appears in {api!.footprint!.sectors.length} supply chains</Label>
          <ul className="mt-2 flex flex-col gap-1.5">
            {api!.footprint!.sectors.map((fs) => (
              <li key={fs.sectorSlug}>
                <Link href={fs.href} className="block rounded-lg border border-line bg-panel-2 px-3 py-2 transition-colors hover:border-accent">
                  <div className="text-[12.5px] font-semibold text-ink">{fs.sectorName}</div>
                  <div className="mt-0.5 text-[11px] leading-snug text-ink-soft">
                    {fs.zones
                      .map((z) => {
                        const t = z.exposureType ? EXPOSURE_TYPE_LABEL[z.exposureType] : null;
                        const st = z.exposureStrength ? EXPOSURE_STRENGTH_LABEL[z.exposureStrength].toLowerCase() : null;
                        return `${z.label}${t || st ? ` (${[t, st && `${st} exposure`].filter(Boolean).join(", ")})` : ""}`;
                      })
                      .join(" · ")}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {rev.some((r) => r.revenue != null) && (
        <div className={phoneHide.trim()}>
          <Label>
            Revenue, ₹ Cr (5-yr) <span className="font-normal normal-case tracking-normal">— company table</span>
          </Label>
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
        <div className={phoneHide.trim()}>
          <Label>
            Stock price return <span className="font-normal normal-case tracking-normal">· {asOf}</span>
          </Label>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {(
              [
                // Dated company-table figures; the Chart tab's "Past 1Y, live" move is from live prices.
                ["1Y price return", s.cagr1y],
                ["3Y CAGR", s.cagr3y],
                ["5Y CAGR", s.cagr5y],
              ] as const
            ).map(([k, v]) => (
              <div key={k} className="rounded-lg border border-line bg-panel-2 px-2 py-2.5 text-center">
                <div className="text-[9.5px] uppercase tracking-wide text-ink-soft">{k}</div>
                <div className={"mt-1 font-mono text-base font-bold " + pctTone(v, 1)}>
                  {fmtSigned(v, 1)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {s.low52w != null && s.high52w != null && s.price != null && (
        <div className={phoneHide.trim()}>
          <Label>
            52-week range {asOf} vs {s.liveQuote ? <span className="text-pos">live</span> : "snapshot"} price
          </Label>
          <div className="relative mt-3 h-2 rounded-full bg-gradient-to-r from-danger/50 via-line to-pos/50">
            <div
              className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-panel bg-accent ring-1 ring-line"
              style={{ left: `${s.high52w > s.low52w ? Math.max(0, Math.min(1, (s.price - s.low52w) / (s.high52w - s.low52w))) * 100 : 50}%` }}
            />
          </div>
          <div className="mt-1.5 flex justify-between font-mono text-[10px] text-ink-soft">
            <span>₹{inr(s.low52w)}</span>
            <span>₹{inr(s.price)}</span>
            <span>₹{inr(s.high52w)}</span>
          </div>
        </div>
      )}

      {loading && !api && (
        <div className={phoneHide.trim()} aria-busy="true">
          <Label>Recent news</Label>
          <div className="mt-2 flex flex-col gap-1.5">
            {[0, 1].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg border border-line bg-panel-2" />
            ))}
          </div>
        </div>
      )}

      {(api?.news.length ?? 0) > 0 && (
        <div className={phoneHide.trim()}>
          <Label>Recent news</Label>
          <ul className="mt-2 flex flex-col gap-1.5">
            {api!.news.slice(0, 3).map((n) => (
              // The whole card is the link's tap area (the headline alone is one 17px line).
              <li key={n.url + n.headline} className="relative rounded-lg border border-line bg-panel-2 px-3 py-2">
                <a href={n.url} target="_blank" rel="noopener noreferrer" className="text-[12.5px] font-semibold leading-snug text-ink after:absolute after:inset-0 after:content-[''] hover:text-accent">
                  {n.headline}
                </a>
                <div className="mt-0.5 font-mono text-[10.5px] text-ink-soft">
                  {n.source} · <NewsTime label={n.date} ts={n.ts} />
                </div>
              </li>
            ))}
          </ul>
          {onOpenTab && (
            <button type="button" onClick={() => onOpenTab("news")} className="tap-y mt-2 text-xs font-semibold text-accent hover:underline">
              All news &amp; links &rarr;
            </button>
          )}
        </div>
      )}

      <div className={"flex flex-col gap-1.5" + phoneHide}>
        {api?.fundamentals?.basis === "standalone" ? (
          <ExtLink href={`https://www.screener.in/company/${encodeURIComponent(ticker)}/`}>View on Screener.in (standalone financials)</ExtLink>
        ) : (
          <ExtLink href={`https://www.screener.in/company/${encodeURIComponent(ticker)}/consolidated/`}>View on Screener.in (consolidated financials)</ExtLink>
        )}
        {tl && (
          <>
            <ExtLink href={`https://trendlyne.com/research-reports/stock/${tl[0]}/${encodeURIComponent(ticker)}/${tl[1]}/`}>All broker / research reports (Trendlyne)</ExtLink>
            <ExtLink href={`https://trendlyne.com/equity/consensus-estimates/${tl[0]}/${encodeURIComponent(ticker)}/${tl[1]}/`}>Analyst ratings &amp; target price consensus</ExtLink>
          </>
        )}
      </div>
      {f?.note && <p className={"text-[11px] text-ink-soft" + phoneHide}>Note: {f.note}</p>}
      <p className={"border-t border-dashed border-line pt-2 text-[10.5px] text-ink-soft" + phoneHide}>
        Market cap, ratios, CAGR and revenue: company table snapshot {asOf} (the same figures on every page). Price:{" "}
        {quote ? (
          <>
            <span className="text-pos">live</span>, Yahoo Finance ({quote.exchange}), {quoteTiming(quote)}
          </>
        ) : (
          `snapshot ${asOf}`
        )}
        . Not investment advice.
      </p>
    </div>
  );
}
