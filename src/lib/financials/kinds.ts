// Banks, NBFCs and insurers do not earn a margin on sales or a return on
// operating capital, so ROCE and operating margin mean nothing for them. This
// flag lets screens, rankings and stock pages swap in lender metrics (net
// interest margin, asset quality, capital adequacy) or insurer metrics (combined
// ratio, solvency, value of new business) instead. It is kept in code, like the
// REIT list, so it holds before any financials are loaded. A holding company
// goes where most of its profit comes from. Brokers, asset managers, exchanges,
// registrars, rating agencies and insurance brokers or aggregators earn fees
// and stay "operating".
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
