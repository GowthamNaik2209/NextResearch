// The daily earnings-call top-up: Vercel Cron calls src/app/api/concalls/refresh each evening
// (21:00 IST, Mon-Sat), and each call runs one chunk of this:
//
//   1. claim the day's ConcallRun lease (one chunk at a time across every instance);
//   2. discover: one BSE query and one NSE query for every company's transcripts filed yesterday or
//      today (IST), kept for tracked companies, deduped (discover.ts);
//   3. insert the new ones as ConcallFiling rows (unique on exchange + exchangeId, so a filing seen
//      yesterday is not inserted again; an NSE twin of a stored BSE filing is skipped);
//   4. download + extract every filing waiting for it (new ones, and ones a past chunk could not
//      finish); scans and non-transcripts are marked and stop there;
//   5. submit ONE batch for everything fetched in this chunk (status batched, batchId set);
//   6. collect earlier batches that have ended: each result is parsed, its PDF downloaded again
//      (no disk on Vercel and no transcript text in the database) and checked against pdfSha256,
//      quotes and numbers checked, then stored (store.ts);
//   7. refresh quarterly results (and Company.bseCode) for companies that got a new summary, so
//      the call sits next to the numbers it discussed.
//
// Work left when the budget runs out stays in the table by status and the next chunk picks it up:
// a filing that is `fetched` with no batch is downloaded again (its text is not kept), a `batched`
// one is collected once its batch ends (results stay available for 29 days). A filing failing
// MAX_ATTEMPTS times (download errors, retryable batch errors) is marked failed.
//
// Spending: step 5 is the only one that costs money (Opus at batch prices, ~$0.10 a call). It runs
// only when the route is switched on (CONCALLS_AUTO_REFRESH=1, see the route).
import type { PrismaClient } from "@/generated/prisma/client";
import { refreshCompanyQuarterly } from "@/lib/financials/quarterly";
import { istDay } from "@/lib/financials/trading-day";
import { batchOutcomes, batchState, submitBatch, type BatchOutcome } from "./batch";
import { callKindFromTitle, discoverDay, isTwinOf, type Attempt } from "./discover";
import { callKindFromText, fetchTranscript } from "./extract";
import { buildRequest, type BatchRequest } from "./prompt";
import { storeSummary } from "./store";
import { checkSummary } from "./validate";

const DAY = 86_400_000;
export const MAX_ATTEMPTS = 3;
/** Downloads stop at this share of the budget so collecting earlier batches gets the rest. */
const FETCH_SHARE = 0.5;

type Run = { id: string; found: number; batched: number; summarised: number; failed: number };

/** Takes the day's run (creating it), or null when another chunk holds its lease. */
export async function claimConcallRun(prisma: PrismaClient, day: Date, leaseSeconds: number): Promise<Run | null> {
  await prisma.concallRun.upsert({ where: { day }, create: { day }, update: {} }).catch(() => {});
  const { count } = await prisma.concallRun.updateMany({
    where: { day, OR: [{ leaseUntil: null }, { leaseUntil: { lt: new Date() } }] },
    data: { leaseUntil: new Date(Date.now() + leaseSeconds * 1000) },
  });
  if (!count) return null;
  return prisma.concallRun.findUnique({ where: { day }, select: { id: true, found: true, batched: true, summarised: true, failed: true } });
}

export type ConcallChunkResult =
  | { status: "busy"; day: string }
  | {
      status: "finished" | "progress";
      day: string;
      discovered: number;
      inserted: number;
      fetched: number;
      batchId: string | null;
      batchedNow: number;
      collected: number;
      summarised: number;
      failed: number;
      quarterlyRefreshed: number;
      attempts: Attempt[];
    };

export type ConcallChunkOptions = { budgetMs: number; now?: Date; log?: (m: string) => void };

type Company = { id: string; ticker: string; name: string; bseCode: string | null; financialsNote: string | null };

