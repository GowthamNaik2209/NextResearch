import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureProfile } from "@/lib/profile";
import { ensureFinancials } from "@/lib/financials/load";
import { parseRupees } from "@/lib/financials/rows";
import { findSupplierByTicker } from "@/lib/sector-content";
import { getQuote } from "@/lib/live/yahoo";

// Per user, and changes the moment they tap a heart: never cached anywhere.
const NO_STORE = { "Cache-Control": "private, no-store" };
// The live quote for priceAtAdd: wait this long, then use the company table's price instead.
const QUOTE_WAIT_MS = 4000;

const fail = (where: string, e: unknown) => {
  console.error(`watchlist ${where} failed`, e);
  return NextResponse.json({ error: "watchlist unavailable, try again" }, { status: 500, headers: NO_STORE });
};

// GET: the current user's watchlisted tickers (empty array if signed out —
// "nothing liked yet" and "not logged in" render the same way: an empty heart).
// `signedIn` lets the heart show the sign-up prompt straight away for a signed-out visitor
// instead of first POSTing and getting a 401 (which also logged a console error).
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ tickers: [], signedIn: false }, { headers: NO_STORE });

    const rows = await prisma.watchlist.findMany({
      where: { userId: user.id },
      select: { company: { select: { ticker: true } } },
    });
    return NextResponse.json({ tickers: rows.map((r) => r.company.ticker), signedIn: true }, { headers: NO_STORE });
  } catch (e) {
    return fail("read", e);
  }
}

/** The price to remember as priceAtAdd: the live quote, else the company table's last price, else null. */
async function addPrice(ticker: string, tablePrice: string | null | undefined): Promise<number | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), QUOTE_WAIT_MS);
  });
  const q = await Promise.race([getQuote(ticker).catch(() => null), timeout]).finally(() => clearTimeout(timer));
  if (q && q.price > 0) return q.price;
  const p = parseRupees(tablePrice);
  return p != null && p > 0 ? p : null;
}

// POST { ticker } — add to watchlist, capturing the price now as priceAtAdd so /watchlist can show
// the move since the user saved it. Only tickers the content lists as listed companies (the same
// allowlist the stock pop-up uses), so an unlisted name or a made-up ticker is a 400. Upsert:
// re-liking an already-saved ticker is a no-op, not a duplicate row or a reset priceAtAdd.
export async function POST(request: Request) {
  try {
    await ensureFinancials();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "not authenticated" }, { status: 401, headers: NO_STORE });

    const body = await request.json().catch(() => null);
    const ticker = typeof body?.ticker === "string" ? body.ticker.trim() : "";
    if (!ticker) return NextResponse.json({ error: "ticker required" }, { status: 400, headers: NO_STORE });
    const supplier = findSupplierByTicker(ticker);
    if (!supplier || ticker.startsWith("UNLISTED_")) return NextResponse.json({ error: "not a listed company" }, { status: 400, headers: NO_STORE });

    // The profile row the watchlist row points at (a user signed in before it existed would
    // otherwise hit a foreign-key error), the company row and the price, all at once.
    const [company, priceAtAdd] = await Promise.all([
      prisma.company.findUnique({ where: { ticker }, select: { id: true } }),
      addPrice(ticker, supplier.f?.price),
      user.email ? ensureProfile(user.id, user.email) : null,
    ]);
    if (!company) return NextResponse.json({ error: "company not found" }, { status: 404, headers: NO_STORE });

    await prisma.watchlist.upsert({
      where: { userId_companyId: { userId: user.id, companyId: company.id } },
      // The column is NOT NULL: 0 stands for "price unknown" (the watchlist page shows no move for it).
      create: { userId: user.id, companyId: company.id, priceAtAdd: priceAtAdd ?? 0 },
      update: {},
    });
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  } catch (e) {
    return fail("add", e);
  }
}

// DELETE ?ticker=X — remove from watchlist.
export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "not authenticated" }, { status: 401, headers: NO_STORE });

    const ticker = new URL(request.url).searchParams.get("ticker");
    if (!ticker) return NextResponse.json({ error: "ticker required" }, { status: 400, headers: NO_STORE });

    // One statement: the watchlist row for this user and ticker, if any (removing one that isn't
    // there is a no-op, so the heart can't get stuck).
    await prisma.watchlist.deleteMany({ where: { userId: user.id, company: { ticker } } });
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  } catch (e) {
    return fail("remove", e);
  }
}
