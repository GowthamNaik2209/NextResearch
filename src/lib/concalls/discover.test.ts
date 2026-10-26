import { test } from "node:test";
import assert from "node:assert/strict";
import {
  callKindFromTitle,
  dedupe,
  fiscalWindows,
  notTranscriptReason,
  parseBseDate,
  parseNseDate,
  quarterBefore,
  quarterFromTitle,
  quarterWindows,
  type Candidate,
} from "./discover";

const d = (s: string) => new Date(`${s}T12:00:00Z`);

test("dates: BSE and NSE times are IST", () => {
  assert.equal(parseBseDate("2026-10-23T23:26:38.503").toISOString(), "2026-10-23T17:56:38.000Z");
  assert.equal(parseNseDate("23-Oct-2026 22:50:22").toISOString(), "2026-10-23T17:20:22.000Z");
  assert.ok(Number.isNaN(parseNseDate("garbage").getTime()));
});

test("fiscalWindows: one fiscal year per window, inside BSE's 12-month limit", () => {
  const w = fiscalWindows(new Date(Date.UTC(2021, 3, 1)), new Date(Date.UTC(2026, 9, 26)));
  assert.equal(w.length, 6);
  assert.equal(w[0].from.toISOString().slice(0, 10), "2021-04-01");
  assert.equal(w[0].to.toISOString().slice(0, 10), "2022-03-31");
  assert.equal(w[5].from.toISOString().slice(0, 10), "2026-04-01");
  assert.equal(w[5].to.toISOString().slice(0, 10), "2026-10-26");
  const q = quarterWindows(w[0].from, w[0].to);
  assert.deepEqual(q.map((x) => x.to.toISOString().slice(0, 10)), ["2021-06-30", "2021-09-30", "2021-12-31", "2022-03-31"]);
});

test("quarterFromTitle reads the common headline forms", () => {
  assert.deepEqual(quarterFromTitle("Q3FY26 Earnings Call Transcript"), { fiscalYear: 2026, quarter: 3 });
  assert.deepEqual(quarterFromTitle("Q2 FY26 Earnings Call Transcript"), { fiscalYear: 2026, quarter: 2 });
  assert.deepEqual(quarterFromTitle("Transcript of the Company''s Q2FY22 earnings conference<BR> call."), { fiscalYear: 2022, quarter: 2 });
  assert.deepEqual(quarterFromTitle("Q1 FY 2026-27 results call"), { fiscalYear: 2027, quarter: 1 });
  assert.deepEqual(quarterFromTitle("Audio Recording Link for the Earnings Call for the Quarter Ended September 30,2026"), { fiscalYear: 2027, quarter: 2 });
  assert.deepEqual(quarterFromTitle("results for the quarter and year ended 31st March, 2026"), { fiscalYear: 2026, quarter: 4 });
  assert.equal(quarterFromTitle("Please refer the enclosed file."), null);
  assert.deepEqual(quarterBefore(d("2026-08-06")), { fiscalYear: 2027, quarter: 1 });
  assert.deepEqual(quarterBefore(d("2026-05-29")), { fiscalYear: 2026, quarter: 4 });
  assert.deepEqual(quarterBefore(d("2026-02-04")), { fiscalYear: 2026, quarter: 3 });
});

test("notTranscriptReason: audio links, AGMs, presentations, media calls", () => {
  assert.equal(notTranscriptReason("Audio Recording Link for the Earnings Call for the Quarter Ended September 30,2026"), "audio/video link");
  assert.equal(notTranscriptReason("Transcript of the 40th Annual General Meeting"), "AGM/EGM");
  assert.equal(notTranscriptReason("Investor Presentation Q2 FY27"), "presentation");
  assert.equal(notTranscriptReason("ICICI Bank Limited has informed the Exchange about transcript of the call with media"), "media call");
  assert.equal(notTranscriptReason("Audio Transcript and Prepared Remarks from Management of Q2FY27 Earning Conference Call"), null);
  assert.equal(notTranscriptReason("Please refer the enclosed file."), null);
  assert.equal(notTranscriptReason("Q2 FY26 Earnings Call Transcript"), null);
});

