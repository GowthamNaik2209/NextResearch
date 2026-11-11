// The nightly signal check (docs/SIGNALS.md section 6), after the price store's evening top-up: every
// saved signal with alerts on is run on the newest close, and each entry or exit met on it is logged
// (SignalEvent, one per close, so a second run adds nothing). Then each user with new events gets
// one email listing them. Real emails go out only with SIGNAL_ALERTS_SEND=1 and the mailer set up
// (RESEND_API_KEY, BRIEF_FROM); otherwise it is a dry run that logs and sends nothing.
import { prisma } from "@/lib/prisma";
import { MARKET } from "@/lib/baskets/projection";
import { SITE_URL } from "@/lib/site";
import { mailerReady, sendBatch, BATCH_MAX, type OutMail } from "@/lib/brief/mailer";
import { loadBasket, loadStock } from "./data";
import { rangeStart, runSignals } from "./engine";
import { runBasketSignals } from "./basket";
import { METRIC_BY_ID } from "./metrics";
import { parseStrategy, strategyMetrics, type Strategy } from "./strategy";
import { describeTrigger } from "./describe";
import { renderAlertEmail, type AlertItem } from "./alert-email";
import { resolveTarget, type Scope } from "./targets";

export const alertsLive = () => process.env.SIGNAL_ALERTS_SEND === "1" && mailerReady();

const day = (iso: string) => new Date(`${iso}T00:00:00Z`);
const iso = (d: Date) => d.toISOString().slice(0, 10);

type Met = { ticker: string; kind: "entry" | "exit"; reason: string; price: number };

/** What the rules met on the target's last close, and that close's date. Null when its prices can't load. */
async function metOnLastClose(scope: Scope, tickers: string[], s: Strategy): Promise<{ lastDay: string; met: Met[] } | null> {
  const needPanel = strategyMetrics(s).some((id) => METRIC_BY_ID.get(id)?.needs?.includes("panel"));
  if (scope === "stock") {
    const d = await loadStock(tickers[0], needPanel);
    const r = d ? runSignals(d.mx, s, MARKET.rf) : null;
    if (!d || !r) return null;
    const c = d.mx.ctx.bars.c;
    return { lastDay: d.lastDay, met: r.pending ? [{ ticker: tickers[0], kind: r.pending, reason: r.pendingReason ?? "rule", price: c[c.length - 1] as number }] : [] };
  }
  const b = await loadBasket(tickers, needPanel);
  if (!b?.stocks.length) return null;
  // As the page does: a stock that can't give an indicator the rules use, or the ATR stop, sits out.
  const usable = b.stocks.filter(({ mx }) => !strategyMetrics(s).some((id) => mx.unavailable(id)) && !(s.stops.atr && mx.unavailable("atrPct")));
  const days = b.nifty.map((p) => p.t);
  const from = rangeStart(days, s.range);
  const r = runBasketSignals(usable, s, MARKET.rf, days.slice(from), b.nifty.slice(from).map((p) => p.c));
  if (!r) return null;
  const last = new Map(usable.map(({ ticker, mx }) => [ticker, mx.ctx.bars]));
  return {
    lastDay: r.to,
    met: r.stocks
      .filter((x) => x.pending && last.get(x.ticker)?.t.at(-1) === r.to)
      .map((x) => ({ ticker: x.ticker, kind: x.pending!, reason: x.pendingReason ?? "rule", price: last.get(x.ticker)!.c.at(-1) as number })),
  };
}

export type CheckReport = { checked: number; skipped: number; failed: number; events: number };

/** Runs every saved signal with alerts on against its newest close and logs what was met. */
export async function checkSignals(deadline: number): Promise<CheckReport> {
  const rows = await prisma.signalStrategy.findMany({ where: { alerts: true }, select: { id: true, userId: true, scope: true, target: true, rules: true, checkedDay: true } });
  const out: CheckReport = { checked: 0, skipped: 0, failed: 0, events: 0 };
  for (const row of rows) {
    if (Date.now() > deadline) break;
    const p = parseStrategy(row.rules);
    if (!p.ok || (row.scope !== "stock" && row.scope !== "basket")) {
      out.skipped++;
      continue;
    }
    try {
      const target = await resolveTarget(row.scope, row.target, row.userId);
      const got = target ? await metOnLastClose(target.scope, target.tickers, p.strategy) : null;
      if (!got) {
        out.failed++;
        continue;
      }
      if (row.checkedDay && iso(row.checkedDay) >= got.lastDay) {
        out.skipped++;
        continue;
      }
      if (got.met.length) {
        const { count } = await prisma.signalEvent.createMany({
          data: got.met.map((m) => ({ strategyId: row.id, day: day(got.lastDay), ticker: m.ticker, kind: m.kind, reason: m.reason, price: m.price })),
          skipDuplicates: true,
        });
        out.events += count;
      }
      // Raw SQL so `updatedAt` (the last save, which "reopen where you left off" goes by) stays as it was.
      await prisma.$executeRaw`UPDATE "SignalStrategy" SET "checkedDay" = ${day(got.lastDay)} WHERE "id" = ${row.id}`;
      out.checked++;
    } catch (e) {
      console.error(`signals check: ${row.id} failed`, e);
      out.failed++;
    }
  }
  return out;
}

