// The morning brief's two cron steps (vercel.json): at 7:30 am IST build the market part for the
// latest close and store it (MorningBrief), at 8:00 am send it to every signed-up user who hasn't
// unsubscribed, each with their own watchlist. One close gets one brief: a close already sent is skipped, so the
// morning after a holiday sends nothing new, and Monday's brief covers Friday.
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/site";
import { storedDeals } from "@/lib/flows/query";
import { istToday } from "@/lib/ipo-content/status";
import { ensureFinancials } from "@/lib/financials/load";
import { buildMarketBrief } from "./market";
import { closesOn, watchBrief, type Saved } from "./watchlist";
import { calendarsFor, stockEvents } from "./events";
import { renderBriefEmail, type BriefEmail } from "./email";
import { BATCH_MAX, mailerReady, sendBatch, type OutMail } from "./mailer";
import type { MarketBrief, WatchBrief } from "./types";

const DAY_MS = 86_400_000;
// A stored brief older than this isn't sent (a send that kept failing for days is stale news).
const SEND_WITHIN_DAYS = 4;

const dayDate = (day: string) => new Date(`${day}T00:00:00Z`);
export const sendDay = () => new Date(istToday()).toISOString().slice(0, 10);

export const unsubscribePage = (token: string, site = SITE_URL) => `${site}/brief/unsubscribe?t=${encodeURIComponent(token)}`;
export const unsubscribeOneClick = (token: string, site = SITE_URL) => `${site}/api/brief/unsubscribe?t=${encodeURIComponent(token)}`;

export type BuildResult = { status: "built" | "already sent" | "no close"; day?: string };

/** Builds the market part for the latest close and stores it (again, until it has been sent). */
export async function buildAndStore(): Promise<BuildResult> {
  const market = await buildMarketBrief();
  if (!market) return { status: "no close" };
  const existing = await prisma.morningBrief.findUnique({ where: { day: dayDate(market.day) }, select: { sentAt: true } });
  if (existing?.sentAt) return { status: "already sent", day: market.day };
  await prisma.morningBrief.upsert({
    where: { day: dayDate(market.day) },
    create: { day: dayDate(market.day), data: market },
    update: { data: market, builtAt: new Date() },
  });
  return { status: "built", day: market.day };
}

type Subscriber = { userId: string; email: string; token: string; saved: Saved[] };

// Test accounts (the staging tester, "@example.com" style addresses) never get the brief.
const TEST_EMAIL = /@(nextresearch\.test|example\.(com|org|net)|test\.com)$/i;

/**
 * Every signed-up user who hasn't turned the brief off (no EmailPref row counts as on). Each gets
 * an EmailPref row first if they have none, so their email carries an unsubscribe token.
 */
async function subscribers(): Promise<Subscriber[]> {
  const missing = await prisma.profile.findMany({ where: { emailPref: null }, select: { id: true } });
  if (missing.length) await prisma.emailPref.createMany({ data: missing.map((p) => ({ userId: p.id, morningBrief: true })), skipDuplicates: true });
  const rows = await prisma.emailPref.findMany({
    where: { morningBrief: true },
    select: {
      userId: true,
      token: true,
      user: { select: { email: true, watchlist: { select: { priceAtAdd: true, company: { select: { ticker: true, name: true } } } } } },
    },
  });
  return rows
    .filter((r) => !TEST_EMAIL.test(r.user.email))
    .map((r) => ({
      userId: r.userId,
      email: r.user.email,
      token: r.token,
      saved: r.user.watchlist.map((w) => ({ ticker: w.company.ticker, name: w.company.name, priceAtAdd: w.priceAtAdd.toNumber() })),
    }));
}

/** Each user's email for a stored brief (shared by the send and the preview route). */
export async function watchBriefs(market: MarketBrief, saved: Saved[][]): Promise<WatchBrief[]> {
  await ensureFinancials();
  const tickers = [...new Set(saved.flat().map((s) => s.ticker))];
  const [closes, deals, cals] = await Promise.all([closesOn(tickers, market.day), storedDeals(), calendarsFor(tickers)]);
  return saved.map((s) => ({ ...watchBrief(s, closes, deals ?? [], market.day), events: stockEvents(s, cals, sendDay()) }));
}

/** `first`: the user has never had a brief, so this one opens with a thank-you. */
export const briefEmail = (market: MarketBrief, watch: WatchBrief | null, token: string, site = SITE_URL, first = false): BriefEmail =>
  renderBriefEmail(market, watch, { site, unsubscribe: unsubscribePage(token, site) }, sendDay(), { first });

/** The users (of `ids`) who have been sent a brief before. */
export async function hadBrief(ids: string[]): Promise<Set<string>> {
  const rows = await prisma.briefSend.findMany({ where: { userId: { in: ids }, ok: true }, select: { userId: true }, distinct: ["userId"] });
  return new Set(rows.map((r) => r.userId));
}

export type SendResult = { status: "nothing to send" | "dry run" | "sent" | "partly sent"; day?: string; recipients: number; sent: number; failed: number };

/** Sends the latest unsent brief to everyone subscribed who hasn't had it yet. `site` is the links' origin. */
export async function sendStored(deadline: number, site = SITE_URL): Promise<SendResult> {
  const row = await prisma.morningBrief.findFirst({
    where: { sentAt: null, day: { gte: new Date(Date.now() - SEND_WITHIN_DAYS * DAY_MS) } },
    orderBy: { day: "desc" },
  });
  if (!row) return { status: "nothing to send", recipients: 0, sent: 0, failed: 0 };
  const market = row.data as unknown as MarketBrief;
  const done = new Set((await prisma.briefSend.findMany({ where: { day: row.day }, select: { userId: true } })).map((r) => r.userId));
  const todo = (await subscribers()).filter((s) => !done.has(s.userId));
  if (!mailerReady()) return { status: "dry run", day: market.day, recipients: todo.length, sent: 0, failed: 0 };

  const [watch, before] = await Promise.all([watchBriefs(market, todo.map((s) => s.saved)), hadBrief(todo.map((s) => s.userId))]);
  let sent = 0;
  let failed = 0;
  for (let i = 0; i < todo.length && Date.now() < deadline; i += BATCH_MAX) {
    const batch = todo.slice(i, i + BATCH_MAX);
    const ids = batch.map((s) => s.userId);
    // Claimed before sending: a run that dies mid-batch never sends these again (a missed email beats a doubled one).
    await prisma.briefSend.createMany({ data: ids.map((userId) => ({ userId, day: row.day })), skipDuplicates: true });
    const mails: OutMail[] = batch.map((s, j) => {
      const e = briefEmail(market, watch[i + j], s.token, site, !before.has(s.userId));
      return { to: s.email, subject: e.subject, html: e.html, text: e.text, unsubscribe: unsubscribeOneClick(s.token, site) };
    });
    if (await sendBatch(mails)) {
      await prisma.briefSend.updateMany({ where: { day: row.day, userId: { in: ids } }, data: { ok: true } });
      sent += batch.length;
    } else {
      // Refused whole: let the next run try them again.
      await prisma.briefSend.deleteMany({ where: { day: row.day, userId: { in: ids }, ok: false } });
      failed += batch.length;
    }
  }
  const complete = sent === todo.length;
  if (complete) await prisma.morningBrief.update({ where: { day: row.day }, data: { sentAt: new Date() } });
  return { status: complete ? "sent" : "partly sent", day: market.day, recipients: todo.length, sent, failed };
}
