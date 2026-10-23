import { CompanyIndex } from "./CompanyIndex";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { listCompanyPages } from "@/lib/sector-content/companies";
import { ensureFinancials } from "@/lib/financials/load";
import { themeNames } from "@/lib/site";

// Figures come from the database; re-render on the same clock as the cached table (load.ts).
export const revalidate = 900;

// A-Z hub of every company page - gives crawlers (and people) one page that links to all
// of them, rather than leaving the company pages discoverable only through sector pages.

export async function generateMetadata(): Promise<Metadata> {
  await ensureFinancials();
  return {
    title: "Indian listed companies by supply chain: A-Z",
    description: `Every listed Indian company NextResearch maps, A-Z, with the industries, policies and supply-chain layers each one sits in - ${themeNames()}.`,
    alternates: { canonical: "/companies" },
  };
}

export default async function CompaniesPage() {
  await ensureFinancials();
  const companies = listCompanyPages();
  const index = companies.map((c) => ({ slug: c.slug, name: c.name, sectors: [...new Set(c.appearances.map((a) => a.sectorName))] }));

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-5 py-14">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">Companies</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
            {companies.length} listed Indian companies, each placed in the supply-chain layers it actually serves. Pick one to see its
            role, its peers in each layer and its financials.
          </p>
        </div>
        <CompanyIndex companies={index} />
      </main>
      <SiteFooter />
    </>
  );
}
