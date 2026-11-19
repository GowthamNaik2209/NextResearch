import { test } from "node:test";
import assert from "node:assert/strict";
import { noteAfterHistoryFix } from "./refresh";

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
