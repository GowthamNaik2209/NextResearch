import type { SectorSupplier } from "@/lib/sector-content";
import type { StockApi } from "./types";
import { fmtNum, fmtSigned, fmtYield, mergeStats, REIT_NOTE } from "./merge";
import { croreShort, NA, pct, sep } from "@/lib/format";

type Row = { label: string; company: number | null; industry: number | null; unit: string; better: "low" | "high" | null; digits?: number };

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section>
    <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-ink-soft">{title}</h3>
    {children}
  </section>
);

function verdict(r: Row): "better" | "worse" | null {
  if (!r.better || r.company == null || r.industry == null || r.company === r.industry) return null;
  return (r.better === "low" ? r.company < r.industry : r.company > r.industry) ? "better" : "worse";
}

// Percentages with the site's typographic minus; multiples with "x"; crore with Indian grouping.
const fmtRow = (v: number | null, r: Row) =>
  v == null ? NA : r.label === "Market cap" ? croreShort(v) : r.label === "Dividend yield" ? fmtYield(v) : r.unit === "%" ? pct(v, r.digits ?? 1) : `${fmtNum(v, r.digits ?? 1)}${r.unit}`;

const SH_COLORS = ["bg-accent", "bg-amber", "bg-pos", "bg-danger", "bg-ink-soft"];

const fmtFetched = (iso: string) =>
  !Number.isFinite(Date.parse(iso)) ? "recently" : sep(new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })) + " IST";

