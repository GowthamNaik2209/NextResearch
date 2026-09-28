import { NextResponse } from "next/server";
import { getCompanyDetail } from "@/lib/companies";

// GET /api/companies/MOTHERSON — full detail (financials, statement lines, price
// history, latest KPIs, news) for the company page and the explorer's supplier
// detail panel, fetched on demand rather than bulk-loaded for every supplier chip.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;
  const company = await getCompanyDetail(ticker);
  if (!company) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ company });
}
