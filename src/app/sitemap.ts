import type { MetadataRoute } from "next";
import { listSectors } from "@/lib/sector-content";
import { listCompanyPages } from "@/lib/sector-content/companies";
import { buildDeck } from "@/lib/sector-content/reports";
import { SITE_URL } from "@/lib/site";
import { ensureFinancials } from "@/lib/financials/load";
import { asOfDate } from "@/lib/financials/rows";
import { dataAsOf } from "@/lib/sector-content/insights";

// Figures come from the database; re-render on the same clock as the cached table (load.ts).
export const revalidate = 900;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await ensureFinancials();
  // Every page here shows company figures, so a page last changed when its figures did: the table's
  // snapshot date, or a company's own when the refresh could not read it. (Stamping every URL with
  // the request time taught crawlers to ignore the dates.)
  const updated = asOfDate(dataAsOf()) ?? new Date();
  const sectors = listSectors().filter((s) => !s.muted);
  return [
    { url: SITE_URL, lastModified: updated, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/companies`, lastModified: updated, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/docs`, lastModified: updated, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/ipos`, lastModified: updated, changeFrequency: "daily", priority: 0.7 },
    { url: `${SITE_URL}/baskets`, lastModified: updated, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/baskets/projections`, lastModified: updated, changeFrequency: "monthly", priority: 0.4 },
    ...sectors.map((s) => ({ url: `${SITE_URL}/baskets/industry/${s.slug}`, lastModified: updated, changeFrequency: "weekly" as const, priority: 0.6 })),
    { url: `${SITE_URL}/connections`, lastModified: updated, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/updates`, lastModified: updated, changeFrequency: "daily", priority: 0.6 },
    ...sectors.map((s) => ({ url: `${SITE_URL}/sector/${s.slug}`, lastModified: updated, changeFrequency: "weekly" as const, priority: 0.9 })),
    ...sectors
      .filter((s) => buildDeck(s.slug))
      .map((s) => ({ url: `${SITE_URL}/docs/${s.slug}`, lastModified: updated, changeFrequency: "monthly" as const, priority: 0.6 })),
    ...listCompanyPages().map((c) => ({
      url: `${SITE_URL}/company/${c.slug}`,
      lastModified: asOfDate(c.supplier.f?.asOf) ?? updated,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}

