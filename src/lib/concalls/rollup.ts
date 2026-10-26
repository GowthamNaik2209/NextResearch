// Industry roll-ups (ConcallRollup): for one sector and one results quarter, what that quarter's
// earnings calls across the sector's companies said together: the shared demand themes (with the
// tickers behind each), a side-by-side of what each company guided, the risks several of them
// raised, where they disagreed, and the tone mix. The sector page shows the latest one.
//
// Sector membership comes from the authored sector content (zones[].suppliers -> suppliers[key].f
// .ticker, listed only, muted sectors skipped), so a company in several sectors feeds each of
// their roll-ups. Policy pages (category "policy") regroup companies already in industry sectors,
// so they get no roll-up of their own by default (rollupSectorSlugs); getSectorConcalls in
// ./read.ts still shows their companies' tone.
//
// A roll-up needs at least MIN_COMPANIES calls in the quarter. Calls land over about six weeks
// after a quarter ends, so a roll-up is rebuilt whenever the set of companies with a call that
// quarter changes (the stored `companies` list is the key); refreshRollup skips otherwise.
//
// Claude writes the prose from the stored summaries (quotes dropped: the page links each company's
// own call for those); the tone mix counts and the company list are ours. Same request shape as
// the digests (callStructured in ./digest.ts): plain Messages API, structured output, adaptive
// thinking, medium effort, server-side refusal fallback.
import type { PrismaClient } from "@/generated/prisma/client";
import type { Prisma } from "@/generated/prisma/client";
import { companyLinkKey, getSector, listSectors, type SectorWithSlug } from "@/lib/sector-content";
import { callStructured, latestPerQuarter } from "./digest";
import { periodText } from "./track-record";
import { quarterLabel, TONES, type ConcallSummaryJson, type FiscalQuarter, type Tone } from "./types";

export const MIN_COMPANIES = 2;
export const ROLLUP_PROMPT_VERSION = "rollup-v1";

/** ConcallRollup.rollup. */
export type ConcallRollupJson = {
  sector: string;
  quarter: string; // "Q2 FY27"
  companies: number;
  headline: string;
  demand_themes: { theme: string; tickers: string[] }[];
  guidance_comparison: { ticker: string; revenue: string; margin: string; capex: string; other: string }[];
  shared_risks: { risk: string; tickers: string[] }[];
  divergences: string[];
  tone_mix: { counts: Record<Tone, number>; note: string };
  promptVersion: string;
};

// ------------------------------------------------------------------ Membership (pure)

/** Listed tickers linked from any zone of a sector, in authored order, without repeats. */
export function sectorTickers(sector: Pick<SectorWithSlug, "zones" | "suppliers">): string[] {
  const out = new Set<string>();
  for (const z of sector.zones)
    for (const link of z.suppliers) {
      const sup = sector.suppliers[companyLinkKey(link)];
      if (sup?.listed && sup.f?.ticker) out.add(sup.f.ticker);
    }
  return [...out];
}

/** Sectors that get a roll-up: live (not muted) industry sectors, not policy pages. */
export function rollupSectorSlugs(opts: { includePolicies?: boolean } = {}): string[] {
  return listSectors()
    .filter((s) => !s.muted && (opts.includePolicies || s.category !== "policy"))
    .map((s) => s.slug);
}

export function tickersForSector(slug: string): string[] {
  const s = getSector(slug);
  return s ? sectorTickers(s) : [];
}

export function toneCounts(tones: string[]): Record<Tone, number> {
  const out = Object.fromEntries(TONES.map((t) => [t, 0])) as Record<Tone, number>;
  for (const t of tones) if ((TONES as readonly string[]).includes(t)) out[t as Tone]++;
  return out;
}

// ------------------------------------------------------------------ Prompt + schema

const str = { type: "string" } as const;
const tickers = { type: "array", items: str, description: "Tickers exactly as given." } as const;

