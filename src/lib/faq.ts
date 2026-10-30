// Short question-and-answer pairs for the sector and company pages: the direct, quotable statements
// answer engines (Google's AI answers, ChatGPT search, Perplexity) lift into replies, also sent as
// FAQPage structured data. Every answer is built from the page's own content and the company table,
// never hand-written, so it always matches what the page shows. Questions whose answer would repeat
// a box on the same page word for word (a sector's "Why now", a company's risks) are left out.
import { companyLinkKey, linkWeight, type ExposureStrength, type ExposureType, type SectorWithSlug } from "@/lib/sector-content";
import { isUnlisted, sectorCompanies, sectorCompanyCounts, type CompanyPage, type CompanyAppearance } from "@/lib/sector-content/companies";
import { croreFromLabel } from "@/components/stock/merge";
import { croreShort } from "@/lib/format";
import { dataAsOf } from "@/lib/sector-content/insights";

export type Faq = { q: string; a: string };

/**
 * "A, B and C"; "A; B; and C" when an item has its own commas ("Landing Gear, Undercarriage &
 * Actuation"), so items stay apart. Past `max`, the rest is counted: "A, B and 3 more".
 */
export function listJoin(xs: string[], max = Infinity): string {
  const shown = xs.length > max ? [...xs.slice(0, max), `${xs.length - max} more`] : xs;
  if (shown.length <= 1) return shown.join("");
  const sep = shown.some((x) => x.includes(",")) ? "; " : ", ";
  return `${shown.slice(0, -1).join(sep)}${sep === "; " ? "; and " : " and "}${shown[shown.length - 1]}`;
}
export const sentence = (t: string) => (/[.!?]$/.test(t.trim()) ? t.trim() : `${t.trim()}.`);
// "20 Microns'" and "Reliance Industries'", not "...s's".
const possessive = (name: string) => (name.endsWith("s") ? `${name}'` : `${name}'s`);
// Stat labels mid-sentence: "dividend yield", but P/E, ROCE and ROE as written.
const midLabel = (label: string) => (/[a-z]/.test(label.slice(1)) ? label.toLowerCase() : label);
// "the Sintered magnet making layer", but "the DC Operators & REIT Layer", not "...Layer layer".
const layerName = (label: string) => (/\blayer$/i.test(label) ? label : `${label} layer`);
// Only listed companies have a page and figures, so unlisted ones are named as such.
const unlistedTag = (name: string, unlisted: boolean) => (unlisted ? `${name} (not NSE-listed)` : name);

// How central a company is to a sector: its strongest link (3 high, 2 medium, 1 low; a lender or
// other side link half a step lower), as the exposure badges on the page rate it.
const weightOf = (zones: { exposureType?: ExposureType; exposureStrength?: ExposureStrength }[]) =>
  Math.max(0, ...zones.map((z) => linkWeight({ key: "", ...z })));

export function sectorFaq(sector: SectorWithSlug): Faq[] {
  const { listed } = sectorCompanyCounts(sector);
  const isIndex = sector.category === "index";
  const ranked = sectorCompanies(sector)
    .filter((c) => c.supplier.listed && c.supplier.f?.ticker)
    .map((c) => ({ c, cap: croreFromLabel(c.supplier.f?.mcap), w: weightOf(c.zones) }))
    .filter((x): x is typeof x & { cap: number } => x.cap != null)
    .sort((a, b) => b.cap - a.cap);
  // "Largest" counts only companies the sector is a main business for: ranked over all of them, Real
  // Estate's were HDFC Bank, SBI and L&T (there as lenders and a contractor) and Rare-Earth Magnets'
  // were L&T, HAL and Bajaj Auto. High exposure first; high or medium where too few are high.
  const high = ranked.filter((x) => x.w >= 3);
  const mid = ranked.filter((x) => x.w >= 2);
  const [pool, exposure] = high.length >= 3 ? [high, "high exposure"] : mid.length >= 3 ? [mid, "high or medium exposure"] : [ranked, ""];
  const largest = pool.slice(0, 5).map(({ c, cap }) => `${c.supplier.name} (${croreShort(cap)})`);
  const largestLabel = exposure && pool.length < ranked.length ? `The largest with ${exposure}, by market cap` : "The largest by market cap";
  const zones = sector.zones.map((z) => z.label);
  const faqs: Faq[] = [];

  if (isIndex) {
    faqs.push({ q: `Which industries make up the ${sector.name}?`, a: `The ${possessive(sector.name)} ${listed} stocks fall into ${zones.length} NSE industries: ${listJoin(zones)}.` });
    if (largest.length) faqs.push({ q: `What are the largest ${sector.name} stocks?`, a: `By market cap as of ${dataAsOf()}: ${listJoin(largest)}.` });
  } else {
    faqs.push({
      q: `Which listed companies are in India's ${sector.name} supply chain?`,
      a: `NextResearch maps ${listed} listed companies across ${zones.length} layers of the ${sector.name} supply chain.${largest.length ? ` ${largestLabel} as of ${dataAsOf()}: ${listJoin(largest)}.` : ""}`,
    });
    faqs.push({ q: `What are the layers of the ${sector.name} supply chain?`, a: `${zones.length} layers: ${listJoin(zones)}.` });
    const integrator = sector.integratorZoneId ? sector.zones.find((z) => z.id === sector.integratorZoneId) : undefined;
    // Main end players (high or medium exposure), largest first; low-exposure entrants (L&T and
    // Titagarh among the naval shipyards) are named apart rather than as peers of the majors.
    const capOf = new Map(ranked.map((x) => [x.c.supplier.name, x.cap]));
    const ends = [
      ...new Map(
        (integrator?.suppliers ?? []).flatMap((l) => {
          const sup = sector.suppliers[companyLinkKey(l)];
          return sup ? [[unlistedTag(sup.name, isUnlisted(sup)), linkWeight(l)] as const] : [];
        }),
      ),
    ].sort((a, b) => (capOf.get(b[0]) ?? -1) - (capOf.get(a[0]) ?? -1));
    const main = ends.filter(([, w]) => w >= 2).map(([n]) => n);
    const minor = ends.filter(([, w]) => w < 2).map(([n]) => n);
    if (integrator && ends.length)
      faqs.push({
        q: `Who are the end players in ${sector.name}?`,
        a: main.length
          ? `In the ${layerName(integrator.label)}: ${listJoin(main, 8)}.${minor.length ? ` Also there, with low exposure: ${listJoin(minor, 4)}.` : ""}`
          : `In the ${layerName(integrator.label)}: ${listJoin(minor, 8)}.`,
      });
  }
  // One bottleneck from each layer that has them, tagged with its layer as the page tags them: the
  // first three of the whole list all came from the first layer and misdescribed the sector.
  const bottlenecks = sector.zones.filter((z) => z.bottlenecks?.length).map((z) => `${z.label}: ${sentence(z.bottlenecks![0])}`);
  if (bottlenecks.length)
    faqs.push({
      q: isIndex ? `What are the key risks for the ${sector.name}?` : `What are the bottlenecks in India's ${sector.name} supply chain?`,
      a: `${bottlenecks.slice(0, 4).join(" ")}${bottlenecks.length > 4 ? ` More by ${isIndex ? "industry" : "layer"} on this page.` : ""}`,
    });
  return faqs;
}

