import { listIpos } from "@/lib/ipo-content";
import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from "@/lib/og";
import { ensureFinancials } from "@/lib/financials/load";

// Figures come from the database; re-render on the same clock as the cached table (load.ts).
export const revalidate = 900;

export const alt = "Upcoming IPO prospectus summaries on NextResearch";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  await ensureFinancials();
  const ipos = listIpos();
  return renderOgCard({
    kicker: "Upcoming IPOs",
    title: "Prospectus summaries",
    subtitle: "Each upcoming IPO in ten slides.",
    stats: [{ label: "IPOs covered", value: String(ipos.length) }],
  });
}
