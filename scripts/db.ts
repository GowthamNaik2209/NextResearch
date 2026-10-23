// Prisma client for the maintenance scripts (seed, refresh-financials). Reads DATABASE_URL from .env.
// The scripts make thousands of sequential round trips to a remote pooler, and one dropped connection
// used to abort a whole run. Every write they make is an idempotent upsert (or a delete-then-create per
// company), so retrying a query on a connection error is safe.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const RETRYABLE = /P1001|P1002|P1008|P1017|ECONNRESET|EHOSTUNREACH|ETIMEDOUT|ENETUNREACH|SocketTimeout|Connection terminated/;

export function scriptPrisma(): PrismaClient {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set (see .env.example)");
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL, keepAlive: true });
  return new PrismaClient({ adapter }).$extends({
    query: {
      async $allOperations({ args, query }) {
        for (let attempt = 1; ; attempt++) {
          try {
            return await query(args);
          } catch (e) {
            const msg = `${(e as { code?: string }).code ?? ""} ${String(e)}`;
            if (attempt >= 6 || !RETRYABLE.test(msg)) throw e;
            const wait = 1000 * 2 ** (attempt - 1);
            console.warn(`  connection error (${msg.trim().slice(0, 60)}), retry ${attempt}/5 in ${wait / 1000}s`);
            await new Promise((r) => setTimeout(r, wait));
          }
        }
      },
    },
  }) as unknown as PrismaClient;
}

/** Where a script is about to write, without the password: "aws-0-...pooler.supabase.com/postgres". */
export function databaseLabel(): string {
  try {
    const u = new URL(process.env.DATABASE_URL ?? "");
    return `${u.hostname}${u.pathname}`;
  } catch {
    return "(unparseable DATABASE_URL)";
  }
}
