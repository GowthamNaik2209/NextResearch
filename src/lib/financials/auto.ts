// The app's side of the automatic refresh (the work itself is ./refresh.ts): a page view that finds
// the published figures older than the latest NSE trading day (past 18:30 IST) schedules one chunk
// with after(), so the response is never held up; the daily cron (src/app/api/financials/refresh)
// is the backstop for days nobody visits. Only one chunk runs at a time across every instance (the
// run's lease), and when a chunk publishes the run the financials cache is revalidated so the site
// moves to the new date in one step.
//
// Off unless enabled: on by default in Vercel production and preview (VERCEL_ENV), off everywhere
// else (local dev, tests, scripts), so a dev server never writes to the shared database.
// FINANCIALS_AUTO_REFRESH=1 turns it on, =0 off, wherever it runs. Imported only by server code
// (./load.ts and the route); it uses next/server and next/cache, so the scripts can't load it.
import { revalidateTag } from "next/cache";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { runChunk, type ChunkResult } from "./refresh";
import { isRefreshDue } from "./trading-day";

/** The data-cache tag of the company table (./load.ts). */
export const FINANCIALS_TAG = "financials";

// A chunk after a page view: about this long fetching companies, then it saves and stops.
const VISIT_BUDGET_MS = 40_000;
// One attempt per instance at most this often (most find another chunk holding the lease, cheaply).
const ATTEMPT_EVERY_MS = 60_000;
const AFTER_ERROR_WAIT_MS = 10 * 60_000;

export function autoRefreshEnabled(): boolean {
  const v = process.env.FINANCIALS_AUTO_REFRESH;
  if (v === "1") return true;
  if (v === "0") return false;
  return process.env.VERCEL_ENV === "production" || process.env.VERCEL_ENV === "preview";
}

let nextAttemptAt = 0;
let running = false;

/**
 * Called on every ensureFinancials() with the date the installed table is published at. Cheap and
 * synchronous; never throws (outside a request, e.g. generateStaticParams or the build, it does nothing).
 */
export function maybeScheduleRefresh(published: Date | null): void {
  try {
    if (!autoRefreshEnabled() || process.env.NEXT_PHASE === "phase-production-build") return;
    const now = Date.now();
    if (running || now < nextAttemptAt || !isRefreshDue(published, new Date(now))) return;
    nextAttemptAt = now + ATTEMPT_EVERY_MS;
    after(async () => {
      running = true;
      try {
        await runFinancialsChunk(VISIT_BUDGET_MS);
      } catch (e) {
        nextAttemptAt = Date.now() + AFTER_ERROR_WAIT_MS;
        console.error("financials refresh: chunk failed", e);
      } finally {
        running = false;
      }
    });
  } catch {
    // after() outside a request scope: skip; the next page view or the cron will try.
  }
}

/** One chunk of the due refresh (the visit trigger and the cron route). */
export function runFinancialsChunk(budgetMs: number): Promise<ChunkResult> {
  return runChunk(prisma, {
    budgetMs,
    onPublished: () => {
      try {
        // Expire now (not stale-while-revalidate): the next request reads the newly published table.
        revalidateTag(FINANCIALS_TAG, { expire: 0 });
      } catch (e) {
        // From inside a prerender Next refuses; the table's 15-minute clock picks the run up instead.
        console.warn("financials refresh: published, cache will refresh on its 15-minute clock", String(e).slice(0, 120));
      }
    },
  });
}
