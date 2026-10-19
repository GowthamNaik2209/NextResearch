// The basket breakdown charts under the basket chart: which stocks (and industries) made the
// return, how each stock moved, and how the weights drifted. Pure: rows and headlines from the
// backtest's holdings, so the charts and their one-line takeaways are tested (breakdown.test.ts).
import type { BacktestHolding } from "./backtest";

export type BarRow =
  | { kind: "stock"; ticker: string; value: number; start?: number }
  | { kind: "group"; label: string; count: number; value: number; start?: number }
  | { kind: "gap"; count: number };

const num = (v: number, dp = 1) => Math.abs(v).toFixed(dp);
const signed = (v: number, dp = 1) => `${v >= 0 ? "+" : "−"}${num(v, dp)}`;
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

/** The biggest adders, the rest combined, then the biggest drags (most negative last). */
export function contributionRows(h: BacktestHolding[], top = 5, bottom = 3): BarRow[] {
  const sorted = [...h].sort((a, b) => b.contribution - a.contribution);
  if (sorted.length <= top + bottom + 1) return sorted.map((x) => ({ kind: "stock", ticker: x.ticker, value: x.contribution }));
  const pos = sorted.filter((x) => x.contribution >= 0);
  const neg = sorted.filter((x) => x.contribution < 0);
  const head = pos.slice(0, top);
  const tail = neg.slice(Math.max(0, neg.length - bottom));
  const shown = new Set([...head, ...tail].map((x) => x.ticker));
  const rest = sorted.filter((x) => !shown.has(x.ticker));
  return [
    ...head.map((x): BarRow => ({ kind: "stock", ticker: x.ticker, value: x.contribution })),
    ...(rest.length ? [{ kind: "group", label: `${rest.length} other${rest.length > 1 ? "s" : ""}`, count: rest.length, value: sum(rest.map((x) => x.contribution)) } as BarRow] : []),
    ...tail.map((x): BarRow => ({ kind: "stock", ticker: x.ticker, value: x.contribution })),
  ];
}

/** Every stock's own return, best first; a long list keeps the top and bottom with a gap between. */
export function returnRows(h: BacktestHolding[], max = 12): BarRow[] {
  const sorted = [...h].sort((a, b) => b.ret - a.ret);
  const row = (x: BacktestHolding): BarRow => ({ kind: "stock", ticker: x.ticker, value: x.ret });
  if (sorted.length <= max) return sorted.map(row);
  const half = Math.floor(max / 2);
  return [...sorted.slice(0, half).map(row), { kind: "gap", count: sorted.length - 2 * half }, ...sorted.slice(-half).map(row)];
}

/** Weights now (with where they started), biggest first, the rest combined. In %. */
export function weightRows(h: BacktestHolding[], max = 8): BarRow[] {
  const sorted = [...h].sort((a, b) => b.endWeight - a.endWeight);
  const row = (x: BacktestHolding): BarRow => ({ kind: "stock", ticker: x.ticker, value: x.endWeight * 100, start: x.weight * 100 });
  if (sorted.length <= max + 1) return sorted.map(row);
  const rest = sorted.slice(max);
  return [
    ...sorted.slice(0, max).map(row),
    { kind: "group", label: `${rest.length} others`, count: rest.length, value: sum(rest.map((x) => x.endWeight)) * 100, start: sum(rest.map((x) => x.weight)) * 100 },
  ];
}

/** Contribution summed by each stock's main industry, biggest first. */
export function industryRows(h: BacktestHolding[], industryOf: (ticker: string) => string | null): BarRow[] {
  const by = new Map<string, { value: number; count: number }>();
  for (const x of h) {
    const k = industryOf(x.ticker) ?? "Other";
    const g = by.get(k) ?? { value: 0, count: 0 };
    g.value += x.contribution;
    g.count += 1;
    by.set(k, g);
  }
  return [...by.entries()].sort((a, b) => b[1].value - a[1].value).map(([label, g]) => ({ kind: "group", label, count: g.count, value: g.value }));
}

