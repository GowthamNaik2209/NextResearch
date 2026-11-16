import { prisma } from "@/lib/prisma";
import { getSector, listSectors } from "@/lib/sector-content";
import { categoryWord } from "@/lib/sector-content/core";
import { ensureFinancials } from "@/lib/financials/load";

// "Follow industry": which industries, policies and indices a user follows. Their headlines show
// on /watchlist beside the saved stocks' news. Only a live module (not muted) can be followed, and a
// follow whose module has since been muted or retired is skipped on read rather than shown broken.

/** What a follow names on the page: the slug, its name and what kind of module it is. */
export type FollowedSector = { slug: string; name: string; word: "industry" | "policy" | "index" };

/** A slug that can be followed today: a live module. Anything else (typo, muted, retired) can't.
 * On the server, after ensureFinancials() (the module list reads through the loaded figures). */
export function isFollowable(slug: unknown): slug is string {
  if (typeof slug !== "string" || !slug || slug.length > 64) return false;
  const s = getSector(slug);
  return !!s && !s.muted;
}

/** Slugs as the database holds them -> the live ones, in site order (the order the menus use). */
export function liveFollows(slugs: Iterable<string>): FollowedSector[] {
  const want = new Set(slugs);
  return listSectors()
    .filter((s) => !s.muted && want.has(s.slug))
    .map((s) => ({ slug: s.slug, name: s.name, word: categoryWord(s.category) }));
}

/** The user's followed modules (live ones only), in site order. */
export async function followedSectors(userId: string): Promise<FollowedSector[]> {
  const [rows] = await Promise.all([prisma.industryFollow.findMany({ where: { userId }, select: { sectorSlug: true } }), ensureFinancials()]);
  return liveFollows(rows.map((r) => r.sectorSlug));
}
