// The institutional-money top-up (src/lib/flows/refresh.ts): Vercel Cron calls this each weekday
// hourly from 16:00 to 21:00 IST and again at 23:00 (vercel.json) to store the day's FII/DII cash
// figures, participant OI and deals, fill any recent gap, and pick up a new NSDL fortnightly sector
// report. NSE publishes the day's figures some time in the evening, after the 15:30 close, and keeps
// only the latest day: the first run after it publishes stores them (the site shows them within a
// minute), the runs before it rewrite the day before's unchanged, and the late one catches a slow
// evening. Every write is idempotent. A run is a handful of small fetches; every source is independent and
// the JSON summary says what each did. Longer backfills are scripts/refresh-flows.ts, by hand.
//
// Same guard as the other crons (CRON_SECRET; refused without it, so local dev never writes).
// FLOWS_AUTO_REFRESH=0 turns it off. Crons run on production deployments only.
import { cronAuthorized } from "@/lib/cron-auth";
import { prisma } from "@/lib/prisma";
import { runFlowsRefresh } from "@/lib/flows/refresh";
import { FLOWS_TAG } from "@/lib/flows/query";
import { revalidateTag } from "next/cache";

export const maxDuration = 300;

export async function GET(request: Request) {
  if (!cronAuthorized(request)) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (process.env.FLOWS_AUTO_REFRESH === "0") return Response.json({ status: "disabled" });
  try {
    const summary = await runFlowsRefresh(prisma, { log: (m) => console.log(`flows refresh (cron): ${m}`) });
    // The day's figures written: every reader's shared copy of the cash days (flows/query.ts) is out of date.
    revalidateTag(FLOWS_TAG, { expire: 0 });
    return Response.json(summary);
  } catch (e) {
    console.error("flows refresh (cron): run failed", e);
    return Response.json({ error: "refresh failed" }, { status: 500 });
  }
}