const names = (xs: string[]) => (xs.length === 1 ? xs[0] : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

/**
 * One line saying who made the return. When it rose: the fewest stocks (up to three) that added
 * half its points or more. When it fell: the stock that took away the most.
 */
export function contributionHeadline(h: BacktestHolding[], nameOf: (t: string) => string, whose: string): string | null {
  if (!h.length) return null;
  const total = sum(h.map((x) => x.contribution));
  const sorted = [...h].sort((a, b) => b.contribution - a.contribution);
  if (total > 0.05) {
    let acc = 0;
    const lead: BacktestHolding[] = [];
    for (const x of sorted) {
      if (x.contribution <= 0 || lead.length === 3) break;
      lead.push(x);
      acc += x.contribution;
      if (acc >= total / 2) break;
    }
    if (acc >= total / 2) {
      const who = lead.length === 1 ? nameOf(lead[0].ticker) : lead.length === 2 ? names(lead.map((x) => nameOf(x.ticker))) : `${lead.length} stocks`;
      // Losers can offset so much that the leaders added more than the whole gain.
      if (acc > total + 0.05) return `${who} added ${num(acc)} points, more than ${whose} ${num(total)} in all`;
      return `${who} added ${num(acc)} of ${whose} ${num(total)} points`;
    }
    return `${h.filter((x) => x.contribution > 0).length} of ${h.length} stocks added to ${whose} ${num(total)}-point gain`;
  }
  const worst = sorted[sorted.length - 1];
  if (worst.contribution >= 0) return null;
  return `${nameOf(worst.ticker)} took away the most: ${signed(worst.contribution)} of ${whose} ${signed(total)} points`;
}

/** How many rose, and the middle stock's return. */
export function returnHeadline(h: BacktestHolding[], period: string): string | null {
  if (!h.length) return null;
  const rets = h.map((x) => x.ret).sort((a, b) => a - b);
  const mid = rets.length % 2 ? rets[(rets.length - 1) / 2] : (rets[rets.length / 2 - 1] + rets[rets.length / 2]) / 2;
  if (rets.length === 1) return `The stock ${mid >= 0 ? "rose" : "fell"} ${num(mid)}% over the past ${period}`;
  const up = rets.filter((r) => r > 0).length;
  const rose = up === 0 ? `None of the ${h.length} stocks rose` : up === h.length ? `All ${h.length} stocks rose` : `${up} of ${h.length} stocks rose`;
  return `${rose} over the past ${period}; the middle one ${mid >= 0 ? "gained" : "lost"} ${num(mid)}%`;
}

/** The biggest holding now, and where it started. `of`: "the basket" or "your picks". */
export function weightHeadline(h: BacktestHolding[], nameOf: (t: string) => string, of = "the basket"): string | null {
  if (!h.length) return null;
  const top = [...h].sort((a, b) => b.endWeight - a.endWeight)[0];
  const now = top.endWeight * 100;
  const was = top.weight * 100;
  if (Math.abs(now - was) < 0.5) return `${nameOf(top.ticker)} is the biggest holding at ${num(now)}%`;
  return `${nameOf(top.ticker)} is now ${num(now)}% of ${of}, from ${num(was)}% at the start`;
}

/** The industry that added (or took away) the most. */
export function industryHeadline(rows: BarRow[], whose: string): string | null {
  const groups = rows.filter((r): r is Extract<BarRow, { kind: "group" }> => r.kind === "group");
  if (groups.length < 2) return null;
  const total = sum(groups.map((g) => g.value));
  const lead = total >= 0 ? groups[0] : groups[groups.length - 1];
  const of = total >= 0 && lead.value >= 0 ? `${whose} ${num(total)}` : `${whose} ${signed(total)}`;
  return `${lead.label} stocks ${lead.value >= 0 ? "added" : "took away"} ${num(lead.value)} of ${of} points`;
}
