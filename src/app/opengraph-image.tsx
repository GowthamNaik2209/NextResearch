import { getPlatformStats } from "@/lib/sector-content/stats";
import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from "@/lib/og";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";
import { ensureFinancials } from "@/lib/financials/load";

// Figures come from the database; re-render on the same clock as the cached table (load.ts).
export const revalidate = 900;

export const alt = `${SITE_NAME} — ${SITE_TAGLINE}`;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  await ensureFinancials();
  const s = getPlatformStats();
  return renderOgCard({
    kicker: "India · Equity research",
    title: "See where every listed company sits in the supply chain",
    stats: [
      { label: "Themes", value: String(s.sectors) },
      { label: "Listed companies", value: String(s.listed) },
    ],
  });
}
