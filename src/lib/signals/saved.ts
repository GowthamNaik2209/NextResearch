// A user's saved signal rules (prisma SignalStrategy, docs/SIGNALS.md section 6): one set per stock
// or basket, so opening it again picks up where they left off, with the alert email on or off.
// Rules are re-read through parseStrategy, so a row saved by older code still loads.
import { prisma } from "@/lib/prisma";
import { parseStrategy, type Strategy } from "./strategy";
import type { Scope } from "./targets";

/** Saved signals one account may keep. */
export const MAX_SAVED = 50;

export type SavedSignal = { id: string; scope: Scope; target: string; name: string; strategy: Strategy; alerts: boolean; updatedAt: string };

type Row = { id: string; scope: string; target: string; name: string; rules: unknown; alerts: boolean; updatedAt: Date };
const SELECT = { id: true, scope: true, target: true, name: true, rules: true, alerts: true, updatedAt: true } as const;

function toSaved(r: Row): SavedSignal | null {
  const p = parseStrategy(r.rules);
  if (!p.ok || (r.scope !== "stock" && r.scope !== "basket")) return null;
  return { id: r.id, scope: r.scope, target: r.target, name: r.name, strategy: p.strategy, alerts: r.alerts, updatedAt: r.updatedAt.toISOString() };
}

export async function getSaved(userId: string, scope: Scope, target: string): Promise<SavedSignal | null> {
  const r = await prisma.signalStrategy.findUnique({ where: { userId_scope_target: { userId, scope, target } }, select: SELECT });
  return r ? toSaved(r) : null;
}

/** Newest first. */
export async function listSaved(userId: string): Promise<SavedSignal[]> {
  const rows = await prisma.signalStrategy.findMany({ where: { userId }, orderBy: { updatedAt: "desc" }, select: SELECT });
  return rows.map(toSaved).filter((x): x is SavedSignal => x != null);
}

/** Saves (or replaces) the rules for one stock or basket. Null when the account is at MAX_SAVED and this is a new one. */
export async function saveSignal(userId: string, scope: Scope, target: string, name: string, strategy: Strategy, alerts: boolean): Promise<SavedSignal | null> {
  const where = { userId_scope_target: { userId, scope, target } };
  const exists = await prisma.signalStrategy.findUnique({ where, select: { id: true } });
  if (!exists && (await prisma.signalStrategy.count({ where: { userId } })) >= MAX_SAVED) return null;
  // New rules start their checks afresh: the next nightly check reads them from that close on.
  const r = await prisma.signalStrategy.upsert({
    where,
    create: { userId, scope, target, name, rules: strategy, alerts },
    update: { name, rules: strategy, alerts, checkedDay: null },
    select: SELECT,
  });
  return toSaved(r);
}

export async function setAlerts(userId: string, id: string, on: boolean): Promise<boolean> {
  const { count } = await prisma.signalStrategy.updateMany({ where: { id, userId }, data: { alerts: on } });
  return count > 0;
}

export async function deleteSaved(userId: string, id: string): Promise<boolean> {
  const { count } = await prisma.signalStrategy.deleteMany({ where: { id, userId } });
  return count > 0;
}

/** The alert emails' unsubscribe: every alert of the token's owner off. False when the token matches no one. */
export async function unsubscribeAlerts(token: string): Promise<boolean> {
  if (!token) return false;
  const row = await prisma.signalStrategy.findUnique({ where: { token }, select: { userId: true } });
  if (!row) return false;
  await prisma.signalStrategy.updateMany({ where: { userId: row.userId }, data: { alerts: false } });
  return true;
}