export async function runConcallChunk(prisma: PrismaClient, opts: ConcallChunkOptions): Promise<ConcallChunkResult> {
  const log = opts.log ?? ((m: string) => console.log(`concalls refresh: ${m}`));
  const started = Date.now();
  const left = () => opts.budgetMs - (Date.now() - started);
  const today = istDay(opts.now ?? new Date());
  const day = today.toISOString().slice(0, 10);

  const run = await claimConcallRun(prisma, today, Math.ceil(opts.budgetMs / 1000) + 120);
  if (!run) return { status: "busy", day };

  let inserted = 0;
  let fetchedNow = 0;
  let collected = 0;
  let summarised = 0;
  let failed = 0;
  let batchId: string | null = null;
  let batchedNow = 0;
  let attempts: Attempt[] = [];
  const refreshed = new Set<string>();
  try {
    const companies: Company[] = await prisma.company.findMany({
      where: { tracked: true },
      select: { id: true, ticker: true, name: true, bseCode: true, financialsNote: true },
    });
    const byTicker = new Map(companies.map((c) => [c.ticker, c]));
    const byId = new Map(companies.map((c) => [c.id, c]));

    // 2-3. Discover yesterday + today, insert what is new.
    const found = await discoverDay(
      companies.map((c) => ({ ticker: c.ticker, bseCode: c.bseCode })),
      new Date(today.getTime() - DAY),
      today,
    );
    attempts = found.attempts;
    const known = await prisma.concallFiling.findMany({
      where: { filedAt: { gte: new Date(today.getTime() - 7 * DAY) } },
      select: { exchange: true, exchangeId: true, filedAt: true, company: { select: { ticker: true } } },
    });
    const knownIds = new Set(known.map((k) => `${k.exchange}:${k.exchangeId}`));
    const storedForTwins = known.map((k) => ({ exchange: k.exchange, filedAt: k.filedAt, companyTicker: k.company.ticker }));
    for (const c of found.candidates) {
      const co = byTicker.get(c.ticker);
      if (!co || knownIds.has(`${c.exchange}:${c.exchangeId}`) || isTwinOf(c, storedForTwins)) continue;
      const r = await prisma.concallFiling.createMany({
        data: [
          {
            companyId: co.id,
            exchange: c.exchange,
            exchangeId: c.exchangeId,
            url: c.url,
            title: c.title.slice(0, 500),
            filedAt: c.filedAt,
            status: c.kind === "transcript" ? "found" : "not_transcript",
            error: c.reason ?? null,
          },
        ],
        skipDuplicates: true,
      });
      inserted += r.count;
    }
    if (found.duplicates.length) log(`${found.duplicates.length} duplicate filing(s) skipped (${found.duplicates.map((d) => `${d.filing.ticker} ${d.reason}`).join(", ")})`);

    // 4. Download + extract everything waiting.
    const waiting = await prisma.concallFiling.findMany({
      where: { status: { in: ["found", "fetched", "download_failed"] }, batchId: null, attempts: { lt: MAX_ATTEMPTS }, company: { tracked: true } },
      orderBy: { filedAt: "asc" },
      select: { id: true, companyId: true, url: true, title: true, filedAt: true, attempts: true },
    });
    const requests: BatchRequest[] = [];
    for (const f of waiting) {
      if (left() < opts.budgetMs * (1 - FETCH_SHARE)) break;
      const co = byId.get(f.companyId);
      if (!co) continue;
      // The PDF, or the company-site transcript a link-only letter points to (extract.ts).
      const t = await fetchTranscript(f.url);
      if (!t.ok) {
        const unreadable = t.kind === "unreadable";
        const giveUp = unreadable || f.attempts + 1 >= MAX_ATTEMPTS || t.kind === "refused";
        await prisma.concallFiling.update({
          where: { id: f.id },
          data: { status: giveUp ? "failed" : "download_failed", error: `${t.kind}: ${t.detail}`.slice(0, 300), attempts: { increment: 1 } },
        });
        if (giveUp) failed++;
        if (t.kind === "refused") break; // the host refused us: no more downloads this chunk
        continue;
      }
      const pages = t.pages;
      const verdict = t.verdict;
      // pdfSha256 is the transcript's (the linked PDF's, for a link-only letter); url stays the
      // exchange filing (AttachHis when it moved), the source link users see.
      const base = { pdfSha256: t.sha256, pages: pages.length, url: t.linkedFrom ?? t.url };
      if (verdict.status !== "ok") {
        await prisma.concallFiling.update({ where: { id: f.id }, data: { ...base, status: verdict.status, error: (t.detail.includes("link") ? t.detail : verdict.reason).slice(0, 300) } });
        continue;
      }
      await prisma.concallFiling.update({ where: { id: f.id }, data: { ...base, status: "fetched", error: null } });
      requests.push(buildRequest(f.id, { companyName: co.name, ticker: co.ticker, title: f.title, filedAt: f.filedAt }, pages));
      fetchedNow++;
    }

    // 5. One batch for everything fetched now.
    if (requests.length) {
      batchId = await submitBatch(requests);
      const ids = requests.map((r) => r.custom_id);
      await prisma.concallFiling.updateMany({ where: { id: { in: ids } }, data: { status: "batched", batchId } });
      batchedNow = ids.length;
      log(`batch ${batchId}: ${ids.length} call(s) submitted`);
    }

    // 6. Collect earlier batches that have ended.
    const pending = await prisma.concallFiling.groupBy({ by: ["batchId"], where: { status: "batched", batchId: { not: null } } });
    for (const { batchId: id } of pending) {
      if (!id || id === batchId || left() < 20_000) continue;
      const state = await batchState(id);
      if (!state.ended) continue;
      const filings = new Map(
        (
          await prisma.concallFiling.findMany({
            where: { batchId: id, status: "batched" },
            select: { id: true, companyId: true, url: true, title: true, filedAt: true, pdfSha256: true, attempts: true },
          })
        ).map((f) => [f.id, f]),
      );
      for await (const out of batchOutcomes(id)) {
        if (left() < 15_000) break;
        const f = filings.get(out.customId);
        if (!f) continue; // already collected by an earlier chunk
        collected++;
        const r = await collectOne(prisma, f, out);
        if (r === "stored") {
          summarised++;
          refreshed.add(f.companyId);
        } else if (r === "failed") failed++;
      }
    }

    // 7. Quarterly results for companies with a new call.
    let quarterlyRefreshed = 0;
    for (const companyId of refreshed) {
      if (left() < 10_000) break;
      const co = byId.get(companyId);
      if (!co) continue;
      try {
        await refreshCompanyQuarterly(prisma, { id: co.id, ticker: co.ticker, financialsNote: co.financialsNote, bseCode: co.bseCode });
        quarterlyRefreshed++;
      } catch (e) {
        log(`${co.ticker}: quarterly refresh failed (${String(e).slice(0, 120)})`);
      }
    }

    const remaining = await prisma.concallFiling.count({
      where: { OR: [{ status: "batched" }, { status: { in: ["found", "fetched", "download_failed"] }, attempts: { lt: MAX_ATTEMPTS } }] },
    });
    const finished = remaining === 0;
    await prisma.concallRun.update({
      where: { id: run.id },
      data: {
        found: run.found + inserted,
        batched: run.batched + batchedNow,
        summarised: run.summarised + summarised,
        failed: run.failed + failed,
        note: attempts.filter((a) => !a.ok).map((a) => `${a.step}: ${a.detail}`).join("; ").slice(0, 500) || null,
        leaseUntil: null,
        ...(finished ? { finishedAt: new Date() } : {}),
      },
    });
    log(`${day}: +${inserted} filings, ${fetchedNow} fetched, ${batchedNow} batched, ${summarised} summarised, ${failed} failed${finished ? ", nothing pending" : ""}`);
    return {
      status: finished ? "finished" : "progress",
      day,
      discovered: found.candidates.length,
      inserted,
      fetched: fetchedNow,
      batchId,
      batchedNow,
      collected,
      summarised,
      failed,
      quarterlyRefreshed,
      attempts,
    };
  } catch (e) {
    await prisma.concallRun.update({ where: { id: run.id }, data: { leaseUntil: null, note: `chunk failed: ${String(e).slice(0, 300)}` } }).catch(() => {});
    throw e;
  }
}

