import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// GET: the current user's watchlisted tickers (empty array if signed out —
// "nothing liked yet" and "not logged in" render the same way: an empty heart).
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ tickers: [] });

  const rows = await prisma.watchlist.findMany({
    where: { userId: user.id },
    include: { company: { select: { ticker: true } } },
  });
  return NextResponse.json({ tickers: rows.map((r) => r.company.ticker) });
}

// POST { ticker } — add to watchlist, capturing the latest known price as
// priceAtAdd (0 if we have no KPI snapshot for it yet) so /watchlist can show
// the move since the user saved it. Upsert: re-liking an already-saved ticker
// is a no-op, not a duplicate row or a reset priceAtAdd.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const ticker = typeof body?.ticker === "string" ? body.ticker : null;
  if (!ticker) return NextResponse.json({ error: "ticker required" }, { status: 400 });

  const company = await prisma.company.findUnique({
    where: { ticker },
    include: { kpis: { orderBy: { asOf: "desc" }, take: 1 } },
  });
  if (!company) return NextResponse.json({ error: "company not found" }, { status: 404 });

  await prisma.watchlist.upsert({
    where: { userId_companyId: { userId: user.id, companyId: company.id } },
    create: { userId: user.id, companyId: company.id, priceAtAdd: company.kpis[0]?.price ?? 0 },
    update: {},
  });
  return NextResponse.json({ ok: true });
}

// DELETE ?ticker=X — remove from watchlist.
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not authenticated" }, { status: 401 });

  const ticker = new URL(request.url).searchParams.get("ticker");
  if (!ticker) return NextResponse.json({ error: "ticker required" }, { status: 400 });

  const company = await prisma.company.findUnique({ where: { ticker } });
  if (!company) return NextResponse.json({ error: "company not found" }, { status: 404 });

  await prisma.watchlist.deleteMany({ where: { userId: user.id, companyId: company.id } });
  return NextResponse.json({ ok: true });
}
