// Backstop for the automatic company-table refresh (src/lib/financials/auto.ts): Vercel Cron calls
// this once each weekday evening (vercel.json, 19:00 IST) so the figures move to the new trading day
// even when nobody visits. It runs one long chunk of the due run (or reports it is up to date or that
// another chunk is running) and publishes when every company has been tried.
//
// Vercel Cron sends `Authorization: Bearer $CRON_SECRET`; without CRON_SECRET set the route refuses
// everything, so local dev never writes. FINANCIALS_AUTO_REFRESH=0 turns it off along with the visit
// trigger. Crons run on production deployments only.
import { cronAuthorized } from "@/lib/cron-auth";
import { runFinancialsChunk } from "@/lib/financials/auto";

// One chunk takes up to ~4 minutes of Screener fetches; leave room to save and publish.
export const maxDuration = 300;
const BUDGET_MS = 230_000;

export async function GET(request: Request) {
  if (!cronAuthorized(request)) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (process.env.FINANCIALS_AUTO_REFRESH === "0") return Response.json({ status: "disabled" });
  try {
    return Response.json(await runFinancialsChunk(BUDGET_MS));
  } catch (e) {
    console.error("financials refresh (cron): chunk failed", e);
    return Response.json({ error: "refresh failed" }, { status: 500 });
  }
}
