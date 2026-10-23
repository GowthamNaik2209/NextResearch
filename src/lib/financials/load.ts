// Server side of the company figures: reads the company table from the database and installs it
// into ./store.ts, which every supplier's `f` reads from. Every page, route and image that shows
// figures awaits ensureFinancials() before rendering; the store throws if something reads first.
//
// The table is the PUBLISHED one (./query.ts): every company's snapshot on or before the latest
// published refresh run, so all companies share one date even while a run is writing. It is kept in
// Next's data cache (tag "financials"), shared by every server instance. When the automatic refresh
// (./auto.ts) publishes a run it expires the tag, so the next request reads the new table; otherwise
// it is re-read in the background 15 minutes after it was loaded (that is how a hand-run
// scripts/refresh-financials.ts shows up, within about half an hour). Prerendered pages revalidate
// on the same clock.
//
// Each call also checks, in memory, whether the published date is behind the latest NSE trading
// day and if so schedules a refresh chunk after the response (./auto.ts); it never blocks or throws.
//
// A request mid-render when a new table is installed can show a mix of old and new figures; that
// only happens at the switch, and the next view is consistent.
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { SupplierFinancials } from "@/lib/sector-content";
import { FINANCIALS_TAG, maybeScheduleRefresh } from "./auto";
import { readPublishedTable } from "./query";
import { installFinancials, missingTickers } from "./store";

export const FINANCIALS_REVALIDATE_SECONDS = 900;

// `published` is an ISO date (the data cache stores JSON): the run the table is held to, or null.
type Table = { loadedAt: number; published: string | null; byTicker: Record<string, SupplierFinancials> };

const loadTable = unstable_cache(
  async (): Promise<Table> => {
    const { byTicker, published } = await readPublishedTable(prisma);
    if (!Object.keys(byTicker).length) throw new Error("The company table is empty - run scripts/refresh-financials.ts against this database");
    return { loadedAt: Date.now(), published: published?.toISOString() ?? null, byTicker };
  },
  ["company-financials-v2"],
  { revalidate: FINANCIALS_REVALIDATE_SECONDS, tags: [FINANCIALS_TAG] },
);

let installedAt: number | null = null;
let installedPublished: Date | null = null;
let checkedAt = 0;
// A page calls this from generateMetadata and the page body: within this window the installed
// table is used as is, without asking the data cache again.
const RECHECK_MS = 60_000;

/**
 * Loads the company table (from the cache when fresh) and installs it, once per load. If the read
 * fails but a table is already installed, keeps serving that one; only a cold server with no table
 * at all fails the request.
 */
export async function ensureFinancials(): Promise<void> {
  if (installedAt !== null) maybeScheduleRefresh(installedPublished);
  if (installedAt !== null && Date.now() - checkedAt < RECHECK_MS) return;
  let table: Table;
  try {
    table = await loadTable();
  } catch (e) {
    if (installedAt === null) throw e;
    console.error("company table: read failed, serving the installed copy", e);
    checkedAt = Date.now();
    return;
  }
  checkedAt = Date.now();
  if (table.loadedAt === installedAt) return;
  const missing = missingTickers(table.byTicker);
  if (missing.length) console.error(`company table: no figures for ${missing.join(", ")} - add with scripts/refresh-financials.ts --add=${missing.join(",")}`);
  installFinancials(table.byTicker);
  const first = installedAt === null;
  installedAt = table.loadedAt;
  installedPublished = table.published ? new Date(table.published) : null;
  if (first) maybeScheduleRefresh(installedPublished);
}

/** The figures for some tickers, for a client component that reads them from the store (the 3D explorer). */
export async function financialsFor(tickers: Iterable<string>): Promise<Record<string, SupplierFinancials>> {
  const { byTicker } = await loadTable();
  const out: Record<string, SupplierFinancials> = {};
  for (const t of tickers) if (Object.hasOwn(byTicker, t)) out[t] = byTicker[t];
  return out;
}
