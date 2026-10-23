// Helpers every sector module shares (they used to sit at the top of products.ts).
import { finRef } from "../../financials/store";
import type { SupplierFinancials } from "../core";

// ASOF dates the authored content (suppliers' sourceDate). The figures carry their own date
// (supplier.f.asOf, the latest refresh in the database).
export const ASOF = "20 Oct 2026";
export const SRC = "Screener.in (consolidated financials)";

// COMPANY FINANCIALS BY TICKER
// Supplier rows reference a company's figures with co(ticker, sectorNote). The figures are one
// record per ticker in the database (src/lib/financials/), so the same ticker shows the same
// figures everywhere (stock pop-ups, research decks, /connections); the company-level note there
// is joined with the optional sector-specific note given here.
export function co(ticker: string, sectorNote?: string | null): SupplierFinancials {
  return finRef(ticker, sectorNote);
}
