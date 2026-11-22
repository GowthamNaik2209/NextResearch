import { test } from "node:test";
import assert from "node:assert/strict";
import { blankYearsNote, hasYearGap, latestFiscalYearDue, listingBound, noteAfterHistoryFix, preferStandalone } from "./refresh";

const full = [1, 2, 3, 4, 5];

test("a filled history drops the 'left blank' clauses and keeps the rest", () => {
  const note = "Lender: revenue is total income; listed Sep 2024 - pre-listing years left blank; standalone figures (no subsidiaries)";
  assert.equal(noteAfterHistoryFix(note, full, full), "Lender: revenue is total income; standalone figures (no subsidiaries)");
});

test("a note that was only the blank-years clause becomes null", () => {
  assert.equal(noteAfterHistoryFix("years before its listing or not on Screener left blank", full, full), null);
});

test("a history with a blank year gets the reason for that year", () => {
  const note = "years before its listing or not on Screener left blank";
  assert.equal(noteAfterHistoryFix(note, [null, 2, 3, 4, 5], full), "FY22 not on Screener, left blank");
  assert.equal(noteAfterHistoryFix(note, full, [1, 2, null, 4, 5]), "FY24 not on Screener, left blank");
  // A curated reason for the blanks (NESTLEIND) stays, with no generic clause added.
  const nestle = "Moved its financial year from January-December to April-March in 2025; earlier years are left blank";
  assert.equal(noteAfterHistoryFix(nestle, [null, null, null, 4, 5], full), nestle);
});

test("no note stays no note", () => {
  assert.equal(noteAfterHistoryFix(null, full, full), null);
});

test("a history read from the standalone page says so in the note", () => {
  assert.equal(noteAfterHistoryFix("years before its listing or not on Screener left blank", full, full, "standalone"), "standalone figures");
  assert.equal(noteAfterHistoryFix(null, [null, 2, 3, 4, 5], full, "standalone"), "standalone figures; FY22 not on Screener, left blank");
  assert.equal(noteAfterHistoryFix("standalone figures; listed 2024", full, full, "standalone"), "standalone figures; listed 2024");
});

test("the year whose results are due: the March year just ended from July", () => {
  // Nov 2026: FY26 (Mar 2026) is due, so a consolidated page ending Mar 2025 is checked against standalone.
  assert.equal(latestFiscalYearDue(new Date("2026-11-22T00:00:00Z")), 2026);
  assert.equal(latestFiscalYearDue(new Date("2026-07-01T00:00:00Z")), 2026);
  assert.equal(latestFiscalYearDue(new Date("2026-06-30T00:00:00Z")), 2025);
  assert.equal(latestFiscalYearDue(new Date("2027-02-10T00:00:00Z")), 2026);
});

const day = (iso: string) => new Date(`${iso}T00:00:00Z`);
const asOf = day("2026-11-22");

test("blank years before the listing say so; years after it are 'not on Screener'", () => {
  // Listed Sep 2024: FY22-FY24 (to Mar 2024) came before it.
  assert.equal(blankYearsNote([null, null, null, 4, 5], full, { listedOn: day("2024-09-05"), dec: false }), "FY22-FY24 before its listing, left blank");
  // Long listed (ACC, PGHH): never "before its listing".
  assert.equal(blankYearsNote([null, null, 3, 4, 5], full, { listedOn: day("2021-11-08"), dec: false }), "FY22-FY23 not on Screener, left blank");
  // Both kinds, and gaps that are not runs.
  assert.equal(blankYearsNote([null, 2, null, 4, null], full, { listedOn: day("2022-06-01"), dec: false }), "FY22 before its listing, left blank; FY24, FY26 not on Screener, left blank");
  // Calendar-year reporters name CY years; no listing date known: "not on Screener".
  assert.equal(blankYearsNote([null, 2, 3, 4, null], full, { listedOn: day("2024-12-20"), dec: true }), "CY2021 before its listing, left blank; CY2025 not on Screener, left blank");
  assert.equal(blankYearsNote([null, 2, 3, 4, 5], full, { listedOn: null, dec: false }), "FY22 not on Screener, left blank");
  assert.equal(blankYearsNote(full, full, { listedOn: null, dec: false }), null);
});

test("the listing date: price store's first day, pulled back by Screener's price CAGRs", () => {
  // A 5-year CAGR: listed at least five years ago, whatever the store's first day.
  assert.deepEqual(listingBound([1, 2, 3], day("2021-11-26"), asOf), day("2021-11-22"));
  // Listed Sep 2024: the store's first day.
  assert.deepEqual(listingBound([-51, null, null], day("2024-09-05"), asOf), day("2024-09-05"));
  // No price history yet and no CAGR at all: listed within the year.
  assert.deepEqual(listingBound([null, null, null], null, asOf), day("2025-11-22"));
  assert.equal(listingBound(null, null, asOf), null);
});

test("a consolidated view that skips years reads the standalone page when revenue agrees", () => {
  const agiCons = ["Mar 2017", "Mar 2018", "Mar 2019", "Mar 2025", "Mar 2026"];
  const agiSa = ["Mar 2022", "Mar 2023", "Mar 2024", "Mar 2025", "Mar 2026"];
  assert.equal(hasYearGap(agiCons), true);
  assert.equal(hasYearGap(agiSa), false);
  assert.equal(preferStandalone({ usable: true, years: agiCons, latestRev: 2665 }, { usable: true, years: agiSa, latestRev: 2665 }), true);
  // TARSONS: the consolidated group is much bigger (an acquired subsidiary), so it stays consolidated.
  const tarCons = ["Mar 2021", "Mar 2022", "Mar 2024", "Mar 2025", "Mar 2026"];
  assert.equal(preferStandalone({ usable: true, years: tarCons, latestRev: 423 }, { usable: true, years: agiSa, latestRev: 333 }), false);
  // No revenue to compare (a lender's page): no switch on a gap alone.
  assert.equal(preferStandalone({ usable: true, years: agiCons, latestRev: null }, { usable: true, years: agiSa, latestRev: null }), false);
});
