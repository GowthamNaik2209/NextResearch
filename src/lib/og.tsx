import { ImageResponse } from "next/og";
import { BRAND, SITE_NAME } from "@/lib/site";

// One branded share-card layout for every opengraph-image route (root, sector, company,
// report) - the warm "research paper" light theme from globals.css. satori only supports
// flexbox, so every element with more than one child sets display:flex explicitly.
export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

// Kept light on purpose: a link preview is seen at thumbnail size in WhatsApp, X and LinkedIn, so the
// card is a big title, at most one short line and two numbers. A longer line is dropped, not cut.
const MAX_SUBTITLE = 72;
const MAX_STATS = 2;

export type OgCard = {
  kicker: string;
  title: string;
  subtitle?: string;
  stats?: { label: string; value: string }[];
};

export function renderOgCard({ kicker, title, subtitle, stats = [] }: OgCard) {
  const line = subtitle && subtitle.length <= MAX_SUBTITLE ? subtitle : null;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: BRAND.bg,
          color: BRAND.ink,
          padding: "56px 64px",
          borderTop: `14px solid ${BRAND.accent}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 8,
                background: BRAND.accent,
                color: BRAND.bg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                fontWeight: 700,
              }}
            >
              {/* The site header's mark is a single "N"; the share card matches it. */}
              N
            </div>
            <div style={{ fontSize: 30, fontWeight: 700 }}>{SITE_NAME}</div>
          </div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: BRAND.amber,
              display: "flex",
            }}
          >
            {kicker}
          </div>
        </div>

        {/* Full width with block text: as flex items the lines wrapped at ~60% of the card. */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20, width: "100%" }}>
          <div style={{ fontSize: title.length > 40 ? 64 : 80, fontWeight: 700, lineHeight: 1.05, letterSpacing: -1, display: "block", width: "100%" }}>
            {title}
          </div>
          {line && <div style={{ fontSize: 32, color: BRAND.inkSoft, lineHeight: 1.3, display: "block", width: "100%" }}>{line}</div>}
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 56 }}>
            {stats.slice(0, MAX_STATS).map((s) => (
              <div key={s.label} style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: 48, fontWeight: 700, color: BRAND.accent, display: "flex" }}>{s.value}</div>
                <div style={{ fontSize: 18, color: BRAND.inkSoft, textTransform: "uppercase", letterSpacing: 1, display: "flex" }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 16, color: BRAND.inkSoft, display: "flex" }}>For information only · not investment advice</div>
        </div>
      </div>
    ),
    OG_SIZE
  );
}