export const ROLLUP_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["headline", "demand_themes", "guidance_comparison", "shared_risks", "divergences", "tone_note"],
  properties: {
    headline: { type: "string", description: "One or two sentences: what this quarter's calls say about the industry." },
    demand_themes: {
      type: "array",
      description: "Themes at least two companies spoke to, strongest first. 2-6 items.",
      items: { type: "object", additionalProperties: false, required: ["theme", "tickers"], properties: { theme: str, tickers } },
    },
    guidance_comparison: {
      type: "array",
      description: "One row per company, every company given.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["ticker", "revenue", "margin", "capex", "other"],
        properties: {
          ticker: str,
          revenue: { type: "string", description: 'Revenue / growth guidance with period, or "not guided".' },
          margin: { type: "string", description: 'Margin guidance with period, or "not guided".' },
          capex: { type: "string", description: 'Capex guidance with period, or "not guided".' },
          other: { type: "string", description: 'Order book / volumes / other guidance, or "-".' },
        },
      },
    },
    shared_risks: {
      type: "array",
      description: "Risks raised by at least two companies.",
      items: { type: "object", additionalProperties: false, required: ["risk", "tickers"], properties: { risk: str, tickers } },
    },
    divergences: { type: "array", items: str, description: "Where companies said clearly different things about the same thing." },
    tone_note: { type: "string", description: "One sentence on the tone mix given." },
  },
} as const;

type RollupModelOut = Omit<ConcallRollupJson, "sector" | "quarter" | "companies" | "tone_mix" | "promptVersion"> & { tone_note: string };

export const ROLLUP_SYSTEM = `You write an industry roll-up of one results quarter from several Indian listed companies' earnings-call summaries (JSON, already extracted from the transcripts and checked against them).

- Use only what is in the summaries. Name the companies (by ticker, exactly as given) behind every theme and risk.
- guidance_comparison: one row per company. Keep numbers and periods exactly as stated, with units; write "not guided" where a company said nothing on that metric. Do not compute or convert.
- divergences: where companies in the industry said clearly different things (demand, pricing, margins, a market).
- Keep it short: an investor should read it in a minute.`;

export type RollupCall = { ticker: string; name: string; tone: string; summary: ConcallSummaryJson };

export function buildRollupPrompt(input: { sectorName: string; q: FiscalQuarter; calls: RollupCall[] }): { system: string; content: string } {
  const toneLine = Object.entries(toneCounts(input.calls.map((c) => c.tone)))
    .filter(([, n]) => n)
    .map(([t, n]) => `${t}: ${n}`)
    .join(", ");
  const block = (c: RollupCall) => {
    const s = c.summary;
    const pts = (xs: { point: string }[] | undefined) => (xs ?? []).map((x) => x.point);
    return `<company ticker="${c.ticker}" name="${c.name}">\n${JSON.stringify({
      tone: { label: s.tone?.label ?? c.tone, why: s.tone?.rationale ?? "" },
      guidance: (s.guidance ?? []).map((g) => ({ metric: g.metric, period: periodText({ periodKind: g.period_kind, targetFiscalYear: g.target_fiscal_year, targetQuarter: g.target_quarter }), statement: g.statement })),
      demand: pts(s.demand),
      risks: pts(s.risks),
      initiatives: pts(s.initiatives),
    })}\n</company>`;
  };
  const content = [
    `Industry: ${input.sectorName}`,
    `Quarter: ${quarterLabel(input.q)} (${input.calls.length} companies)`,
    `Tone mix (counted): ${toneLine}`,
    "",
    ...input.calls.map(block),
  ].join("\n\n");
  return { system: ROLLUP_SYSTEM, content };
}

export function finishRollup(out: RollupModelOut, sectorName: string, q: FiscalQuarter, calls: RollupCall[]): ConcallRollupJson {
  const known = new Set(calls.map((c) => c.ticker));
  const only = (ts: string[]) => ts.filter((t) => known.has(t)); // drop any ticker the model made up
  return {
    sector: sectorName,
    quarter: quarterLabel(q),
    companies: calls.length,
    headline: out.headline,
    demand_themes: out.demand_themes.map((d) => ({ ...d, tickers: only(d.tickers) })),
    guidance_comparison: out.guidance_comparison.filter((g) => known.has(g.ticker)),
    shared_risks: out.shared_risks.map((r) => ({ ...r, tickers: only(r.tickers) })),
    divergences: out.divergences,
    tone_mix: { counts: toneCounts(calls.map((c) => c.tone)), note: out.tone_note },
    promptVersion: ROLLUP_PROMPT_VERSION,
  };
}

