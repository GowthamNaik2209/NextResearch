// The canonical public origin, used for metadataBase, canonical URLs, the sitemap and
// robots.txt. NEXT_PUBLIC_SITE_URL wins when set (set it to the custom domain once one is
// attached); otherwise Vercel's own production URL, which Vercel switches to the custom
// domain automatically once that domain is marked primary. Localhost only in local dev.
function resolveSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured && !configured.includes("localhost")) return configured.replace(/\/$/, "");
  const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelProd) return `https://${vercelProd}`;
  return (configured ?? "http://localhost:3000").replace(/\/$/, "");
}

export const SITE_URL = resolveSiteUrl();
export const SITE_NAME = "NextResearch";
export const SITE_TAGLINE = "Supply-chain research for India's public markets";
export const SITE_DESCRIPTION =
  "Map India's listed companies by where they sit in an industry's supply chain - data centres, EVs, chips and phones, electronic components, rare-earth magnets, railways, defence, solar, real estate, pharma and more - then deep-dive into any company's financials.";

// Brand tokens for places CSS variables can't reach (OG images via satori). Keep in sync
// with globals.css's light theme.
export const BRAND = {
  bg: "#f8f4ea",
  panel: "#efe9d9",
  panel2: "#e5dec9",
  ink: "#14201a",
  inkSoft: "#536157",
  line: "#d4cab0",
  accent: "#0f5c4a",
  amber: "#a8650a",
  darkBg: "#0c1110",
  darkAccent: "#f0b53f",
} as const;

// JSON-LD payloads go into a raw <script>; escape "<" so authored text can never close it.
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

// What a dynamic route's generateMetadata returns for an unknown slug. The page then calls
// notFound(), but the head comes from generateMetadata, so `{}` would leave the home page title.
export const NOT_FOUND_METADATA = { title: "Page not found", robots: { index: false } } as const;

// Title Case names ("Vehicle OEMs & Assembly", "Semiconductors (Fab + ATMP)") used mid-sentence:
// only plain capitalised words drop to lower case, so acronyms (OEMs, DC, REIT, EPC, ATMP) and
// India stay as written - a blanket toLowerCase() gave "dc operators & reit layer".
const KEEP_CASE = new Set(["India", "Indian"]);
export const midSentence = (label: string) => label.replace(/\b[A-Z][a-z]+\b/g, (w) => (KEEP_CASE.has(w) ? w : w.toLowerCase()));
