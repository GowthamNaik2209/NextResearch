import { test } from "node:test";
import assert from "node:assert/strict";
import { detectOutlier, oneOffReason } from "./outliers";

// Fixtures shaped like the company table's figures (revenue and net profit, ₹ Cr, FY22..FY26).

test("an impairment year: a single loss between profitable years (Tata Steel FY24)", () => {
  const o = detectOutlier({ rev: [243959, 243353, 229171, 218543, 232140], np: [41749, 8075, -4910, 3174, 10886] });
  assert.deepEqual(o, { year: "FY24", reason: "FY24 loss looks one-off (profits either side)" });
});

test("a mark-to-market loss year (Info Edge FY23)", () => {
  assert.equal(detectOutlier({ rev: [1589, 2346, 2536, 2850, 3285], np: [12882, -70, 595, 1310, 1763] })?.year, "FY23");
});

test("a one-off jump in the latest year: profit up by more rupees than sales (JSW Steel FY26)", () => {
  const o = detectOutlier({ rev: [146371, 165960, 175006, 168824, 185470], np: [20938, 4139, 8973, 3491, 25508] });
  assert.equal(o?.year, "FY26");
  assert.match(o!.reason, /^FY26 profit jump looks one-off/);
});

test("a one-off drop in the latest year (a plant write-off)", () => {
  assert.match(oneOffReason({ rev: [250, 302, 399, 488, 478], np: [40, 44, 57, 70, -83] })!, /^FY26 profit drop/);
});

test("a middle-year spike counts only when it reverses the next year", () => {
  // FY23 gain that fell away in FY24 (a debt-restructuring gain).
  assert.equal(detectOutlier({ rev: [6582, 5971, 6529, 10890, 16732], np: [-177, 2887, 660, 2072, 3163] })?.year, "FY23");
  // FY25 jump that held in FY26 (a new level, not a spike).
  assert.equal(detectOutlier({ rev: [116547, 139145, 149982, 172985, 210973], np: [8305, 12287, 8558, 37481, 33823] }), null);
});

test("a company the table marks screenOut is flagged with its own note", () => {
  const o = detectOutlier({
    rev: [null, 239, 76, 72, 1879],
    np: [null, -223, -387, -343, 1553],
    screenOut: true,
    note: "FY22 consolidated figures not shown on Screener; FY26 revenue and profit are almost entirely a one-off voucher sale",
  });
  assert.deepEqual(o, { year: "FY26", reason: "FY26 revenue and profit are almost entirely a one-off voucher sale" });
});

test("ordinary companies are not flagged", () => {
  const ordinary = {
    steadyGrower: { rev: [1000, 1200, 1400, 1600, 1800], np: [100, 120, 140, 160, 180] },
    // Operating leverage: profit 2.6x on 28% more sales, but by fewer rupees than sales grew.
    operatingLeverage: { rev: [4884, 4469, 5237, 6385, 8148], np: [203, 94, 164, 384, 988] },
    // A loss-maker turning a small profit on growing sales.
    turnaround: { rev: [4974, 7990, 9978, 6900, 8437], np: [-2396, -1776, -1422, -663, 552] },
    // A high-margin company's ordinary wobble.
    highMargin: { rev: [1000, 1100, 1300, 1400, 1500], np: [290, 245, 640, 580, 730] },
    // Losses throughout: no profit to distort.
    lossMaker: { rev: [300, 320, 340, 360, 380], np: [-40, -10, -60, -20, -70] },
    missingYears: { rev: [null, null, null, 100, 200], np: [null, null, null, 10, 90] },
  };
  for (const [name, f] of Object.entries(ordinary)) assert.equal(detectOutlier(f), null, name);
  assert.equal(detectOutlier(null), null);
});
