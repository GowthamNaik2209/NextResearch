"use client";

import { useEffect, useState } from "react";
import {
  companyLinkExposure,
  companyLinkKey,
  tickerForSupplier,
  EXPOSURE_TYPE_LABEL,
  EXPOSURE_STRENGTH_LABEL,
  type SectorDef,
  type SectorZone,
} from "@/lib/sector-content";
import type { CompanySummary } from "@/lib/companies";
import { WatchlistButton } from "./WatchlistButton";

type Props = {
  sector: SectorDef;
  zone: SectorZone;
  onClose: () => void;
};

// low -> high: how much of this company's business rides on this one segment,
// i.e. how correlated its stock is likely to be with something happening to it.
const STRENGTH_RANK = { low: 1, medium: 2, high: 3 } as const;

// Spec §6.F: compare companies within a layer — company, role, exposure type, main
// risk, a revenue snapshot where available, and data status. Role/exposure/risk
// come straight from the static sector content (instant, no fetch); revenue is the
// one genuinely dynamic figure, so that alone is bulk-fetched from the DB via the
// same /api/companies?tickers= endpoint the zone chips already use.
export function CompanyComparison({ sector, zone, onClose }: Props) {
  const [live, setLive] = useState<Record<string, CompanySummary>>({});
  const [loading, setLoading] = useState(true);

  const rows = zone.suppliers.map((link) => {
    const key = companyLinkKey(link);
    return { key, supplier: sector.suppliers[key], exposure: companyLinkExposure(link) };
  });

  useEffect(() => {
    // No setLoading(true) reset here: the parent keys this component by zone.id
    // (SectorExplorer.tsx), so a zone change remounts it fresh with the initial
    // state above instead of reusing a stale instance — same pattern as SupplierDetail.
    let cancelled = false;
    const tickers = rows.filter((r) => r.supplier.listed).map((r) => tickerForSupplier(r.supplier));
    // No-tickers case folded into the same promise chain (rather than an early
    // return) so there's exactly one setLoading(false), inside .finally() below.
    const request: Promise<{ companies?: CompanySummary[] }> =
      tickers.length > 0
        ? fetch(`/api/companies?tickers=${encodeURIComponent(tickers.join(","))}`).then((r) => r.json())
        : Promise.resolve({ companies: [] });
    request
      .then((data) => {
        if (cancelled) return;
        const map: Record<string, CompanySummary> = {};
        for (const c of data.companies ?? []) map[c.ticker] = c;
        setLive(map);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // Re-fetch when the zone itself changes, not on every re-derivation of `rows`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zone.id]);

  // Ordered by exposure/impact correlation, not cumulative company revenue —
  // a company's total top-line says little about this one segment (most of
  // these companies don't disclose segment-level revenue at all, per their
  // own `risks` entries). exposureStrength is the authored stand-in: low first
  // (this segment barely moves the needle for them), high last (a shock to
  // this segment would hit their stock hard). Revenue only breaks ties within
  // the same tier, and only as a secondary, not the sort basis itself.
  const sortedRows = [...rows].sort((a, b) => {
    const ra = a.exposure.exposureStrength ? STRENGTH_RANK[a.exposure.exposureStrength] : 0;
    const rb = b.exposure.exposureStrength ? STRENGTH_RANK[b.exposure.exposureStrength] : 0;
    if (ra !== rb) return ra - rb;
    const ta = a.supplier.listed ? tickerForSupplier(a.supplier) : null;
    const tb = b.supplier.listed ? tickerForSupplier(b.supplier) : null;
    const va = (ta ? live[ta]?.latestRevenueCr : null) ?? null;
    const vb = (tb ? live[tb]?.latestRevenueCr : null) ?? null;
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    return va - vb;
  });

  return (
    <div className="compare-overlay" onClick={onClose}>
      <div className="compare-box" onClick={(e) => e.stopPropagation()}>
        <div className="compare-head">
          <h2>
            <span className="zc-tag" style={{ background: zone.color }} />
            Compare companies &mdash; {zone.label}
          </h2>
          <button className="panel-close-btn" type="button" aria-label="Close" onClick={onClose}>
            &times;
          </button>
        </div>
        <p className="fine" style={{ padding: "0 18px" }}>
          Ordered by exposure to this segment, ascending &mdash; least correlated first, most exposed (highest likely
          stock impact if something happened to it) last.
        </p>
        <div className="compare-table-wrap">
          <table className="compare-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Exposure</th>
                <th>Role</th>
                <th>Revenue (Rs Cr, company-wide)</th>
                <th>Main risk</th>
                <th>Data status</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map(({ key, supplier, exposure }) => {
                const ticker = supplier.listed ? tickerForSupplier(supplier) : null;
                const liveCompany = ticker ? live[ticker] : undefined;
                const revenue = liveCompany?.latestRevenueCr ?? null;
                return (
                  <tr key={key}>
                    <td>
                      {supplier.name}
                      {supplier.listed && ticker && (
                        <>
                          <span className="fine"> ({ticker})</span>
                          <WatchlistButton ticker={ticker} />
                        </>
                      )}
                    </td>
                    <td>
                      {exposure.exposureType ? EXPOSURE_TYPE_LABEL[exposure.exposureType] : "—"}
                      {exposure.exposureStrength ? ` · ${EXPOSURE_STRENGTH_LABEL[exposure.exposureStrength]}` : ""}
                    </td>
                    <td className="fine">{supplier.role}</td>
                    <td>
                      {!supplier.listed
                        ? "—"
                        : loading
                          ? "…"
                          : revenue != null
                            ? revenue.toLocaleString("en-IN") +
                              (liveCompany?.latestRevenueYear ? ` (FY${String(liveCompany.latestRevenueYear).slice(2)})` : "")
                            : "n/a"}
                    </td>
                    <td className="fine">{supplier.risks?.[0] ?? "—"}</td>
                    <td>
                      {supplier.dataStatus ? (
                        <span className={"badge " + (supplier.dataStatus === "demo" ? "unlisted" : "listed")}>
                          {supplier.dataStatus === "demo" ? "public info" : supplier.dataStatus.replace(/_/g, " ")}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
