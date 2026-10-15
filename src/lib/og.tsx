import { ImageResponse } from "next/og";
import { BRAND, SITE_NAME } from "@/lib/site";

// One branded share-card layout for every opengraph-image route (root, sector, company,
// report) - the warm "research paper" light theme from globals.css. satori only supports
// flexbox, so every element with more than one child sets display:flex explicitly.
export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

export type OgCard = {
  kicker: string;
  title: string;
  subtitle?: string;
  stats?: { label: string; value: string }[];
  chips?: string[];
};

export function renderOgCard({ kicker, title, subtitle, stats = [], chips = [] }: OgCard) {
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
              NR
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

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: title.length > 48 ? 54 : 66, fontWeight: 700, lineHeight: 1.08, letterSpacing: -1, display: "flex" }}>
            {title}
          </div>
          {subtitle && (
            <div style={{ fontSize: 28, color: BRAND.inkSoft, lineHeight: 1.35, display: "flex" }}>
              {subtitle.length > 150 ? subtitle.slice(0, 147) + "..." : subtitle}
            </div>
          )}
          {chips.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {chips.slice(0, 5).map((c) => (
                <div
                  key={c}
                  style={{
                    display: "flex",
                    fontSize: 20,
                    padding: "6px 14px",
                    borderRadius: 999,
                    border: `2px solid ${BRAND.line}`,
                    background: BRAND.panel,
                    color: BRAND.ink,
                  }}
                >
                  {c}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 44 }}>
            {stats.slice(0, 4).map((s) => (
              <div key={s.label} style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: 40, fontWeight: 700, color: BRAND.accent, display: "flex" }}>{s.value}</div>
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
