import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { EXPOSURE_STRENGTH_LABEL, EXPOSURE_TYPE_LABEL } from "@/lib/sector-content";
import { footprintScore, listConnectedCompanies } from "@/lib/sector-content/exposure";
import { OpenStockCard } from "@/components/stock/OpenStockCard";
import { findSupplierByTicker } from "@/lib/sector-content";
import { ensureFinancials } from "@/lib/financials/load";
import { shareMeta } from "@/lib/site";
import { ConnectionsSearch } from "@/components/ConnectionsSearch";
import { connectionRowId, type ConnectionsSearchEntry } from "@/lib/connections-search";

// Figures come from the database; re-render on the same clock as the cached table (load.ts).
export const revalidate = 900;

export const metadata = {
  title: "Connected companies: Indian stocks that span several supply chains",
  description: "Listed Indian companies that show up in more than one industry or policy supply chain - see every layer each one supplies.",
  alternates: { canonical: "/connections" },
  ...shareMeta({ title: "Companies in several supply chains", line: "Indian stocks that supply more than one industry.", path: "/connections" }),
};

export default async function ConnectionsPage() {
  await ensureFinancials();
  const companies = listConnectedCompanies();

  // What the search box looks through: every company on the list, and every industry in its chips
  // (with how many of the listed companies sit in it).
  const sectorCount = new Map<string, { name: string; n: number }>();
  for (const c of companies)
    for (const s of c.sectors) {
      const e = sectorCount.get(s.sectorSlug);
      if (e) e.n++;
      else sectorCount.set(s.sectorSlug, { name: s.sectorName, n: 1 });
    }
  const searchIndex: ConnectionsSearchEntry[] = [
    ...companies.map((c) => ({
      kind: "company" as const,
      key: `c:${c.ticker}`,
      label: c.name,
      ticker: c.ticker,
      sub: `${c.ticker} · ${c.sectors.map((s) => s.sectorName).join(", ")}`,
    })),
    ...[...sectorCount].map(([slug, s]) => ({
      kind: "sector" as const,
      key: `s:${slug}`,
      label: s.name,
      href: `/sector/${slug}`,
      sub: `${s.n} connected ${s.n === 1 ? "company" : "companies"}`,
    })),
  ];

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-page flex-1 flex-col gap-6 px-5 pt-6 pb-14 sm:py-14">
        {/* Search sits in the free space right of the intro on wide screens and drops below it otherwise. */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink">Connected companies</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
            Some listed companies sit in more than one supply chain we map. A shock in one industry can reach their numbers
            through another, so they are worth reading across themes, not inside one. Ranked by number of chains, then by
            how strongly they are exposed in each layer.
          </p>
        </div>
        <div className="w-full sm:max-w-md lg:mt-1 lg:w-80 lg:flex-none xl:w-96">
          <ConnectionsSearch index={searchIndex} />
        </div>
        </div>

        <ol className="flex flex-col gap-3">
          {companies.map((c, i) => {
            const supplier = findSupplierByTicker(c.ticker);
            const head = (
              <>
                <span className="w-6 flex-none font-mono text-xs text-ink-soft">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  {/* Wraps on phones: "CG Power and Industrial So…" hid which company it was. */}
                  <span className="block text-sm font-semibold leading-snug text-ink">{c.name}</span>
                  <span className="font-mono text-xs text-ink-soft">{c.ticker}</span>
                </span>
                <span className="flex-none text-right">
                  <span className="block font-mono text-sm font-semibold text-accent">{c.sectors.length} chains</span>
                  <span className="font-mono text-[11px] text-ink-soft">exposure score {footprintScore(c)}</span>
                </span>
              </>
            );
            return (
              <li key={c.ticker} id={connectionRowId(c.ticker)} className="scroll-mt-24 rounded-2xl border border-line bg-panel p-4">
                {supplier ? (
                  <OpenStockCard ticker={c.ticker} supplier={supplier} className="flex w-full items-center gap-3 text-left">
                    {head}
                  </OpenStockCard>
                ) : (
                  <div className="flex items-center gap-3">{head}</div>
                )}
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {c.sectors.map((s) => (
                    <Link key={s.sectorSlug} href={s.href} className="rounded-lg border border-line bg-panel-2 px-3 py-2 transition-colors hover:border-accent">
                      <div className="text-xs font-semibold text-ink">{s.sectorName}</div>
                      <div className="mt-0.5 text-[11px] leading-snug text-ink-soft">
                        {s.zones
                          .map((z) => {
                            const extra = [z.exposureType && EXPOSURE_TYPE_LABEL[z.exposureType], z.exposureStrength && `${EXPOSURE_STRENGTH_LABEL[z.exposureStrength].toLowerCase()} exposure`].filter(Boolean).join(", ");
                            return extra ? `${z.label} (${extra})` : z.label;
                          })
                          .join(" · ")}
                      </div>
                    </Link>
                  ))}
                </div>
              </li>
            );
          })}
        </ol>
        <p className="text-xs text-ink-soft">Information and research only — exposure labels are editorial classifications, not investment advice.</p>
      </main>
      <SiteFooter />
    </>
  );
}
