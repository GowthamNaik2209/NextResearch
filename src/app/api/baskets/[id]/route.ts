import { NextResponse, after } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MAX_BASKET_STOCKS } from "@/lib/baskets/industry";
import { uniqueName } from "@/lib/baskets/names";
import { cleanName, cleanTickers, fillAddPrices, getVisibleBasket } from "@/lib/baskets/store";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const user = await getCurrentUser();
  const b = await getVisibleBasket(id, user?.id ?? null);
  return b ? NextResponse.json(b) : NextResponse.json({ error: "not found" }, { status: 404 });
}

// PATCH { name?, description?, weighting?, isPublic?, add?: string[], remove?: string[] } - owner only.
export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  const row = await prisma.basket.findUnique({ where: { id }, include: { items: { select: { ticker: true } } } });
  if (!row || row.userId !== user.id) return NextResponse.json({ error: "not found" }, { status: 404 });
  const body = await request.json().catch(() => ({}));

  const data: { name?: string; description?: string | null; weighting?: "EQUAL" | "MCAP"; isPublic?: boolean } = {};
  if (body?.name !== undefined) {
    // Unique among the owner's other baskets: a name already in use gets a number after it.
    const others = await prisma.basket.findMany({ where: { userId: user.id, id: { not: id } }, select: { name: true } });
    data.name = uniqueName(cleanName(body.name, row.name), others.map((b) => b.name));
  }
  if (body?.description !== undefined) data.description = typeof body.description === "string" && body.description.trim() ? body.description.trim().slice(0, 280) : null;
  if (body?.weighting === "equal" || body?.weighting === "mcap") data.weighting = body.weighting === "mcap" ? "MCAP" : "EQUAL";
  if (typeof body?.isPublic === "boolean") data.isPublic = body.isPublic;

  const have = new Set(row.items.map((i) => i.ticker));
  const remove = cleanTickers(body?.remove).filter((t) => have.has(t));
  const room = MAX_BASKET_STOCKS - (have.size - remove.length);
  const add = cleanTickers(body?.add).filter((t) => !have.has(t)).slice(0, Math.max(0, room));

  await prisma.$transaction([
    prisma.basket.update({ where: { id }, data }),
    prisma.basketItem.deleteMany({ where: { basketId: id, ticker: { in: remove } } }),
    prisma.basketItem.createMany({ data: add.map((ticker) => ({ basketId: id, ticker })), skipDuplicates: true }),
  ]);
  if (add.length) after(() => fillAddPrices(id, add));
  return NextResponse.json(await getVisibleBasket(id, user.id));
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  const { count } = await prisma.basket.deleteMany({ where: { id, userId: user.id } });
  return count ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "not found" }, { status: 404 });
}
