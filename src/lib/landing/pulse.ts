// The landing page's "Market pulse" line: the Nifty 50 and the Sensex over the chosen period and the
// latest day's FII / DII net cash flows. Pure (tested in pulse.test.ts), so the server's figures and
// the browser's period switch read the same words.
import { fmtDay, signedPct, NA } from "@/lib/format";
import { signedCr } from "@/components/flows/format";
import type { Period } from "@/lib/baskets/periods";

export type PulseIndex = { name: string; ret: Partial<Record<Period, number>> };
/** The latest day with both sides stored, ₹ crore; `day` is "YYYY-MM-DD". */
export type PulseFlows = { day: string; fiiNetCr: number; diiNetCr: number };
export type PulseItem = { key: string; label: string; value: string; tone: "pos" | "neg" | "flat" | "none"; title: string };

const tone = (shown: string, v: number | null | undefined): PulseItem["tone"] =>
  v == null || !Number.isFinite(v) ? "none" : shown.startsWith("+") ? "pos" : shown.startsWith("−") ? "neg" : "flat";

/** "Market pulse · 3 Nov 2026" (the date of the latest close), or just the words without one. */
export function pulseHeading(asOf: string | null): string {
  return asOf ? `Market pulse · ${fmtDay(asOf)}` : "Market pulse";
}

/** The line's items for a period: each index's return, then FII and DII net labelled with the flows' own (short) date. */
export function pulseItems(indices: PulseIndex[], flows: PulseFlows | null, period: Period): PulseItem[] {
  const out: PulseItem[] = indices.map((ix) => {
    const v = ix.ret[period];
    const value = signedPct(v);
    return { key: ix.name, label: `${ix.name} · ${period}`, value, tone: tone(value, v), title: v == null ? `${ix.name}: updating` : `${ix.name} over ${period}: ${value}` };
  });
  if (flows) {
    const day = fmtDay(flows.day).replace(/ \d{4}$/, "");
    for (const [who, v, long] of [
      ["FII", flows.fiiNetCr, "Foreign institutions"],
      ["DII", flows.diiNetCr, "Domestic institutions"],
    ] as const) {
      const n = signedCr(v);
      // "+₹3,106 Cr" / "−₹2,418 Cr": the sign before the rupee, as the percentages carry theirs.
      const value = n === NA ? NA : n.replace(/^([+−]?)/, "$1₹") + " Cr";
      out.push({ key: who, label: `${who} net · ${day}`, value, tone: tone(n, v), title: `${long}' net cash buying on ${fmtDay(flows.day)}, ₹ crore (a daily figure, not for the period)` });
    }
  }
  return out;
}
