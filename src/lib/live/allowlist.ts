// The stock endpoints proxy third-party sites, so they only serve tickers that
// actually appear in our sector content — not an open relay.
import { listSectors } from "@/lib/sector-content";

let map: Map<string, { name: string; slug: string }> | null = null;
export function lookupTicker(ticker: string): { name: string; slug: string } | null {
  if (!map) {
    map = new Map();
    for (const s of listSectors()) {
      for (const sup of Object.values(s.suppliers)) {
        const t = sup.f?.ticker;
        if (sup.listed && t && !map.has(t)) map.set(t, { name: sup.name, slug: t });
      }
    }
  }
  return map.get(ticker) ?? null;
}
