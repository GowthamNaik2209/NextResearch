// What the coverage test (src/lib/sector-content/coverage.test.ts) can't see: the database rows
// every listed company in a live sector needs. Read-only: it never writes.
//
//   npx tsx scripts/check-coverage.ts            gaps by sector, then a summary
//   npx tsx scripts/check-coverage.ts --all      also list every company's row (years of prices etc.)
//
// Per listed content ticker: a tracked Company row with a KpiSnapshot and FY history, a PriceSeries
// with a recent last bar (and how many years it holds), and Shareholding quarters. Per live sector:
// its stored basket figures (BasketReturn) and benchmark series. Exits 1 on a gap no named rule explains.
import { listSectors } from "../src/lib/sector-content/index";
import { latestDueTradingDay } from "../src/lib/financials/trading-day";
import { MARKET_BENCHMARKS, BENCHMARKS, sectorBenchmarks } from "../src/lib/sector-content/benchmarks";
import { databaseLabel, scriptPrisma } from "./db";

const ALL = process.argv.includes("--all");
const DAY = 86_400_000;
// A last bar this many days before the due trading day means the top-up has stopped for it (the
// baskets' reads fall back to Yahoo past 6 days: src/lib/prices/store.ts).
const STALE_DAYS = 6;

type Gap = "no-company" | "untracked" | "no-kpi" | "no-history" | "no-prices" | "stale-prices" | "no-shareholding";

// Gaps a company may have for a stated reason. Anything else fails the run.
const RULES: { id: string; reason: string; gap: Gap; applies: (t: string, name: string, note: string) => boolean }[] = [
  {
    id: "trust-no-shareholding",
    reason: "REITs and InvITs file unitholding, which Screener's shareholding table doesn't carry",
    gap: "no-shareholding",
    applies: (_t, name) => /\b(REIT|InvIT)\b|Trust\b/i.test(name),
  },
  {
    id: "history-left-blank",
    reason: "its FY22-FY26 years are blank on purpose and its Company.financialsNote says why (pre-listing years, a recent demerger)",
    gap: "no-history",
    applies: (_t, _n, note) => /left blank/i.test(note),
  },
  {
    id: "no-market-price",
    reason: "illiquid, no market price at all (its Company.financialsNote says so): Yahoo and Screener have no series to store",
    gap: "no-prices",
    applies: (_t, _n, note) => /no market price/i.test(note),
  },
];

const FIX: Record<Gap, string> = {
  "no-company": "npx tsx scripts/refresh-financials.ts --add=<T> (dry run; --apply with the go-ahead)",
  untracked: "set Company.tracked=true (by hand, with the go-ahead) or re-add with refresh-financials.ts --add",
  "no-kpi": "npx tsx scripts/refresh-financials.ts --only=<T> (dry run), then --add=<T> --apply",
  "no-history": "npx tsx scripts/refresh-financials.ts --fix-history=<T> (dry run; --apply with the go-ahead)",
  "no-prices": "npx tsx scripts/refresh-prices.ts --only=<T> (status), then --only=<T> --apply",
  "stale-prices": "npx tsx scripts/refresh-prices.ts --only=<T> (status), then --only=<T> --apply",
  "no-shareholding": "npx tsx scripts/backfill-shareholding.ts --only=<T> (dry run), then --only=<T> --apply",
};

