// What the company page and the sector page read about earnings calls: plain, serialisable objects
// (ISO date strings, numbers instead of Decimals) so a server component can hand them straight to a
// client component. Read-only; everything here comes from rows the pipeline, the track record
// (./track-record.ts), the digests (./digest.ts) and the roll-ups (./rollup.ts) wrote.
//
// A quarter can have more than one transcript filed (a corrected re-filing, or the same call on BSE
// and NSE): the latest filing per quarter is the call, and guidance from the superseded one is left
// out, so nothing is counted twice in the track record.
//
// This file imports nothing that talks to Claude, so pulling it into a page doesn't bundle the SDK.
// getSectorConcalls reads sector membership from the authored content; inside the Next server the
// caller must have awaited ensureFinancials() first (src/lib/financials/load.ts), as every sector
// page already does.
import type { PrismaClient } from "@/generated/prisma/client";
import { companyLinkKey, getSector } from "@/lib/sector-content";
import { periodText } from "./track-record";
import type { ConcallRollupJson } from "./rollup";
import { quarterKey, quarterLabel, TONES, type ConcallDigestJson, type ConcallSummaryJson, type FiscalQuarter, type Tone, type Verdict } from "./types";

const VERDICTS: Verdict[] = ["beat", "met", "missed", "pending", "not_checkable"];
const num = (d: { toString(): string } | null | undefined) => (d == null ? null : Number(d.toString()));
const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);
const ymd = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : null);
const fq = (fiscalYear: number, quarter: number): FiscalQuarter => ({ fiscalYear, quarter: quarter as FiscalQuarter["quarter"] });

function latestPerQuarter<T extends { fiscalYear: number; quarter: number; filing: { filedAt: Date } }>(rows: T[]): T[] {
  const by = new Map<number, T>();
  for (const r of rows) {
    const k = quarterKey(fq(r.fiscalYear, r.quarter));
    const prev = by.get(k);
    if (!prev || r.filing.filedAt > prev.filing.filedAt) by.set(k, r);
  }
  return [...by.values()].sort((a, b) => quarterKey(fq(b.fiscalYear, b.quarter)) - quarterKey(fq(a.fiscalYear, a.quarter)));
}

// ------------------------------------------------------------------ Company page

export type CallSource = { exchange: string; url: string; title: string; filedAt: string };

export type CallTimelineItem = {
  label: string; // "Q2 FY27"
  fiscalYear: number;
  quarter: number;
  tone: string;
  toneNote: string;
  callDate: string | null; // YYYY-MM-DD
  source: CallSource;
};

export type TrackRecordRow = {
  id: string;
  statement: string;
  period: string; // "FY27", "H2 FY26", "by FY30", "unspecified"
  low: number | null;
  high: number | null;
  unit: string | null;
  direction: string | null;
  actual: number | null;
  actualNote: string | null;
  verdict: Verdict;
  checkedAt: string | null;
  quote: string;
  page: number;
  saidIn: string; // quarter label of the call it was said on
  source: CallSource;
};

export type CredibilityCounts = Record<Verdict, number> & {
  /** beat + met + missed */
  checkable: number;
  /** (beat + met) / checkable, null when nothing is checkable yet. */
  hitRate: number | null;
};

export type StoredDigest = ConcallDigestJson & { throughKey: number; updatedAt: string; model: string; stale: boolean };

export type CompanyConcalls = {
  ticker: string;
  name: string;
  lastQuarter: (CallTimelineItem & { summary: ConcallSummaryJson; checksPassed: number; checksTotal: number }) | null;
  lastYear: StoredDigest | null;
  multiYear: StoredDigest | null;
  calls: CallTimelineItem[]; // latest first
  guidanceTrackRecord: { metric: string; rows: TrackRecordRow[] }[];
  credibility: CredibilityCounts;
};

