// Writing one call's checked summary: a ConcallSummary row (our summary + short quotes, never the
// transcript), its guidance as ConcallGuidance rows for the track record, and the filing marked
// summarised with the results quarter Claude read from the transcript.
//
// One summary per company per results quarter: a company that re-files a corrected transcript (or
// files the same call on both exchanges when the NSE twin slipped past the 3-day rule) ends up with
// two filings for one call. The summary of the later filing wins; the earlier one's summary is
// deleted (its guidance rows go with it) and its filing keeps a note saying which filing replaced it.
// Special calls (an acquisition investor call, an investor day: discover.ts CallKind) never replace a
// results call's summary or get replaced by one; they are stored beside it.
// Rewriting a filing's own summary (a re-run with a newer prompt) replaces it in place.
import type { PrismaClient } from "@/generated/prisma/client";
import { costOf, type TokenUsage } from "./claude";
import { checkCounts } from "./validate";
import { callKindFromTitle, type CallKind } from "./discover";
import { PROMPT_VERSION } from "./prompt";
import { CONCALL_MODEL, type ConcallSummaryJson, type ItemCheck } from "./types";

export type StoreInput = {
  filing: { id: string; companyId: string; filedAt: Date };
  /** results (default) or special: only results calls take part in one-summary-per-quarter. */
  callKind?: CallKind;
  summary: ConcallSummaryJson;
  checks: ItemCheck[];
  usage: TokenUsage;
  /** Batch API price (half); false for a plain request. */
  batch?: boolean;
  promptVersion?: string;
  pages?: number;
  pdfSha256?: string;
};

const callDateOf = (s: string) => (/^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T00:00:00Z`) : null);

/** The ConcallSummary + ConcallGuidance rows for one filing (pure: what store() writes). */
export function summaryRows(x: StoreInput) {
  const s = x.summary;
  const { checksPassed, checksTotal } = checkCounts(x.checks);
  return {
    summary: {
      filingId: x.filing.id,
      companyId: x.filing.companyId,
      fiscalYear: s.fiscal_year,
      quarter: s.quarter,
      callDate: callDateOf(s.call_date),
      tone: s.tone.label,
      toneNote: s.tone.rationale,
      // The summary whole, plus the per-item check results so a page can flag an unconfirmed item.
      summary: { ...s, checks: x.checks } as unknown as object,
      checksPassed,
      checksTotal,
      model: CONCALL_MODEL,
      promptVersion: x.promptVersion ?? PROMPT_VERSION,
      inputTokens: x.usage.input + x.usage.cacheWrite + x.usage.cacheRead,
      outputTokens: x.usage.output,
      costUsd: Number(costOf(x.usage, { batch: x.batch ?? true }).toFixed(6)),
    },
    guidance: s.guidance.map((g) => ({
      companyId: x.filing.companyId,
      metric: g.metric,
      periodKind: g.period_kind,
      targetFiscalYear: g.target_fiscal_year,
      targetQuarter: g.target_quarter,
      low: g.low,
      high: g.high,
      unit: g.unit,
      direction: g.direction,
      statement: g.statement,
      quote: g.quote,
      page: g.page,
    })),
  };
}

/** Writes one filing's summary and guidance; returns the summary id and any filings it replaced. */
export async function storeSummary(prisma: PrismaClient, x: StoreInput): Promise<{ summaryId: string; superseded: string[] }> {
  const rows = summaryRows(x);
  const { fiscalYear, quarter, companyId } = rows.summary;
  // Other summaries of the same call (company + results quarter), from other filings.
  // ConcallFiling has no call-kind column yet, so other filings' kind is read from their headlines.
  const others =
    (x.callKind ?? "results") === "special"
      ? []
      : (
          await prisma.concallSummary.findMany({
            where: { companyId, fiscalYear, quarter, filingId: { not: x.filing.id } },
            select: { id: true, filingId: true, filing: { select: { filedAt: true, title: true } } },
          })
        ).filter((o) => callKindFromTitle(o.filing.title) === "results");
  const older = others.filter((o) => o.filing.filedAt.getTime() <= x.filing.filedAt.getTime());
  // A newer filing for this call is already summarised: keep that one, and say so on this filing.
  const newer = others.find((o) => o.filing.filedAt.getTime() > x.filing.filedAt.getTime());
  if (newer) {
    await prisma.concallFiling.update({
      where: { id: x.filing.id },
      data: { status: "summarised", fiscalYear, quarter, error: `superseded by filing ${newer.filingId}`, batchId: null },
    });
    return { summaryId: newer.id, superseded: [x.filing.id] };
  }

  const summaryId = await prisma.$transaction(async (tx) => {
    // Re-summarising this filing replaces its own row (guidance cascades).
    await tx.concallSummary.deleteMany({ where: { filingId: x.filing.id } });
    if (older.length) {
      await tx.concallSummary.deleteMany({ where: { id: { in: older.map((o) => o.id) } } });
      await tx.concallFiling.updateMany({ where: { id: { in: older.map((o) => o.filingId) } }, data: { error: `superseded by filing ${x.filing.id}` } });
    }
    const created = await tx.concallSummary.create({ data: rows.summary, select: { id: true } });
    if (rows.guidance.length) await tx.concallGuidance.createMany({ data: rows.guidance.map((g) => ({ ...g, summaryId: created.id })) });
    await tx.concallFiling.update({
      where: { id: x.filing.id },
      data: {
        status: "summarised",
        fiscalYear,
        quarter,
        error: null,
        batchId: null,
        ...(x.pages !== undefined ? { pages: x.pages } : {}),
        ...(x.pdfSha256 ? { pdfSha256: x.pdfSha256 } : {}),
      },
    });
    return created.id;
  });
  return { summaryId, superseded: older.map((o) => o.filingId) };
}
