// The industry page's pools, built on the server from the industry basket (the same companies the
// heatmap shows) and the company table. Needs ensureFinancials() first, like every figure read.
// The maths is in ./pools.ts.
import { getSector } from "@/lib/sector-content";
import { companySlug, getCompanyPage } from "@/lib/sector-content/companies";
import { getFinancials } from "@/lib/financials/store";
import { FISCAL_YEARS } from "@/lib/financials/rows";
import { getIndustryBasket } from "./industry";
import type { IndustryPools, PoolCompany } from "./pools";

/**
 * A company counts as low exposure when the content rates its link to this industry as low, or as
 * medium while its company-wide revenue is at least this share of the whole industry's: a group of
 * that size earns most of its money outside the industry (Adani Enterprises in solar modules, M&M
 * in EVs), and its full revenue would swamp the layer. (Measured against the companies rated high
 * instead, it flagged nearly every supplier in industries with a small core, such as data centres.)
 */
export const LOW_EXPOSURE_REV_SHARE = 0.15;
/**
 * A company that large is also low exposure, whatever its rating, when the content maps it in at
 * least this many industries: a conglomerate (L&T is in nine) can be a real defence player and
 * still earn most of its money elsewhere.
 */
export const LOW_EXPOSURE_MIN_INDUSTRIES = 5;
/** By hand, where the rule can't tell: a steelmaker counted in full in the navy's hull-steel layer. */
const LOW_EXPOSURE_EXTRA: Record<string, string[]> = { naval: ["SAIL"] };

// linkWeight (sector-content/core.ts): high 3, medium 2, low 1, half a step less for a side link.
const strengthOf = (weight: number) => (weight >= 2.5 ? "high" : weight >= 1.5 ? "medium" : "low");

export function industryPools(slug: string): IndustryPools | null {
  const sector = getSector(slug);
  const basket = getIndustryBasket(slug);
  if (!sector || sector.muted || sector.stage === "heatmap" || !basket?.stocks.length) return null;

  const companies: (PoolCompany & { strength: string; industries: number })[] = [];
  let asOf = "";
  for (const s of basket.stocks) {
    const f = getFinancials(s.ticker);
    if (!f) continue;
    asOf ||= f.asOf ?? "";
    const here = getCompanyPage(companySlug(s.ticker))?.appearances.filter((a) => a.sectorSlug === slug) ?? [];
    const weight = here.reduce((w, a) => Math.max(w, a.weight), 0);
    const at = (xs: (number | null)[] | undefined, i: number) => xs?.[i] ?? null;
    const last = FISCAL_YEARS.length - 1;
    companies.push({
      ticker: s.ticker,
      name: s.name,
      layer: s.layer,
      rev: [at(f.rev, last - 1), at(f.rev, last)],
      np: [at(f.np, last - 1), at(f.np, last)],
      mcapCr: s.mcapCr,
      roce: f.kpi?.[3] ?? null,
      ...(s.oneOff ? { oneOff: s.oneOff } : {}),
      strength: here.length ? strengthOf(weight) : "high",
      industries: s.industries.length,
    });
  }
  if (!companies.length) return null;

  const totalRev = companies.reduce((t, c) => t + Math.max(c.rev[1] ?? 0, 0), 0);
  const extra = new Set(LOW_EXPOSURE_EXTRA[slug] ?? []);
  const out: PoolCompany[] = companies.map(({ strength, industries, ...c }) => {
    const big = totalRev > 0 && (c.rev[1] ?? 0) >= LOW_EXPOSURE_REV_SHARE * totalRev;
    const low = strength === "low" || (big && (strength === "medium" || industries >= LOW_EXPOSURE_MIN_INDUSTRIES)) || extra.has(c.ticker);
    return low ? { ...c, lowExposure: true } : c;
  });

  const used = new Set(out.map((c) => c.layer));
  const layers: IndustryPools["layers"] = [];
  for (const z of sector.zones) if (used.has(z.label) && !layers.some((l) => l.name === z.label)) layers.push({ name: z.label, color: z.color });
  // A layer label the map doesn't list (shouldn't happen) still shows, after the map's own.
  for (const l of used) if (!layers.some((x) => x.name === l)) layers.push({ name: l, color: "#64748B" });

  return { slug, year: `FY${String(FISCAL_YEARS[FISCAL_YEARS.length - 1]).slice(2)}`, asOf, layers, companies: out };
}