async function main() {
  const prisma = scriptPrisma();
  console.log(`database: ${databaseLabel()} (read-only)`);
  const due = latestDueTradingDay(new Date());

  // Every listed ticker in every live sector, with the sectors it is in.
  const live = listSectors().filter((s) => !s.muted);
  const where = new Map<string, { name: string; sectors: string[] }>();
  for (const s of live)
    for (const sup of Object.values(s.suppliers)) {
      const t = sup.f?.ticker;
      if (!sup.listed || !t) continue;
      const e = where.get(t) ?? { name: sup.name, sectors: [] };
      if (!e.sectors.includes(s.slug)) e.sectors.push(s.slug);
      where.set(t, e);
    }
  const tickers = [...where.keys()];
  // The indices the baskets and Analysis charts compare with: the market lines and each live sector's.
  const benchSymbols = [...new Set([...MARKET_BENCHMARKS.map((id) => BENCHMARKS[id].symbol), ...live.flatMap((s) => sectorBenchmarks(s.slug).map((b) => b.symbol))])];

  const [companies, series, returns] = await Promise.all([
    prisma.company.findMany({
      where: { ticker: { in: tickers } },
      select: { ticker: true, tracked: true, financialsNote: true, _count: { select: { kpis: true, financials: true, shareholdings: true } } },
    }),
    prisma.priceSeries.findMany({ where: { key: { in: [...tickers, ...benchSymbols] } } }),
    prisma.basketReturn.groupBy({ by: ["slug"], _count: { _all: true }, _max: { asOf: true } }),
  ]);
  const company = new Map(companies.map((c) => [c.ticker, c]));
  const priceOf = new Map(series.map((s) => [s.key, s]));

  type Row = { ticker: string; name: string; sectors: string[]; years: number | null; lastDay: string | null; source: string | null; quarters: number; gaps: Gap[]; explained: string[] };
  const rows: Row[] = [];
  for (const t of tickers) {
    const { name, sectors } = where.get(t)!;
    const c = company.get(t);
    const p = priceOf.get(t);
    const gaps: Gap[] = [];
    if (!c) gaps.push("no-company");
    else {
      if (!c.tracked) gaps.push("untracked");
      if (!c._count.kpis) gaps.push("no-kpi");
      if (!c._count.financials) gaps.push("no-history");
      if (!c._count.shareholdings) gaps.push("no-shareholding");
    }
    if (!p?.lastDay) gaps.push("no-prices");
    else if ((due.getTime() - p.lastDay.getTime()) / DAY > STALE_DAYS) gaps.push("stale-prices");
    const explained: string[] = [];
    const open = gaps.filter((g) => {
      const rule = RULES.find((r) => r.gap === g && r.applies(t, name, c?.financialsNote ?? ""));
      if (rule) explained.push(`${g} (${rule.id})`);
      return !rule;
    });
    rows.push({
      ticker: t,
      name,
      sectors,
      years: p?.firstDay && p.lastDay ? (p.lastDay.getTime() - p.firstDay.getTime()) / (365.25 * DAY) : null,
      lastDay: p?.lastDay?.toISOString().slice(0, 10) ?? null,
      source: p?.source ?? null,
      quarters: c?._count.shareholdings ?? 0,
      gaps: open,
      explained,
    });
  }

  // Gaps by sector.
  const byGap = new Map<Gap, Set<string>>();
  console.log(`\nprices due to ${due.toISOString().slice(0, 10)}; ${tickers.length} listed tickers in ${live.length} live sectors\n`);
  const pad = (s: string, n: number) => s.padEnd(n);
  console.log(`${pad("sector", 18)}${pad("listed", 8)}${pad("gaps", 6)}detail`);
  for (const s of live) {
    const mine = rows.filter((r) => r.sectors.includes(s.slug));
    const bad = mine.filter((r) => r.gaps.length);
    const counts = new Map<Gap, string[]>();
    for (const r of bad) for (const g of r.gaps) counts.set(g, [...(counts.get(g) ?? []), r.ticker]);
    const detail = [...counts].map(([g, ts]) => `${g} ${ts.length} (${ts.join(", ")})`).join("; ");
    console.log(`${pad(s.slug, 18)}${pad(String(mine.length), 8)}${pad(String(bad.length), 6)}${detail || "-"}`);
  }
  for (const r of rows) for (const g of r.gaps) byGap.set(g, (byGap.get(g) ?? new Set()).add(r.ticker));
  const failing = rows.filter((r) => r.gaps.length).length;

  // Stored basket figures per live sector (the /baskets heatmap and table; refresh-basket-returns.ts).
  const ret = new Map(returns.map((r) => [r.slug, r]));
  const noReturns = live.filter((s) => !ret.get(s.slug)?._count._all).map((s) => s.slug);
  const staleReturns = live.filter((s) => {
    const d = ret.get(s.slug)?._max.asOf;
    return d && (due.getTime() - d.getTime()) / DAY > STALE_DAYS;
  }).map((s) => s.slug);

  const benchGaps = benchSymbols.filter((b) => {
    const d = priceOf.get(b)?.lastDay;
    return !d || (due.getTime() - d.getTime()) / DAY > STALE_DAYS;
  });

  if (ALL) {
    console.log(`\n${pad("ticker", 14)}${pad("years", 7)}${pad("last bar", 12)}${pad("source", 16)}${pad("SH qtrs", 9)}gaps`);
    for (const r of rows.sort((a, b) => a.ticker.localeCompare(b.ticker)))
      console.log(`${pad(r.ticker, 14)}${pad(r.years == null ? "-" : r.years.toFixed(1), 7)}${pad(r.lastDay ?? "-", 12)}${pad(r.source ?? "-", 16)}${pad(String(r.quarters), 9)}${[...r.gaps, ...r.explained].join(", ") || "-"}`);
  }

  const short = rows.filter((r) => r.years != null && r.years < 4.9).sort((a, b) => a.years! - b.years!);
  console.log(`\nsummary`);
  console.log(`  companies with an unexplained gap: ${failing} of ${rows.length}`);
  for (const [g, ts] of byGap) console.log(`  ${pad(g, 16)} ${ts.size}  fix: ${FIX[g].replace("<T>", [...ts].join(","))}`);
  const explained = rows.flatMap((r) => r.explained.map((e) => `${r.ticker} ${e}`));
  if (explained.length) console.log(`  explained by a named rule: ${explained.length} (${explained.join("; ")})`);
  console.log(`  price history under 5 years (recent listings; not a gap): ${short.length}${short.length ? ` (${short.map((r) => `${r.ticker} ${r.years!.toFixed(1)}y`).join(", ")})` : ""}`);
  console.log(`  baskets with no stored figures: ${noReturns.length ? noReturns.join(", ") : "none"}${noReturns.length ? "  fix: npx tsx scripts/refresh-basket-returns.ts (status), then --apply" : ""}`);
  console.log(`  benchmark series missing or stale: ${benchGaps.length ? `${benchGaps.join(", ")}  fix: npx tsx scripts/refresh-prices.ts --only=${benchGaps.join(",")} (status), then --apply` : "none"}`);
  console.log(`  baskets with stale stored figures: ${staleReturns.length ? staleReturns.join(", ") : "none"}`);

  await prisma.$disconnect();
  process.exit(failing || noReturns.length || benchGaps.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
