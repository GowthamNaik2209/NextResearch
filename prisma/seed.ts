// Populates the database from prisma/seed-source/extracted.json (produced by
// `node prisma/extract-source-data.mjs` from the original static artifact).
// Only companies + their financials/KPIs/news are persisted here — sector/zone/3D
// geometry is static content ported into src/lib/sector-content/products.ts instead
// (see the comment atop prisma/schema.prisma for why).
// Run with: npm run db:seed
import "dotenv/config";
import { StatementType } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { syntheticTicker } from "../src/lib/slugify.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

type Extracted = {
  asOf: string;
  src: string;
  newsAsOf: string;
  sectors: Array<{
    key: string;
    suppliers: Record<
      string,
      {
        name: string;
        listed: boolean;
        role: string;
        notes?: string[];
        f?: {
          rev: (number | null)[];
          np: (number | null)[];
          mcap: string;
          price: string;
          ticker: string;
          note: string | null;
          cagr: (number | null)[] | null;
          range: (number | null)[] | null;
          tl: [number, string] | null;
          kpi: (number | null)[] | null;
        };
      }
    >;
  }>;
  news: Record<
    string,
    { items: Array<{ date: string; headline: string; source: string; url: string }> }
  >;
};

// The artifact's 5-length rev/np arrays are FY22..FY26 — confirmed by cross-checking
// notes like Amara Raja's "FY25-FY26 not yet reflected" against which array indices
// (3, 4) are null, and Exide's "FY22 profit includes a one-time gain" against index 0.
const FISCAL_YEARS = [2022, 2023, 2024, 2025, 2026];

