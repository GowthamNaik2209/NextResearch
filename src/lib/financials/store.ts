// In-memory copy of the company table (price, valuation, ratios, FY revenue/profit per ticker).
// The figures themselves live in the database: on the server, ./load.ts reads them and installs
// them here; in the browser, the 3D explorer installs the slice its page hands it. Works on both
// sides, so it must not import anything server-only.
//
// The authored content (products.ts and policies/*.ts) only names a company's ticker: `co(ticker,
// sectorNote)` returns a placeholder from finRef() below, and every install fills each placeholder
// in place. So sector pages, idea screens and decks keep reading `supplier.f` as before, and the
// same ticker shows the same figures everywhere.
import type { SupplierFinancials } from "@/lib/sector-content";

type Ref = { f: SupplierFinancials; sectorNote: string | null };

let table: Record<string, SupplierFinancials> | null = null;
let version = 0;
const refs: Ref[] = [];

/** A supplier's `f`: the ticker's figures once installed, with the sector's own note added to the company note. */
export function finRef(ticker: string, sectorNote?: string | null): SupplierFinancials {
  const ref: Ref = { f: { ticker }, sectorNote: sectorNote || null };
  refs.push(ref);
  const row = table?.[ticker];
  if (row) fill(ref, row);
  return ref.f;
}

function fill(ref: Ref, row: SupplierFinancials) {
  for (const k of Object.keys(ref.f)) if (k !== "ticker") delete (ref.f as Record<string, unknown>)[k];
  Object.assign(ref.f, row, { note: [row.note, ref.sectorNote].filter(Boolean).join("; ") || null });
}

/** Tickers the content names (co()) that `byTicker` has no figures for. */
export function missingTickers(byTicker: Record<string, SupplierFinancials>): string[] {
  return [...new Set(refs.map((r) => r.f.ticker).filter((t) => !Object.hasOwn(byTicker, t)))];
}

/**
 * Install figures: the server installs the whole table; `partial` (the browser) adds just the given
 * tickers on top of what is there. A ticker the content names but the table lacks just stays blank
 * here (one missing company must not take every page down); load.ts logs it and
 * financials.test.ts fails on it, so add it with scripts/refresh-financials.ts --add before pushing.
 */
export function installFinancials(byTicker: Record<string, SupplierFinancials>, opts: { partial?: boolean } = {}) {
  table = opts.partial ? { ...table, ...byTicker } : { ...byTicker };
  for (const ref of refs) {
    const row = table[ref.f.ticker];
    if (row && (!opts.partial || Object.hasOwn(byTicker, ref.f.ticker))) fill(ref, row);
    else if (!row && !opts.partial) for (const k of Object.keys(ref.f)) if (k !== "ticker") delete (ref.f as Record<string, unknown>)[k];
  }
  version++;
}

/** Bumps on every install, so anything derived from the figures can tell when to rebuild. */
export function financialsVersion(): number {
  return version;
}

function installed(): Record<string, SupplierFinancials> {
  if (!table) throw new Error("Company figures are not loaded: await ensureFinancials() (src/lib/financials/load.ts) before rendering");
  return table;
}

export function getFinancials(ticker: string): SupplierFinancials | null {
  const t = installed();
  return Object.hasOwn(t, ticker) ? t[ticker] : null;
}

export function listFinancials(): SupplierFinancials[] {
  return Object.values(installed());
}

/**
 * Something the derived tables also read changed (a basket stock's projection reads its price
 * statistics, ../baskets/projection-risk-data.ts): rebuild them as after an install.
 */
export function invalidateDerived() {
  version++;
}

/** A memo that rebuilds after each install, for derived tables (company pages, screens, footprints). */
export function memoByFinancials<T>(build: () => T): () => T {
  let v = -1;
  let value: T;
  return () => {
    if (v !== version) {
      value = build();
      v = version;
    }
    return value;
  };
}