/** Theme names (not index memberships) a company is mapped in, its primary one first. */
export function chainThemes(c: CompanyPage, primary: CompanyAppearance, isIndex: (a: CompanyAppearance) => boolean): string[] {
  const names = [...new Set(c.appearances.filter((a) => !isIndex(a)).map((a) => a.sectorName))];
  return names.includes(primary.sectorName) ? [primary.sectorName, ...names.filter((n) => n !== primary.sectorName)] : names;
}

/**
 * The one-line "where it sits" for link previews and llms.txt. A company in several themes (L&T is in
 * nine) is described by all of them, not by its primary record's one layer.
 */
export function companyWhere(c: CompanyPage, primary: CompanyAppearance, isIndex: (a: CompanyAppearance) => boolean): string {
  const themes = chainThemes(c, primary, isIndex);
  if (themes.length > 1) return `In ${themes.length} supply chains, incl. ${themes[0]}`;
  return `${primary.sectorName} · ${primary.zoneLabel}`;
}

/** `figures`: the snapshot the page itself shows (label + formatted value), so the answer matches it. */
export function companyFaq(c: CompanyPage, primary: CompanyAppearance, figures: { asOf: string; stats: { label: string; value: string }[] }, isIndex: (a: CompanyAppearance) => boolean): Faq[] {
  const chains = c.appearances.filter((a) => !isIndex(a));
  const themes = chainThemes(c, primary, isIndex);
  // A multi-theme company's role line is its primary theme's (as the page labels it), so say so.
  const faqs: Faq[] = [
    {
      q: `What does ${c.name} do?`,
      a: themes.length > 1 ? `In ${primary.sectorName}: ${sentence(primary.role)} NextResearch maps it in ${themes.length} supply chains: ${listJoin(themes)}.` : sentence(primary.role),
    },
  ];
  if (chains.length)
    faqs.push({
      q: `Where does ${c.name} sit in the supply chain?`,
      a: `${c.name} (NSE: ${c.ticker}) is mapped in ${chains.length} supply-chain layer${chains.length > 1 ? "s" : ""}: ${listJoin(chains.map((a) => `${a.zoneLabel} (${a.sectorName})`), 4)}.`,
    });
  else faqs.push({ q: `Which industry is ${c.name} in?`, a: `${listJoin(c.appearances.map((a) => `${a.zoneLabel}, in the ${a.sectorName}`))}.` });
  const peers = primary.peers.filter((p) => p.name !== c.name).map((p) => unlistedTag(p.name, p.unlisted));
  const where = isIndex(primary) ? `In the ${possessive(primary.sectorName)} ${primary.zoneLabel} industry` : `In the ${layerName(primary.zoneLabel)} of ${primary.sectorName}`;
  if (peers.length) faqs.push({ q: `Who are ${possessive(c.name)} peers?`, a: `${where}: ${listJoin(peers, 6)}.` });
  const valuation = figures.stats.filter((s) => s.label !== "Price");
  if (valuation.length) faqs.push({ q: `What is ${possessive(c.name)} market cap and valuation?`, a: `As of ${figures.asOf}: ${valuation.map((s) => `${midLabel(s.label)} ${s.value}`).join(", ")}.` });
  return faqs;
}

/** The FAQPage node for a page's JSON-LD @graph. */
export function faqJsonLd(faqs: Faq[]) {
  return {
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
}
