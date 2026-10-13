import type { SectorSupplier } from "@/lib/sector-content";
import type { StaticFin, StockApi } from "./types";
import { fmtNum, mergeStats } from "./merge";

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

const SH_COLORS = ["bg-accent", "bg-amber", "bg-pos", "bg-danger", "bg-ink-soft"];

export function FundamentalsView({ supplier, api, loading }: { supplier: SectorSupplier; api: StockApi | null; loading: boolean }) {
  const fund = api?.fundamentals ?? null;
  const f = supplier.f as unknown as StaticFin | undefined;
  const s = mergeStats(f, api);
  const ind = fund?.industry ?? null;
  const self = ind?.self ?? null;
  const med = ind?.median ?? null;
  const cls = fund?.classification;
  const pb = s.price != null && s.bookValue ? s.price / s.bookValue : null;

  const rows: Row[] = [
    { label: "P/E (TTM)", company: s.pe, industry: med?.pe ?? null, unit: "x", better: "low", digits: 1 },
    { label: "P/B", company: pb, industry: null, unit: "x", better: "low", digits: 2 },
    { label: "ROE", company: s.roe, industry: null, unit: "%", better: "high", digits: 1 },
    { label: "ROCE", company: s.roce, industry: med?.roce ?? null, unit: "%", better: "high", digits: 1 },
    { label: "Dividend yield", company: s.divYield, industry: med?.divYield ?? null, unit: "%", better: "high", digits: 2 },
    { label: "Qtr sales growth (YoY)", company: self?.qtrSalesVarPct ?? null, industry: med?.qtrSalesVarPct ?? null, unit: "%", better: "high", digits: 1 },
    { label: "Qtr profit growth (YoY)", company: self?.qtrProfitVarPct ?? null, industry: med?.qtrProfitVarPct ?? null, unit: "%", better: "high", digits: 1 },
    { label: "Market cap (₹ Cr)", company: self?.marketCapCr ?? null, industry: med?.marketCapCr ?? null, unit: "", better: null, digits: 0 },
  ];
  const shown = rows.filter((r) => r.company != null || r.industry != null);

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
        {!fund && !loading && (
          <p className="mt-2 rounded-lg border border-amber/40 bg-amber/10 px-3 py-2 text-xs text-ink">
            Live Screener.in data isn&rsquo;t reachable right now, so company ratios below are cached figures and industry medians are unavailable. Try again shortly.
          </p>
        )}
      </div>

      <Section title={ind ? `Key ratios — company vs industry median (${ind.peerCount ?? "—"} companies)` : "Key ratios"}>
        <div className="overflow-hidden rounded-2xl border border-line bg-panel">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-panel-2 text-[11px] uppercase tracking-wide text-ink-soft">
                <th className="px-3 py-2.5 text-left font-semibold">Ratio</th>
                <th className="px-3 py-2.5 text-right font-semibold">Company</th>
                <th className="px-3 py-2.5 text-right font-semibold">Industry</th>
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
                        {r.company == null ? "—" : `${fmtNum(r.company, r.digits ?? 1)}${r.unit}`}
                      </span>
                      {v && <span className={"ml-1.5 text-[10px] " + (v === "better" ? "text-pos" : "text-danger")}>{v === "better" ? "▲" : "▼"}</span>}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-ink-soft">{r.industry == null ? "—" : `${fmtNum(r.industry, r.digits ?? 1)}${r.unit}`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-soft">
          <span><span className="text-pos">▲</span> better than industry median</span>
          <span><span className="text-danger">▼</span> worse than industry median</span>
          <span>Lower is better for P/E and P/B.</span>
        </p>
      </Section>

      {fund && fund.growth.length > 0 && (
        <Section title="Compounded growth">
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {fund.growth.map((g) => (
              <div key={g.title} className="rounded-xl border border-line bg-panel p-3">
                <div className="mb-1.5 text-[11px] font-semibold text-ink">{g.title.replace(/^Compounded /, "")}</div>
                {g.rows.map((r) => (
                  <div key={r.period} className="flex justify-between font-mono text-xs leading-6 text-ink-soft">
                    <span>{r.period}</span>
                    <span className={r.value.startsWith("-") ? "text-danger" : "text-ink"}>{r.value}</span>
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

      {fund?.annual && fund.annual.series.length > 0 && (
        <Section title="Annual performance (₹ Cr)">
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
                {fund.annual.series.map((r) => (
                  <tr key={r.label}>
                    <td className="px-3 py-2.5 text-ink">{r.label}</td>
                    {r.values.map((v, i) => (
                      <td key={i} className={"px-3 py-2.5 text-right font-mono " + (v != null && v < 0 ? "text-danger" : "text-ink")}>{fmtNum(v, r.label === "OPM %" || r.label.startsWith("EPS") ? 1 : 0)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      <p className="border-t border-dashed border-line pt-2 text-[10.5px] text-ink-soft">
        Source: Screener.in (consolidated){fund ? `, fetched ${new Date(fund.fetchedAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : ", cached"}. Industry = median of the company&rsquo;s Screener industry group.
      </p>
    </div>
  );
}
