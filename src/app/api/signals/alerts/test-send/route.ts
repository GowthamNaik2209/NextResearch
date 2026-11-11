// Local dev only: emails one signed-up user (?email=) a preview alert built from their saved signals,
// so the email can be checked in a real inbox before alerts go live. With nothing met on the last
// close, each saved signal's latest backtest trade stands in, and the subject says it is a preview.
// Writes nothing: no SignalEvent is logged. Refused outside `next dev`.
import { prisma } from "@/lib/prisma";
import { ensureFinancials } from "@/lib/financials/load";
import { MARKET } from "@/lib/baskets/projection";
import { mailerReady, sendBatch } from "@/lib/brief/mailer";
import { loadStock } from "@/lib/signals/data";
import { runSignals } from "@/lib/signals/engine";
import { parseStrategy } from "@/lib/signals/strategy";
import { describeTrigger } from "@/lib/signals/describe";
import { renderAlertEmail, type AlertItem } from "@/lib/signals/alert-email";
import { resolveTarget } from "@/lib/signals/targets";

export const maxDuration = 60;
// The live site, so the test email's links open real pages (locally SITE_URL is localhost).
const LIVE_SITE = "https://nextresearchapp.in";

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") return new Response("Not found", { status: 404 });
  if (!mailerReady()) return Response.json({ error: "set RESEND_API_KEY and BRIEF_FROM in .env.local" }, { status: 400 });
  const email = new URL(request.url).searchParams.get("email")?.trim().toLowerCase();
  if (!email) return Response.json({ error: "?email= required" }, { status: 400 });
  const profile = await prisma.profile.findUnique({ where: { email }, select: { id: true, signals: { select: { scope: true, target: true, name: true, rules: true, token: true } } } });
  if (!profile) return Response.json({ error: `no account for ${email}` }, { status: 404 });
  if (!profile.signals.length) return Response.json({ error: "save a signal first (Signals > Save)" }, { status: 400 });
  await ensureFinancials();

  const items: AlertItem[] = [];
  let day = "";
  for (const s of profile.signals.slice(0, 5)) {
    const p = parseStrategy(s.rules);
    const target = p.ok && (s.scope === "stock" || s.scope === "basket") ? await resolveTarget(s.scope, s.target, profile.id) : null;
    if (!p.ok || !target) continue;
    // A basket previews its first stock: the email's layout is the same.
    const ticker = target.tickers[0];
    const d = await loadStock(ticker, false).catch(() => null);
    const r = d ? runSignals(d.mx, p.strategy, MARKET.rf) : null;
    const t = r?.trades.at(-1);
    if (!d || !r || !t) continue;
    const exited = t.exitT != null;
    day = d.lastDay;
    items.push({ name: target.name, scope: target.scope, target: target.target, ticker, kind: exited ? "exit" : "entry", why: describeTrigger(p.strategy, exited ? "exit" : "entry", exited ? t.reason : null), price: exited ? t.exitPx : t.entryPx });
  }
  if (!items.length) return Response.json({ error: "none of your saved signals has a trade to preview" }, { status: 400 });
  const token = profile.signals[0].token;
  const e = renderAlertEmail(items, day, { site: LIVE_SITE, unsubscribe: `${LIVE_SITE}/signals/unsubscribe?t=${encodeURIComponent(token)}` });
  const stamp = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" });
  const subject = `[Preview ${stamp}] ${e.subject}`;
  const ok = await sendBatch([{ to: email, subject, html: e.html, text: e.text, unsubscribe: `${LIVE_SITE}/api/signals/unsubscribe?t=${encodeURIComponent(token)}` }]);
  return Response.json({ ok, to: email, subject, items: items.length }, { status: ok ? 200 : 502 });
}
