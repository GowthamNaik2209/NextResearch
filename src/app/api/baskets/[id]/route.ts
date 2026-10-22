import { NextResponse, after } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MAX_BASKET_STOCKS } from "@/lib/baskets/industry";
import { uniqueName } from "@/lib/baskets/names";
import { cleanName, cleanTickers, cleanWeights, fillAddPrices, getVisibleBasket } from "@/lib/baskets/store";
import { addToWeights, removeFromWeights } from "@/lib/baskets/strategy";
import { ensureFinancials } from "@/lib/financials/load";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  await ensureFinancials();
  const { id } = await params;
  const user = await getCurrentUser();
  const b = await getVisibleBasket(id, user?.id ?? null);
  return b ? NextResponse.json(b) : NextResponse.json({ error: "not found" }, { status: 404 });
}

// PATCH { name?, description?, weighting?, weights?, isPublic?, add?: string[], remove?: string[] } - owner only.
// weighting "custom" needs weights ({ ticker: % } for every stock after the add and remove,
// totalling 100). A custom basket's add or remove without weights keeps the others' proportions.
export async function PATCH(request: Request, { params }: Ctx) {
  await ensureFinancials();
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  const row = await prisma.basket.findUnique({ where: { id }, include: { items: { select: { ticker: true, weight: true } } } });
  if (!row || row.userId !== user.id) return NextResponse.json({ error: "not found" }, { status: 404 });
  const body = await request.json().catch(() => ({}));

  const data: { name?: string; description?: string | null; weighting?: "EQUAL" | "MCAP"; customWeighting?: boolean; isPublic?: boolean } = {};
  if (body?.name !== undefined) {
    // Unique among the owner's other baskets: a name already in use gets a number after it.
    const others = await prisma.basket.findMany({ where: { userId: user.id, id: { not: id } }, select: { name: true } });
    data.name = uniqueName(cleanName(body.name, row.name), others.map((b) => b.name));
  }
  if (body?.description !== undefined) data.description = typeof body.description === "string" && body.description.trim() ? body.description.trim().slice(0, 280) : null;
  if (body?.weighting === "equal" || body?.weighting === "mcap") {
    data.weighting = body.weighting === "mcap" ? "MCAP" : "EQUAL";
    data.customWeighting = false;
  }
  if (typeof body?.isPublic === "boolean") data.isPublic = body.isPublic;

  const have = new Set(row.items.map((i) => i.ticker));
  const remove = cleanTickers(body?.remove).filter((t) => have.has(t));
  const room = MAX_BASKET_STOCKS - (have.size - remove.length);
  const add = cleanTickers(body?.add).filter((t) => !have.has(t)).slice(0, Math.max(0, room));

  // Custom weights: the ones sent, or (a stock added or taken off with none sent) the saved ones
  // rescaled. Written only while the basket is custom, or as it becomes custom.
  const next = [...row.items.map((i) => i.ticker).filter((t) => !remove.includes(t)), ...add];
  const custom = body?.weighting === "custom" || (row.customWeighting && data.customWeighting !== false);
  let weights: Record<string, number> | null = null;
  if (custom && body?.weights !== undefined) {
    weights = cleanWeights(body.weights, next);
    if (!weights && next.length) return NextResponse.json({ error: "weights must total 100%" }, { status: 400 });
  } else if (custom && (add.length || remove.length)) {
    const saved = Object.fromEntries(row.items.filter((i) => i.weight != null).map((i) => [i.ticker, i.weight!]));
    weights = addToWeights(removeFromWeights(saved, remove), add);
  } else if (body?.weighting === "custom") {
    return NextResponse.json({ error: "weights must total 100%" }, { status: 400 });
  }
  if (body?.weighting === "custom") data.customWeighting = true;
  const kept = next.filter((t) => !add.includes(t));
  const set = weights;

  await prisma.$transaction([
    prisma.basket.update({ where: { id }, data }),
    prisma.basketItem.deleteMany({ where: { basketId: id, ticker: { in: remove } } }),
    prisma.basketItem.createMany({ data: add.map((ticker) => ({ basketId: id, ticker, weight: set?.[ticker] ?? null })), skipDuplicates: true }),
    ...(set ? kept.map((ticker) => prisma.basketItem.updateMany({ where: { basketId: id, ticker }, data: { weight: set[ticker] ?? null } })) : []),
  ]);
  if (add.length) after(() => fillAddPrices(id, add));
  return NextResponse.json(await getVisibleBasket(id, user.id));
}

export async function DELETE(_req: Request, { params }: Ctx) {
  await ensureFinancials();
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  const { count } = await prisma.basket.deleteMany({ where: { id, userId: user.id } });
  return count ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "not found" }, { status: 404 });
}
