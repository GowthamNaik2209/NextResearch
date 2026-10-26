// A transcript PDF's text, page by page, and the checks that decide whether it is worth sending
// to Claude: a scanned (image-only) PDF has almost no extractable text and needs OCR; a filing with
// no moderator/analyst/question markers is probably a presentation or a cover letter filed under
// the transcript heading. Pages are kept separate because every summary item cites the page its
// quote is on ([[Page N]] markers in the prompt), and validate.ts checks it there.
//
// Many filings are a one-page letter rather than the transcript: some say the transcript is on the
// company's website and give its link (followed by fetchTranscript), some point at an investor-
// relations archive page (L&T: not followed, the filing stays not_transcript with the reason), and
// some are a cover letter whose twin on the other exchange carries the PDF (the backfill tries it).
// The opening pages also say which results quarter the call was about (quarterFromText) and whether
// it was a results call at all (callKindFromText): headlines often say neither.
import { extractText, getDocumentProxy } from "unpdf";
import { quarterFromTitle } from "./discover";
import { downloadPdf } from "./fetch-pdf";
import type { FiscalQuarter } from "./types";

/** Fewer extractable characters per page than this and the PDF is treated as a scan. */
export const MIN_CHARS_PER_PAGE = 300;
/** Transcripts are rarely shorter; a 1-2 page PDF is a cover letter or an audio link. */
export const MIN_TRANSCRIPT_PAGES = 3;

