// Database rows <-> the SupplierFinancials shape the app reads (supplier.f). Pure: shared by the
// server loader (./load.ts) and the scripts that write the table (scripts/refresh-financials.ts).
import type { SupplierFinancials } from "@/lib/sector-content";

// The five fiscal years every figure set carries, FY22..FY26 (rev[i] / np[i] is FISCAL_YEARS[i]).
// A company that reports calendar years keeps CY2021-CY2025 in these columns (its note says so).
export const FISCAL_YEARS = [2022, 2023, 2024, 2025, 2026] as const;

type Num = { toString(): string } | number | null;

export type CompanyFinRow = {
  ticker: string;
  screenerSlug: string | null;
  externalId: string | null;
  financialsNote: string | null;
  screenOut: boolean;
  // Latest first; only [0] is read.
  kpis: {
    asOf: Date;
    price: Num;
    marketCap: string | null;
    pe: Num;
    bookValue: Num;
    divYield: Num;
    roce: Num;
    roe: Num;
    faceValue: Num;
    low52w: Num;
    high52w: Num;
    cagr1y: Num;
    cagr3y: Num;
    cagr5y: Num;
  }[];
  financials: { year: number; revenueCr: Num; netProfitCr: Num }[];
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Date -> "20 Oct 2026" (dates are stored at UTC midnight). */
export function formatAsOf(d: Date): string {
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** "20 Oct 2026" -> that day at UTC midnight. */
export function parseAsOf(s: string): Date {
  const m = /^(\d{1,2}) ([A-Z][a-z]{2}) (\d{4})$/.exec(s.trim());
  const month = m ? MONTHS.indexOf(m[2]) : -1;
  if (!m || month < 0) throw new Error(`Bad as-of date "${s}" (want e.g. "20 Oct 2026")`);
  return new Date(Date.UTC(Number(m[3]), month, Number(m[1])));
}

/** 1166.6 -> "Rs 1,167"; 65.3 -> "Rs 65.3" (whole rupees from Rs 100 up, as Screener shows them). */
export function formatPrice(p: number): string {
  return `Rs ${p >= 100 ? Math.round(p).toLocaleString("en-IN") : p.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

/** "Rs 1,167" -> 1167. */
export function parseRupees(s: string | null | undefined): number | null {
  const n = s ? Number(s.replace(/Rs\s*/i, "").replace(/,/g, "").trim()) : NaN;
  return Number.isFinite(n) ? n : null;
}

const num = (v: Num): number | null => (v == null ? null : Number(v.toString()));
// A tuple with no values at all reads as "none" (consumers index it with ?.[i] ?? null either way).
const tuple = (vs: (number | null)[]) => (vs.some((v) => v != null) ? vs : null);

export function rowToFinancials(r: CompanyFinRow): SupplierFinancials {
  const k = r.kpis[0];
  const year = (y: number) => r.financials.find((f) => f.year === y);
  const price = k ? num(k.price) : null;
  const f: SupplierFinancials = {
    ticker: r.ticker,
    rev: FISCAL_YEARS.map((y) => num(year(y)?.revenueCr ?? null)),
    np: FISCAL_YEARS.map((y) => num(year(y)?.netProfitCr ?? null)),
    mcap: k?.marketCap ?? null,
    price: price == null ? null : formatPrice(price),
    note: r.financialsNote,
    cagr: k ? tuple([num(k.cagr1y), num(k.cagr3y), num(k.cagr5y)]) : null,
    range: k ? tuple([num(k.low52w), num(k.high52w)]) : null,
    tl: r.screenerSlug ? [r.externalId == null ? null : Number(r.externalId), r.screenerSlug] : null,
    kpi: k ? tuple([num(k.pe), num(k.bookValue), num(k.divYield), num(k.roce), num(k.roe), num(k.faceValue)]) : null,
    asOf: k ? formatAsOf(k.asOf) : undefined,
  };
  if (r.screenOut) f.screenOut = true;
  return f;
}

/** The figures as columns: Company fields, one KpiSnapshot (dated f.asOf) and the FY rows that have a value. */
export function financialsToRows(f: SupplierFinancials, asOf: Date) {
  const at = (a: (number | null)[] | null | undefined, i: number) => a?.[i] ?? null;
  return {
    company: {
      screenerSlug: f.tl?.[1] ?? null,
      externalId: f.tl?.[0] != null ? String(f.tl[0]) : null,
      financialsNote: f.note ?? null,
      screenOut: !!f.screenOut,
      tracked: true,
    },
    kpi: {
      asOf,
      price: parseRupees(f.price),
      marketCap: f.mcap ?? null,
      pe: at(f.kpi, 0),
      bookValue: at(f.kpi, 1),
      divYield: at(f.kpi, 2),
      roce: at(f.kpi, 3),
      roe: at(f.kpi, 4),
      faceValue: at(f.kpi, 5),
      low52w: at(f.range, 0),
      high52w: at(f.range, 1),
      cagr1y: at(f.cagr, 0),
      cagr3y: at(f.cagr, 1),
      cagr5y: at(f.cagr, 2),
    },
    years: FISCAL_YEARS.map((year, i) => ({ year, revenueCr: at(f.rev, i), netProfitCr: at(f.np, i) })).filter(
      (y) => y.revenueCr != null || y.netProfitCr != null,
    ),
  };
}