// ------------------------------------------------------------------ DB layer

/** The sector's calls for one quarter: one per company, its latest filing. */
export async function loadSectorCalls(prisma: PrismaClient, tickers: string[], q: FiscalQuarter): Promise<RollupCall[]> {
  if (!tickers.length) return [];
  const rows = await prisma.concallSummary.findMany({
    where: { fiscalYear: q.fiscalYear, quarter: q.quarter, company: { ticker: { in: tickers } } },
    select: { fiscalYear: true, quarter: true, tone: true, summary: true, filing: { select: { filedAt: true } }, company: { select: { ticker: true, name: true } } },
  });
  const byTicker = new Map<string, typeof rows>();
  for (const r of rows) byTicker.set(r.company.ticker, [...(byTicker.get(r.company.ticker) ?? []), r]);
  const order = new Map(tickers.map((t, i) => [t, i]));
  return [...byTicker.entries()]
    .map(([ticker, rs]) => {
      const latest = latestPerQuarter(rs.map((r) => ({ ...r, quarter: r.quarter as FiscalQuarter["quarter"], filedAt: r.filing.filedAt })))[0];
      return { ticker, name: latest.company.name, tone: latest.tone, summary: latest.summary as unknown as ConcallSummaryJson };
    })
    .sort((a, b) => (order.get(a.ticker) ?? 0) - (order.get(b.ticker) ?? 0));
}

export type RollupOutcome =
  | { status: "skipped"; reason: string }
  | { status: "dry_run"; companies: string[]; promptChars: number }
  | { status: "written"; companies: string[]; costUsd: number };

/**
 * Rebuild a sector's roll-up for a quarter when the set of companies with a call that quarter
 * changed (or `force`). `apply: false` builds the prompt without calling Claude or writing.
 */
export async function refreshRollup(
  prisma: PrismaClient,
  sectorSlug: string,
  fiscalYear: number,
  quarter: number,
  opts: { apply?: boolean; force?: boolean } = {},
): Promise<RollupOutcome> {
  const apply = opts.apply ?? true;
  const sector = getSector(sectorSlug);
  if (!sector) return { status: "skipped", reason: `unknown sector ${sectorSlug}` };
  if (sector.muted) return { status: "skipped", reason: "muted sector" };
  const q = { fiscalYear, quarter: quarter as FiscalQuarter["quarter"] };
  const calls = await loadSectorCalls(prisma, sectorTickers(sector), q);
  if (calls.length < MIN_COMPANIES) return { status: "skipped", reason: `${calls.length} call(s) in ${quarterLabel(q)}; a roll-up needs ${MIN_COMPANIES}` };
  const companies = calls.map((c) => c.ticker).sort();
  const existing = await prisma.concallRollup.findUnique({
    where: { sectorSlug_fiscalYear_quarter: { sectorSlug, fiscalYear, quarter } },
    select: { companies: true },
  });
  if (existing && !opts.force && [...existing.companies].sort().join(",") === companies.join(","))
    return { status: "skipped", reason: `up to date (${companies.length} companies)` };

  const prompt = buildRollupPrompt({ sectorName: sector.name, q, calls });
  if (!apply) return { status: "dry_run", companies, promptChars: prompt.content.length };

  const res = await callStructured<RollupModelOut>(prompt.system, ROLLUP_SCHEMA as unknown as Record<string, unknown>, prompt.content);
  const rollup = finishRollup(res.data, sector.name, q, calls) as unknown as Prisma.InputJsonValue;
  const costUsd = res.costUsd.toFixed(6);
  await prisma.concallRollup.upsert({
    where: { sectorSlug_fiscalYear_quarter: { sectorSlug, fiscalYear, quarter } },
    create: { sectorSlug, fiscalYear, quarter, rollup, companies, model: res.model, costUsd },
    update: { rollup, companies, model: res.model, costUsd },
  });
  return { status: "written", companies, costUsd: res.costUsd };
}