function parseRupees(s: string | undefined | null): number | null {
  if (!s) return null;
  const cleaned = s.replace(/Rs\s*/i, "").replace(/,/g, "").trim();
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

async function main() {
  const raw = fs.readFileSync(path.join(__dirname, "seed-source/extracted.json"), "utf8");
  const data: Extracted = JSON.parse(raw);
  const asOfDate = new Date(`${data.asOf} UTC`);

  // Real ticker -> Company id, so the NEWS object (keyed by real ticker) can find the
  // same company row seeded while walking each sector's suppliers dict.
  const companyIdByRealTicker = new Map<string, string>();
  // Which sector slugs referenced a given ticker, accumulated across sectors so a
  // company that appears in multiple ecosystems (e.g. Motherson) lists them all.
  const sectorSlugsByTicker = new Map<string, Set<string>>();

  for (const sector of data.sectors) {
    console.log(`Seeding companies for sector: ${sector.key}`);

    for (const sup of Object.values(sector.suppliers)) {
      const ticker = sup.f?.ticker ?? syntheticTicker(sup.name);
      if (!sectorSlugsByTicker.has(ticker)) sectorSlugsByTicker.set(ticker, new Set());
      sectorSlugsByTicker.get(ticker)!.add(sector.key);

      const company = await prisma.company.upsert({
        where: { ticker },
        create: {
          ticker,
          name: sup.name,
          listed: sup.listed,
          role: sup.role,
          screenerSlug: sup.f?.tl?.[1] ?? null,
          externalId: sup.f?.tl?.[0] != null ? String(sup.f.tl[0]) : null,
          notes: sup.notes ?? [],
          sectorSlugs: [...sectorSlugsByTicker.get(ticker)!],
        },
        update: {
          name: sup.name,
          role: sup.role,
          screenerSlug: sup.f?.tl?.[1] ?? null,
          externalId: sup.f?.tl?.[0] != null ? String(sup.f.tl[0]) : null,
          notes: sup.notes ?? [],
          sectorSlugs: [...sectorSlugsByTicker.get(ticker)!],
        },
      });
      companyIdByRealTicker.set(ticker, company.id);

      if (!sup.f) continue;
      const { rev, np, mcap, price, note, cagr, range, kpi } = sup.f;

      for (let i = 0; i < FISCAL_YEARS.length; i++) {
        const revenueCr = rev?.[i];
        const netProfitCr = np?.[i];
        if (revenueCr == null && netProfitCr == null) continue;
        await prisma.financialSnapshot.upsert({
          where: { companyId_year: { companyId: company.id, year: FISCAL_YEARS[i] } },
          create: {
            companyId: company.id,
            year: FISCAL_YEARS[i],
            revenueCr: revenueCr ?? null,
            netProfitCr: netProfitCr ?? null,
          },
          update: { revenueCr: revenueCr ?? null, netProfitCr: netProfitCr ?? null },
        });

        if (revenueCr != null) {
          await prisma.financialStatementLine.upsert({
            where: {
              companyId_statementType_year_lineItem: {
                companyId: company.id,
                statementType: StatementType.INCOME,
                year: FISCAL_YEARS[i],
                lineItem: "Revenue",
              },
            },
            create: {
              companyId: company.id,
              statementType: StatementType.INCOME,
              year: FISCAL_YEARS[i],
              lineItem: "Revenue",
              value: revenueCr,
              sortOrder: 0,
            },
            update: { value: revenueCr },
          });
        }
        if (netProfitCr != null) {
          await prisma.financialStatementLine.upsert({
            where: {
              companyId_statementType_year_lineItem: {
                companyId: company.id,
                statementType: StatementType.INCOME,
                year: FISCAL_YEARS[i],
                lineItem: "Net Profit",
              },
            },
            create: {
              companyId: company.id,
              statementType: StatementType.INCOME,
              year: FISCAL_YEARS[i],
              lineItem: "Net Profit",
              value: netProfitCr,
              sortOrder: 10,
            },
            update: { value: netProfitCr },
          });
        }
      }

      await prisma.kpiSnapshot.upsert({
        where: { companyId_asOf: { companyId: company.id, asOf: asOfDate } },
        create: {
          companyId: company.id,
          asOf: asOfDate,
          price: parseRupees(price),
          marketCap: mcap ?? null,
          pe: kpi?.[0] ?? null,
          bookValue: kpi?.[1] ?? null,
          divYield: kpi?.[2] ?? null,
          roce: kpi?.[3] ?? null,
          roe: kpi?.[4] ?? null,
          faceValue: kpi?.[5] ?? null,
          low52w: range?.[0] ?? null,
          high52w: range?.[1] ?? null,
          cagr1y: cagr?.[0] ?? null,
          cagr3y: cagr?.[1] ?? null,
          cagr5y: cagr?.[2] ?? null,
          note: note ?? null,
        },
        update: {
          price: parseRupees(price),
          marketCap: mcap ?? null,
          pe: kpi?.[0] ?? null,
          bookValue: kpi?.[1] ?? null,
          divYield: kpi?.[2] ?? null,
          roce: kpi?.[3] ?? null,
          roe: kpi?.[4] ?? null,
          faceValue: kpi?.[5] ?? null,
          low52w: range?.[0] ?? null,
          high52w: range?.[1] ?? null,
          cagr1y: cagr?.[0] ?? null,
          cagr3y: cagr?.[1] ?? null,
          cagr5y: cagr?.[2] ?? null,
          note: note ?? null,
        },
      });

      // Sparse price history placeholder: just the 52w low/high/current we actually
      // have, flagged isEstimate — a real vendor replaces this with daily closes.
      const pricePoints: Array<[Date, number | null]> = [
        [new Date(asOfDate.getTime() - 365 * 86400000), range?.[0] ?? null],
        [asOfDate, parseRupees(price)],
      ];
      for (const [date, close] of pricePoints) {
        if (close == null) continue;
        await prisma.priceSnapshot.upsert({
          where: { companyId_date: { companyId: company.id, date } },
          create: { companyId: company.id, date, close, isEstimate: true },
          update: { close, isEstimate: true },
        });
      }
    }
  }

  // Curated news, keyed by real ticker.
  for (const [ticker, entry] of Object.entries(data.news)) {
    const companyId = companyIdByRealTicker.get(ticker);
    if (!companyId) {
      console.warn(`News ticker "${ticker}" has no matching seeded company — skipped.`);
      continue;
    }
    await prisma.newsLink.deleteMany({ where: { companyId } });
    for (const item of entry.items) {
      await prisma.newsLink.create({
        data: { companyId, date: item.date, headline: item.headline, source: item.source, url: item.url },
      });
    }
  }

  const companyCount = await prisma.company.count();
  console.log(`Done. ${companyCount} companies seeded across ${data.sectors.length} sectors.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