type BatchedFiling = { id: string; companyId: string; url: string; title: string; filedAt: Date; pdfSha256: string | null; attempts: number };

/** One batch result: validated against a fresh download of the PDF and stored, or the filing marked. */
export async function collectOne(prisma: PrismaClient, f: BatchedFiling, out: BatchOutcome): Promise<"stored" | "retry" | "failed"> {
  const mark = async (status: "fetched" | "failed", error: string) => {
    await prisma.concallFiling.update({ where: { id: f.id }, data: { status, error: error.slice(0, 300), batchId: null, attempts: { increment: 1 } } });
    return status === "failed" ? ("failed" as const) : ("retry" as const);
  };
  if (!out.ok) return mark(out.retry && f.attempts + 1 < MAX_ATTEMPTS ? "fetched" : "failed", out.error);

  const t = await fetchTranscript(f.url);
  // Not checkable now: summarise again on a later run (the batch result is not kept).
  if (!t.ok) return mark(f.attempts + 1 < MAX_ATTEMPTS ? "fetched" : "failed", `re-download for checks failed: ${t.detail}`);
  if (f.pdfSha256 && t.sha256 !== f.pdfSha256) return mark("fetched", "the PDF changed since it was summarised");
  const pages = t.pages;
  const pdf = t;
  const checks = checkSummary(out.summary, pages);
  const callKind = callKindFromTitle(f.title) === "special" || callKindFromText(pages) === "special" ? "special" : "results";
  await storeSummary(prisma, { filing: f, callKind, summary: out.summary, checks, usage: out.usage, batch: true, pages: pages.length, pdfSha256: pdf.sha256 });
  return "stored";
}
