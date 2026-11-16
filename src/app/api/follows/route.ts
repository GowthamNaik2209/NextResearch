import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureProfile } from "@/lib/profile";
import { followedSectors, isFollowable } from "@/lib/follows";
import { ensureFinancials } from "@/lib/financials/load";

// "Follow industry": the signed-in user's followed industries, policies and indices.
// Per user and changes the moment they tap the button: never cached anywhere.
const NO_STORE = { "Cache-Control": "private, no-store" };

const fail = (where: string, e: unknown) => {
  console.error(`follows ${where} failed`, e);
  return NextResponse.json({ error: "follows unavailable, try again" }, { status: 500, headers: NO_STORE });
};

// GET: the followed slugs (live modules only). Signed out answers 200 with signedIn false, so the
// button can show the sign-up prompt at once instead of POSTing into a 401 (as the watchlist does).
export async function GET() {
  try {
    // The module list (which slugs are live) reads through the loaded company figures.
    await ensureFinancials();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ slugs: [], signedIn: false }, { headers: NO_STORE });
    const follows = await followedSectors(user.id);
    return NextResponse.json({ slugs: follows.map((f) => f.slug), signedIn: true }, { headers: NO_STORE });
  } catch (e) {
    return fail("read", e);
  }
}

// POST { slug }: follow. Only a live module (a typo, a muted or retired slug is a 400). Upsert, so a
// second tap or a retried request is a no-op, never a duplicate or an error.
export async function POST(request: Request) {
  try {
    await ensureFinancials();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "not authenticated" }, { status: 401, headers: NO_STORE });
    const body = await request.json().catch(() => null);
    const slug = typeof body?.slug === "string" ? body.slug.trim() : "";
    if (!isFollowable(slug)) return NextResponse.json({ error: "not an industry you can follow" }, { status: 400, headers: NO_STORE });
    // The profile row the follow points at: a user signed in before it existed would otherwise hit
    // a foreign-key error.
    if (user.email) await ensureProfile(user.id, user.email);
    await prisma.industryFollow.upsert({
      where: { userId_sectorSlug: { userId: user.id, sectorSlug: slug } },
      create: { userId: user.id, sectorSlug: slug },
      update: {},
    });
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  } catch (e) {
    return fail("add", e);
  }
}

// DELETE ?slug=X: unfollow. Any slug, live or not (so a follow of a since-muted module can still be
// cleared); removing one that isn't there is a no-op, so the button can't get stuck.
export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "not authenticated" }, { status: 401, headers: NO_STORE });
    const slug = new URL(request.url).searchParams.get("slug")?.trim();
    if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400, headers: NO_STORE });
    await prisma.industryFollow.deleteMany({ where: { userId: user.id, sectorSlug: slug } });
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  } catch (e) {
    return fail("remove", e);
  }
}
