// Banks, NBFCs and insurers do not earn a margin on sales or a return on
// operating capital, so ROCE and operating margin mean nothing for them. This
// flag lets screens, rankings and stock pages swap in lender metrics (net
// interest margin, asset quality, capital adequacy) or insurer metrics (combined
// ratio, solvency, value of new business) instead. It is kept in code, like the
// REIT list, so it holds before any financials are loaded. A holding company
// goes where most of its profit comes from. Brokers, asset managers, exchanges,
// registrars, rating agencies and insurance brokers or aggregators earn fees
// and stay "operating".
import type { SupplierFinancials } from "@/lib/sector-content";

export type CompanyKind = "operating" | "lender" | "insurer";

export const LENDERS: readonly string[] = [
  // Banks
  "HDFCBANK", "ICICIBANK", "SBIN", "AXISBANK", "KOTAKBANK",
  "INDUSINDBK", "IDFCFIRSTB", "BANDHANBNK", "FEDERALBNK", "AUBANK", "YESBANK",
  "PNB", "BANKBARODA", "CANBK", "UNIONBANK",
  // NBFCs and holding companies led by lending
  "BAJFINANCE", "BAJAJFINSV", "JIOFIN", "SHRIRAMFIN", "CHOLAFIN", "MUTHOOTFIN", "MANAPPURAM", "M&MFIN", "POONAWALLA", "SBICARD",
  // Housing finance
  "BAJAJHFL", "LICHSGFIN", "PNBHOUSING", "AADHARHFC", "AAVAS", "HOMEFIRST", "CANFINHOMES",
  // Infrastructure and energy lenders
  "RECLTD", "PFC", "IRFC", "IREDA", "HUDCO",
  // Microfinance
  "CREDITACC",
];

export const INSURERS: readonly string[] = [
  "HDFCLIFE", "SBILIFE", "ICICIPRULI", "LICI",
  "ICICIGI", "NIACL", "GICRE", "STARHEALTH", "NIVABUPA",
];

const LENDER_SET = new Set(LENDERS);
const INSURER_SET = new Set(INSURERS);

export function companyKind(ticker: string): CompanyKind {
  if (LENDER_SET.has(ticker)) return "lender";
  if (INSURER_SET.has(ticker)) return "insurer";
  return "operating";
}

/**
 * The figures as the app shows them: a lender's or an insurer's ROCE (kpi[3]) emptied, so no surface
 * (pop-up, screens, pools, decks, share images) can show it as a number. Applied only where the app
 * installs the table (./store.ts installFinancials, ./load.ts financialsFor), never on the rows the
 * refresh reads back (./query.ts readCompanyTable): the database keeps Screener's ROCE as reported,
 * and the refresh treats a null it reads as a curated "not meaningful" it would keep writing.
 */
export function forDisplay(f: SupplierFinancials): SupplierFinancials {
  if ((f.kind ?? companyKind(f.ticker)) === "operating" || !f.kpi || f.kpi[3] == null) return f;
  return { ...f, kpi: f.kpi.map((v, i) => (i === 3 ? null : v)) };
}
