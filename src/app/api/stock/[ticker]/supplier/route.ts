import { NextResponse } from "next/server";
import { findSupplierByTicker } from "@/lib/sector-content";

// GET /api/stock/VOLTAS/supplier — the authored supplier record for a ticker, so a page can
// reopen the stock pop-up from just `?stock=VOLTAS` (see ReturnToStock) without shipping the
// whole sector content module to the browser. Static data, so cache it hard.
export async function GET(_req: Request, { params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  const supplier = findSupplierByTicker(ticker);
  if (!supplier) return NextResponse.json({ error: "unknown ticker" }, { status: 404 });
  return NextResponse.json(
    { supplier },
    { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } }
  );
}