export function credibilityOf(rows: { verdict: Verdict }[]): CredibilityCounts {
  const c = Object.fromEntries(VERDICTS.map((v) => [v, 0])) as Record<Verdict, number>;
  for (const r of rows) c[r.verdict]++;
  const checkable = c.beat + c.met + c.missed;
  return { ...c, checkable, hitRate: checkable ? (c.beat + c.met) / checkable : null };
}

/** Everything the company page shows about earnings calls, or null for an unknown ticker. */
export async function getCompanyConcalls(prisma: PrismaClient, ticker: string): Promise<CompanyConcalls | null> {
  const company = await prisma.company.findUnique({ where: { ticker }, select: { id: true, ticker: true, name: true } });
  if (!company) return null;
  const [summaries, guidance, digests] = await Promise.all([
    prisma.concallSummary.findMany({
      where: { companyId: company.id },
      select: {
        id: true,
        fiscalYear: true,
        quarter: true,
        callDate: true,
        tone: true,
        toneNote: true,
        summary: true,
        checksPassed: true,
        checksTotal: true,
        filing: { select: { exchange: true, url: true, title: true, filedAt: true } },
      },
    }),
    prisma.concallGuidance.findMany({ where: { companyId: company.id } }),
    prisma.concallDigest.findMany({ where: { companyId: company.id } }),
  ]);

  const calls = latestPerQuarter(summaries);
  const source = (s: (typeof calls)[number]): CallSource => ({ exchange: s.filing.exchange, url: s.filing.url, title: s.filing.title, filedAt: s.filing.filedAt.toISOString() });
  const timeline = (s: (typeof calls)[number]): CallTimelineItem => ({
    label: quarterLabel(fq(s.fiscalYear, s.quarter)),
    fiscalYear: s.fiscalYear,
    quarter: s.quarter,
    tone: s.tone,
    toneNote: s.toneNote,
    callDate: ymd(s.callDate),
    source: source(s),
  });
  const byId = new Map(calls.map((s) => [s.id, s]));

  // Track record: guidance from the kept calls only, grouped by metric, latest target first.
  const kept = guidance
    .filter((g) => byId.has(g.summaryId))
    .map((g) => {
      const call = byId.get(g.summaryId)!;
      const row: TrackRecordRow = {
        id: g.id,
        statement: g.statement,
        period: periodText(g),
        low: num(g.low),
        high: num(g.high),
        unit: g.unit,
        direction: g.direction,
        actual: num(g.actual),
        actualNote: g.actualNote ?? (g.verdict ? null : "Not checked yet."),
        verdict: (VERDICTS as string[]).includes(g.verdict ?? "") ? (g.verdict as Verdict) : "pending",
        checkedAt: iso(g.checkedAt),
        quote: g.quote,
        page: g.page,
        saidIn: quarterLabel(fq(call.fiscalYear, call.quarter)),
        source: source(call),
      };
      return { metric: g.metric, target: g.targetFiscalYear ?? 0, said: call.fiscalYear * 10 + call.quarter, row };
    })
    .sort((a, b) => b.target - a.target || b.said - a.said);
  const metrics = new Map<string, TrackRecordRow[]>();
  for (const k of kept) metrics.set(k.metric, [...(metrics.get(k.metric) ?? []), k.row]);
  const rows = kept.map((k) => k.row);

  const latestKey = calls.length ? quarterKey(fq(calls[0].fiscalYear, calls[0].quarter)) : 0;
  const digest = (scope: string): StoredDigest | null => {
    const d = digests.find((x) => x.scope === scope);
    if (!d) return null;
    return { ...(d.digest as unknown as ConcallDigestJson), throughKey: d.throughKey, updatedAt: d.updatedAt.toISOString(), model: d.model, stale: d.throughKey < latestKey };
  };

  const last = calls[0];
  return {
    ticker: company.ticker,
    name: company.name,
    lastQuarter: last
      ? { ...timeline(last), summary: last.summary as unknown as ConcallSummaryJson, checksPassed: last.checksPassed, checksTotal: last.checksTotal }
      : null,
    lastYear: digest("year"),
    multiYear: digest("multi_year"),
    calls: calls.map(timeline),
    guidanceTrackRecord: [...metrics].map(([metric, rs]) => ({ metric, rows: rs })),
    credibility: credibilityOf(rows),
  };
}

