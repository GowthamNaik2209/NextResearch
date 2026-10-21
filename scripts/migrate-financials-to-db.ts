// One-off (Oct 2026): copies the company figures that used to be written into the content files
// (products.ts `FIN["X"] = fin(...)` and policies' `addFin(...)`) into the database, then reads every
// one back and checks it matches exactly. After this the database is the only home for the figures.
//
//   npx tsx scripts/migrate-financials-to-db.ts --from=fin-snapshot.json            dry run: checks every company has a name
//   npx tsx scripts/migrate-financials-to-db.ts --from=fin-snapshot.json --apply    write, then verify
//
// fin-snapshot.json is `{ ASOF, FIN }` dumped from products.ts as of commit 886bf97 (the last commit
// with figures in the content). Companies in no industry (IPO peers) take their name from the IPO page.
import fs from "node:fs";
import { scriptPrisma, databaseLabel } from "./db";
import { findSupplierByTicker, type SupplierFinancials } from "../src/lib/sector-content";
import { listIpos } from "../src/lib/ipo-content";
import { parseAsOf } from "../src/lib/financials/rows";
import { readCompanyTable } from "../src/lib/financials/query";
import { writeFinancials } from "../src/lib/financials/write";

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const FROM = args.find((a) => a.startsWith("--from="))?.slice("--from=".length);
if (!FROM) throw new Error("--from=<fin-snapshot.json> is required");

// What the app compares: a tuple with no values reads the same as none (see rows.ts).
function normalize(f: SupplierFinancials) {
  const t = (a: (number | null)[] | null | undefined) => (a?.some((v) => v != null) ? a : null);
  return JSON.stringify({
    ticker: f.ticker, rev: f.rev, np: f.np, mcap: f.mcap ?? null, price: f.price ?? null, note: f.note ?? null,
    cagr: t(f.cagr), range: t(f.range), tl: f.tl ?? null, kpi: t(f.kpi), asOf: f.asOf, screenOut: !!f.screenOut,
  });
}

async function main() {
  const { FIN } = JSON.parse(fs.readFileSync(FROM!, "utf8")) as { FIN: Record<string, SupplierFinancials> };
  const peerName = new Map(listIpos().flatMap((r) => r.peers.filter((p) => p.ticker).map((p) => [p.ticker!, p.name])));
  const tickers = Object.keys(FIN).sort();
  console.log(`${tickers.length} companies -> ${databaseLabel()}${APPLY ? "" : " (dry run)"}`);

  const identity = (t: string) => {
    const sup = findSupplierByTicker(t);
    if (sup) return { name: sup.name, listed: sup.listed, role: sup.role };
    const name = peerName.get(t);
    if (!name) throw new Error(`${t}: in no industry and no IPO peer table, so no name for its Company row`);
    return { name, listed: true, role: "" };
  };
  for (const t of tickers) identity(t); // fail before writing anything
  if (!APPLY) return;

  const prisma = scriptPrisma();
  let n = 0;
  for (const t of tickers) {
    const f = FIN[t];
    await writeFinancials(prisma, f, parseAsOf(f.asOf!), { identity: identity(t) });
    if (++n % 50 === 0) console.log(`  ${n}/${tickers.length}`);
  }

  // Read back exactly the way the app does and compare.
  const back = new Map(Object.entries(await readCompanyTable(prisma)));
  const bad = tickers.filter((t) => !back.has(t) || normalize(back.get(t)!) !== normalize(FIN[t]));
  const extra = [...back.keys()].filter((t) => !FIN[t]);
  for (const t of bad.slice(0, 10)) console.log(`MISMATCH ${t}\n  want ${normalize(FIN[t])}\n  got  ${back.has(t) ? normalize(back.get(t)!) : "(missing)"}`);
  console.log(`verified ${tickers.length - bad.length}/${tickers.length} identical${extra.length ? `; tracked but not in the snapshot: ${extra.join(", ")}` : ""}`);
  await prisma.$disconnect();
  if (bad.length || extra.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
