// The morning brief's market part (src/lib/brief/run.ts buildAndStore): Vercel Cron calls this at
// 7:30 am IST on weekdays (vercel.json), half an hour before the send.
//
// Same guard as the other crons (CRON_SECRET; refused without it, so local dev never runs it).
// BRIEF_AUTO_SEND=0 turns the brief off. Crons run on production deployments only.
import { cronAuthorized } from "@/lib/cron-auth";
import { buildAndStore } from "@/lib/brief/run";

export const maxDuration = 120;

export async function GET(request: Request) {
  if (!cronAuthorized(request)) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (process.env.BRIEF_AUTO_SEND === "0") return Response.json({ status: "disabled" });
  try {
    return Response.json(await buildAndStore());
  } catch (e) {
    console.error("brief build (cron): failed", e);
    return Response.json({ error: "build failed" }, { status: 500 });
  }
}
