import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { listCompanyPages } from "@/lib/sector-content/companies";
import { ensureFinancials } from "@/lib/financials/load";

// Figures come from the database; re-render on the same clock as the cached table (load.ts).
export const revalidate = 900;

// A-Z hub of every company page - gives crawlers (and people) one page that links to all
// of them, rather than leaving the company pages discoverable only through sector pages.

export const metadata: Metadata = {
  title: "Indian listed companies by supply chain: A-Z",
  description:
    "Every listed Indian company NextResearch maps, A-Z, with the industries, policies and supply-chain layers each one sits in - data centres, EVs, semiconductors, phones and electronic components, rare-earth magnets, railways, defence, aerospace, telecom, solar, power, real estate and pharma.",
  alternates: { canonical: "/companies" },
};

export default async function CompaniesPage() {
  await ensureFinancials();
  const companies = listCompanyPages();
  const byLetter = new Map<string, typeof companies>();
  for (const c of companies) {
    const letter = /[A-Z]/i.test(c.name[0]) ? c.name[0].toUpperCase() : "#";
    byLetter.set(letter, [...(byLetter.get(letter) ?? []), c]);
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-5 py-14">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">Companies</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
            {companies.length} listed Indian companies, each placed in the supply-chain layers it actually serves. Pick one to see its
            role, its peers in each layer and its financials.
          </p>
        </div>
        {[...byLetter.entries()].map(([letter, list]) => (
          <section key={letter}>
            <h2 className="font-display text-lg font-bold text-accent">{letter}</h2>
            <ul className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((c) => (
                <li key={c.slug} className="text-sm">
                  <Link href={`/company/${c.slug}`} className="font-semibold text-ink hover:text-accent hover:underline">
                    {c.name}
                  </Link>
                  <span className="block text-xs text-ink-soft">
                    {[...new Set(c.appearances.map((a) => a.sectorName))].join(" · ")}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>
      <SiteFooter />
    </>
  );
}