test("callKindFromTitle: acquisition / investor-day calls are special, results calls are not", () => {
  assert.equal(callKindFromTitle("Transcript of Sun Pharma-Organon Acquisition Investor Call held on April 27, 2026"), "special");
  // Sun Pharma's Q4 FY26 results call: the headline alone cannot tell, the text decides.
  assert.equal(callKindFromTitle("Transcript for 22 May 2026 Analyst Meet"), "results");
  assert.equal(callKindFromTitle("Q4 FY26 Earnings Call Transcript"), "results");
  assert.equal(callKindFromTitle("Transcript of earnings call on Q2 results and the acquisition of XYZ"), "results");
  assert.equal(callKindFromTitle("Please refer the enclosed file."), "results");
});

let seq = 0;
function cand(p: Partial<Candidate> & { filedAt: Date }): Candidate {
  const title = p.title ?? "Earnings Call Transcript";
  return {
    ticker: "SUNPHARMA",
    exchange: "BSE",
    exchangeId: `id${++seq}`,
    url: "u",
    title,
    kind: "transcript",
    callKind: callKindFromTitle(title),
    guess: quarterFromTitle(title) ?? quarterBefore(p.filedAt),
    guessFromTitle: !!quarterFromTitle(title),
    ...p,
  };
}

test("dedupe: NSE twin of a BSE filing within 3 days is dropped, later NSE kept", () => {
  const b = cand({ filedAt: d("2026-08-06") });
  const n1 = cand({ exchange: "NSE", filedAt: d("2026-08-07") });
  const n2 = cand({ exchange: "NSE", filedAt: d("2026-11-10") });
  const other = cand({ ticker: "CIPLA", exchange: "NSE", filedAt: d("2026-08-06") });
  const r = dedupe([b, n1, n2, other]);
  assert.deepEqual(r.kept.map((k) => k.exchangeId).sort(), [b.exchangeId, n2.exchangeId, other.exchangeId].sort());
  assert.equal(r.duplicates.length, 1);
  assert.equal(r.duplicates[0].reason, "other_exchange");
});

test("dedupe: a re-filed transcript keeps the latest; distinct quarters stay", () => {
  const first = cand({ title: "Q1 FY27 Earnings Call Transcript", filedAt: d("2026-08-06") });
  const fixed = cand({ title: "Revised Q1 FY27 Earnings Call Transcript", filedAt: d("2026-08-20") });
  const next = cand({ title: "Q2 FY27 Earnings Call Transcript", filedAt: d("2026-11-10") });
  const r = dedupe([first, fixed, next]);
  assert.deepEqual(r.kept.map((k) => k.exchangeId), [fixed.exchangeId, next.exchangeId]);
  assert.equal(r.duplicates[0].filing.exchangeId, first.exchangeId);
  assert.equal(r.duplicates[0].reason, "refiled");
});

test("dedupe: Sun Pharma May 2026 - acquisition call and the Q4 results call both kept", () => {
  const special = cand({ title: "Transcript of Sun Pharma - Organon Acquisition Investor Call", filedAt: d("2026-05-05") });
  const results = cand({ title: "Please find enclosed the transcript", filedAt: d("2026-05-29") });
  const nseTwinOfResults = cand({ exchange: "NSE", title: "Sun Pharmaceutical Industries Limited has informed the Exchange about Transcript", filedAt: d("2026-05-30") });
  const nseTwinOfSpecial = cand({ exchange: "NSE", title: "Sun Pharmaceutical Industries Limited has informed the Exchange about Transcript", filedAt: d("2026-05-05") });
  const r = dedupe([special, results, nseTwinOfResults, nseTwinOfSpecial]);
  assert.deepEqual(r.kept.map((k) => k.exchangeId), [special.exchangeId, results.exchangeId]);
  assert.equal(special.callKind, "special");
  assert.equal(r.duplicates.length, 2);
  assert.equal(r.duplicates.find((x) => x.filing === nseTwinOfSpecial)?.keptId, special.exchangeId);
});

test("dedupe: two calls with date-inferred quarters far apart are not merged", () => {
  const a = cand({ title: "Please refer the enclosed file.", filedAt: d("2026-05-05") });
  const b = cand({ title: "Please refer the enclosed file.", filedAt: d("2026-06-10") });
  assert.equal(dedupe([a, b]).kept.length, 2);
});
