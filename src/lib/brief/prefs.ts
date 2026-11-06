// A user's morning brief choice (EmailPref). Every signed-up user gets the brief until they turn it
// off: no row counts as on. Turning it off by the unsubscribe link's token needs no sign-in; the
// watchlist page's switch is the signed-in user's own row.
import { prisma } from "@/lib/prisma";

export async function briefEnabled(userId: string): Promise<boolean> {
  return (await prisma.emailPref.findUnique({ where: { userId }, select: { morningBrief: true } }))?.morningBrief ?? true;
}

export async function setBrief(userId: string, on: boolean): Promise<void> {
  await prisma.emailPref.upsert({ where: { userId }, create: { userId, morningBrief: on }, update: { morningBrief: on } });
}

/** Turns the brief off for the token's owner. False when the token matches no one. */
export async function unsubscribeToken(token: string): Promise<boolean> {
  if (!token) return false;
  const { count } = await prisma.emailPref.updateMany({ where: { token }, data: { morningBrief: false } });
  return count > 0;
}
