// Browser-side sector loader for the 3D explorer. Each sector is its own chunk (a dynamic import
// per slug), so /sector/<slug>/explore downloads that sector's zones, suppliers and 3D model only,
// not every sector's (~20k lines of geometry). Server code uses ../index.ts (getSector) instead.
// Keep the slugs in step with the registry in ../products.ts: validate:content and
// sector-load.test.ts fail when they drift.
import type { SectorDef, SectorWithSlug } from "../core";

type SectorModule = { default: unknown };

// Static import() calls (not a template path), so the bundler emits exactly one chunk per sector.
export const SECTOR_LOADERS: Record<string, () => Promise<SectorModule>> = {
  ev4w: () => import("./ev4w"),
  semiconductors: () => import("./semiconductors"),
  datacenter: () => import("./datacenter"),
  railways: () => import("./railways"),
  naval: () => import("./naval"),
  aerospace: () => import("./aerospace"),
  telecom5g: () => import("./telecom5g"),
  solarmodules: () => import("./solarmodules"),
  energy: () => import("./energy"),
  realestate: () => import("./realestate"),
  pharma: () => import("./pharma"),
  semicon2: () => import("./semicon2"),
  rareearth: () => import("./rareearth"),
  defenceproc: () => import("./defenceproc"),
  ecms: () => import("./ecms"),
};

// One promise per slug, so React's use() sees the same promise on every render (a new one each
// time would suspend forever) and moving back to an explorer doesn't fetch its chunk again.
const cache = new Map<string, Promise<SectorWithSlug | null>>();

/** The sector for an explorer page, loaded on demand; null for an unknown slug. */
export function loadSector(slug: string): Promise<SectorWithSlug | null> {
  let p = cache.get(slug);
  if (!p) {
    const load = Object.hasOwn(SECTOR_LOADERS, slug) ? SECTOR_LOADERS[slug] : null;
    p = load ? load().then((m) => ({ slug, ...(m.default as SectorDef) })) : Promise.resolve(null);
    // A failed chunk load (flaky network) shouldn't stick: the next render tries again.
    p.catch(() => cache.delete(slug));
    cache.set(slug, p);
  }
  return p;
}
