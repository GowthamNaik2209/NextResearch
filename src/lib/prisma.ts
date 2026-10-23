import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// Standard Next.js dev-mode singleton so hot-reload doesn't open a new pool per edit.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  // A small pool per instance. On Vercel every function instance gets its own pool, so the total
  // number of connections is instances x max: pg's default of 10 lets a traffic spike exhaust the
  // Supabase pooler's client limit. Five covers one request's parallel queries (a page awaits two or
  // three at once). Idle connections close after 10s so a frozen or idle instance gives its slots
  // back instead of holding them until the pooler times them out; a new connection is refused after
  // 10s rather than hanging a request. Use the transaction pooler (:6543) for DATABASE_URL (.env.example).
  // `next build` collects page data in ~7 worker processes at once, each loading the company table
  // (one findMany fans out into a query per relation), so there each worker gets one connection:
  // 7 x 5 overflowed the session pooler's 15-client limit and failed the build.
  const building = process.env.NEXT_PHASE === "phase-production-build";
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    max: building ? 1 : 5,
    idleTimeoutMillis: 10_000,
    // A build queues behind the other workers for the pooler's slots, so it waits longer.
    connectionTimeoutMillis: building ? 60_000 : 10_000,
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
