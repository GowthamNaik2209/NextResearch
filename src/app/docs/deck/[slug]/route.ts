import { NextResponse } from "next/server";
import { buildDeck } from "@/lib/sector-content/reports";
import { ensureFinancials } from "@/lib/financials/load";

// GET /docs/deck/<slug>: one research deck, fetched when its card is opened, so the Analysis
// block doesn't carry every deck in its page (see src/lib/analysis-props.ts).
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  await ensureFinancials();
  const { slug } = await params;
  const deck = buildDeck(slug);
  if (!deck) return NextResponse.json({ error: "unknown report" }, { status: 404 });
  // Figures follow the company table, which refreshes on a 15-minute clock (financials/load.ts).
  return NextResponse.json(deck, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900" } });
}
