// Talking to BSE and NSE politely, and downloading a filing's PDF.
//
// Both exchanges sit behind Akamai bot protection. Plain requests that say who we are (UA below) get
// answers; we never imitate a browser (no browser User-Agent, no cookie dance, no header copying)
// and when a host refuses us (403 "Access Denied") we record it and move on rather than retry
// around it. Every request to a host waits until at least PAUSE_MS has passed since the previous
// one to that host, so a backfill over hundreds of companies stays at ~one request every 2 s.
// 429s, 5xx and timeouts back off (10 s, then 30 s) and are tried at most twice more.
//
// PDFs: BSE serves a recent attachment under /AttachLive/ and moves it to /AttachHis/ after a
// while, so a 404 on AttachLive is retried once on AttachHis. The bytes are hashed (pdfSha256):
// the collect step downloads the PDF again to check quotes (Vercel has no disk to keep text on)
// and refuses to validate against a file whose hash changed.
import crypto from "node:crypto";

export const USER_AGENT = "NextResearch-concall/1.0 (earnings-call summaries for research; ~1 request per 2s)";
export const PAUSE_MS = 2000;
const BACKOFF_MS = [10_000, 30_000];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const lastAt = new Map<string, number>();

/** Waits until this host has had PAUSE_MS of quiet since our last request to it. */
async function waitTurn(url: string, pauseMs: number) {
  const host = new URL(url).host;
  const wait = (lastAt.get(host) ?? 0) + pauseMs - Date.now();
  if (wait > 0) await sleep(wait);
  lastAt.set(host, Date.now());
}

export type FailKind = "refused" | "rate_limited" | "timeout" | "http" | "not_json" | "not_pdf" | "network";
export type Fetched = { ok: true; status: number; body: Buffer } | { ok: false; kind: FailKind; detail: string };

export type PoliteOptions = { referer?: string; accept?: string; timeoutMs?: number; pauseMs?: number };

/** One GET under our own name, spaced from the last request to the same host, with backoff on 429/5xx/timeouts. */
export async function politeGet(url: string, opts: PoliteOptions = {}): Promise<Fetched> {
  for (let attempt = 0; ; attempt++) {
    await waitTurn(url, opts.pauseMs ?? PAUSE_MS);
    let res: Response;
    let body: Buffer;
    try {
      res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT, Accept: opts.accept ?? "*/*", ...(opts.referer ? { Referer: opts.referer } : {}) },
        signal: AbortSignal.timeout(opts.timeoutMs ?? 30_000),
      });
      body = Buffer.from(await res.arrayBuffer());
    } catch (e) {
      const timeout = /timeout|abort/i.test(String(e));
      if (attempt < BACKOFF_MS.length) {
        await sleep(BACKOFF_MS[attempt]);
        continue;
      }
      return { ok: false, kind: timeout ? "timeout" : "network", detail: String(e).slice(0, 160) };
    }
    if (res.ok) return { ok: true, status: res.status, body };
    // Akamai's refusal: not something to retry around.
    if (res.status === 403) {
      return { ok: false, kind: "refused", detail: `HTTP 403${/Access Denied/i.test(body.toString("utf8", 0, 600)) ? " (Akamai Access Denied)" : ""}` };
    }
    if ((res.status === 429 || res.status >= 500) && attempt < BACKOFF_MS.length) {
      await sleep(BACKOFF_MS[attempt]);
      continue;
    }
    return { ok: false, kind: res.status === 429 ? "rate_limited" : "http", detail: `HTTP ${res.status}` };
  }
}

export type JsonResult = { ok: true; data: unknown } | { ok: false; kind: FailKind; detail: string };

export async function politeJson(url: string, referer: string, timeoutMs = 30_000): Promise<JsonResult> {
  const r = await politeGet(url, { referer, accept: "application/json", timeoutMs });
  if (!r.ok) return r;
  const text = r.body.toString("utf8");
  try {
    return { ok: true, data: JSON.parse(text) };
  } catch {
    return { ok: false, kind: "not_json", detail: `HTTP ${r.status} but not JSON (${text.slice(0, 60).replace(/\s+/g, " ")})` };
  }
}

export const sha256 = (buf: Uint8Array) => crypto.createHash("sha256").update(buf).digest("hex");

export type PdfDownload =
  | { ok: true; buf: Buffer; sha256: string; url: string; detail: string }
  | { ok: false; kind: FailKind; detail: string };

export const isPdf = (buf: Uint8Array) => buf.length > 4 && Buffer.from(buf.subarray(0, 1024)).includes("%PDF");

async function downloadOnce(url: string): Promise<PdfDownload> {
  const r = await politeGet(url, { accept: "application/pdf,*/*", timeoutMs: 90_000 });
  if (!r.ok) return r;
  if (!isPdf(r.body)) return { ok: false, kind: "not_pdf", detail: `response is not a PDF (${r.body.length} bytes)` };
  return { ok: true, buf: r.body, sha256: sha256(r.body), url, detail: `${(r.body.length / 1024).toFixed(0)} KB` };
}

/** The filing's PDF; a BSE AttachLive 404 is tried again under AttachHis (the returned url is the one that worked). */
export async function downloadPdf(url: string): Promise<PdfDownload> {
  const first = await downloadOnce(url);
  if (first.ok || !url.includes("/AttachLive/")) return first;
  // Moved: a 404, or an HTML "file not found" page served with 200.
  const moved = (first.kind === "http" && /404/.test(first.detail)) || first.kind === "not_pdf";
  if (!moved) return first;
  const his = await downloadOnce(url.replace("/AttachLive/", "/AttachHis/"));
  return { ...his, detail: `AttachLive ${first.detail}; AttachHis ${his.detail}` };
}
