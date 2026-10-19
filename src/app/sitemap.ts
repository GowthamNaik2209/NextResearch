import type { MetadataRoute } from "next";
import { listSectors } from "@/lib/sector-content";
import { listCompanyPages } from "@/lib/sector-content/companies";
import { buildDeck } from "@/lib/sector-content/reports";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const sectors = listSectors().filter((s) => !s.muted);
  return [
    { url: SITE_URL, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/companies`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/docs`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/ipos`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${SITE_URL}/baskets`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    ...sectors.map((s) => ({ url: `${SITE_URL}/baskets/industry/${s.slug}`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.6 })),
    { url: `${SITE_URL}/connections`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/updates`, lastModified: now, changeFrequency: "daily", priority: 0.6 },
    ...sectors.map((s) => ({ url: `${SITE_URL}/sector/${s.slug}`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.9 })),
    ...sectors
      .filter((s) => buildDeck(s.slug))
      .map((s) => ({ url: `${SITE_URL}/docs/${s.slug}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.6 })),
    ...listCompanyPages().map((c) => ({
      url: `${SITE_URL}/company/${c.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
