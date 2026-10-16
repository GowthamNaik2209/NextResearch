import { getPlatformStats } from "@/lib/sector-content/stats";
import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from "@/lib/og";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";

export const alt = `${SITE_NAME} — ${SITE_TAGLINE}`;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  const s = getPlatformStats();
  return renderOgCard({
    kicker: "India · Equity research",
    title: "See where every listed company sits in the supply chain",
    subtitle: "Data centres, EVs, semiconductors, railways, defence, solar, real estate and pharma - mapped layer by layer, with the financials behind each company.",
    stats: [
      { label: "Sectors", value: String(s.sectors) },
      { label: "Supply-chain layers", value: String(s.zones) },
      { label: "Listed companies", value: String(s.listed) },
    ],
  });
}
