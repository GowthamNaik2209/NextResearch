import { test } from "node:test";
import assert from "node:assert/strict";
import { latestFiscalYearDue, noteAfterHistoryFix } from "./refresh";

const full = [1, 2, 3, 4, 5];

test("a filled history drops the 'left blank' clauses and keeps the rest", () => {
  const note = "Lender: revenue is total income; listed Sep 2024 - pre-listing years left blank; standalone figures (no subsidiaries)";
  assert.equal(noteAfterHistoryFix(note, full, full), "Lender: revenue is total income; standalone figures (no subsidiaries)");
});

test("a note that was only the blank-years clause becomes null", () => {
  assert.equal(noteAfterHistoryFix("years before its listing or not on Screener left blank", full, full), null);
});

test("a history with a blank year keeps its note", () => {
  const note = "years before its listing or not on Screener left blank";
  assert.equal(noteAfterHistoryFix(note, [null, 2, 3, 4, 5], full), note);
  assert.equal(noteAfterHistoryFix(note, full, [1, 2, null, 4, 5]), note);
});

test("no note stays no note", () => {
  assert.equal(noteAfterHistoryFix(null, full, full), null);
});

test("a history read from the standalone page says so in the note", () => {
  assert.equal(noteAfterHistoryFix("years before its listing or not on Screener left blank", full, full, "standalone"), "standalone figures");
  assert.equal(noteAfterHistoryFix(null, [null, 2, 3, 4, 5], full, "standalone"), "standalone figures");
  assert.equal(noteAfterHistoryFix("standalone figures; listed 2024", full, full, "standalone"), "standalone figures; listed 2024");
});

test("the year whose results are due: the March year just ended from July", () => {
  // Nov 2026: FY26 (Mar 2026) is due, so a consolidated page ending Mar 2025 is checked against standalone.
  assert.equal(latestFiscalYearDue(new Date("2026-11-22T00:00:00Z")), 2026);
  assert.equal(latestFiscalYearDue(new Date("2026-07-01T00:00:00Z")), 2026);
  assert.equal(latestFiscalYearDue(new Date("2026-06-30T00:00:00Z")), 2025);
  assert.equal(latestFiscalYearDue(new Date("2027-02-10T00:00:00Z")), 2026);
});
