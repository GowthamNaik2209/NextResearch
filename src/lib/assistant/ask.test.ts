import assert from "node:assert/strict";
import { test } from "node:test";
import type { SearchEntry } from "../sector-content/stats";
import { findKeys, keyForHref, mentionAt, splitReply, toIndian, toThousands } from "./ask";

// A small slice of the real search index (buildSearchIndex), so these run without the database.
const INDEX: SearchEntry[] = [
  { kind: "sector", label: "Defence Procurement (DAC approvals)", sub: "Policy", href: "/sector/defenceproc" },
  { kind: "sector", label: "Railways & Metro", sub: "Industry", href: "/sector/railways" },
  { kind: "sector", label: "Pharmaceuticals", sub: "Industry", href: "/sector/pharma" },
  { kind: "company", label: "Hindustan Aeronautics", sub: "Aerospace", href: "/company/hal", aliases: ["hal"] },
  { kind: "company", label: "Bharat Electronics", sub: "Defence", href: "/company/bel", aliases: ["bel", "be"] },
  { kind: "company", label: "Sun Pharmaceutical Industries", sub: "Pharma", href: "/company/sunpharma", aliases: ["sunpharma"] },
  { kind: "company", label: "Larsen & Toubro", sub: "Railways", href: "/company/lt", aliases: ["lt", "l&t"] },
  { kind: "company", label: "Tata Steel", sub: "Real estate", href: "/company/tatasteel", aliases: ["tatasteel"] },
  { kind: "company", label: "Tata Power", sub: "Energy", href: "/company/tatapower", aliases: ["tatapower"] },
  { kind: "company", label: "Acme Unlisted", sub: "Unlisted · Pharma", href: "/sector/pharma/explore?zone=api&company=acme" },
  { kind: "ipo", label: "Zepto IPO", sub: "IPO · SEBI approved", href: "/ipos?ipo=zepto", aliases: ["zepto", "ipo", "ipos"] },
];
const keys = (q: string, current = "platform") => findKeys(q, current, INDEX);

test("questions land on the pages they name, in the order they name them", () => {
  assert.deepEqual(keys("Compare HAL and BEL valuation"), ["company:hal", "company:bel", "platform"]);
  // "pharma" also names the theme: its median P/E is what "valued" gets compared with.
  assert.deepEqual(keys("how is sun pharma valued?"), ["company:sunpharma", "sector:pharma", "platform"]);
  assert.deepEqual(keys("What does L&T do in railways?"), ["company:lt", "sector:railways", "platform"]);
  assert.deepEqual(keys("Who are the biggest companies in defence?"), ["sector:defenceproc", "platform"]);
});

test("a theme goes by its short name or the start of its first word", () => {
  assert.deepEqual(keys("How fast is the pharma industry growing?"), ["sector:pharma", "platform"]);
  assert.deepEqual(keys("pharmaceutical exports"), ["sector:pharma", "platform"]);
  assert.deepEqual(keys("rail stocks"), ["platform"]);
});

test("the page the reader is on answers 'it' and 'here'", () => {
  assert.deepEqual(keys("Is it expensive?", "company:hal"), ["company:hal", "platform"]);
  assert.deepEqual(keys("what are the risks here", "sector:pharma"), ["sector:pharma", "platform"]);
});

test("a company needs more than a shared first word; a short form needs 3 letters or capitals", () => {
  // "tata" alone names no one company; "tata steel" names one.
  assert.deepEqual(keys("tata group news"), ["platform"]);
  assert.deepEqual(keys("tata steel revenue"), ["company:tatasteel", "platform"]);
  // "be" in lower case is a word, not Bharat Electronics; "LT" in capitals is L&T.
  assert.equal(mentionAt(INDEX[4], "be careful with it"), -1);
  assert.equal(mentionAt(INDEX[6], "What is LT's order book?"), 2);
});

test("the plain word IPO means the IPO list; a named IPO means its page", () => {
  assert.deepEqual(keys("which ipos are coming up"), ["ipos", "platform"]);
  assert.deepEqual(keys("When does Zepto list?"), ["ipo:zepto", "platform"]);
});

test("links map to the pages we have facts on", () => {
  assert.equal(keyForHref("/company/hal"), "company:hal");
  assert.equal(keyForHref("/ipos?ipo=zepto"), "ipo:zepto");
  // An unlisted company opens its sector's map: the sector is the source.
  assert.equal(keyForHref("/sector/pharma/explore?zone=api&company=acme"), "sector:pharma");
});

test("the reply's last line gives the sources and is not part of the answer", () => {
  assert.deepEqual(splitReply("HAL trades at a P/E of 34.3.\nSources: 1, 2"), { answer: "HAL trades at a P/E of 34.3.", sources: [1, 2] });
  assert.deepEqual(splitReply("Answer text. **Sources:** 3"), { answer: "Answer text.", sources: [3] });
  assert.deepEqual(splitReply("No source line here."), { answer: "No source line here.", sources: [] });
  // Titles instead of numbers, on the same line as the answer.
  assert.deepEqual(splitReply("Median growth was 11.4%. Sources: Pharmaceuticals (figures as of 26 Oct 2026).", ["NextResearch", "Pharmaceuticals"]), { answer: "Median growth was 11.4%.", sources: [2] });
});

test("numbers go to the model in thousands grouping and come back in Indian grouping", () => {
  assert.equal(toThousands("Rs 3,19,944 Cr vs Rs 27,610 Cr"), "Rs 319,944 Cr vs Rs 27,610 Cr");
  assert.equal(toIndian("Rs 319,944 Cr vs Rs 27,610 Cr"), "Rs 3,19,944 Cr vs Rs 27,610 Cr");
  assert.equal(toIndian("P/E 34.3 in 2026"), "P/E 34.3 in 2026");
});
