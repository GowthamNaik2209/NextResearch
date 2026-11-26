import { readFile } from "node:fs/promises";
import { join } from "node:path";
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

// The site's own fonts, as static TTFs (satori reads only ttf/otf/woff, and the site ships variable
// woff2): Space Grotesk Bold for the name, title and numbers, IBM Plex Sans for the rest, like the
// pages. Without them next/og falls back to Geist Regular alone, so nothing was bold and the gaps
// between words looked uneven. The Latin subsets have no "₹", so Geist stays loaded as the fallback
// for that glyph. Read once per server instance; paths are from the project root (Next traces them).
const FONT_DIR = join(process.cwd(), "src/lib/og-fonts");
let fontsPromise: Promise<{ name: string; data: Buffer; weight: 400 | 700; style: "normal" }[]> | null = null;
function loadFonts() {
  fontsPromise ??= Promise.all([
    readFile(join(FONT_DIR, "SpaceGrotesk-Bold.ttf")),
    readFile(join(FONT_DIR, "IBMPlexSans-Regular.ttf")),
    readFile(join(FONT_DIR, "Geist-Regular.ttf")),
  ]).then(([grotesk, plex, geist]) => [
    { name: "Space Grotesk", data: grotesk, weight: 700, style: "normal" },
    { name: "IBM Plex Sans", data: plex, weight: 400, style: "normal" },
    { name: "Geist", data: geist, weight: 400, style: "normal" },
  ]);
  return fontsPromise;
}
const DISPLAY = "Space Grotesk";

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

export async function renderOgCard({ kicker, title, subtitle, stats = [] }: OgCard) {
  const fonts = await loadFonts();
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
          fontFamily: "IBM Plex Sans",
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
                fontFamily: DISPLAY,
                fontWeight: 700,
              }}
            >
              {/* The site header's mark is a single "N"; the share card matches it. */}
              N
            </div>
            <div style={{ fontSize: 30, fontFamily: DISPLAY, fontWeight: 700 }}>{SITE_NAME}</div>
          </div>
          <div
            style={{
              fontSize: 20,
              fontFamily: DISPLAY,
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
          <div style={{ fontSize: title.length > 40 ? 64 : 80, fontFamily: DISPLAY, fontWeight: 700, lineHeight: 1.05, letterSpacing: -1, display: "block", width: "100%" }}>
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
                    {/* "₹" gets its own box: it only exists in the fallback font, and satori sets a whole
                        word in whichever font has every glyph, so "₹3.12L" would lose the display font. */}
                    <div style={{ fontSize: 52, fontFamily: DISPLAY, fontWeight: 700, color: BRAND.accent, display: "flex", alignItems: "baseline" }}>
                      {s.value.startsWith("₹") ? [<span key="r">₹</span>, <span key="v">{s.value.slice(1)}</span>] : s.value}
                    </div>
                    {/* satori's baseline alignment leaves the smaller label ~6px low; lift it onto the number's baseline. */}
                    <div style={{ fontSize: 34, color: BRAND.ink, display: "flex", position: "relative", top: -6 }}>{s.label}</div>
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
    { ...OG_SIZE, fonts }
  );
}
