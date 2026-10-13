// Landing-page numbers derived straight from the authored sector content, so
// the hero stats and search index can never drift from what the product
// actually contains (no hand-typed counts).
import { listSectors, tickerForSupplier } from "./index";

export function getPlatformStats() {
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
}

export type SearchEntry = {
  kind: "sector" | "company";
  label: string;
  sub: string;
  href: string;
};

// One flat index of sectors + every company (deep-linked to the zone it sits
// in), shipped to the hero search box. ~250 short rows - cheap to send whole.
export function buildSearchIndex(): SearchEntry[] {
  const out: SearchEntry[] = [];
  for (const s of listSectors().filter((x) => !x.muted)) {
    out.push({ kind: "sector", label: s.name, sub: s.category === "policy" ? "Policy" : "Sector", href: `/sector/${s.slug}` });
    const seen = new Set<string>();
    for (const z of s.zones) {
      for (const link of z.suppliers) {
        const key = typeof link === "string" ? link : link.key;
        const sup = s.suppliers[key];
        if (!sup || seen.has(sup.name)) continue;
        seen.add(sup.name);
        out.push({
          kind: "company",
          label: sup.name,
          sub: `${sup.listed ? "Listed" : "Unlisted"} · ${z.label} · ${s.name}`,
          href: `/sector/${s.slug}/explore?zone=${encodeURIComponent(z.id)}&company=${encodeURIComponent(key)}`,
        });
      }
    }
  }
  return out;
}
