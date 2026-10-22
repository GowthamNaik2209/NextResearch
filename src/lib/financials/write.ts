// Writes one company's figures to the database: the Company's figure fields, a KpiSnapshot dated
// `asOf` and the FY22-FY26 revenue/profit rows. Used by the scripts that maintain the company table
// (scripts/refresh-financials.ts); takes the Prisma client so it runs outside Next.
//
// A company's writes go in one transaction, so a crash or dropped connection part-way can't leave it
// with a new snapshot but half its FY rows. The transaction is retried as a whole on a connection
// error (every write in it is an idempotent upsert or delete): a retry of a single query inside a
// transaction whose connection has gone would only fail again.
import type { PrismaClient } from "@/generated/prisma/client";
import type { SupplierFinancials } from "@/lib/sector-content";
import { FISCAL_YEARS, financialsToRows } from "./rows";

type Identity = { name: string; listed?: boolean; role?: string };

const RETRYABLE = /P1001|P1002|P1008|P1017|P2028|ECONNRESET|EHOSTUNREACH|ETIMEDOUT|ENETUNREACH|SocketTimeout|Connection terminated|Transaction not found|Transaction already closed/;

export async function writeFinancials(
  prisma: PrismaClient,
  f: SupplierFinancials,
  asOf: Date,
  opts: { identity: Identity; history?: boolean },
) {
  const rows = financialsToRows(f, asOf);
  // No Trendlyne pair given (a new company from --add): keep whatever the row already has.
  const update = f.tl ? rows.company : { ...rows.company, screenerSlug: undefined, externalId: undefined };

  const write = () =>
    prisma.$transaction(
      async (tx) => {
        const company = await tx.company.upsert({
          where: { ticker: f.ticker },
          create: { ticker: f.ticker, name: opts.identity.name, listed: opts.identity.listed ?? true, role: opts.identity.role ?? "", ...rows.company },
          update,
        });
        await tx.kpiSnapshot.upsert({
          where: { companyId_asOf: { companyId: company.id, asOf } },
          create: { companyId: company.id, ...rows.kpi },
          update: rows.kpi,
        });
        // Revenue/profit history is curated: replaced only when asked (a new company, or --fix-history).
        if (opts.history === false) return;
        const have = new Set(rows.years.map((y) => y.year));
        const drop = FISCAL_YEARS.filter((year) => !have.has(year));
        if (drop.length) await tx.financialSnapshot.deleteMany({ where: { companyId: company.id, year: { in: drop } } });
        for (const y of rows.years) {
          await tx.financialSnapshot.upsert({
            where: { companyId_year: { companyId: company.id, year: y.year } },
            create: { companyId: company.id, ...y },
            update: { revenueCr: y.revenueCr, netProfitCr: y.netProfitCr },
          });
        }
      },
      // A remote pooler is ~10 round trips here; the default 5s can be tight on a slow link.
      { maxWait: 10_000, timeout: 30_000 },
    );

  for (let attempt = 1; ; attempt++) {
    try {
      return await write();
    } catch (e) {
      const msg = `${(e as { code?: string }).code ?? ""} ${String(e)}`;
      if (attempt >= 4 || !RETRYABLE.test(msg)) throw e;
      const wait = 1000 * 2 ** attempt;
      console.warn(`  ${f.ticker}: connection error (${msg.trim().slice(0, 60)}), retrying the company's writes in ${wait / 1000}s`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
}
