// The nightly signal check and alert emails (src/lib/signals/alerts.ts): Vercel Cron calls this at
// 8:30 pm IST on weekdays, after the price store's evening top-up (vercel.json). Without
// SIGNAL_ALERTS_SEND=1 (and the mailer's keys) the events are logged but no email is sent: a dry run.
//
// Same guard as the other crons (CRON_SECRET). SIGNAL_ALERTS_CHECK=0 turns the check off.
import { cronAuthorized } from "@/lib/cron-auth";
import { ensureFinancials } from "@/lib/financials/load";
import { checkSignals, sendAlerts } from "@/lib/signals/alerts";

export const maxDuration = 300;
const BUDGET_MS = 240_000;

export async function GET(request: Request) {
  if (!cronAuthorized(request)) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (process.env.SIGNAL_ALERTS_CHECK === "0") return Response.json({ status: "disabled" });
  try {
    await ensureFinancials();
    const check = await checkSignals(Date.now() + BUDGET_MS);
    const send = await sendAlerts();
    console.log("signals alerts", JSON.stringify({ check, send }));
    return Response.json({ check, send });
  } catch (e) {
    console.error("signals alerts (cron): failed", e);
    return Response.json({ error: "check failed" }, { status: 500 });
  }
}
