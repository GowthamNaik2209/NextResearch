// Research decks for the reading list: joins each sector's authored report
// (./<slug>.ts) with that sector's live content — zone labels, and the seed
// financials of every company it names — into one plain `Deck` object that can
// cross the server/client boundary to the slide viewer (components/research).
import { getSector, type SectorSupplier } from "../index";
import type { SectorReport } from "./types";
import { ev4w } from "./ev4w";
import { semiconductors } from "./semiconductors";
import { datacenter } from "./datacenter";
import { railways } from "./railways";
import { naval } from "./naval";
import { aerospace } from "./aerospace";
import { telecom5g } from "./telecom5g";
import { solarmodules } from "./solarmodules";
import { energy } from "./energy";
import { realestate } from "./realestate";
import { pharma } from "./pharma";

export type { SectorReport, Tone } from "./types";

const REPORTS: Record<string, SectorReport> = {
  ev4w,
  semiconductors,
  datacenter,
  railways,
  naval,
  aerospace,
  telecom5g,
  solarmodules,
  energy,
  realestate,
  pharma,
};

export function getReport(slug: string): SectorReport | null {
  return REPORTS[slug] ?? null;
}

export type DeckCompany = {
  key: string;
  name: string;
  ticker: string;
  role: string;
  supplier: SectorSupplier;
  tier?: "core" | "direct" | "indirect";
  why?: string;
  mcap: string | null;
  mcapCr: number | null;
  revCr: number | null; // latest fiscal year in the seed data
  revYear: string | null; // e.g. "FY26"
  revCagr: number | null; // % a year, first to latest reported year
  revStart: number | null; // revenue in the CAGR's first year (flags small-base effects)
  cagrSpan: string | null; // e.g. "FY22-26"
  cagrNote: string | null; // why revCagr is missing despite reported revenue (history under 3 years)
  npMargin: number | null; // %, latest year
  pe: number | null;
  roce: number | null;
};

export type DeckNews = SectorReport["companyNews"][number] & { company: DeckCompany };

export type Deck = {
  slug: string;
  name: string;
  icon: string;
  category: "sector" | "policy";
  report: Omit<SectorReport, "beneficiaries" | "companyNews">;
  zoneLabels: Record<string, { label: string; companies: number }>;
  companies: DeckCompany[];
  news: DeckNews[];
};

// Seed financials hold five fiscal years, FY22..FY26 (see SupplierFinancials).
const FIRST_FY = 22;
const MIN_CAGR_YEARS = 3;
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const parseRs = (s?: string) => {
  const n = s ? parseFloat(s.replace(/[^0-9.]/g, "")) : NaN;
  return Number.isFinite(n) ? n : null;
};

function toCompany(key: string, sup: SectorSupplier): DeckCompany {
  const f = sup.f;
  const rev = (f?.rev ?? []).map(num);
  const np = (f?.np ?? []).map(num);
  const reported = rev.map((v, i) => (v != null && v > 0 ? i : -1)).filter((i) => i >= 0);
  const first = reported[0];
  const last = reported[reported.length - 1];
  const span = first != null && last != null ? last - first : 0;
  // A growth rate over one or two years (e.g. a 2024 listing) is not comparable with the
  // four-year CAGRs beside it on the scorecard, so it is left out and the row says why.
  const cagrOk = span >= MIN_CAGR_YEARS;
  const revLast = last != null ? rev[last] : null;
  const npLast = last != null ? np[last] : null;
  return {
    key,
    name: sup.name,
    ticker: f?.ticker ?? "",
    role: sup.role,
    supplier: sup,
    mcap: f?.mcap ?? null,
    mcapCr: parseRs(f?.mcap),
    revCr: revLast,
    revYear: last != null ? `FY${FIRST_FY + last}` : null,
    revCagr: cagrOk ? (Math.pow(revLast! / rev[first]!, 1 / span) - 1) * 100 : null,
    revStart: cagrOk ? rev[first]! : null,
    cagrSpan: span > 0 ? `FY${FIRST_FY + first}-${FIRST_FY + last}` : null,
    cagrNote: span > 0 && !cagrOk ? `only ${span + 1} years reported` : null,
    npMargin: revLast && npLast != null ? (npLast / revLast) * 100 : null,
    pe: num(f?.kpi?.[0]),
    roce: num(f?.kpi?.[3]),
  };
}

export function buildDeck(slug: string): Deck | null {
  const report = REPORTS[slug];
  const sector = getSector(slug);
  if (!report || !sector) return null;
  const { beneficiaries, companyNews, ...rest } = report;

  const zoneLabels: Deck["zoneLabels"] = {};
  for (const z of sector.zones) zoneLabels[z.id] = { label: z.label, companies: z.suppliers.length };

  const companies = beneficiaries.flatMap((b) => {
    const sup = sector.suppliers[b.key];
    return sup ? [{ ...toCompany(b.key, sup), tier: b.tier, why: b.why }] : [];
  });
  const news = companyNews.flatMap((n) => {
    const sup = sector.suppliers[n.key];
    return sup ? [{ ...n, company: companies.find((c) => c.key === n.key) ?? toCompany(n.key, sup) }] : [];
  });

  return {
    slug,
    name: sector.name,
    icon: sector.icon,
    category: sector.category ?? "sector",
    report: rest,
    zoneLabels,
    companies,
    news,
  };
}

export function listReportSlugs(): string[] {
  return Object.keys(REPORTS);
}
