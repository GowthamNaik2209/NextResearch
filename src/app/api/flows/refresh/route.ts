// The institutional-money top-up (src/lib/flows/refresh.ts): Vercel Cron calls this once each
// weekday evening (vercel.json, 20:30 IST, after NSE has published the day's FII/DII cash figures,
// participant OI and deals) to store the day's figures, fill any recent gap, and pick up a new NSDL
// fortnightly sector report. A run is a handful of small fetches; every source is independent and
// the JSON summary says what each did. Longer backfills are scripts/refresh-flows.ts, by hand.
//
// Same guard as the other crons (CRON_SECRET; refused without it, so local dev never writes).
// FLOWS_AUTO_REFRESH=0 turns it off. Crons run on production deployments only.
import { cronAuthorized } from "@/lib/cron-auth";
import { prisma } from "@/lib/prisma";
import { runFlowsRefresh } from "@/lib/flows/refresh";

export const maxDuration = 300;

export async function GET(request: Request) {
  if (!cronAuthorized(request)) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (process.env.FLOWS_AUTO_REFRESH === "0") return Response.json({ status: "disabled" });
  try {
    return Response.json(await runFlowsRefresh(prisma, { log: (m) => console.log(`flows refresh (cron): ${m}`) }));
  } catch (e) {
    console.error("flows refresh (cron): run failed", e);
    return Response.json({ error: "refresh failed" }, { status: 500 });
  }
}
