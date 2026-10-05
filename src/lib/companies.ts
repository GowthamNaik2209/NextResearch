import { prisma } from "@/lib/prisma";
import { scrapeScreenerKpi } from "@/lib/scrapers/screener";

// How long a cached KpiSnapshot is trusted before a company-detail view
// triggers a live re-scrape. An hour balances "feels current" against not
// hammering screener.in on every single page view (and risking getting this
// server's IP rate-limited/blocked).
const KPI_STALE_MS = 60 * 60 * 1000;

// Shapes returned to the client — Decimal fields from Prisma are converted to
// plain numbers/strings here so this can be sent straight through JSON.stringify
// (Next.js route handlers/Server Components can't serialize Decimal as-is).

export async function getCompaniesByTickers(tickers: string[]) {
  if (tickers.length === 0) return [];
  const companies = await prisma.company.findMany({
    where: { ticker: { in: tickers } },
    include: {
      kpis: { orderBy: { asOf: "desc" }, take: 1 },
      // Latest year only — the comparison view (CompanyComparison.tsx) needs one
      // revenue figure per company side by side, not the full 5yr series that
      // getCompanyDetail's single-company fetch returns.
      financials: { orderBy: { year: "desc" }, take: 1 },
    },
  });
  return companies.map((c) => ({
    ticker: c.ticker,
    name: c.name,
    listed: c.listed,
    role: c.role,
    screenerSlug: c.screenerSlug,
    externalId: c.externalId,
    notes: c.notes,
    sectorSlugs: c.sectorSlugs,
    dataStatus: c.dataStatus,
    latestRevenueCr: c.financials[0]?.revenueCr?.toNumber() ?? null,
    latestRevenueYear: c.financials[0]?.year ?? null,
    kpi: c.kpis[0]
      ? {
          asOf: c.kpis[0].asOf.toISOString(),
          price: c.kpis[0].price?.toNumber() ?? null,
          marketCap: c.kpis[0].marketCap,
          pe: c.kpis[0].pe?.toNumber() ?? null,
          bookValue: c.kpis[0].bookValue?.toNumber() ?? null,
          divYield: c.kpis[0].divYield?.toNumber() ?? null,
          roce: c.kpis[0].roce?.toNumber() ?? null,
          roe: c.kpis[0].roe?.toNumber() ?? null,
          faceValue: c.kpis[0].faceValue?.toNumber() ?? null,
          low52w: c.kpis[0].low52w?.toNumber() ?? null,
          high52w: c.kpis[0].high52w?.toNumber() ?? null,
          cagr1y: c.kpis[0].cagr1y?.toNumber() ?? null,
          cagr3y: c.kpis[0].cagr3y?.toNumber() ?? null,
          cagr5y: c.kpis[0].cagr5y?.toNumber() ?? null,
          note: c.kpis[0].note,
        }
      : null,
  }));
}

export async function getCompanyDetail(ticker: string) {
  const company = await prisma.company.findUnique({
    where: { ticker },
    include: {
      financials: { orderBy: { year: "asc" } },
      statementLines: { orderBy: [{ statementType: "asc" }, { sortOrder: "asc" }, { year: "asc" }] },
      prices: { orderBy: { date: "asc" } },
      kpis: { orderBy: { asOf: "desc" }, take: 1 },
      news: { orderBy: { id: "desc" } },
    },
  });
  if (!company) return null;

  let latestKpi = company.kpis[0];
  let liveRefreshed = false;
  const isStale = !latestKpi || Date.now() - latestKpi.asOf.getTime() > KPI_STALE_MS;

  if (isStale && company.listed) {
    const fresh = await scrapeScreenerKpi(company.ticker);
    if (fresh) {
      // CAGR figures and the free-text note aren't on screener's top-ratios
      // block (they'd need a separate, deeper page section) — carry those
      // over from the last cached snapshot rather than wiping them out.
      latestKpi = await prisma.kpiSnapshot.create({
        data: {
          companyId: company.id,
          asOf: new Date(),
          price: fresh.price,
          marketCap: fresh.marketCap,
          pe: fresh.pe,
          bookValue: fresh.bookValue,
          divYield: fresh.divYield,
          roce: fresh.roce,
          roe: fresh.roe,
          faceValue: fresh.faceValue,
          low52w: fresh.low52w,
          high52w: fresh.high52w,
          cagr1y: latestKpi?.cagr1y ?? null,
          cagr3y: latestKpi?.cagr3y ?? null,
          cagr5y: latestKpi?.cagr5y ?? null,
          note: latestKpi?.note ?? null,
        },
      });
      liveRefreshed = true;
    }
  }

  return {
    ticker: company.ticker,
    name: company.name,
    listed: company.listed,
    role: company.role,
    screenerSlug: company.screenerSlug,
    externalId: company.externalId,
    notes: company.notes,
    sectorSlugs: company.sectorSlugs,
    dataStatus: company.dataStatus,
    financials: company.financials.map((f) => ({
      year: f.year,
      revenueCr: f.revenueCr?.toNumber() ?? null,
      netProfitCr: f.netProfitCr?.toNumber() ?? null,
    })),
    statementLines: company.statementLines.map((l) => ({
      statementType: l.statementType,
      year: l.year,
      lineItem: l.lineItem,
      value: l.value.toNumber(),
    })),
    prices: company.prices.map((p) => ({
      date: p.date.toISOString(),
      close: p.close.toNumber(),
      isEstimate: p.isEstimate,
    })),
    kpi: latestKpi
      ? {
          asOf: latestKpi.asOf.toISOString(),
          live: liveRefreshed,
          price: latestKpi.price?.toNumber() ?? null,
          marketCap: latestKpi.marketCap,
          pe: latestKpi.pe?.toNumber() ?? null,
          bookValue: latestKpi.bookValue?.toNumber() ?? null,
          divYield: latestKpi.divYield?.toNumber() ?? null,
          roce: latestKpi.roce?.toNumber() ?? null,
          roe: latestKpi.roe?.toNumber() ?? null,
          faceValue: latestKpi.faceValue?.toNumber() ?? null,
          low52w: latestKpi.low52w?.toNumber() ?? null,
          high52w: latestKpi.high52w?.toNumber() ?? null,
          cagr1y: latestKpi.cagr1y?.toNumber() ?? null,
          cagr3y: latestKpi.cagr3y?.toNumber() ?? null,
          cagr5y: latestKpi.cagr5y?.toNumber() ?? null,
          note: latestKpi.note,
        }
      : null,
    news: company.news.map((n) => ({
      date: n.date,
      headline: n.headline,
      source: n.source,
      url: n.url,
    })),
  };
}

export type CompanyDetail = NonNullable<Awaited<ReturnType<typeof getCompanyDetail>>>;
export type CompanySummary = Awaited<ReturnType<typeof getCompaniesByTickers>>[number];
