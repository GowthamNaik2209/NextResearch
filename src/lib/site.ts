import { listSectors } from "@/lib/sector-content";

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
export const SITE_TAGLINE = "All your thematic research on India, in one place";
export const INSTAGRAM_URL = "https://www.instagram.com/nextresearch.app/";
export const CONTACT_EMAIL = "queries@nextresearchapp.com";
// No list of themes here: a hand-typed list drifted from the content (this is read at import time,
// before the content can be). Pages that name the themes use themeNames() below.
export const SITE_DESCRIPTION =
  "Thematic research on India in one place: industries and policies mapped by supply chain, stock heatmaps, backtested baskets and signals, FII and DII flows and IPO deep dives, with each listed company's financials, peers and risks.";

/**
 * The live industries and policies as a phrase for descriptions and share cards, from the content
 * itself so it never drifts: "electric 4-wheeler, semiconductors, data center, … and pharmaceuticals".
 * Parentheticals and "/ …" tails are dropped for length. Call after ensureFinancials().
 */
export function themeNames(max = Infinity): string {
  const names = listSectors()
    .filter((s) => !s.muted && s.category !== "index")
    .map((s) => midSentence(s.name.replace(/\s*\(.*?\)/g, "").split(" / ")[0].trim()));
  if (names.length > max) return `${names.slice(0, max).join(", ")} and more`;
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : names.join("");
}

// Brand tokens for places CSS variables can't reach (OG images via satori). Share cards use the
// dark theme, the site's default; keep in sync with globals.css's :root.
export const BRAND = {
  bg: "#0c1110",
  panel: "#121a17",
  panel2: "#18231f",
  ink: "#eef2ea",
  inkSoft: "#93a399",
  line: "#25342d",
  accent: "#f0b53f",
  amber: "#e08a3c",
} as const;

// Search Console / Bing ownership tags and the GA4 measurement ID, all optional (unset renders nothing).
// GA never loads on Vercel preview builds (staging), so test visits there stay out of the reports even
// if the ID is copied to the Preview environment; set it for Production only.
export const GA_ID = process.env.VERCEL_ENV === "preview" ? undefined : process.env.NEXT_PUBLIC_GA_ID;
export const SITE_VERIFICATION = {
  google: process.env.GOOGLE_SITE_VERIFICATION,
  bing: process.env.BING_SITE_VERIFICATION,
};

/**
 * Link-preview tags (WhatsApp, X, LinkedIn, iMessage): a short title and one short line, kept apart
 * from the longer search description. A page that sets `openGraph` replaces the layout's whole
 * object (pages that set none showed the home page's title and URL), so every indexable page sets
 * these through here. Setting `openGraph` also drops the share card a route would inherit, so
 * `image` names it (the root card by default). A route with its own opengraph-image file passes
 * null: an explicit image would replace its card.
 */
export function shareMeta({ title, line, path, type = "website", image = "/opengraph-image" }: { title: string; line: string; path: string; type?: "website" | "article"; image?: string | null }) {
  const images = image ? { images: [{ url: image, width: 1200, height: 630, alt: title }] } : {};
  return {
    openGraph: { type, siteName: SITE_NAME, locale: "en_IN", url: path, title, description: line, ...images },
    twitter: { card: "summary_large_image" as const, title, description: line, ...images },
  };
}

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
