"use client";

import { useEffect, useState } from "react";
import type { SectorDef } from "@/lib/sector-content";
import { tickerForSupplier } from "@/lib/sector-content";
import type { CompanyDetail } from "@/lib/companies";
import { WatchlistButton } from "./WatchlistButton";

type Props = {
  sector: SectorDef;
  supplierKey: string;
  zoneSuppliers: string[];
  onSelectSupplier: (key: string) => void;
};

const YEAR_LABEL = (year: number) => `FY${String(year).slice(2)}`;

export function SupplierDetail({ sector, supplierKey, zoneSuppliers, onSelectSupplier }: Props) {
  const supplier = sector.suppliers[supplierKey];
  const ticker = tickerForSupplier(supplier);

  const [detail, setDetail] = useState<CompanyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    // No reset of detail/loading/error here: the parent keys this component by
    // supplierKey (SectorExplorer.tsx), so a supplier change remounts it fresh
    // with the initial state above rather than reusing a stale instance.
    let cancelled = false;
    fetch(`/api/companies/${encodeURIComponent(ticker)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((data) => {
        if (!cancelled) setDetail(data.company);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ticker]);

  const hasNav = zoneSuppliers.length > 1;
  const curIdx = zoneSuppliers.indexOf(supplierKey);
  const goPrev = () => onSelectSupplier(zoneSuppliers[(curIdx - 1 + zoneSuppliers.length) % zoneSuppliers.length]);
  const goNext = () => onSelectSupplier(zoneSuppliers[(curIdx + 1) % zoneSuppliers.length]);

  return (
    <div className="supplier-detail">
      <div className="supplier-head">
        {hasNav && (
          <button className="nav-arrow" title="Previous supplier" onClick={goPrev}>
            &#8249;
          </button>
        )}
        <div className="supplier-head-title">
          <h3 style={{ fontSize: 14.5 }}>
            {supplier.name}
            {supplier.listed && (
              <>
                <span className="fine" style={{ fontWeight: 400 }}>
                  {" "}
                  ({ticker})
                </span>
                <WatchlistButton ticker={ticker} />
              </>
            )}
          </h3>
          <p className="fine" style={{ marginTop: 4 }}>
            {supplier.role}
          </p>
          {supplier.dataStatus && (
            <span className={"badge " + (supplier.dataStatus === "demo" ? "unlisted" : "listed")} style={{ marginTop: 6, display: "inline-block" }}>
              {supplier.dataStatus === "demo" ? "From publicly available information" : supplier.dataStatus.replace(/_/g, " ")}
            </span>
          )}
        </div>
        {hasNav && (
          <button className="nav-arrow" title="Next supplier" onClick={goNext}>
            &#8250;
          </button>
        )}
      </div>
      {supplier.risks && supplier.risks.length > 0 && (
        <div>
          <div className="chart-label">Risks</div>
          <ul className="unlisted-facts" style={{ marginTop: 4 }}>
            {supplier.risks.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      {!supplier.listed ? (
        <>
          <ul className="unlisted-facts">
            {(supplier.notes ?? []).map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
          <p className="source-line">Compiled from public reporting — not exchange-listed.</p>
        </>
      ) : loading ? (
        <p className="fine">Loading financials…</p>
      ) : error || !detail ? (
        <p className="fine">Couldn&rsquo;t load financials for this company right now.</p>
      ) : (
        <ListedSupplierDetail ticker={ticker} name={supplier.name} detail={detail} />
      )}
    </div>
  );
}

function ListedSupplierDetail({
  ticker,
  name,
  detail,
}: {
  ticker: string;
  name: string;
  detail: CompanyDetail;
}) {
  const kpi = detail.kpi;
  const revYears = detail.financials.filter((f) => f.revenueCr != null);
  const maxRev = Math.max(1, ...revYears.map((f) => f.revenueCr as number));

  return (
    <>
      {kpi && (
        <>
          <div className="chart-label">Key stats — seed snapshot, not live</div>
          <div className="kpi-chips">
            {[
              ["Mkt Cap", kpi.marketCap?.replace("Rs ", "") ?? "n/a"],
              ["Price", kpi.price != null ? `Rs ${kpi.price.toLocaleString("en-IN")}` : "n/a"],
              [
                "High/Low",
                kpi.high52w != null && kpi.low52w != null
                  ? `${kpi.high52w.toLocaleString("en-IN")} / ${kpi.low52w.toLocaleString("en-IN")}`
                  : "n/a",
              ],
              ["Stock P/E", kpi.pe ?? "n/a"],
              ["Book Value", kpi.bookValue ?? "n/a"],
              ["Div Yield", kpi.divYield != null ? `${kpi.divYield}%` : "n/a"],
              ["ROCE", kpi.roce != null ? `${kpi.roce}%` : "n/a"],
              ["ROE", kpi.roe != null ? `${kpi.roe}%` : "n/a"],
              ["Face Value", kpi.faceValue != null ? kpi.faceValue.toFixed(2) : "n/a"],
            ].map(([label, value]) => (
              <div className="kpi-chip" key={label}>
                <div className="label">{label}</div>
                <div className="value">{value}</div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="broker-links" style={{ marginTop: 2 }}>
        <a
          className="broker-link"
          href={`https://www.screener.in/company/${encodeURIComponent(detail.screenerSlug ?? ticker)}/consolidated/`}
          target="_blank"
          rel="noopener"
        >
          <span>View on Screener.in (consolidated financials)</span>
          <span className="arrow">-&gt;</span>
        </a>
        <a
          className="broker-link"
          href={`https://www.tradingview.com/chart/?symbol=NSE%3A${encodeURIComponent(ticker)}`}
          target="_blank"
          rel="noopener"
        >
          <span>View chart on TradingView</span>
          <span className="arrow">-&gt;</span>
        </a>
      </div>

      {revYears.length > 0 && (
        <>
          <div className="chart-label">Revenue, Rs Cr (5-yr)</div>
          <svg className="bars" viewBox="0 0 300 100">
            {detail.financials.map((f, i) => {
              const bw = 44,
                gap = 14,
                baseY = 76;
              const x = 8 + i * (bw + gap);
              if (f.revenueCr == null) {
                return (
                  <g key={f.year}>
                    <text className="bar-label" x={x + bw / 2} y={baseY + 14} textAnchor="middle">
                      {YEAR_LABEL(f.year)}
                    </text>
                    <text className="bar-value" x={x + bw / 2} y={baseY - 4} textAnchor="middle">
                      n/a
                    </text>
                  </g>
                );
              }
              const h = Math.max(3, (f.revenueCr / maxRev) * 58);
              const isLast = i === detail.financials.length - 1;
              return (
                <g key={f.year}>
                  <rect className={"bar" + (isLast ? " current" : "")} x={x} y={baseY - h} width={bw} height={h} rx={3} />
                  <text className="bar-label" x={x + bw / 2} y={baseY + 14} textAnchor="middle">
                    {YEAR_LABEL(f.year)}
                  </text>
                  <text className="bar-value" x={x + bw / 2} y={baseY - h - 5} textAnchor="middle">
                    {f.revenueCr.toLocaleString("en-IN")}
                  </text>
                </g>
              );
            })}
          </svg>
        </>
      )}

      {kpi && (kpi.cagr1y != null || kpi.cagr3y != null || kpi.cagr5y != null) && (
        <>
          <div className="chart-label">Stock price CAGR</div>
          <div className="cagr-row">
            {[
              ["1Y", kpi.cagr1y],
              ["3Y", kpi.cagr3y],
              ["5Y", kpi.cagr5y],
            ].map(([label, v]) => {
              const val = v as number | null;
              const valTxt = val == null ? "n/a" : `${val > 0 ? "+" : ""}${val}%`;
              const cls = val == null ? "" : val >= 0 ? "pos" : "neg";
              return (
                <div className="cagr-tile" key={label as string}>
                  <div className="label">{label}</div>
                  <div className={`value ${cls}`}>{valTxt}</div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {kpi && kpi.low52w != null && kpi.high52w != null && kpi.price != null && (
        <>
          <div className="chart-label">52-week range vs current price</div>
          <div className="range-wrap">
            <div className="range-track">
              <div
                className="range-dot"
                style={{
                  left: `${
                    kpi.high52w > kpi.low52w
                      ? Math.max(0, Math.min(1, (kpi.price - kpi.low52w) / (kpi.high52w - kpi.low52w))) * 100
                      : 50
                  }%`,
                }}
              />
            </div>
            <div className="range-labels">
              <span>Rs {kpi.low52w.toLocaleString("en-IN")}</span>
              <span>Rs {kpi.price.toLocaleString("en-IN")}</span>
              <span>Rs {kpi.high52w.toLocaleString("en-IN")}</span>
            </div>
          </div>
        </>
      )}

      {detail.externalId && detail.screenerSlug && (
        <>
          <div className="chart-label">Broker &amp; analyst reports</div>
          <div className="broker-links">
            <a
              className="broker-link"
              href={`https://trendlyne.com/research-reports/stock/${detail.externalId}/${encodeURIComponent(
                ticker
              )}/${detail.screenerSlug}/`}
              target="_blank"
              rel="noopener"
            >
              <span>All broker/research reports</span>
              <span className="arrow">-&gt;</span>
            </a>
            <a
              className="broker-link"
              href={`https://trendlyne.com/equity/consensus-estimates/${detail.externalId}/${encodeURIComponent(
                ticker
              )}/${detail.screenerSlug}/`}
              target="_blank"
              rel="noopener"
            >
              <span>Analyst ratings &amp; target price consensus</span>
              <span className="arrow">-&gt;</span>
            </a>
          </div>
          <p className="fine">Via Trendlyne — aggregated brokerage/analyst coverage, not our own view.</p>
        </>
      )}

      <div>
        <div className="chart-label">Recent news coverage</div>
        {detail.news.length > 0 && (
          <div className="news-items">
            {detail.news.map((item, i) => (
              <div className="news-item" key={i}>
                <a href={item.url} target="_blank" rel="noopener">
                  {item.headline}
                </a>
                <div className="news-meta">
                  {item.source} · {item.date}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="broker-links" style={{ marginTop: detail.news.length > 0 ? 8 : 2 }}>
          <a
            className="broker-link"
            href={`https://news.google.com/search?q=${encodeURIComponent(name + " share")}&hl=en-IN&gl=IN&ceid=IN:en`}
            target="_blank"
            rel="noopener"
          >
            <span>More coverage on Google News</span>
            <span className="arrow">-&gt;</span>
          </a>
          {detail.externalId && detail.screenerSlug && (
            <a
              className="broker-link"
              href={`https://trendlyne.com/latest-news/${detail.externalId}/${encodeURIComponent(ticker)}/${detail.screenerSlug}/`}
              target="_blank"
              rel="noopener"
            >
              <span>Latest news &amp; announcements (Trendlyne)</span>
              <span className="arrow">-&gt;</span>
            </a>
          )}
          <a
            className="broker-link"
            href={`https://www.nseindia.com/get-quotes/equity?symbol=${encodeURIComponent(ticker)}`}
            target="_blank"
            rel="noopener"
          >
            <span>Exchange filings &amp; announcements (NSE)</span>
            <span className="arrow">-&gt;</span>
          </a>
        </div>
      </div>

      {kpi?.note && <p className="fine">Note: {kpi.note}</p>}
      <p className="source-line">
        As of {kpi ? new Date(kpi.asOf).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"} ·{" "}
        <b>Screener.in (consolidated)</b>
      </p>
      {/* "Open full research page" (/company/[ticker]) comes back once that page
          exists — Step 3. Linking to it now would just 404. */}
    </>
  );
}
