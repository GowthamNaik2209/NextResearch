// The daily earnings-call top-up (src/lib/concalls/daily.ts): Vercel Cron calls this at 21:00 IST,
// Monday to Saturday (vercel.json), after most companies have filed the day's transcripts. One chunk
// of up to ~4 minutes: discover the day's transcripts on BSE/NSE, download them, send one Batch API
// request for the new ones, collect batches sent on earlier runs and store their summaries. Work it
// doesn't reach waits in ConcallFiling for the next run.
//
// OPT-IN: it does nothing unless CONCALLS_AUTO_REFRESH=1, because it spends money (Claude batch
// requests, ~$0.10 a call) and needs the concall tables (migration 20261026120000) to exist. Same
// CRON_SECRET guard as the other cron routes (refused without it, so local dev never writes). Crons
// run on production deployments only.
import { cronAuthorized } from "@/lib/cron-auth";
import { prisma } from "@/lib/prisma";
import { runConcallChunk } from "@/lib/concalls/daily";

export const maxDuration = 300;
const BUDGET_MS = 240_000;

export async function GET(request: Request) {
  if (!cronAuthorized(request)) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (process.env.CONCALLS_AUTO_REFRESH !== "1") return Response.json({ status: "disabled" });
  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ status: "disabled", reason: "ANTHROPIC_API_KEY is not set" });
  try {
    return Response.json(await runConcallChunk(prisma, { budgetMs: BUDGET_MS }));
  } catch (e) {
    console.error("concalls refresh (cron): chunk failed", e);
    return Response.json({ error: "refresh failed" }, { status: 500 });
  }
}