// ------------------------------------------------------------------ Sector page

export type SectorCompanyTone = {
  ticker: string;
  name: string;
  tone: string;
  toneNote: string;
  callDate: string | null;
  source: CallSource;
};

export type SectorConcalls = {
  sectorSlug: string;
  /** The quarter shown: the latest roll-up's, else the latest quarter any company has a call for. */
  quarter: { fiscalYear: number; quarter: number; label: string } | null;
  rollup: { json: ConcallRollupJson; companies: string[]; updatedAt: string; model: string } | null;
  /** That quarter's call per company (tickers with no call that quarter are left out). */
  companies: SectorCompanyTone[];
  toneMix: Record<Tone, number>;
  /** Companies in the sector with no call on file for the quarter shown. */
  missing: string[];
};

function sectorTickers(slug: string): string[] {
  const s = getSector(slug);
  if (!s) return [];
  const out = new Set<string>();
  for (const z of s.zones)
    for (const link of z.suppliers) {
      const sup = s.suppliers[companyLinkKey(link)];
      if (sup?.listed && sup.f?.ticker) out.add(sup.f.ticker);
    }
  return [...out];
}

/** The latest roll-up and each company's tone for that quarter, or null for an unknown sector. */
export async function getSectorConcalls(prisma: PrismaClient, sectorSlug: string): Promise<SectorConcalls | null> {
  const tickers = sectorTickers(sectorSlug);
  if (!tickers.length) return null;
  const rollup = await prisma.concallRollup.findFirst({ where: { sectorSlug }, orderBy: [{ fiscalYear: "desc" }, { quarter: "desc" }] });
  let q = rollup ? fq(rollup.fiscalYear, rollup.quarter) : null;
  if (!q) {
    const latest = await prisma.concallSummary.findFirst({
      where: { company: { ticker: { in: tickers } } },
      orderBy: [{ fiscalYear: "desc" }, { quarter: "desc" }],
      select: { fiscalYear: true, quarter: true },
    });
    q = latest ? fq(latest.fiscalYear, latest.quarter) : null;
  }
  const toneMix = Object.fromEntries(TONES.map((t) => [t, 0])) as Record<Tone, number>;
  if (!q) return { sectorSlug, quarter: null, rollup: null, companies: [], toneMix, missing: tickers };

  const rows = await prisma.concallSummary.findMany({
    where: { fiscalYear: q.fiscalYear, quarter: q.quarter, company: { ticker: { in: tickers } } },
    select: {
      fiscalYear: true,
      quarter: true,
      callDate: true,
      tone: true,
      toneNote: true,
      company: { select: { ticker: true, name: true } },
      filing: { select: { exchange: true, url: true, title: true, filedAt: true } },
    },
  });
  const latest = new Map<string, (typeof rows)[number]>();
  for (const r of rows) {
    const prev = latest.get(r.company.ticker);
    if (!prev || r.filing.filedAt > prev.filing.filedAt) latest.set(r.company.ticker, r);
  }
  const companies = tickers.flatMap((t) => {
    const r = latest.get(t);
    if (!r) return [];
    if (r.tone in toneMix) toneMix[r.tone as Tone]++;
    return [
      {
        ticker: t,
        name: r.company.name,
        tone: r.tone,
        toneNote: r.toneNote,
        callDate: ymd(r.callDate),
        source: { exchange: r.filing.exchange, url: r.filing.url, title: r.filing.title, filedAt: r.filing.filedAt.toISOString() },
      },
    ];
  });
  return {
    sectorSlug,
    quarter: { ...q, label: quarterLabel(q) },
    rollup: rollup ? { json: rollup.rollup as unknown as ConcallRollupJson, companies: rollup.companies, updatedAt: rollup.updatedAt.toISOString(), model: rollup.model } : null,
    companies,
    toneMix,
    missing: tickers.filter((t) => !latest.has(t)),
  };
}
