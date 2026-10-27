import { NextResponse, type NextRequest } from "next/server";
import { ensureFinancials } from "@/lib/financials/load";
import { suggest } from "@/lib/assistant/suggest";

// GET /api/assistant/suggest?q=hal%20vs%20bel -> { questions, pages } for the landing search box
// (src/lib/assistant/suggest.ts). No model call and the same for everyone, so the CDN caches it.
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 120);
  if (q.length < 3) return NextResponse.json({ questions: [], pages: [] });
  // Page titles and suggested questions come from the company table.
  await ensureFinancials();
  return NextResponse.json(suggest(q), { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
}
