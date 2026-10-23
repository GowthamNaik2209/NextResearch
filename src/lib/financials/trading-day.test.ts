import { test } from "node:test";
import assert from "node:assert/strict";
import { istDay, isRefreshDue, isTradingDay, latestDueTradingDay, pickSnapshot, publishedCutoff } from "./trading-day";

const day = (s: string) => new Date(`${s}T00:00:00Z`);
// An instant given in IST wall-clock time.
const ist = (s: string) => new Date(`${s}+05:30`);
const iso = (d: Date | null | undefined) => d?.toISOString().slice(0, 10) ?? null;

test("istDay uses the Indian calendar date, not the server's", () => {
  assert.equal(iso(istDay(ist("2026-10-23T00:10:00"))), "2026-10-23"); // 18:40 UTC on the 22nd
  assert.equal(iso(istDay(ist("2026-10-22T23:59:00"))), "2026-10-22");
});

test("weekends and NSE holidays are not trading days", () => {
  assert.equal(isTradingDay(day("2026-10-23")), true); // Friday
  assert.equal(isTradingDay(day("2026-10-24")), false); // Saturday
  assert.equal(isTradingDay(day("2026-10-25")), false); // Sunday
  assert.equal(isTradingDay(day("2026-10-20")), false); // Dussehra
  assert.equal(isTradingDay(day("2026-12-25")), false); // Christmas
});

test("a trading day's figures are due from 18:30 IST", () => {
  assert.equal(iso(latestDueTradingDay(ist("2026-10-23T18:29:00"))), "2026-10-22");
  assert.equal(iso(latestDueTradingDay(ist("2026-10-23T18:30:00"))), "2026-10-23");
  assert.equal(iso(latestDueTradingDay(ist("2026-10-23T23:59:00"))), "2026-10-23");
  // Before 18:30 on Thursday the due day is Wednesday.
  assert.equal(iso(latestDueTradingDay(ist("2026-10-22T09:00:00"))), "2026-10-21");
});

test("weekends and holidays fall back to the last trading day", () => {
  assert.equal(iso(latestDueTradingDay(ist("2026-10-24T12:00:00"))), "2026-10-23"); // Saturday -> Friday
  assert.equal(iso(latestDueTradingDay(ist("2026-10-26T10:00:00"))), "2026-10-23"); // Monday morning -> Friday
  // Wednesday 21 Oct morning: Tuesday 20th is Dussehra, so Monday 19th.
  assert.equal(iso(latestDueTradingDay(ist("2026-10-21T10:00:00"))), "2026-10-19");
  // Evening of the holiday itself: still Monday.
  assert.equal(iso(latestDueTradingDay(ist("2026-10-20T20:00:00"))), "2026-10-19");
});

test("a refresh is due only when the published date is behind the due trading day", () => {
  const fridayNight = ist("2026-10-23T19:00:00");
  assert.equal(isRefreshDue(day("2026-10-22"), fridayNight), true);
  assert.equal(isRefreshDue(day("2026-10-23"), fridayNight), false);
  assert.equal(isRefreshDue(day("2026-10-23"), ist("2026-10-25T12:00:00")), false); // weekend: nothing new
  assert.equal(isRefreshDue(day("2026-10-22"), ist("2026-10-23T17:00:00")), false); // Friday's not due yet
  assert.equal(isRefreshDue(null, fridayNight), true);
});

test("the cutoff is the latest published run, else the day before the first run, else none", () => {
  assert.equal(iso(publishedCutoff(day("2026-10-22"), day("2026-10-01"))), "2026-10-22");
  assert.equal(iso(publishedCutoff(null, day("2026-10-23"))), "2026-10-22");
  assert.equal(publishedCutoff(null, null), null);
});

test("each company shows its latest snapshot on or before the published date", () => {
  const snaps = [{ asOf: day("2026-10-21") }, { asOf: day("2026-10-23") }, { asOf: day("2026-10-22") }];
  // A run for the 23rd is half written: the 23rd stays hidden until it publishes.
  assert.equal(iso(pickSnapshot(snaps, day("2026-10-22"))?.asOf), "2026-10-22");
  assert.equal(iso(pickSnapshot(snaps, day("2026-10-23"))?.asOf), "2026-10-23");
  // A company the run could not read keeps its own older date.
  assert.equal(iso(pickSnapshot([{ asOf: day("2026-10-14") }], day("2026-10-23"))?.asOf), "2026-10-14");
  // Only newer snapshots than the cutoff: nothing to show.
  assert.equal(pickSnapshot([{ asOf: day("2026-10-23") }], day("2026-10-22")), undefined);
  // No cutoff (no runs recorded): the latest.
  assert.equal(iso(pickSnapshot(snaps, null)?.asOf), "2026-10-23");
});
