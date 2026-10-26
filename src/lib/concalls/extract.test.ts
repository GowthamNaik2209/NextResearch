import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { callKindFromText, judgeText, pagedText, pdfPages, textStats } from "./extract";

const body = (n: number) => "Moderator: Ladies and gentlemen, good day. The first question is from the line of an analyst. ".repeat(n);

test("judgeText: transcript, scan, presentation, cover letter", () => {
  assert.deepEqual(judgeText([body(5), body(5), body(5), body(5)]), { status: "ok" });
  assert.equal(judgeText(["", "  ", "x"]).status, "scanned");
  assert.equal(judgeText([]).status, "scanned");
  assert.equal(judgeText(["Revenue grew 12% in the quarter, EBITDA margin expanded. ".repeat(20)]).status, "not_transcript");
  assert.equal(judgeText(["Dear Sir, please find the link to the audio recording of the earnings call. Moderator ".repeat(5)]).status, "not_transcript");
});

test("callKindFromText", () => {
  assert.equal(callKindFromText(["Sun Pharma Organon Acquisition Investor Call, April 27, 2026. Moderator: Good morning"]), "special");
  assert.equal(callKindFromText(["Earnings Conference Call for the quarter ended June 30, 2026. Moderator"]), "results");
  assert.equal(callKindFromText(["Q4 FY26 earnings call. We also discussed the acquisition of Checkpoint."]), "results");
});

test("pagedText and textStats", () => {
  assert.equal(pagedText(["a", "b"]), "[[Page 1]]\na\n\n[[Page 2]]\nb");
  assert.deepEqual(textStats(["abcd", "ef"]), { pages: 2, chars: 6, charsPerPage: 3 });
});

// A real transcript, when the prototype's cache is on this machine (it is gitignored).
const sample = [".concall-cache/BEL/transcript.pdf", ".concall-cache/CIPLA/transcript.pdf"].map((p) => path.join(process.cwd(), p)).find((p) => fs.existsSync(p));
test("pdfPages reads a cached transcript", { skip: !sample && "no cached PDF" }, async () => {
  const pages = await pdfPages(fs.readFileSync(sample!));
  assert.ok(pages.length > 5);
  assert.equal(judgeText(pages).status, "ok");
  assert.equal(callKindFromText(pages), "results");
});

test("transcriptLinks: a link broken over two lines is joined; exchange links are ignored", async () => {
  const { transcriptLinks, quarterFromText, hasResultsMarkers } = await import("./extract");
  const letter = [
    "Kindly note of the same.\nhttps://www.apollohospitals.com/sites/default/files/2026-05/transcript-of-apollo-hospitals---\nq4-fy26-earnings-call.pdf\nThe link to access the said transcript is:\nsee also https://www.bseindia.com/xml-data/x.pdf",
  ];
  assert.deepEqual(transcriptLinks(letter), ["https://www.apollohospitals.com/sites/default/files/2026-05/transcript-of-apollo-hospitals---q4-fy26-earnings-call.pdf"]);
  assert.deepEqual(transcriptLinks(["web link of which is https://www.lupin.com/wp-content/uploads/2024/11/lupin-transcript-\nq2fy25-earnings-call.pdf."]), [
    "https://www.lupin.com/wp-content/uploads/2024/11/lupin-transcript-q2fy25-earnings-call.pdf",
  ]);
  assert.deepEqual(quarterFromText(["Earnings call for the quarter ended June 30, 2022. Moderator: ..."]), { fiscalYear: 2023, quarter: 1 });
  assert.equal(hasResultsMarkers(["Analyst meet hosted by XYZ Securities"]), false);
});
