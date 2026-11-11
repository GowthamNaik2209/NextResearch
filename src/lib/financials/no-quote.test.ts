import { test } from "node:test";
import assert from "node:assert/strict";
import { storeKeys } from "@/lib/prices/refresh";
import { listCompanyPages } from "@/lib/sector-content/companies";
import { hasQuote, NO_QUOTE, withNoQuoteNote, withoutNoQuoteNote } from "./no-quote";
import { financialsToRows, rowToFinancials, type CompanyFinRow } from "./rows";

const row = (ticker: string, financialsNote: string | null): CompanyFinRow =>
  ({ ticker, screenerSlug: null, externalId: null, financialsNote, screenOut: false, kpis: [], financials: [] }) as unknown as CompanyFinRow;

test("a listing with no traded price is left out of the price store, and only that", () => {
  const keys = new Set(storeKeys().map((k) => k.key));
  for (const t of Object.keys(NO_QUOTE)) assert.ok(!keys.has(t), `${t} should not be in the price store`);
  for (const p of listCompanyPages()) if (hasQuote(p.ticker)) assert.ok(keys.has(p.ticker), `${p.ticker} missing from the price store`);
});

test("every no-quote ticker is a covered company", () => {
  const tickers = new Set(listCompanyPages().map((p) => p.ticker));
  for (const t of Object.keys(NO_QUOTE)) assert.ok(tickers.has(t), `${t} is not a covered company; remove it from NO_QUOTE`);
});

test("the no-traded-price note is shown with the figures but never stored", () => {
  const note = NO_QUOTE.DIGIFIBRE;
  assert.equal(rowToFinancials(row("DIGIFIBRE", null)).note, note);
  assert.equal(rowToFinancials(row("DIGIFIBRE", "Calendar-year figures.")).note, `Calendar-year figures. ${note}`);
  assert.equal(withNoQuoteNote("DIGIFIBRE", note), note, "added once");
  assert.equal(rowToFinancials(row("LT", "Own note.")).note, "Own note.");

  assert.equal(financialsToRows(rowToFinancials(row("DIGIFIBRE", null)), new Date()).company.financialsNote, null);
  assert.equal(financialsToRows(rowToFinancials(row("DIGIFIBRE", "Calendar-year figures.")), new Date()).company.financialsNote, "Calendar-year figures.");
  assert.equal(withoutNoQuoteNote("LT", "Own note."), "Own note.");
});
