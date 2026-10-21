import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { EXPOSURE_STRENGTH_LABEL, EXPOSURE_TYPE_LABEL } from "@/lib/sector-content";
import { footprintScore, listConnectedCompanies } from "@/lib/sector-content/exposure";
import { OpenStockCard } from "@/components/stock/OpenStockCard";
import { findSupplierByTicker } from "@/lib/sector-content";
import { ensureFinancials } from "@/lib/financials/load";

// Figures come from the database; re-render on the same clock as the cached table (load.ts).
export const revalidate = 900;

export const metadata = {
  title: "Connected companies: Indian stocks that span several supply chains",
  description: "Listed Indian companies that show up in more than one industry or policy supply chain - see every layer each one supplies.",
  alternates: { canonical: "/connections" },
};

export default async function ConnectionsPage() {
  await ensureFinancials();
  const companies = listConnectedCompanies();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-5 py-14">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink">Connected companies</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
            Some listed companies sit in more than one supply chain we map. A shock in one industry can reach their numbers
            through another, so they are worth reading across themes, not inside one. Ranked by number of chains, then by
            how strongly they are exposed in each layer.
          </p>
        </div>

        <ol className="flex flex-col gap-3">
          {companies.map((c, i) => {
            const supplier = findSupplierByTicker(c.ticker);
            const head = (
              <>
                <span className="w-6 flex-none font-mono text-xs text-ink-soft">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink">{c.name}</span>
                  <span className="font-mono text-xs text-ink-soft">{c.ticker}</span>
                </span>
                <span className="flex-none text-right">
                  <span className="block font-mono text-sm font-semibold text-accent">{c.sectors.length} chains</span>
                  <span className="font-mono text-[11px] text-ink-soft">exposure score {footprintScore(c)}</span>
                </span>
              </>
            );
            return (
              <li key={c.ticker} className="rounded-2xl border border-line bg-panel p-4">
                {supplier ? (
                  <OpenStockCard ticker={c.ticker} supplier={supplier} className="flex w-full items-center gap-3 text-left">
                    {head}
                  </OpenStockCard>
                ) : (
                  <div className="flex items-center gap-3">{head}</div>
                )}
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
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
