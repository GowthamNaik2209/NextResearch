"use client";

import {
  companyLinkExposure,
  companyLinkKey,
  tickerForSupplier,
  EXPOSURE_TYPE_LABEL,
  EXPOSURE_STRENGTH_LABEL,
  type SectorDef,
  type SectorZone,
} from "@/lib/sector-content";
import { WatchlistButton } from "./WatchlistButton";

type Props = {
  sector: SectorDef;
  zone: SectorZone;
  onClose: () => void;
};

// low -> high: how much of this company's business rides on this one segment,
// i.e. how correlated its stock is likely to be with something happening to it.
const STRENGTH_RANK = { low: 1, medium: 2, high: 3 } as const;

// Latest fiscal year in the seed data's 5-year revenue series (see SupplierFinancials in
// sector-content). Revenue here is company-wide, not segment-level.
const LATEST_FY = 26;
const latestRevenueCr = (rev: number[] | undefined) => rev?.[rev.length - 1] ?? null;

// Compare the companies in one layer: role, exposure type, main risk, a revenue snapshot
// and data status. Everything comes from the static sector content, so it renders
// instantly and works without any network or database.
export function CompanyComparison({ sector, zone, onClose }: Props) {
  const rows = zone.suppliers.map((link) => {
    const key = companyLinkKey(link);
    const supplier = sector.suppliers[key];
    return { key, supplier, exposure: companyLinkExposure(link), revenue: supplier.listed ? latestRevenueCr(supplier.f?.rev) : null };
  });

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
    if (a.revenue == null && b.revenue == null) return 0;
    if (a.revenue == null) return 1;
    if (b.revenue == null) return -1;
    return a.revenue - b.revenue;
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
              {sortedRows.map(({ key, supplier, exposure, revenue }) => {
                const ticker = supplier.listed ? tickerForSupplier(supplier) : null;
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
                      {!supplier.listed ? "—" : revenue != null ? `${revenue.toLocaleString("en-IN")} (FY${LATEST_FY})` : "n/a"}
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
