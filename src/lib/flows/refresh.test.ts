import { test } from "node:test";
import assert from "node:assert/strict";
import { officialByTradeDate } from "./refresh";

const day = (s: string) => new Date(`${s}T00:00:00Z`);
const iso = (d: Date) => d.toISOString().slice(0, 10);

test("official figures merge by trade date: NSDL's reporting days shift back one, SEBI's stay", () => {
  const rows = officialByTradeDate({
    fpi: [
      { reportDay: day("2026-10-28"), buyCr: 0, sellCr: 0, netCr: 4197.9 },
      { reportDay: day("2026-10-29"), buyCr: 0, sellCr: 0, netCr: 1113 },
      { reportDay: day("2026-10-30"), buyCr: 0, sellCr: 0, netCr: -812.73 },
    ],
    dii: [{ reportDay: day("2026-10-30"), buyCr: 0, sellCr: 0, netCr: 1902.2 }],
    mf: [{ day: day("2026-10-23"), buyCr: 0, sellCr: 0, netCr: 2802.33 }],
  });
  assert.deepEqual(
    rows.map((r) => [iso(r.day), r.fpiNsdlNetCr, r.diiNsdlNetCr, r.mfSebiNetCr]),
    [
      ["2026-10-23", undefined, undefined, 2802.33],
      ["2026-10-27", 4197.9, undefined, undefined],
      ["2026-10-28", 1113, undefined, undefined],
      ["2026-10-29", -812.73, 1902.2, undefined],
    ],
  );
});
