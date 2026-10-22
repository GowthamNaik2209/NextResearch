// Landing-page numbers derived straight from the authored sector content, so
// the hero stats and search index can never drift from what the product
// actually contains (no hand-typed counts).
import { listComingSoonSectors, listSectors, tickerForSupplier } from "./index";
import { sectorNumbers } from "./insights";
import { companySlug, sectorCompanyCounts } from "./companies";
import { listIpos } from "../ipo-content";
import { memoByFinancials } from "@/lib/financials/store";
import { croreShort } from "@/lib/format";

// The builders below walk every sector on each call, so each is cached until new company figures
// are installed (memoByFinancials). Results are shared: never mutate them.
export const getPlatformStats = memoByFinancials(() => {
  const sectors = listSectors().filter((s) => !s.muted);
  const tickers = new Set<string>();
  const listedTickers = new Set<string>();
  let zones = 0;
  for (const s of sectors) {
    zones += s.zones.length;
    for (const sup of Object.values(s.suppliers)) {
      const t = tickerForSupplier(sup);
      tickers.add(t);
      if (sup.listed) listedTickers.add(t);
    }
  }
  return { sectors: sectors.length, zones, companies: tickers.size, listed: listedTickers.size };
});

export type SearchEntry = {
  kind: "sector" | "ipo" | "company";
  label: string;
  sub: string;
  href: string;
  // Lower-case short forms matched alongside the label: the ticker and the initials of the
  // name ("l&t", "m&m", "sbi"), so people can type what they would say.
  aliases?: string[];
};

// "Larsen & Toubro" -> "l&t", "State Bank of India" -> "sbi": capitalised words and "&" only.
function initials(name: string): string | null {
  const parts = name.replace(/[().,]/g, " ").split(/\s+/).filter((w) => w === "&" || /^[A-Z]/.test(w));
  const ini = parts.map((w) => (w === "&" ? "&" : w[0])).join("");
  return ini.replace(/&/g, "").length >= 2 ? ini.toLowerCase() : null;
}

// One flat index shipped to the hero search box: every live sector, then every company ONCE
// (a company mapped in several sectors lists them all in its sub-line). Listed companies open
// their company page (which links to each sector's map); unlisted ones deep-link into the map. IPOs come last, with their status as of today.
export function buildSearchIndex(): SearchEntry[] {
  return [
    ...contentIndex(),
    ...listIpos().map((r): SearchEntry => ({ kind: "ipo", label: `${r.name} IPO`, sub: `IPO · ${r.status.label}`, href: `/ipos?ipo=${r.slug}`, aliases: [r.name.toLowerCase(), "ipo", "ipos"] })),
  ];
}

const contentIndex = memoByFinancials((): SearchEntry[] => {
  const sectors = listSectors().filter((x) => !x.muted);
  const out: SearchEntry[] = sectors.map((s) => ({
    kind: "sector" as const,
    label: s.name,
    sub: s.category === "policy" ? "Policy" : "Industry",
    href: `/sector/${s.slug}`,
  }));
  const companies = new Map<string, { name: string; listed: boolean; ticker: string; sectors: string[]; href: string; zone: string }>();
  for (const s of sectors)
    for (const z of s.zones)
      for (const link of z.suppliers) {
        const key = typeof link === "string" ? link : link.key;
        const sup = s.suppliers[key];
        if (!sup) continue;
        const ticker = tickerForSupplier(sup);
        const c = companies.get(ticker);
        if (c) {
          if (!c.sectors.includes(s.name)) c.sectors.push(s.name);
          continue;
        }
        companies.set(ticker, {
          name: sup.name,
          listed: sup.listed && !!sup.f?.ticker,
          ticker,
          sectors: [s.name],
          zone: z.label,
          href:
            sup.listed && sup.f?.ticker
              ? `/company/${companySlug(sup.f.ticker)}`
              : `/sector/${s.slug}/explore?zone=${encodeURIComponent(z.id)}&company=${encodeURIComponent(key)}`,
        });
      }
  for (const c of companies.values()) {
    const where = c.sectors.length === 1 ? `${c.zone} · ${c.sectors[0]}` : `${c.sectors.length} themes: ${c.sectors.join(", ")}`;
    const aliases = [initials(c.name), c.listed ? c.ticker.toLowerCase() : null].filter((a): a is string => !!a);
    out.push({
      kind: "company",
      label: c.name,
      sub: `${c.listed ? `NSE: ${c.ticker}` : "Unlisted"} · ${where}`,
      href: c.href,
      aliases: [...new Set(aliases)],
    });
  }
  return out;
});

// The hero's theme window: three rows per tab. Industries lead with the featured one, then the
// most recently added; policies the live ones, newest first, then those coming soon; IPOs the next
// issues by date (recent listings are left for the IPOs page).
export function buildHeroThemeRows(featuredSlug?: string) {
  type Row = import("@/components/landing/ThemeWindow").ThemeRow;
  const live = listSectors().filter((s) => !s.muted);
  const cards = buildSectorCards();
  const listedCount = (slug: string) => cards.find((c) => c.slug === slug)?.listed ?? 0;
  const themeRow = (s: (typeof live)[number]): Row => ({
    key: s.slug,
    icon: s.icon,
    name: s.name,
    sub: `${listedCount(s.slug)} listed companies`,
    chip: s.category === "policy" ? "Policy" : "Industry",
    chipTone: "accent",
    href: `/sector/${s.slug}`,
  });
  const industries = live.filter((s) => (s.category ?? "sector") === "sector");
  const featured = industries.find((s) => s.slug === featuredSlug);
  const sector = [...(featured ? [featured] : []), ...industries.filter((s) => s !== featured).reverse()].slice(0, 3).map(themeRow);
  const soonPolicies = listComingSoonSectors().filter((s) => s.category === "policy");
  const policy = [
    ...live.filter((s) => s.category === "policy").reverse().map(themeRow),
    ...soonPolicies.map((s): Row => ({ key: s.name, icon: s.icon, name: s.name, sub: "Policy", chip: "Coming soon", chipTone: "soon" })),
  ].slice(0, 3);
  const ipo = listIpos()
    .filter((r) => r.status.stage !== "listed")
    .slice(0, 3)
    .map((r): Row => {
      const i = r.issue;
      const size = i.totalCr != null ? croreShort(i.totalCr) : r.sectorLabel;
      return { key: r.slug, icon: r.icon, name: r.name, sub: size, chip: r.status.label, chipTone: r.status.stage === "open" || r.status.stage === "upcoming" ? "live" : "accent", href: `/ipos?ipo=${r.slug}`, ipoSlug: r.slug };
    });
  return { sector, policy, ipo };
}

// One card per sector for the Analysis Deep dive. ThemeCards is a Client Component, so only plain
// serializable fields cross the boundary - notably not `build`, each sector's three.js
// geometry function (see explore/page.tsx for the same constraint).
export const buildSectorCards = memoByFinancials(() =>
  listSectors().map((s) => {
    return {
      slug: s.slug,
      icon: s.icon,
      name: s.name,
      tagline: s.tagline,
      category: s.category,
      muted: s.muted,
      zones: s.zones.length,
      ...sectorCompanyCounts(s),
      ...sectorNumbers(s.slug),
    };
  }),
);
