// Sends the stored morning brief (src/lib/brief/run.ts sendStored): Vercel Cron calls this at 8:00 am
// IST on weekdays, and again at 8:15 to retry anyone a refused batch left out (vercel.json). Without
// RESEND_API_KEY and BRIEF_FROM it only counts the recipients (a dry run).
//
// Same guard as the other crons (CRON_SECRET). BRIEF_AUTO_SEND=0 turns the brief off.
import { cronAuthorized } from "@/lib/cron-auth";
import { sendStored } from "@/lib/brief/run";

export const maxDuration = 300;
const BUDGET_MS = 270_000;

export async function GET(request: Request) {
  if (!cronAuthorized(request)) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (process.env.BRIEF_AUTO_SEND === "0") return Response.json({ status: "disabled" });
  try {
    return Response.json(await sendStored(Date.now() + BUDGET_MS));
  } catch (e) {
    console.error("brief send (cron): failed", e);
    return Response.json({ error: "send failed" }, { status: 500 });
  }
}