export function FundamentalsView({ supplier, api, loading }: { supplier: SectorSupplier; api: StockApi | null; loading: boolean }) {
  const fund = api?.fundamentals ?? null;
  const f = supplier.f;
  const s = mergeStats(f, api);
  const ind = fund?.industry ?? null;
  const self = ind?.self ?? null;
  const med = ind?.median ?? null;
  const cls = fund?.classification;
  // Snapshot price over snapshot book value: the same dated figures as the company page.
  const pb = s.snapshotPrice != null && s.bookValue ? s.snapshotPrice / s.bookValue : null;
  const asOf = s.asOf ? `as of ${s.asOf}` : "snapshot";

  const rows: Row[] = [
    { label: "P/E (TTM)", company: s.pe, industry: med?.pe ?? null, unit: "x", better: "low", digits: 1 },
    { label: "P/B", company: pb, industry: null, unit: "x", better: "low", digits: 2 },
    { label: "ROE", company: s.roe, industry: null, unit: "%", better: "high", digits: 1 },
    { label: "ROCE", company: s.roce, industry: med?.roce ?? null, unit: "%", better: "high", digits: 1 },
    { label: "Dividend yield", company: s.divYield, industry: med?.divYield ?? null, unit: "%", better: "high", digits: 2 },
    // Not in the company table: these two come from Screener live (the footnote says so).
    { label: "Qtr sales growth (YoY)*", company: self?.qtrSalesVarPct ?? null, industry: med?.qtrSalesVarPct ?? null, unit: "%", better: "high", digits: 1 },
    { label: "Qtr profit growth (YoY)*", company: self?.qtrProfitVarPct ?? null, industry: med?.qtrProfitVarPct ?? null, unit: "%", better: "high", digits: 1 },
    { label: "Market cap", company: s.marketCapCr, industry: med?.marketCapCr ?? null, unit: "", better: null, digits: 0 },
  ];
  // REITs: P/E, ROE and dividend yield are equity-company ratios that misread a trust (see
  // REIT_NOTE) - drop them rather than print a "0.05% yield" or a 168x P/E.
  const REIT_HIDDEN = new Set(["P/E (TTM)", "ROE", "Dividend yield"]);
  const hasLiveRows = rows.some((r) => r.label.endsWith("*") && r.company != null);
  const shown = rows.filter((r) => (r.company != null || r.industry != null) && !(s.reit && REIT_HIDDEN.has(r.label)));
  const hasIndustry = shown.some((r) => r.industry != null);
  // Belt and braces over the parser: never render a growth row without a number ("10 Years: %"),
  // a growth card with no rows, or an annual table with no years / all-blank rows.
  // Stock price CAGR is a company-table figure (Summary shows it): Screener's live card is
  // replaced by the same dated snapshot, so one label never shows two values in one pop-up.
  const priceCagr = {
    title: "Stock price return",
    snapshot: true,
    rows: (
      [
        ["1 Year price return", s.cagr1y],
        ["3 Years CAGR", s.cagr3y],
        ["5 Years CAGR", s.cagr5y],
      ] as const
    )
      .filter(([, v]) => v != null)
      .map(([period, v]) => ({ period, value: fmtSigned(v, 1) })),
  };
  const growth = [
    ...(fund?.growth ?? [])
      .filter((g) => !/price/i.test(g.title) && !(s.reit && /return on equity/i.test(g.title)))
      .map((g) => ({ title: g.title.replace(/^Compounded /, ""), snapshot: false, rows: g.rows.filter((r) => /\d/.test(r.value)).map((r) => ({ ...r, value: r.value.replace(/^-/, "−") })) })),
    priceCagr,
  ].filter((g) => g.rows.length > 0);
  const hasLiveGrowth = growth.some((g) => !g.snapshot);
  const annualSeries = fund?.annual?.years.length ? fund.annual.series.filter((r) => r.values.some((v) => v != null)) : [];
  const basis = fund?.basis ?? "consolidated";

  return (
    <div className="flex flex-col gap-6">
      <div>
        {cls?.sector || cls?.industry ? (
          <p className="text-sm text-ink">
            <span className="text-ink-soft">Industry:</span> {[cls.broadSector, cls.sector, cls.industry].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(" › ")}
          </p>
        ) : loading ? (
          <p className="text-sm text-ink-soft">Fetching live fundamentals…</p>
        ) : null}
        {fund?.source === "yahoo" && (
          <p className="mt-2 rounded-lg border border-amber/40 bg-amber/10 px-3 py-2 text-xs text-ink">
            Screener.in isn&rsquo;t reachable right now, so the live sections below come from Yahoo Finance. Shareholding and industry medians are unavailable until Screener.in responds.
          </p>
        )}
        {!fund && !loading && (
          <p className="mt-2 rounded-lg border border-amber/40 bg-amber/10 px-3 py-2 text-xs text-ink">
            Live Screener.in data isn&rsquo;t reachable right now, so industry medians, growth and shareholding are unavailable. Company ratios below are the company snapshot. Try again shortly.
          </p>
        )}
      </div>

      {s.reit && (
        <p className="-mt-3 rounded-lg border border-line bg-panel-2 px-3 py-2 text-xs leading-relaxed text-ink">
          <b>REIT:</b> P/E, ROE and dividend yield are left out. {REIT_NOTE}
        </p>
      )}

      {shown.length > 0 && (
      <Section title={ind && hasIndustry ? `Key ratios — company vs industry median (${ind.peerCount ?? "—"} companies)` : "Key ratios"}>
        <div className="overflow-hidden rounded-2xl border border-line bg-panel">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-panel-2 text-[11px] uppercase tracking-wide text-ink-soft">
                <th className="px-3 py-2.5 text-left font-semibold">Ratio</th>
                <th className="px-3 py-2.5 text-right font-semibold">
                  Company<span className="block text-[9px] font-normal normal-case tracking-normal">snapshot {asOf}</span>
                </th>
                {hasIndustry && (
                  <th className="px-3 py-2.5 text-right font-semibold">
                    Industry<span className="block text-[9px] font-normal normal-case tracking-normal">median, live</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {shown.map((r) => {
                const v = verdict(r);
                return (
                  <tr key={r.label}>
                    <td className="px-3 py-3 text-ink">{r.label}</td>
                    <td className="px-3 py-3 text-right font-mono">
                      <span className={v === "better" ? "text-pos" : v === "worse" ? "text-danger" : "text-ink"}>
                        {fmtRow(r.company, r)}
                      </span>
                      {v && <span className={"ml-1.5 text-[10px] " + (v === "better" ? "text-pos" : "text-danger")}>{v === "better" ? "▲" : "▼"}</span>}
                    </td>
                    {hasIndustry && (
                      <td className="px-3 py-3 text-right font-mono text-ink-soft" title={r.industry == null ? "No industry median available" : undefined}>
                        {r.industry == null ? "n/a" : fmtRow(r.industry, r)}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {hasIndustry ? (
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-soft">
            <span><span className="text-pos">▲</span> better than industry median</span>
            <span><span className="text-danger">▼</span> worse than industry median</span>
            <span>Lower is better for P/E and P/B. n/a = no industry median.</span>
          </p>
        ) : (
          fund && <p className="mt-2 text-[11px] text-ink-soft">Industry medians aren&rsquo;t available for this company right now.</p>
        )}
        {hasLiveRows && <p className="mt-1 text-[11px] text-ink-soft">* Latest quarter, live from Screener.in (not in the company snapshot).</p>}
      </Section>
      )}

      {growth.length > 0 && (
        <Section title="Compounded growth">
          <p className="-mt-1 mb-2 text-[11px] text-ink-soft">
            {hasLiveGrowth && (
              <>
                Sales, profit and ROE: <span className="text-pos">live</span>, Screener.in.{" "}
              </>
            )}
            Stock price: company snapshot {asOf}.
          </p>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {growth.map((g) => (
              <div key={g.title} className="rounded-xl border border-line bg-panel p-3">
                <div className="mb-1.5 text-[11px] font-semibold text-ink">
                  {g.title}
                  {g.snapshot && <span className="font-normal text-ink-soft"> · {asOf}</span>}
                </div>
                {g.rows.map((r) => (
                  <div key={r.period} className="flex justify-between font-mono text-xs leading-6 text-ink-soft">
                    <span>{r.period}</span>
                    <span className={r.value.startsWith("−") ? "text-danger" : "text-ink"}>{r.value}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Section>
      )}

      {fund?.shareholding && fund.shareholding.rows.length > 0 && (
        <Section title={`Shareholding pattern — ${fund.shareholding.period}`}>
          <div className="rounded-2xl border border-line bg-panel p-4">
            <div className="flex h-3 overflow-hidden rounded-full bg-panel-2">
              {fund.shareholding.rows.map((r, i) => (
                <div key={r.label} className={SH_COLORS[i % SH_COLORS.length]} style={{ width: `${Math.max(0, r.value ?? 0)}%` }} title={`${r.label} ${r.value}%`} />
              ))}
            </div>
            <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-3">
              {fund.shareholding.rows.map((r, i) => (
                <li key={r.label} className="flex items-center justify-between gap-2 text-xs">
                  <span className="flex items-center gap-2 text-ink-soft">
                    <span className={"h-2.5 w-2.5 rounded-sm " + SH_COLORS[i % SH_COLORS.length]} />
                    {r.label}
                  </span>
                  <span className="font-mono text-ink">{r.value == null ? "—" : `${r.value}%`}</span>
                </li>
              ))}
            </ul>
          </div>
        </Section>
      )}

      {fund?.annual && annualSeries.length > 0 && (
        <div className="max-[640px]:hidden"><Section title="Annual performance (₹ Cr)">
          <div className="overflow-x-auto rounded-2xl border border-line bg-panel">
            <table className="w-full min-w-[480px] text-xs">
              <thead>
                <tr className="bg-panel-2 text-ink-soft">
                  <th className="px-3 py-2.5 text-left font-semibold" />
                  {fund.annual.years.map((y) => (
                    <th key={y} className="px-3 py-2.5 text-right font-mono font-semibold">{y}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {annualSeries.map((r) => (
                  <tr key={r.label}>
                    <td className="px-3 py-2.5 text-ink">{r.label.replace(/ in Rs\.?$/i, " (₹)")}</td>
                    {r.values.map((v, i) => (
                      <td key={i} className={"px-3 py-2.5 text-right font-mono " + (v != null && v < 0 ? "text-danger" : "text-ink")}>{fmtNum(v, r.label === "OPM %" || r.label.startsWith("EPS") ? 1 : 0)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section></div>
      )}

      <p className="border-t border-dashed border-line pt-2 text-[10.5px] text-ink-soft">
        Company ratios and market cap: company table snapshot {asOf}, the same figures as every other page. Industry medians, growth,
        shareholding and annual figures:{" "}
        {fund ? (
          <>
            <span className="text-pos">live</span> from {fund.source === "yahoo" ? "Yahoo Finance" : `Screener.in (${basis}${basis === "standalone" ? " — the company reports no consolidated accounts" : ""})`}, fetched{" "}
            {fmtFetched(fund.fetchedAt)}
            {fund.source === "yahoo" ? "" : ". Industry = median of the company\u2019s Screener industry group"}.
          </>
        ) : (
          "unavailable right now."
        )}
      </p>
    </div>
  );
}
