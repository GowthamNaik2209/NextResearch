import { NextResponse } from "next/server";
import { getCompaniesByTickers } from "@/lib/companies";

// GET /api/companies?tickers=MOTHERSON,UNOMINDA,...
// Bulk fetch used by SectorExplorer to hydrate supplier chips with live
// financials/KPIs from the database (the static sector content only carries
// identity — name/role/ticker — see src/lib/sector-content/products.ts).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tickers = (searchParams.get("tickers") ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  if (tickers.length === 0) {
    return NextResponse.json({ companies: [] });
  }

  const companies = await getCompaniesByTickers(tickers);
  return NextResponse.json({ companies });
}