type EventRow = { id: string; day: Date; ticker: string; kind: string; reason: string; price: number; strategy: { userId: string; scope: string; target: string; name: string; rules: unknown; token: string; alerts: boolean; user: { email: string } } };

/** One user's unsent events as an email (newest close), or null when none still has alerts on. */
export function emailFor(events: EventRow[], site: string): { to: string; day: string; mail: OutMail; ids: string[] } | null {
  const live = events.filter((e) => e.strategy.alerts);
  if (!live.length) return null;
  const last = live.reduce((a, e) => (iso(e.day) > a ? iso(e.day) : a), iso(live[0].day));
  const items: AlertItem[] = live
    .filter((e) => iso(e.day) === last)
    .map((e) => {
      const p = parseStrategy(e.strategy.rules);
      const kind = e.kind === "exit" ? "exit" : "entry";
      return {
        name: e.strategy.name,
        scope: e.strategy.scope === "basket" ? "basket" : "stock",
        target: e.strategy.target,
        ticker: e.ticker,
        kind,
        why: p.ok ? describeTrigger(p.strategy, kind, e.reason as Parameters<typeof describeTrigger>[2]) : "",
        price: e.price,
      } satisfies AlertItem;
    });
  const token = live[0].strategy.token;
  const e = renderAlertEmail(items, last, { site, unsubscribe: `${site}/signals/unsubscribe?t=${encodeURIComponent(token)}` });
  return {
    to: live[0].strategy.user.email,
    day: last,
    // Every unsent event is marked sent with this email, older closes too: one email per run, never a backlog.
    ids: events.map((x) => x.id),
    mail: { to: live[0].strategy.user.email, subject: e.subject, html: e.html, text: e.text, unsubscribe: `${site}/api/signals/unsubscribe?t=${encodeURIComponent(token)}` },
  };
}

const EVENT_SELECT = {
  id: true,
  day: true,
  ticker: true,
  kind: true,
  reason: true,
  price: true,
  strategy: { select: { userId: true, scope: true, target: true, name: true, rules: true, token: true, alerts: true, user: { select: { email: true } } } },
} as const;

export type SendReport = { users: number; sent: number; dryRun: boolean };

/** Emails every user their unsent events (one email each). A dry run counts them and sends nothing. */
export async function sendAlerts(): Promise<SendReport> {
  const events = (await prisma.signalEvent.findMany({ where: { emailedAt: null }, orderBy: { day: "asc" }, select: EVENT_SELECT })) as EventRow[];
  const byUser = new Map<string, EventRow[]>();
  for (const e of events) byUser.set(e.strategy.userId, [...(byUser.get(e.strategy.userId) ?? []), e]);
  const mails = [...byUser.values()].map((ev) => emailFor(ev, SITE_URL)).filter((m): m is NonNullable<typeof m> => m != null);
  if (!alertsLive()) return { users: mails.length, sent: 0, dryRun: true };
  let sent = 0;
  for (let i = 0; i < mails.length; i += BATCH_MAX) {
    const batch = mails.slice(i, i + BATCH_MAX);
    if (await sendBatch(batch.map((m) => m.mail))) {
      await prisma.signalEvent.updateMany({ where: { id: { in: batch.flatMap((m) => m.ids) } }, data: { emailedAt: new Date() } });
      sent += batch.length;
    }
  }
  // Events whose signal has since had alerts turned off are closed without an email.
  const quiet = [...byUser.values()].filter((ev) => !ev.some((e) => e.strategy.alerts)).flatMap((ev) => ev.map((e) => e.id));
  if (quiet.length) await prisma.signalEvent.updateMany({ where: { id: { in: quiet } }, data: { emailedAt: new Date() } });
  return { users: mails.length, sent, dryRun: false };
}
