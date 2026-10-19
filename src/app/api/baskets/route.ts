import { NextResponse, after } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureProfile } from "@/lib/profile";
import { MAX_BASKETS_PER_USER, getIndustryBasket } from "@/lib/baskets/industry";
import { cleanName, cleanTickers, fillAddPrices, getVisibleBasket, toSaved } from "@/lib/baskets/store";

export const maxDuration = 60;

// GET: the signed-in user's baskets, newest first.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ baskets: [], signedIn: false });
  const rows = await prisma.basket.findMany({ where: { userId: user.id }, include: { items: { orderBy: { addedAt: "asc" } } }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ baskets: rows.map((r) => toSaved(r, user.id)), signedIn: true });
}

// POST { name?, tickers? | sector? | copyFrom?, weighting? } - a new basket, empty, from a list
// of stocks, from an industry basket, or a copy of a basket shared with the viewer.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  const body = await request.json().catch(() => ({}));

  let tickers = cleanTickers(body?.tickers);
  let name = cleanName(body?.name, "My basket");
  let sourceSector: string | null = null;
  let description: string | null = null;
  let weighting: "EQUAL" | "MCAP" = body?.weighting === "mcap" ? "MCAP" : "EQUAL";
  if (typeof body?.sector === "string") {
    const ind = getIndustryBasket(body.sector);
    if (!ind) return NextResponse.json({ error: "unknown industry" }, { status: 404 });
    tickers = ind.stocks.map((s) => s.ticker);
    sourceSector = ind.slug;
    name = cleanName(body?.name, `My ${ind.name} basket`);
  } else if (typeof body?.copyFrom === "string") {
    const src = await getVisibleBasket(body.copyFrom, user.id);
    if (!src) return NextResponse.json({ error: "not found" }, { status: 404 });
    // Only stocks the maps still list: one dropped since the original was made is left behind.
    tickers = cleanTickers(src.items.map((i) => i.ticker));
    sourceSector = src.sourceSector;
    description = src.description;
    weighting = src.weighting === "mcap" ? "MCAP" : "EQUAL";
    name = cleanName(body?.name, src.isOwner ? `${src.name} (copy)` : src.name).slice(0, 60);
  }

  // A cap per person, so one account can't fill the shared database with baskets. The count and
  // the profile check run together: each is a round trip to the database.
  const [count] = await Promise.all([prisma.basket.count({ where: { userId: user.id } }), user.email ? ensureProfile(user.id, user.email) : null]);
  if (count >= MAX_BASKETS_PER_USER) {
    return NextResponse.json({ error: "limit", max: MAX_BASKETS_PER_USER }, { status: 409 });
  }
  const row = await prisma.basket.create({
    data: { userId: user.id, name, description, sourceSector, weighting, items: { create: tickers.map((ticker) => ({ ticker })) } },
  });
  // Live prices take a few seconds for a big basket; the page doesn't wait for them.
  after(() => fillAddPrices(row.id, tickers));
  return NextResponse.json({ id: row.id });
}
