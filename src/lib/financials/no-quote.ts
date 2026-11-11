// Listings no source has a traded price for (Yahoo has no symbol, Screener's current price is blank),
// so neither the daily company refresh nor the price store can read them. Both jobs skip them rather
// than count them as failed every day; the company keeps its stored figures, shown with this note.
// Pure (no I/O): shared by the refresh jobs and the rows <-> figures mapping.
export const NO_QUOTE: Readonly<Record<string, string>> = {
  DIGIFIBRE: "No traded price: a privately placed InvIT listed on BSE whose units rarely trade, so its figures are the last ones read.",
};

export const hasQuote = (ticker: string) => !(ticker in NO_QUOTE);

/** The company's own note with the no-traded-price note added (once), for a listing without a quote. */
export function withNoQuoteNote(ticker: string, note: string | null): string | null {
  const extra = NO_QUOTE[ticker];
  if (!extra || note?.includes(extra)) return note;
  return note ? `${note} ${extra}` : extra;
}

/** The note as stored: without the no-traded-price note, which comes from this file, not the table. */
export function withoutNoQuoteNote(ticker: string, note: string | null | undefined): string | null {
  const extra = NO_QUOTE[ticker];
  if (!note || !extra) return note ?? null;
  return note.replace(extra, "").trim() || null;
}
