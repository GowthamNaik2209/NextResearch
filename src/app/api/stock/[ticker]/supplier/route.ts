import { NextResponse } from "next/server";
import { findSupplierByTicker } from "@/lib/sector-content";
import { ensureFinancials } from "@/lib/financials/load";

// GET /api/stock/VOLTAS/supplier — the authored supplier record for a ticker, so a page can
// reopen the stock pop-up from just `?stock=VOLTAS` (see ReturnToStock) without shipping the
// whole sector content module to the browser. The record carries the company table's figures, which a
// refresh changes without a deploy, so the CDN keeps it no longer than the loader does (load.ts).
export async function GET(_req: Request, { params }: { params: Promise<{ ticker: string }> }) {
  await ensureFinancials();
  const { ticker } = await params;
  const supplier = findSupplierByTicker(ticker);
  if (!supplier) return NextResponse.json({ error: "unknown ticker" }, { status: 404 });
  return NextResponse.json(
    { supplier },
    { headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=900" } }
  );
}
