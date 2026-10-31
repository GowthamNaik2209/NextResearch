// Shapes shared by the institutional-money pipeline (src/lib/flows/): what each source parser returns,
// what the refresh writes, and what the /updates FII / DII view reads. Days are IST trading days held
// as Date at UTC midnight (like PriceBar.day and KpiSnapshot.asOf).

/** NSE's provisional cash-market figures for one day (₹ crore), NSE + BSE + MSEI combined. */
export type CashFlowDay = {
  day: Date;
  fii: { buyCr: number; sellCr: number; netCr: number };
  dii: { buyCr: number; sellCr: number; netCr: number };
};

/** Index-futures open interest (contracts) from NSE's participant-wise OI file for one day. */
export type ParticipantOiDay = {
  day: Date;
  fii: { idxFutLong: number; idxFutShort: number };
  dii: { idxFutLong: number; idxFutShort: number };
};

/** One sector's row in an NSDL fortnightly report: equity only, ₹ crore. */
export type SectorFlowRow = { sector: string; netEquityCr: number; aucEquityCr: number | null };

/** One NSDL fortnightly sector report. */
export type SectorFortnight = {
  /** Last day of the fortnight (the 15th or the month end), UTC midnight. */
  periodEnd: Date;
  /** NSDL's label for the fortnight, e.g. "October 01-15, 2026". */
  periodLabel: string;
  rows: SectorFlowRow[];
};

/** An NSDL fortnightly report that is available (from the selection page's list). */
export type FortnightLink = { periodEnd: Date; url: string };

export type DealKind = "BULK" | "BLOCK";
export type DealSide = "BUY" | "SELL";

/** One published bulk or block deal row. */
export type Deal = {
  day: Date;
  kind: DealKind;
  symbol: string;
  securityName: string;
  clientName: string;
  side: DealSide;
  quantity: number;
  price: number;
};

/** Who a deal's client is, guessed from its name: a foreign institution, a domestic one, or anyone else. */
export type PartyType = "FII" | "DII" | "OTHER";

/** One quarter of a company's shareholding pattern (% of equity). */
export type ShareholdingQuarter = {
  /** Quarter end, UTC midnight. */
  quarter: Date;
  promoters: number | null;
  fii: number | null;
  dii: number | null;
  government: number | null;
  public: number | null;
  others: number | null;
  shareholders: number | null;
};
