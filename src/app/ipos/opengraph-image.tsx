import { listIpos } from "@/lib/ipo-content";
import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from "@/lib/og";

export const alt = "Upcoming IPO prospectus summaries on NextResearch";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  const ipos = listIpos();
  return renderOgCard({
    kicker: "Upcoming IPOs",
    title: "Prospectus summaries",
    subtitle: "Issue, business, financials, peers and risks - ten slides per IPO.",
    chips: ipos.slice(0, 5).map((r) => r.name),
    stats: [{ label: "IPOs covered", value: String(ipos.length) }],
  });
}
