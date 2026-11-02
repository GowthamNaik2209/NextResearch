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
 * medium while its company-wide revenue is at least this share of the industry's (see below): a group of
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
  if (!sector || sector.muted || !basket?.stocks.length) return null;
  // A market index (the Nifty 50): its layers are the index's industries and every company is in
  // it in full, so none is low exposure.
  const isIndex = sector.stage === "heatmap";

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

  const extra = new Set(LOW_EXPOSURE_EXTRA[slug] ?? []);
  const revOf = (c: { rev: PoolCompany["rev"] }) => Math.max(c.rev[1] ?? 0, 0);
  const totalRev = companies.reduce((t, c) => t + revOf(c), 0);
  // A conglomerate is judged against the whole industry, once: L&T is 61% of defence. A
  // medium-rated large group is measured again after each round against the companies still
  // counted, so one giant (Reliance in solar, ₹10L Cr) can't raise the bar so far that the next
  // (Adani Enterprises, ₹1L Cr) slips under it. Judged that way, a conglomerate rated high
  // (BEL across five defence industries) would be flagged as soon as L&T left, which is wrong.
  const conglomerate = new Set(companies.filter((c) => c.industries >= LOW_EXPOSURE_MIN_INDUSTRIES && totalRev > 0 && revOf(c) >= LOW_EXPOSURE_REV_SHARE * totalRev).map((c) => c.ticker));
  const largeGroup = new Set<string>();
  for (let grew = true; grew; ) {
    grew = false;
    const total = companies.filter((c) => !conglomerate.has(c.ticker) && !largeGroup.has(c.ticker)).reduce((t, c) => t + revOf(c), 0);
    for (const c of companies) {
      if (c.strength !== "medium" || conglomerate.has(c.ticker) || largeGroup.has(c.ticker)) continue;
      if (total > 0 && revOf(c) >= LOW_EXPOSURE_REV_SHARE * total) {
        largeGroup.add(c.ticker);
        grew = true;
      }
    }
  }
  const out: PoolCompany[] = companies.map(({ strength, industries, ...c }) => {
    // The reason the viewer sees beside it in the add list.
    const why = isIndex
      ? null
      : strength === "low"
        ? "Rated low exposure here"
        : conglomerate.has(c.ticker)
          ? `Conglomerate in ${industries} industries`
          : largeGroup.has(c.ticker) || extra.has(c.ticker)
            ? "Large group, most revenue elsewhere"
            : null;
    return why ? { ...c, lowExposure: why } : c;
  });

  const used = new Set(out.map((c) => c.layer));
  const layers: IndustryPools["layers"] = [];
  for (const z of sector.zones) if (used.has(z.label) && !layers.some((l) => l.name === z.label)) layers.push({ name: z.label, color: z.color });
  // A layer label the map doesn't list (shouldn't happen) still shows, after the map's own.
  for (const l of used) if (!layers.some((x) => x.name === l)) layers.push({ name: l, color: "#64748B" });

  return { slug, year: `FY${String(FISCAL_YEARS[FISCAL_YEARS.length - 1]).slice(2)}`, asOf, layers, companies: out };
}
