// Local dev only: sends one test morning brief to one signed-up user (?email=), built from their own
// watchlist, so the email can be checked in a real inbox before anyone else gets it. Writes nothing:
// no EmailPref row is made and no BriefSend is logged. Refused outside `next dev`.
import { prisma } from "@/lib/prisma";
import { buildMarketBrief } from "@/lib/brief/market";
import { briefEmail, unsubscribeOneClick, watchBriefs } from "@/lib/brief/run";
import { mailerReady, sendBatch } from "@/lib/brief/mailer";

export const maxDuration = 60;
// The live site, so the test email's links open real pages (locally SITE_URL is localhost).
const LIVE_SITE = "https://nextresearchapp.in";

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") return new Response("Not found", { status: 404 });
  if (!mailerReady()) return Response.json({ error: "set RESEND_API_KEY and BRIEF_FROM in .env.local" }, { status: 400 });
  const email = new URL(request.url).searchParams.get("email")?.trim().toLowerCase();
  if (!email) return Response.json({ error: "?email= required" }, { status: 400 });

  const profile = await prisma.profile.findUnique({
    where: { email },
    select: { emailPref: { select: { token: true } }, watchlist: { select: { priceAtAdd: true, company: { select: { ticker: true, name: true } } } } },
  });
  if (!profile) return Response.json({ error: `no account for ${email}` }, { status: 404 });

  // Built fresh, not read from MorningBrief: a test is for checking the latest layout and data.
  const market = await buildMarketBrief();
  if (!market) return Response.json({ error: "no market close to build from" }, { status: 503 });
  const [watch] = await watchBriefs(market, [profile.watchlist.map((w) => ({ ticker: w.company.ticker, name: w.company.name, priceAtAdd: w.priceAtAdd.toNumber() }))]);
  const token = profile.emailPref?.token ?? "test";
  const e = briefEmail(market, watch, token, LIVE_SITE);
  // A different subject per test, so Gmail doesn't fold the tests into one conversation and trim them.
  const stamp = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" });
  const ok = await sendBatch([{ to: email, subject: `[Test ${stamp}] ${e.subject}`, html: e.html, text: e.text, unsubscribe: unsubscribeOneClick(token, LIVE_SITE) }]);
  return Response.json({ ok, to: email, subject: `[Test ${stamp}] ${e.subject}`, day: market.day, stocks: watch.items.length }, { status: ok ? 200 : 502 });
}
