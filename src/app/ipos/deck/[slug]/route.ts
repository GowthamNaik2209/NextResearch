import { NextResponse } from "next/server";
import { cachedIpoDeck } from "@/lib/analysis-props";
import { ensureFinancials } from "@/lib/financials/load";

// GET /ipos/deck/<slug>: one IPO deck, fetched when its card is opened (see src/lib/analysis-props.ts).
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  await ensureFinancials();
  const { slug } = await params;
  const deck = cachedIpoDeck(slug);
  if (!deck) return NextResponse.json({ error: "unknown IPO" }, { status: 404 });
  // Short cache: the status chip rolls over with the date (components/ipo/status.ts).
  return NextResponse.json(deck, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900" } });
}