export const cleanPage = (p: string) => p.replace(/\u0000/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();

/** Text of every page (1-based page N is index N-1). Throws on a PDF unpdf cannot open. */
export async function pdfPages(buf: Uint8Array): Promise<string[]> {
  // unpdf takes ownership of the buffer it is given: pass a copy.
  const pdf = await getDocumentProxy(new Uint8Array(buf));
  const { text } = await extractText(pdf, { mergePages: false });
  return (text as string[]).map(cleanPage);
}

export type TextStats = { pages: number; chars: number; charsPerPage: number };

export function textStats(pages: string[]): TextStats {
  const chars = pages.reduce((n, p) => n + p.length, 0);
  return { pages: pages.length, chars, charsPerPage: Math.round(chars / Math.max(1, pages.length)) };
}

export const looksScanned = (pages: string[]) => textStats(pages).charsPerPage < MIN_CHARS_PER_PAGE;

/** Q&A markers every call transcript has (the operator, analysts' questions). */
export const hasCallMarkers = (pages: string[]) => /moderator|operator|question|analyst|participant/i.test(pages.join(" "));

export type TextVerdict = { status: "ok" } | { status: "scanned" | "not_transcript"; reason: string };

/** Whether the extracted text is a call transcript to summarise. */
export function judgeText(pages: string[]): TextVerdict {
  const s = textStats(pages);
  if (s.pages === 0 || looksScanned(pages)) return { status: "scanned", reason: `${s.chars} characters over ${s.pages} pages (needs OCR)` };
  if (!hasCallMarkers(pages)) return { status: "not_transcript", reason: "no moderator/question markers: a presentation or letter" };
  if (s.pages < MIN_TRANSCRIPT_PAGES && s.chars < 4000) return { status: "not_transcript", reason: `${s.pages} page(s), ${s.chars} characters: a cover letter or link` };
  return { status: "ok" };
}

/**
 * Whether the call is a results call or a special one (acquisition, investor day), read from the
 * opening of the transcript where the operator names the call. Used with discover.ts
 * callKindFromTitle(): either saying "special" makes it special.
 */
export function callKindFromText(pages: string[]): "results" | "special" {
  const head = pages.slice(0, 3).join(" ").slice(0, 4000);
  const special = /acqui(sition|re)|merger|amalgamation|demerger|investor day|capital markets? day|strategy day/i.test(head);
  const results = /(quarter|half[- ]year|year) ended|(quarterly|annual|full[- ]year|Q[1-4]) (results|performance|numbers)|\bQ[1-4]\s*'?\s*(FY|20)|(financial|quarterly|annual) results|earnings (conference )?call/i.test(head);
  return special && !results ? "special" : "results";
}

/**
 * The results quarter the opening of the transcript names ("quarter ended June 30, 2026",
 * "Q1 FY27"), or null. Headlines often say nothing ("Compliance under Regulation 30"), so this is
 * what tells two filings of one call apart from two calls.
 */
export function quarterFromText(pages: string[]): FiscalQuarter | null {
  return quarterFromTitle(pages.slice(0, 3).join(" ").slice(0, 6000));
}

/** Words a results call's opening has and a broker-hosted meet or a special call often lacks. */
export const hasResultsMarkers = (pages: string[]) =>
  /(quarter|half[- ]year|year) ended|(financial|quarterly|annual) results|earnings (conference )?call|results (conference )?call/i.test(pages.slice(0, 3).join(" ").slice(0, 6000));

/** The transcript as the prompt carries it: each page under its [[Page N]] marker. */
export const pagedText = (pages: string[]) => pages.map((p, i) => `[[Page ${i + 1}]]\n${p}`).join("\n\n");

// ------------------------------------------------------------------ Link-only filings

/**
 * Some companies file a one-page letter saying the transcript "is available on the Company's
 * website" with its link (Apollo Hospitals every quarter, Lupin Q2 FY25). The link is the
 * company's own document, so it is followed (once, politely, under our own name). Extraction
 * often breaks a long URL over two lines, so a line ending in - / _ . is joined to the next.
 */
export function transcriptLinks(pages: string[]): string[] {
  const text = pages
    .slice(0, 3)
    .join("\n")
    .replace(/([-/_.=])\s*\n\s*(?=[\w-])/g, "$1");
  const out: string[] = [];
  for (const m of text.matchAll(/https?:\/\/[^\s<>"')]+/gi)) {
    const url = m[0].replace(/[.,;]+$/, "");
    let host: string;
    try {
      host = new URL(url).host.toLowerCase();
    } catch {
      continue;
    }
    if (/bseindia\.com|nseindia\.com/.test(host)) continue;
    if (/\.pdf($|\?)/i.test(url) || /transcript/i.test(url)) out.push(url);
  }
  // PDFs and links naming a transcript first.
  return [...new Set(out)].sort((a, b) => Number(/transcript/i.test(b)) - Number(/transcript/i.test(a)));
}

export type TranscriptFetch =
  | { ok: true; buf: Buffer; sha256: string; url: string; pages: string[]; verdict: TextVerdict; linkedFrom?: string; detail: string }
  | { ok: false; kind: string; detail: string };

/**
 * The filing's transcript text: its PDF, or, when that PDF is a letter pointing at the
 * transcript on the company's website, the linked PDF. `url` is where the text came from; the
 * filing keeps the exchange link as its source.
 */
export async function fetchTranscript(url: string): Promise<TranscriptFetch> {
  const pdf = await downloadPdf(url);
  if (!pdf.ok) return pdf;
  let pages: string[];
  try {
    pages = await pdfPages(pdf.buf);
  } catch (e) {
    return { ok: false, kind: "unreadable", detail: `PDF unreadable: ${String(e).slice(0, 160)}` };
  }
  const verdict = judgeText(pages);
  const first = { ok: true as const, buf: pdf.buf, sha256: pdf.sha256, url: pdf.url, pages, verdict, detail: pdf.detail };
  if (verdict.status === "ok") return first;
  const link = transcriptLinks(pages)[0];
  if (!link) return first;
  const linked = await downloadPdf(link);
  if (!linked.ok) return { ...first, detail: `${verdict.reason}; linked transcript ${link}: ${linked.detail}` };
  try {
    const p2 = await pdfPages(linked.buf);
    const v2 = judgeText(p2);
    if (v2.status !== "ok") return { ...first, detail: `${verdict.reason}; linked ${link}: ${v2.reason}` };
    return { ok: true, buf: linked.buf, sha256: linked.sha256, url: link, pages: p2, verdict: v2, linkedFrom: pdf.url, detail: `via company link ${link}` };
  } catch (e) {
    return { ...first, detail: `${verdict.reason}; linked ${link} unreadable: ${String(e).slice(0, 100)}` };
  }
}
