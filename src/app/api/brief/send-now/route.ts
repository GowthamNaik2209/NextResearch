// Local dev only: builds the brief for the latest close and sends it to every subscribed user now,
// the same as the 7:30 + 8:00 crons (MorningBrief, BriefSend and EmailPref rows are written, so no
// one gets that close's brief twice and the crons skip it). For a send before the crons are live.
// Needs ?confirm=send-to-all, so a stray request never mails anyone.
import { buildAndStore, sendStored } from "@/lib/brief/run";

export const maxDuration = 300;
// The live site, so the links open real pages (locally SITE_URL is localhost).
const LIVE_SITE = "https://nextresearchapp.in";

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") return new Response("Not found", { status: 404 });
  if (new URL(request.url).searchParams.get("confirm") !== "send-to-all") return Response.json({ error: "add ?confirm=send-to-all" }, { status: 400 });
  const built = await buildAndStore();
  if (built.status !== "built") return Response.json({ built });
  return Response.json({ built, sent: await sendStored(Date.now() + 270_000, LIVE_SITE) });
}
