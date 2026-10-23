import { NextResponse, after } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureProfile } from "@/lib/profile";
import { ensureFinancials } from "@/lib/financials/load";
import { findSupplierByTicker } from "@/lib/sector-content";
import { getQuote } from "@/lib/live/yahoo";

// Per user, and changes the moment they tap a heart: never cached anywhere.
const NO_STORE = { "Cache-Control": "private, no-store" };
// priceAtAdd is always a live price, filled after the response (see fillPriceAtAdd): waits
// before each try at the quote. Under load getQuote can time out, so it is retried a few times.
const QUOTE_RETRY_DELAYS_MS = [0, 5_000, 20_000];
// Only rows saved this recently are filled, so an old row whose price was never known doesn't
// get today's price (which would make its "since added" meaningless).
const FILL_WINDOW_MS = 2 * 60_000;

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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Records the live quote as the row's priceAtAdd. It used to fall back to the company table's
 * snapshot price when the quote was slow, so stocks saved from different places had different
 * bases (a stock "lost 4.5%" the moment it was saved). No live price = it stays 0 (unknown), and
 * the watchlist page shows "—" for the move rather than a figure against the wrong base.
 */
async function fillPriceAtAdd(userId: string, companyId: string, ticker: string) {
  for (const wait of QUOTE_RETRY_DELAYS_MS) {
    if (wait) await sleep(wait);
    const q = await getQuote(ticker).catch(() => null);
    if (q && q.price > 0) {
      await prisma.watchlist.updateMany({
        where: { userId, companyId, priceAtAdd: 0, addedAt: { gte: new Date(Date.now() - FILL_WINDOW_MS - wait) } },
        data: { priceAtAdd: q.price },
      });
      return;
    }
  }
}

// POST { ticker } — add to watchlist and answer at once; the live price at the time of saving
// (priceAtAdd, for /watchlist's "since added") is filled in just after the response. Only tickers the content lists as listed companies (the same
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
    // otherwise hit a foreign-key error) and the company row, at once.
    const [company] = await Promise.all([
      prisma.company.findUnique({ where: { ticker }, select: { id: true } }),
      user.email ? ensureProfile(user.id, user.email) : null,
    ]);
    if (!company) return NextResponse.json({ error: "company not found" }, { status: 404, headers: NO_STORE });

    await prisma.watchlist.upsert({
      where: { userId_companyId: { userId: user.id, companyId: company.id } },
      // The column is NOT NULL: 0 stands for "price unknown" (the watchlist page shows no move for it).
      create: { userId: user.id, companyId: company.id, priceAtAdd: 0 },
      update: {},
    });
    after(() => fillPriceAtAdd(user.id, company.id, ticker).catch((e) => console.error("watchlist priceAtAdd fill failed", e)));
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
