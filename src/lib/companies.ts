import { prisma } from "@/lib/prisma";

// Shapes returned to the client — Decimal fields from Prisma are converted to
// plain numbers/strings here so this can be sent straight through JSON.stringify
// (Next.js route handlers/Server Components can't serialize Decimal as-is).

export async function getCompaniesByTickers(tickers: string[]) {
  if (tickers.length === 0) return [];
  const companies = await prisma.company.findMany({
    where: { ticker: { in: tickers } },
    include: {
      kpis: { orderBy: { asOf: "desc" }, take: 1 },
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

  return {
    ticker: company.ticker,
    name: company.name,
    listed: company.listed,
    role: company.role,
    screenerSlug: company.screenerSlug,
    externalId: company.externalId,
    notes: company.notes,
    sectorSlugs: company.sectorSlugs,
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
    kpi: company.kpis[0]
      ? {
          asOf: company.kpis[0].asOf.toISOString(),
          price: company.kpis[0].price?.toNumber() ?? null,
          marketCap: company.kpis[0].marketCap,
          pe: company.kpis[0].pe?.toNumber() ?? null,
          bookValue: company.kpis[0].bookValue?.toNumber() ?? null,
          divYield: company.kpis[0].divYield?.toNumber() ?? null,
          roce: company.kpis[0].roce?.toNumber() ?? null,
          roe: company.kpis[0].roe?.toNumber() ?? null,
          faceValue: company.kpis[0].faceValue?.toNumber() ?? null,
          low52w: company.kpis[0].low52w?.toNumber() ?? null,
          high52w: company.kpis[0].high52w?.toNumber() ?? null,
          cagr1y: company.kpis[0].cagr1y?.toNumber() ?? null,
          cagr3y: company.kpis[0].cagr3y?.toNumber() ?? null,
          cagr5y: company.kpis[0].cagr5y?.toNumber() ?? null,
          note: company.kpis[0].note,
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
