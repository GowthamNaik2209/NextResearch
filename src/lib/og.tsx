import { ImageResponse } from "next/og";
import { BRAND, SITE_NAME } from "@/lib/site";

// One branded share-card layout for every opengraph-image route (root, sector, company,
// report) - the dark theme from globals.css, the site's default. satori only supports
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
  // Shown as "<value> <label>", so the label is written to follow the number: "listed companies",
  // "market cap", "ROCE" (lower case unless it is an acronym, singular when the value is 1).
  stats?: { label: string; value: string }[];
};

/** "1 IPO covered" / "4 IPOs covered": pick the label form that reads right after the number. */
export function countLabel(n: number, one: string, many: string) {
  return n === 1 ? one : many;
}

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
          {/* Each number reads as a phrase ("12 supply-chain layers") on one line, right under the title.
              It used to sit bottom-left with a small caption below, and X lays its title chip over exactly
              that corner, so the cards showed bare numbers. Keep the bottom-left corner empty. */}
          {stats.length > 0 && (
            <div style={{ display: "flex", alignItems: "baseline", gap: 28, marginTop: 12 }}>
              {stats.slice(0, MAX_STATS).map((s, i) => (
                <div key={s.label} style={{ display: "flex", alignItems: "baseline", gap: 28 }}>
                  {i > 0 && <div style={{ fontSize: 48, color: BRAND.inkSoft, display: "flex" }}>·</div>}
                  <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                    <div style={{ fontSize: 52, fontWeight: 700, color: BRAND.accent, display: "flex" }}>{s.value}</div>
                    <div style={{ fontSize: 34, color: BRAND.ink, display: "flex" }}>{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <div style={{ fontSize: 16, color: BRAND.inkSoft, display: "flex" }}>For information only · not investment advice</div>
        </div>
      </div>
    ),
    OG_SIZE
  );
}
